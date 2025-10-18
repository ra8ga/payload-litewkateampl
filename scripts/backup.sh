#!/usr/bin/env bash
set -euo pipefail

# backup.sh — pełny backup D1 + R2 do lokalnego katalogu backups/
# Użycie:
#  - bash scripts/backup.sh dev
#  - bash scripts/backup.sh prod
#  - bash scripts/backup.sh --dry-run dev
# Możesz też ustawić CLOUDFLARE_ENV=dev|prod i wywołać bez parametru env.

usage() {
  echo "Usage: $0 [--dry-run] dev|prod" >&2
  exit 1
}

DRY_RUN=false
ENV="${CLOUDFARE_ENV:-${CLOUDFLARE_ENV:-}}"  # fallback do ENV z otoczenia (poprawione)
# Ostrzeżenie o literówce: CLOUDFARE_ENV
if [ "${CLOUDFARE_ENV+x}" = x ]; then
  if [ "${CLOUDFLARE_ENV+x}" = x ]; then
    echo "UWAGA: ustawiono zarówno CLOUDFARE_ENV (literówka) jak i CLOUDFLARE_ENV; używam CLOUDFARE_ENV przez priorytet. Używaj wyłącznie poprawnej CLOUDFLARE_ENV." >&2
  else
    echo "UWAGA: wykryto CLOUDFARE_ENV (literówka). Preferuj CLOUDFLARE_ENV." >&2
  fi
fi

# Parsowanie argumentów
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true; shift ;;
    dev|prod)
      ENV="$1"; shift ;;
    *)
      echo "Unknown argument: $1" >&2
      usage ;;
  esac
done

if [[ -z "${ENV}" ]]; then
  echo "Brak ENV (dev|prod). Podaj jako argument albo ustaw CLOUDFLARE_ENV." >&2
  usage
fi

ENV_UC=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')
TS=$(date -u +'%Y%m%d-%H%M%S')

# Ścieżki
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.backup"
BACKUPS_DIR_DEFAULT="$ROOT_DIR/backups"

# Wczytanie .env.backup (jeśli istnieje)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "UWAGA: brak pliku .env.backup — używam tylko zmiennych środowiskowych." >&2
fi

BACKUPS_DIR="${BACKUPS_DIR:-$BACKUPS_DIR_DEFAULT}"
LOGS_DIR="$BACKUPS_DIR/logs"
D1_DIR="$BACKUPS_DIR/d1/$ENV"
R2_DIR="$BACKUPS_DIR/r2/$ENV"
mkdir -p "$LOGS_DIR" "$D1_DIR" "$R2_DIR"
LOG_FILE="$LOGS_DIR/$TS-$ENV.log"

# Logowanie całego wyjścia do pliku
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Backup start [$ENV] @ $TS (UTC) ==="

# Wymagane narzędzia
has_cmd() { command -v "$1" >/dev/null 2>&1; }
if ! has_cmd npx; then echo "Brak npx (Node) — zainstaluj Node.js" >&2; fi
if ! has_cmd node; then echo "Brak node — zainstaluj Node.js" >&2; fi

# Zmienne środowiskowe specyficzne dla ENV
D1_NAME_VAR="D1_DATABASE_NAME_${ENV_UC}"
R2_BUCKET_VAR="R2_PRIMARY_BUCKET_${ENV_UC}"
D1_NAME="${!D1_NAME_VAR:-}"
R2_BUCKET="${!R2_BUCKET_VAR:-}"

# Eksport D1
SQL_PATH="$D1_DIR/$TS.sql"
SQL_GZ="$D1_DIR/$TS.sql.gz"
if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] D1 export: $D1_NAME -> $SQL_GZ (placeholder)"
  echo "-- dry-run placeholder for $D1_NAME @ $TS" > "$SQL_PATH"
  gzip -f "$SQL_PATH"
else
  echo "[D1] Exporting $D1_NAME -> $SQL_PATH"
  npx wrangler d1 export "$D1_NAME" --remote --output "$SQL_PATH"
  echo "[D1] Compressing $SQL_PATH -> $SQL_GZ"
  gzip -f "$SQL_PATH"
fi

# R2 backup przez wrangler (native Cloudflare): pobierz wszystkie obiekty
# Wymaga: CLOUDFLARE_ACCOUNT_ID ustawione (z whoami) oraz (opcjonalnie) włączony Data Catalog
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  echo "[R2] Brak CLOUDFLARE_ACCOUNT_ID — ustaw np. z 'wrangler whoami'." >&2
fi

JURISDICTION="${R2_JURISDICTION:-eu}"
# Derive S3 endpoint for jurisdiction if not provided
if [[ -z "${R2_S3_ENDPOINT:-}" && -n "${ACCOUNT_ID:-}" && -n "${JURISDICTION:-}" ]]; then
  R2_S3_ENDPOINT="https://${ACCOUNT_ID}.${JURISDICTION}.r2.cloudflarestorage.com"
fi
if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] R2 mirror via wrangler: bucket=$R2_BUCKET -> $R2_DIR"
else
  echo "[R2] Mirroring (wrangler) bucket=$R2_BUCKET -> $R2_DIR"
fi

# Opcjonalnie: manifest z kluczami (po jednej ścieżce na linię)
DEFAULT_MANIFEST="$ROOT_DIR/scripts/r2-keys-$ENV.txt"
R2_KEYS_MANIFEST="${R2_KEYS_MANIFEST:-$DEFAULT_MANIFEST}"

# Global array for R2 keys
keys=()

# Funkcja: sprawdzenie statusu katalogu
catalog_is_enabled() {
  local bucket="$1"
  local out
  if out=$(CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" npx wrangler r2 bucket catalog get "$bucket" 2>&1); then
    if echo "$out" | grep -qi "not enabled"; then
      return 1
    fi
    # Jeśli komenda się powiodła i nie zwróciła "not enabled", uznaj katalog za włączony
    return 0
  else
    # Błąd (np. Unauthorized / brak uprawnień) — traktuj jako nieaktywne
    return 1
  fi
}

# Funkcja: pobierz listę kluczy przez R2 SQL (open-beta). Wymaga R2_SQL_WAREHOUSE.
list_keys_sql() {
  local bucket="$1"; shift
  local out_file="$1"; shift
  local warehouse_var="R2_SQL_WAREHOUSE_${ENV_UC}"
  local warehouse="${!warehouse_var:-${R2_SQL_WAREHOUSE:-}}"
  local query="SELECT key FROM r2.objects WHERE bucket = '${bucket}'"
  if [[ -z "$warehouse" ]]; then
    echo "[R2] Brak R2_SQL_WAREHOUSE_${ENV_UC} ani R2_SQL_WAREHOUSE — podaj nazwę magazynu Data Catalog lub użyj manifestu kluczy." >&2
    return 1
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY-RUN] SQL query (warehouse=$warehouse): $query"
    echo "(dry-run)" > "$out_file"
    return 0
  fi
  if WRANGLER_R2_SQL_AUTH_TOKEN="${WRANGLER_R2_SQL_AUTH_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}" CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" npx wrangler r2 sql query "$warehouse" "$query" > "$out_file"; then
    return 0
  else
    return 1
  fi
}

# Funkcja: pobierz listę kluczy przez S3 API dla R2
list_keys_s3() {
  local bucket="$1"; shift
  local out_file="$1"; shift
  local prefix="$1"; shift || true

  if [[ -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" || -z "${R2_S3_ENDPOINT:-}" ]]; then
    echo "[R2] Brak S3 poświadczeń (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_S3_ENDPOINT)." >&2
    return 1
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY-RUN] S3 list: bucket=$bucket prefix='$prefix' -> $out_file"
    echo "(dry-run)" > "$out_file"
    return 0
  fi
  if NODE_OPTIONS="" node "$SCRIPT_DIR/list-s3-keys.mjs" "$bucket" "$out_file" "$prefix"; then
    return 0
  else
    local alt_endpoint="https://${ACCOUNT_ID}.${JURISDICTION}.r2.cloudflarestorage.com"
    if [[ -n "${ACCOUNT_ID:-}" && -n "${JURISDICTION:-}" ]]; then
      echo "[R2] S3 list failed. Retrying with jurisdiction endpoint: $alt_endpoint"
      R2_S3_ENDPOINT="$alt_endpoint" NODE_OPTIONS="" node "$SCRIPT_DIR/list-s3-keys.mjs" "$bucket" "$out_file" "$prefix"
      return $?
    else
      return 1
    fi
  fi
}

# Funkcja: pobierz pojedynczy obiekt
get_object() {
  local bucket="$1"; shift
  local key="$1"; shift
  local dest="$1"; shift
  local dest_dir; dest_dir="$(dirname "$dest")"
  mkdir -p "$dest_dir"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY-RUN] wrangler r2 object get --remote --jurisdiction ${JURISDICTION} ${bucket}/${key} -> ${dest}"
  else
    CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" npx wrangler r2 object get --remote --jurisdiction "$JURISDICTION" "${bucket}/${key}" --file "$dest"
  fi
}

# Helper: read keys file into array (portable, no mapfile)
read_keys_file() {
  local file="$1"
  keys=()
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    keys+=("$line")
  done < "$file"
}

# Helper: get bucket object_count via Wrangler
bucket_object_count() {
  local bucket="$1"
  local out
  if out=$(CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" npx wrangler r2 bucket info "$bucket" 2>&1); then
    local count
    count=$(echo "$out" | awk -F': +' '/object_count/{print $2}' | tr -d '[:space:]')
    if [[ "$count" =~ ^[0-9]+$ ]]; then
      echo "$count"
      return 0
    fi
  fi
  return 1
}

# Strategia listowania: 1) manifest, 2) S3 (jeśli dostępne), 3) SQL (gdy katalog włączony), 4) fallback
KEYS_LIST_FILE="$R2_DIR/.keys.manifest"
if [[ -f "$R2_KEYS_MANIFEST" ]]; then
  echo "[R2] Używam manifestu kluczy: $R2_KEYS_MANIFEST"
  cp "$R2_KEYS_MANIFEST" "$KEYS_LIST_FILE"
  read_keys_file "$KEYS_LIST_FILE"
  echo "[R2] Downloading ${#keys[@]:-0} objects (manifest)..."
  for k in "${keys[@]-}"; do
    [[ -z "$k" ]] && continue
    if [[ "$k" == "${R2_BUCKET}/"* ]]; then
      safe_k="${k#${R2_BUCKET}/}"
    else
      safe_k="$k"
    fi
    dest_path="$R2_DIR/$safe_k"
    get_object "$R2_BUCKET" "$safe_k" "$dest_path"
  done
else
  if [[ -n "${R2_ACCESS_KEY_ID:-}" && -n "${R2_SECRET_ACCESS_KEY:-}" && -n "${R2_S3_ENDPOINT:-}" ]]; then
    echo "[R2] Generuję listę kluczy przez S3 API..."
    if list_keys_s3 "$R2_BUCKET" "$KEYS_LIST_FILE" ""; then
      read_keys_file "$KEYS_LIST_FILE"
      echo "[R2] Downloading ${#keys[@]:-0} objects (S3)..."
      for k in "${keys[@]-}"; do
        [[ -z "$k" ]] && continue
        if [[ "$k" == "${R2_BUCKET}/"* ]]; then
          safe_k="${k#${R2_BUCKET}/}"
        else
          safe_k="$k"
        fi
        dest_path="$R2_DIR/$safe_k"
        get_object "$R2_BUCKET" "$safe_k" "$dest_path"
      done
    else
      echo "[R2] S3 list nie powiodło się. Próbuję SQL (jeśli dostępne)."
      if catalog_is_enabled "$R2_BUCKET" && list_keys_sql "$R2_BUCKET" "$KEYS_LIST_FILE"; then
        echo "[R2] Keys list (SQL): $KEYS_LIST_FILE"
        if [[ "$DRY_RUN" == true ]]; then
          echo "[DRY-RUN] Pominę pobieranie obiektów — tylko lista kluczy."
        else
          keys=()
          if command -v jq >/dev/null 2>&1; then
            while IFS= read -r line; do
              [[ -z "$line" ]] && continue
              keys+=("$line")
            done < <(jq -r '.[]?.key // .key // empty' "$KEYS_LIST_FILE" 2>/dev/null || true)
          fi
          if [[ ${#keys[@]} -eq 0 ]]; then
            while IFS= read -r line; do
              [[ -z "$line" ]] && continue
              keys+=("$line")
            done < <(grep -o '"key"\s*:\s*"[^"]\+' "$KEYS_LIST_FILE" | sed 's/.*"key"\s*:\s*"\(.*\)"/\1/')
          fi
          if [[ ${#keys[@]} -eq 0 ]]; then
            echo "[R2] Brak kluczy do pobrania (SQL)."
          else
            echo "[R2] Downloading ${#keys[@]:-0} objects (SQL)..."
            for k in "${keys[@]-}"; do
              [[ -z "$k" ]] && continue
              if [[ "$k" == "${R2_BUCKET}/"* ]]; then
                safe_k="${k#${R2_BUCKET}/}"
              else
                safe_k="$k"
              fi
              dest_path="$R2_DIR/$safe_k"
              get_object "$R2_BUCKET" "$safe_k" "$dest_path"
            done
          fi
        fi
      else
        # If bucket appears empty, treat as successful no-op
        if out=$(bucket_object_count "$R2_BUCKET") && [[ "$out" == "0" ]]; then
          echo "[R2] Bucket '$R2_BUCKET' is empty; skipping object download."
        else
          echo "[R2] Brak listowania kluczy (S3/SQL). Dodaj manifest lub włącz Data Catalog."
        fi
      fi
    fi
  fi
fi

# Podsumowanie
SQL_SIZE=$(du -h "$SQL_GZ" | awk '{print $1}')
echo "=== Backup done [$ENV] @ $TS | D1: $SQL_SIZE | R2->local: $R2_DIR ==="
