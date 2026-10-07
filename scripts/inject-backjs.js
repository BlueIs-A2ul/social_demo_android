const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const SNIPPET = '<script src="assets/vendor/back.js"></script>'

const files = fs
  .readdirSync(wwwDir)
  .filter(file => file.endsWith('.html') && file !== 'index.html')

let injected = 0
let skipped = 0
const failed = []

for (const file of files) {
  const full = path.join(wwwDir, file)
  let html = fs.readFileSync(full, 'utf8')
  if (html.includes('assets/vendor/back.js')) {
    skipped++
    continue
  }
  const idx = html.lastIndexOf('</body>')
  if (idx === -1) {
    failed.push(file)
    continue
  }
  const before = html.slice(0, idx)
  const after = html.slice(idx)
  const separator = before.endsWith('\n') ? '' : '\n'
  fs.writeFileSync(full, before + separator + SNIPPET + '\n' + after)
  injected++
}

console.log('injected: ' + injected + ', skipped: ' + skipped)
if (failed.length) {
  console.log('missing </body>: ' + failed.join(', '))
  process.exit(1)
}
