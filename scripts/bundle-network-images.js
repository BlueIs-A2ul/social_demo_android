const fs = require('fs')
const path = require('path')
const https = require('https')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const outDir = path.join(wwwDir, 'assets', 'packaged')
const base = 'assets/packaged/'

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const htmlFiles = fs
  .readdirSync(wwwDir)
  .filter(file => file.endsWith('.html'))

const urlRe = /https:\/\/modao\.cc\/agent-py\/media\/[^"'()\s>]+/g

const filesText = new Map()
for (const file of htmlFiles) {
  filesText.set(file, fs.readFileSync(path.join(wwwDir, file), 'utf8'))
}

const urls = new Set()
for (const text of filesText.values()) {
  for (const m of text.matchAll(urlRe)) {
    const u = m[0].replace(/[)",;\s]+$/, '')
    urls.add(u)
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(download(new URL(res.headers.location, url).href, dest))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const tmp = dest + '.tmp'
      const ws = fs.createWriteStream(tmp)
      res.pipe(ws)
      ws.on('finish', () => {
        ws.close(() => {
          fs.renameSync(tmp, dest)
          resolve()
        })
      })
      ws.on('error', err => {
        fs.unlinkSync(tmp)
        reject(err)
      })
    })
    req.on('error', reject)
  })
}

async function main() {
  const downloaded = []
  const failures = []

  const workers = 8
  const queue = [...urls]
  let next = 0

  async function worker() {
    while (next < queue.length) {
      const url = queue[next++]
      const name = url.split('/').pop()
      const dest = path.join(outDir, name)
      if (fs.existsSync(dest)) {
        downloaded.push(name)
        continue
      }
      try {
        await download(url, dest)
        downloaded.push(name)
      } catch (err) {
        failures.push({ url, error: err.message })
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, worker))

  console.log(`Images downloaded: ${downloaded.length}/${queue.length}`)
  if (failures.length) {
    console.log('Failures:')
    for (const f of failures) console.log(`  ${f.url} -> ${f.error}`)
    process.exitCode = 1
    return
  }

  let totalReplaced = 0
  for (const [file, text] of filesText) {
    let replaced = 0
    const rewritten = text.replace(urlRe, m => {
      const u = m.replace(/[)",;\s]+$/, '')
      replaced++
      return base + u.split('/').pop()
    })
    if (replaced > 0) {
      fs.writeFileSync(path.join(wwwDir, file), rewritten)
      totalReplaced += replaced
    }
  }
  console.log(`References rewritten: ${totalReplaced}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
