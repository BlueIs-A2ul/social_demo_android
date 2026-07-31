const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')

const htmlFiles = fs
  .readdirSync(wwwDir)
  .filter(file => file.endsWith('.html'))
  .map(file => path.join(wwwDir, file))

const checks = [
  {
    name: 'fixed prototype viewport meta',
    pattern: /<meta[^>]+content=["'][^"']*(?:width=(?:393|852)|height=(?:393|852))[^"']*["'][^>]*>/gi,
  },
  {
    name: 'fixed 393px CSS width',
    pattern: /\bwidth\s*:\s*393px\b/gi,
  },
  {
    name: 'fixed 852px CSS height',
    pattern: /\bheight\s*:\s*852px\b/gi,
  },
  {
    name: 'fixed 852px CSS width',
    pattern: /\bwidth\s*:\s*852px\b/gi,
  },
  {
    name: 'fixed 393px CSS height',
    pattern: /\bheight\s*:\s*393px\b/gi,
  },
  {
    name: 'static mobile viewport height',
    pattern: /\b(?:min-height|height)\s*:\s*100vh\b/gi,
  },
  {
    name: 'fixed 393px Tailwind width',
    pattern: /(^|[\s"'])w-\[393px\](?=$|[\s"'])/g,
  },
  {
    name: 'fixed 852px Tailwind height',
    pattern: /(^|[\s"'])h-\[852px\](?=$|[\s"'])/g,
  },
]

const failures = []

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)

  checks.forEach(check => {
    lines.forEach((line, index) => {
      if (check.pattern.test(line)) {
        failures.push({
          file: path.relative(root, file),
          line: index + 1,
          name: check.name,
          text: line.trim(),
        })
      }
      check.pattern.lastIndex = 0
    })
  })
}

if (failures.length > 0) {
  console.error('Found fixed prototype viewport dimensions:')
  failures.forEach(failure => {
    console.error(
      `${failure.file}:${failure.line} ${failure.name}: ${failure.text}`,
    )
  })
  process.exit(1)
}

console.log('Responsive layout scan passed.')
