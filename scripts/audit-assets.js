const fs = require('fs')
const path = require('path')

const WWW = process.argv[2] || path.resolve(__dirname, '..', 'www')

const assets = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else assets.push(full)
  }
})(path.join(WWW, 'assets'))

const texts = []
;(function walk(dir, insideAssets) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      walk(full, insideAssets || full === path.join(WWW, 'assets'))
    } else if (/\.(html|js|css|json|svg)$/i.test(e.name)) {
      texts.push(fs.readFileSync(full, 'utf8'))
    }
  }
})(WWW, false)
const blob = texts.join('\n')

const dynPrefixes = new Set()
for (const m of blob.matchAll(/assets\/[^\s"'`)]*\$\{[^}]+\}[^\s"'`)]*/g)) {
  const s = m[0]
  const idx = s.indexOf('${')
  const prefix = s.slice(0, idx)
  const rest = s.slice(s.indexOf('}') + 1)
  dynPrefixes.add(prefix + '\u0000' + rest)
}

function classify(a) {
  const posix = path.relative(WWW, a).split(path.sep).join('/')
  if (blob.includes(posix)) return 'full'
  const base = path.basename(a)
  if (blob.includes(base)) return 'basename'
  const stem = base.replace(/\.[^.]+$/, '')
  if (stem.length >= 4 && blob.includes(stem)) return 'stem'
  for (const p of dynPrefixes) {
    const [prefix, suffix] = p.split('\u0000')
    if (posix.startsWith(prefix) && posix.endsWith(suffix) && posix.length > prefix.length + suffix.length) return 'dynamic'
  }
  return 'unused'
}

const result = assets.map(a => ({ rel: path.relative(WWW, a).split(path.sep).join('/'), size: fs.statSync(a).size, use: classify(a) }))
const byUse = {}
for (const r of result) (byUse[r.use] = byUse[r.use] || []).push(r)

const MB = x => (x / 1048576).toFixed(1)
for (const k of ['full', 'basename', 'stem', 'dynamic', 'unused']) {
  const arr = byUse[k] || []
  console.log(`${k}: ${arr.length} files, ${MB(arr.reduce((s, r) => s + r.size, 0))} MB`)
}

console.log('\n--- dynamic patterns ---')
for (const p of dynPrefixes) console.log('  ' + p.replace('\u0000', '${...}'))

console.log('\n--- unused (top 40 by size) ---')
const unused = (byUse.unused || []).sort((a, b) => b.size - a.size)
for (const u of unused.slice(0, 40)) console.log(`${MB(u.size).padStart(6)} MB  ${u.rel}`)

const outFile = process.argv[3]
if (outFile) {
  fs.writeFileSync(outFile, JSON.stringify({ byUse, dynPrefixes: [...dynPrefixes] }, null, 1))
  console.log(`\nJSON report: ${outFile}`)
}
