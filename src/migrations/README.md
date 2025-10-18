# Payload Migrations

This directory contains database migrations for the Payload CMS application using D1 SQLite.

## Migration Overview

### Struktura folderów
- `core/` — fundament: users, media, locked, preferences, migrations
- `docs/` — migracje kolekcji docs
- `posts/` — migracje kolekcji posts (schema, seed, patch)
- `initiatives/` — migracje kolekcji initiatives (schema + arrays)
- `index.ts` — agregator migracji
- `README.md` — dokumentacja


### All Migrations (Applied to Database)

#### 1. `20250929_111647.ts` - Initial Database Setup

**Purpose:** Core system foundation

- **Tables Created:**
  - `users` - User accounts with authentication
  - `users_sessions` - User session management
  - `media` - File and image storage
  - `payload_locked_documents` - Document locking system
  - `payload_preferences` - User preferences
  - `payload_migrations` - Migration tracking
- **Features:**
  - User authentication and session management
  - Media file handling with metadata
  - Collaborative editing with document locks
  - System preferences and migration tracking

#### 2. `20251017_164338.ts` - Docs Collection

**Purpose:** Document management system

- **Table Created:** `docs`
- **Fields:** `title`, `description`, `file_id` (media relation)
- **Features:**
  - Document storage with file attachments
  - Integration with media system
  - Document locking support

#### 3. `20251018_153012.ts` - Posts Collection ✅

**Purpose:** Blog functionality

- **Table Created:** `posts`
- **Fields:** `title`, `slug`, `status`, `published_at`, `content`, `image_id`, `author_id`
- **Features:**
  - Blog posts with rich text content
  - Publishing workflow (draft/published)
  - Image and author relationships
  - URL-friendly slugs with automatic generation
  - Publication date management

#### 4. `20251018_155420_seed_posts.ts` - Posts Seed Data ✅

**Purpose:** Sample blog posts

- **Data Added:**
  - "Hello World" (published, slug: hello-world)
  - "Drugi wpis" (draft, slug: second-post)
- **Features:**
  - Sample content for testing
  - Different publication statuses
  - Polish language content examples

#### 5. `20251018_160150_patch_posts_content_json.ts` - Posts Content Fix ✅

**Purpose:** Fix posts content field structure

- **Issue Resolved:** JSON content type conversion for rich text
- **Features:**
  - Proper rich text content structure
  - Lexical editor compatibility

#### 6. `20251018_164900.ts` - Initiatives Collection

**Purpose:** Project/initiative management

- **Table Created:** `initiatives`
- **Fields:** `title`, `slug`, `excerpt`, `content`, `featured`, `order`, `status`, `published_at`
- **Features:**
  - Publishing workflow (draft/published)
  - Featured projects highlighting
  - URL-friendly slugs
  - Custom ordering and publication dates

#### 7. `20251018_182500.ts` - Initiatives Array Fields

**Purpose:** Extended initiative functionality

- **Tables Created:**
  - `initiatives_gallery` - Image galleries for initiatives
  - `initiatives_tags` - Tag system for categorization
- **Features:**
  - Multiple images per initiative
  - Tag-based categorization
  - Ordered gallery and tag arrays

## Database Schema Summary

```
📊 Active Schema:
├── 👤 User Management
│   ├── users (accounts, auth)
│   └── users_sessions (login state)
├── 📁 Media System
│   └── media (files, images, metadata)
├── 📄 Content Collections
│   ├── docs (documents with files)
│   └── initiatives (projects with galleries & tags)
└── 🔧 System Tables
    ├── payload_locked_documents (editing locks)
    ├── payload_preferences (user settings)
    └── payload_migrations (migration tracking)

└── 📝 Blog System
    ├── posts (blog entries)
    ├── seed data (sample posts)
    └── content patches (JSON fixes)
```

## Migration Status

| Migration                                  | Status     | Description                        |
| ------------------------------------------ | ---------- | ---------------------------------- |
| `20250929_111647`                          | ✅ Applied | Core system setup                  |
| `20251017_164338`                          | ✅ Applied | Docs collection                    |
| `20251018_153012`                          | ✅ Applied | Posts collection                   |
| `20251018_155420_seed_posts`               | ✅ Applied | Posts seed data                    |
| `20251018_160150_patch_posts_content_json` | ✅ Applied | Posts content JSON fix             |
| `20251018_164900`                          | ✅ Applied | Initiatives collection             |
| `20251018_182500`                          | ✅ Applied | Initiatives arrays (gallery, tags) |

## Important Notes

### Porządki w migracjach
- Usunięto duplikat pliku: `20251018_155420.ts` (pozostaje `20251018_155420_seed_posts.ts`).
- Usunięto nieużywane snapshoty `.json`: `20250929_111647.json`, `20251017_164338.json`.
- `index.ts` importuje teraz wszystkie 7 migracji, zgodnie z dokumentacją.


### Migration Status Clarification

**All 7 migrations are applied and functional** in the database, despite some not being imported in `index.ts`. This was verified through:

- Direct database queries showing all migration tables exist
- API testing confirming `/api/posts` endpoint works correctly
- Posts collection contains seed data ("Hello World", "Drugi wpis")

### Database Configuration

- Database uses D1 SQLite with proper foreign key relationships
- Each migration includes both `up()` and `down()` functions for rollback capability
- Indexes are created for performance optimization
- Migration status is tracked in `payload_migrations` table

### Index.ts vs Database State

The `index.ts` file imports only 4 migrations, but the database contains all 7. This discrepancy occurred because:

- Posts migrations were applied during development before being removed from index.ts
- Database maintains migration history regardless of index.ts imports
- Posts functionality remains fully operational through the API

### API Verification

The Posts collection functionality has been confirmed working:

- **Endpoint**: `GET /api/posts` returns proper JSON response
- **Seed Data**: Contains sample posts ("Hello World", "Drugi wpis")
- **Content Fields**: Properly structured with title, content, and metadata
- **Admin Access**: Posts manageable through Payload admin interface

### Migration History

The migration sequence shows progressive development:

1. **Core System** (`20250929_111647`) - Foundation with users, media, system tables
2. **Documentation** (`20251017_164338`) - Docs collection for static content
3. **Blog System** (`20251018_153012` + seed + patch) - Complete posts functionality
4. **Projects** (`20251018_164900` + arrays) - Initiatives with galleries and tags

This progression demonstrates a typical CMS evolution from basic infrastructure to content management.

## Development Guidelines

When adding new migrations:

1. **Create migration files** with timestamp format: `YYYYMMDD_HHMMSS.ts`
2. **Implement both functions**: `up()` for applying, `down()` for rollback
3. **Update index.ts**: Add import and entry to `migrations` array
4. **Test thoroughly**: Verify in development before production deployment
5. **Document changes**: Update this README with new migration details

### Best Practices

- Always include proper error handling in migration functions
- Use descriptive names for migration files
- Test rollback procedures (`down()` functions)
- Keep migrations atomic and independent
- Verify data integrity after migration completion

### Current Database State

- **Total Migrations**: 7 (all applied)
- **Collections**: users, media, docs, posts, initiatives
- **System Tables**: payload_migrations, payload_preferences, etc.
- **Status**: Production ready with full functionality
