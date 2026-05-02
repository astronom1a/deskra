// One-shot script: add Tailwind dark: variants to non-print pages.
// Run: node scripts/add-dark-variants.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const files = [
  'src/pages/Dashboard.jsx',
  'src/pages/DatabasePejabat.jsx',
  'src/pages/DatabaseTarif.jsx',
  'src/pages/DatabaseTenaga.jsx',
  'src/pages/DetailPekerjaan.jsx',
  'src/pages/DkhpSkshhk.jsx',
  'src/pages/MainLink.jsx',
  'src/pages/RegisterKapling.jsx',
  'src/pages/TumpukKapling.jsx',
]

// Order matters: more specific (hover:, ring-, divide-, border-) BEFORE bare "bg-"/"text-"
// Each entry: [classToken, darkCounterpart]
const map = [
  // hover backgrounds
  ['hover:bg-gray-50',  'dark:hover:bg-gray-800'],
  ['hover:bg-gray-100', 'dark:hover:bg-gray-700'],
  ['hover:bg-gray-200', 'dark:hover:bg-gray-700'],
  ['hover:bg-white',    'dark:hover:bg-gray-700'],
  // hover text
  ['hover:text-gray-900', 'dark:hover:text-gray-100'],
  ['hover:text-gray-700', 'dark:hover:text-gray-200'],
  // divides
  ['divide-gray-100', 'dark:divide-gray-800'],
  ['divide-gray-200', 'dark:divide-gray-700'],
  // borders
  ['border-gray-100', 'dark:border-gray-800'],
  ['border-gray-200', 'dark:border-gray-700'],
  ['border-gray-300', 'dark:border-gray-700'],
  // rings
  ['ring-gray-200', 'dark:ring-gray-700'],
  ['ring-gray-300', 'dark:ring-gray-700'],
  // backgrounds
  ['bg-white',     'dark:bg-gray-800'],
  ['bg-gray-50',   'dark:bg-gray-900'],
  ['bg-gray-100',  'dark:bg-gray-800'],
  ['bg-gray-200',  'dark:bg-gray-700'],
  // text
  ['text-gray-900', 'dark:text-gray-100'],
  ['text-gray-800', 'dark:text-gray-100'],
  ['text-gray-700', 'dark:text-gray-200'],
  ['text-gray-600', 'dark:text-gray-300'],
  ['text-gray-500', 'dark:text-gray-400'],
  ['text-gray-400', 'dark:text-gray-500'],
  ['text-gray-300', 'dark:text-gray-600'],
  // placeholders
  ['placeholder-gray-400', 'dark:placeholder-gray-500'],
  ['placeholder-gray-500', 'dark:placeholder-gray-400'],
]

// Match the class as a whole token: must NOT be preceded by `dark:` or `-`,
// and must NOT be followed by `-`, `/`, or `:`.
function buildRegex(token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\w:-])${escaped}(?![\\w/:-])`, 'g')
}

let totalAdded = 0
for (const rel of files) {
  const path = resolve(process.cwd(), rel)
  let src = readFileSync(path, 'utf8')
  let added = 0
  for (const [token, dark] of map) {
    const re = buildRegex(token)
    src = src.replace(re, (match, offset, full) => {
      // Avoid double-add: skip if the dark counterpart already adjacent (within 60 chars after).
      const tail = full.slice(offset, offset + match.length + 80)
      if (tail.includes(dark)) return match
      added++
      return `${match} ${dark}`
    })
  }
  writeFileSync(path, src)
  totalAdded += added
  console.log(`${rel}: +${added}`)
}
console.log(`Total added: ${totalAdded}`)
