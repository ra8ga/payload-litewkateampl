import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20251017_164338 from './20251017_164338';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20251017_164338.up,
    down: migration_20251017_164338.down,
    name: '20251017_164338'
  },
];
