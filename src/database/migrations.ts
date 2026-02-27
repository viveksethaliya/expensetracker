/**
 * WatermelonDB Migrations
 *
 * ── HOW TO ADD A FUTURE SCHEMA CHANGE ──────────────────────────
 *
 * 1. Bump the `version` in `schema.ts` (e.g. from 1 → 2).
 * 2. Apply your change in `schema.ts` (add column, add table, etc.).
 * 3. Add a matching migration step below inside the `migrations` array,
 *    targeting `toVersion` equal to the new schema version.
 *
 * Example — adding a "currency" column to transactions in version 2:
 *
 *   {
 *     toVersion: 2,
 *     steps: [
 *       addColumns({
 *         table: 'transactions',
 *         columns: [
 *           { name: 'currency', type: 'string', isOptional: true },
 *         ],
 *       }),
 *     ],
 *   },
 *
 * Available migration helpers (import from '@nozbe/watermelondb/Schema/migrations'):
 *   - addColumns({ table, columns })
 *   - createTable({ name, columns })
 *
 * ⚠️  NEVER remove or rename an existing column in a migration.
 *     SQLite does not support DROP COLUMN on older Android versions.
 *     Instead, add a new column and deprecate the old one.
 * ────────────────────────────────────────────────────────────────
 */

import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
// import { addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
    migrations: [
        // Future migrations go here, e.g.:
        // {
        //   toVersion: 2,
        //   steps: [
        //     addColumns({ table: 'transactions', columns: [{ name: 'currency', type: 'string', isOptional: true }] }),
        //   ],
        // },
    ],
});
