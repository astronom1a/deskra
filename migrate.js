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

async function ensureMigrationTable() {
  // Cukup pastikan tabel ada — sudah dibuat via bootstrap.sql
  const { error } = await supabase
    .from('_deskra_migrations')
    .select('id')
    .limit(1)

  if (error) {
    console.error('❌  Tabel _deskra_migrations belum ada.')
    console.error('    Jalankan dulu: supabase/bootstrap.sql di Supabase SQL Editor.')
    process.exit(1)
  }
}

async function getAppliedMigrations() {
  const { data, error } = await supabase
    .from('_deskra_migrations')
    .select('filename')
    .order('filename')

  if (error) return []
  return data.map(d => d.filename)
}

async function runMigration(filename, sql) {
  console.log(`  ▶  Running: ${filename}`)

  const { error } = await supabase.rpc('run_sql', { sql })

  if (error) {
    console.error(`  ✗  Gagal: ${error.message}`)
    return false
  }

  const { error: insertError } = await supabase
    .from('_deskra_migrations')
    .insert({ filename })

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

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const pending = files.filter(f => !applied.includes(f))

  if (pending.length === 0) {
    console.log('✅  Semua migrasi sudah up to date.\n')
    return
  }

  console.log(`📋  ${pending.length} migrasi pending:\n`)

  let success = 0
  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    const ok = await runMigration(file, sql)
    if (ok) success++
    else break
  }

  console.log(`\n${success === pending.length ? '✅' : '⚠️ '} ${success}/${pending.length} migrasi berhasil dijalankan.\n`)
}

main()
