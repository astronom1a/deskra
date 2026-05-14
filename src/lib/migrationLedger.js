import { createHash } from 'node:crypto'

export function createMigrationChecksum(sql) {
  return createHash('sha256').update(String(sql || ''), 'utf8').digest('hex')
}

export function planMigrations({ applied = [], localFiles = [] } = {}) {
  const appliedByFilename = new Map(applied.map(row => [row.filename, row]))
  const pending = []
  const checksumBackfills = []
  const checksumMismatches = []

  for (const file of localFiles) {
    const row = appliedByFilename.get(file.filename)
    if (!row) {
      pending.push(file)
      continue
    }

    if (!row.checksum) {
      checksumBackfills.push({ filename: file.filename, checksum: file.checksum })
      continue
    }

    if (row.checksum !== file.checksum) {
      checksumMismatches.push({
        filename: file.filename,
        appliedChecksum: row.checksum,
        localChecksum: file.checksum,
      })
    }
  }

  return { pending, checksumBackfills, checksumMismatches }
}
