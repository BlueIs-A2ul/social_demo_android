const fs = require('fs')
const path = require('path')
const https = require('https')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const fontsDir = path.join(wwwDir, 'assets', 'fonts')
const vendorDir = path.join(wwwDir, 'assets', 'vendor')

fs.mkdirSync(fontsDir, { recursive: true })

const cssUrl =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'

function get(url, headers) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return resolve(get(new URL(res.headers.location, url).href, headers))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function main() {
  const ua = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  }

  const css = (await get(cssUrl, ua)).toString('utf8')
  const fontRe = /https:\/\/fonts\.gstatic\.com\/[^)]+/g
  const urls = [...new Set([...css.matchAll(fontRe)].map(m => m[0]))]

  for (const url of urls) {
    const name = url.split('/').pop()
    const dest = path.join(fontsDir, name)
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, await get(url, ua))
    }
  }

  const localCss = css.replace(fontRe, m => '../fonts/' + m.split('/').pop())
  fs.writeFileSync(path.join(vendorDir, 'inter.css'), localCss)

  const htmlFiles = fs.readdirSync(wwwDir).filter(f => f.endsWith('.html'))
  let updated = 0
  for (const file of htmlFiles) {
    const filePath = path.join(wwwDir, file)
    const text = fs.readFileSync(filePath, 'utf8')
    const next = text.replace(
      /@import url\(['"]?https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:[^)'"]*['"]?\);/g,
      `@import url('assets/vendor/inter.css');`,
    )
    if (next !== text) {
      fs.writeFileSync(filePath, next)
      updated++
    }
  }

  console.log(`Fonts downloaded: ${urls.length}`)
  console.log(`HTML files updated: ${updated}`)
  console.log(`inter.css written: ${localCss.length} bytes`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
