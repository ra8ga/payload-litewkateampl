import * as migration_20250929_111647 from './core/20250929_111647';
import * as migration_20251017_164338 from './docs/20251017_164338';
import * as migration_20251018_153012 from './posts/20251018_153012';
import * as migration_20251018_155420_seed_posts from './posts/20251018_155420_seed_posts';
import * as migration_20251018_160150_patch_posts_content_json from './posts/20251018_160150_patch_posts_content_json';
import * as migration_20251018_164900 from './initiatives/20251018_164900';
import * as migration_20251018_182500 from './initiatives/20251018_182500';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20251017_164338.up,
    down: migration_20251017_164338.down,
    name: '20251017_164338',
  },
  {
    up: migration_20251018_153012.up,
    down: migration_20251018_153012.down,
    name: '20251018_153012',
  },
  {
    up: migration_20251018_155420_seed_posts.up,
    down: migration_20251018_155420_seed_posts.down,
    name: '20251018_155420_seed_posts',
  },
  {
    up: migration_20251018_160150_patch_posts_content_json.up,
    down: migration_20251018_160150_patch_posts_content_json.down,
    name: '20251018_160150_patch_posts_content_json',
  },
  {
    up: migration_20251018_164900.up,
    down: migration_20251018_164900.down,
    name: '20251018_164900',
  },
  {
    up: migration_20251018_182500.up,
    down: migration_20251018_182500.down,
    name: '20251018_182500',
  },
];
