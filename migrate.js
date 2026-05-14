#!/usr/bin/env node
// ============================================================
// Deskra — Migration Runner
// Jalankan: node migrate.js
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createMigrationChecksum, planMigrations } from './src/lib/migrationLedger.js'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'supabase', 'migrations')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Pastikan VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ada di .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

function sqlLiteral(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

async function ensureMigrationTable() {
  // Cukup pastikan tabel ada — sudah dibuat via bootstrap.sql.
  const { error } = await supabase
    .from('_deskra_migrations')
    .select('id')
    .limit(1)

  if (error) {
    console.error('❌  Tabel _deskra_migrations belum ada.')
    console.error('    Jalankan dulu: supabase/bootstrap.sql di Supabase SQL Editor.')
    process.exit(1)
  }

  const { error: checksumError } = await supabase.rpc('run_sql', {
    sql: 'alter table _deskra_migrations add column if not exists checksum text',
  })

  if (checksumError) {
    console.error(`❌  Gagal menyiapkan kolom checksum migrasi: ${checksumError.message}`)
    process.exit(1)
  }
}

async function getAppliedMigrations() {
  const { data, error } = await supabase
    .from('_deskra_migrations')
    .select('filename, checksum')
    .order('filename')

  if (error) return []
  return data || []
}

async function backfillMigrationChecksum({ filename, checksum }) {
  const { error } = await supabase.rpc('run_sql', {
    sql: `
      update _deskra_migrations
      set checksum = ${sqlLiteral(checksum)}
      where filename = ${sqlLiteral(filename)}
    `,
  })

  if (error) {
    console.error(`  ✗  Gagal catat checksum ${filename}: ${error.message}`)
    return false
  }

  console.log(`  ✓  Checksum dicatat: ${filename}`)
  return true
}

async function runMigration(file) {
  const { filename, sql, checksum } = file
  console.log(`  ▶  Running: ${filename}`)

  const { error } = await supabase.rpc('run_sql', { sql })

  if (error) {
    console.error(`  ✗  Gagal: ${error.message}`)
    return false
  }

  const { error: insertError } = await supabase.rpc('run_sql', {
    sql: `
      insert into _deskra_migrations (filename, checksum)
      values (${sqlLiteral(filename)}, ${sqlLiteral(checksum)})
    `,
  })

  if (insertError) {
    console.error(`  ✗  Gagal catat migrasi: ${insertError.message}`)
    return false
  }

  console.log(`  ✓  Selesai: ${filename}`)
  return true
}

async function main() {
  console.log('\n🌿 Deskra Migration Runner\n')
  console.log(`📡 Connecting to: ${supabaseUrl}\n`)

  await ensureMigrationTable()
  const applied = await getAppliedMigrations()

  const localFiles = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(filename => {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
      return { filename, sql, checksum: createMigrationChecksum(sql) }
    })

  const { pending, checksumBackfills, checksumMismatches } = planMigrations({ applied, localFiles })

  if (checksumMismatches.length > 0) {
    console.error('❌  Ada migration yang sudah pernah dijalankan tetapi isi file lokalnya berubah:\n')
    checksumMismatches.forEach(row => {
      console.error(`  • ${row.filename}`)
      console.error(`    DB    : ${row.appliedChecksum}`)
      console.error(`    Lokal : ${row.localChecksum}`)
    })
    console.error('\n    Buat migration baru untuk perubahan schema, jangan edit file migration yang sudah tercatat.\n')
    process.exit(1)
  }

  for (const row of checksumBackfills) {
    const ok = await backfillMigrationChecksum(row)
    if (!ok) process.exit(1)
  }

  if (pending.length === 0) {
    console.log('✅  Semua migrasi sudah up to date.\n')
    return
  }

  console.log(`📋  ${pending.length} migrasi pending:\n`)

  let success = 0
  for (const file of pending) {
    const ok = await runMigration(file)
    if (ok) success++
    else break
  }

  console.log(`\n${success === pending.length ? '✅' : '⚠️ '} ${success}/${pending.length} migrasi berhasil dijalankan.\n`)
}

main()
