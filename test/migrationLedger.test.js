import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createMigrationChecksum,
  planMigrations,
} from '../src/lib/migrationLedger.js'

test('createMigrationChecksum is stable for identical SQL', () => {
  const sql = 'create table demo (id uuid primary key);\n'

  assert.equal(createMigrationChecksum(sql), createMigrationChecksum(sql))
  assert.match(createMigrationChecksum(sql), /^[a-f0-9]{64}$/)
})

test('planMigrations separates pending, checksum backfills, and mismatches', () => {
  const localFiles = [
    { filename: '001_init.sql', checksum: 'old-current' },
    { filename: '002_next.sql', checksum: 'next-current' },
    { filename: '003_new.sql', checksum: 'new-current' },
  ]
  const applied = [
    { filename: '001_init.sql', checksum: null },
    { filename: '002_next.sql', checksum: 'next-stale' },
  ]

  const plan = planMigrations({ applied, localFiles })

  assert.deepEqual(plan.pending.map(f => f.filename), ['003_new.sql'])
  assert.deepEqual(plan.checksumBackfills, [
    { filename: '001_init.sql', checksum: 'old-current' },
  ])
  assert.deepEqual(plan.checksumMismatches, [
    { filename: '002_next.sql', appliedChecksum: 'next-stale', localChecksum: 'next-current' },
  ])
})
