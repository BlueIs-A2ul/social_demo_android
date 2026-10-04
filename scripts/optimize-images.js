const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const WWW = process.argv.find(a => a.startsWith('--root='))?.slice(7) || path.resolve(__dirname, '..', 'www')
const APPLY = process.argv.includes('--apply')
const REPORT = process.argv.find(a => a.startsWith('--report='))?.slice(9)

const ICON_DIRS = ['/icon/', '/card/', '/coin/', '/vip/', '/mascot/', '/gender/', '/数字vip/', '/标志/']
const FULLSCREEN = ['启动页背景', '雷达地图', '我的主页-封面', '社区房间横幅', 'AI背景纹理', '智慧空间海报']

const capFor = rel => {
  if (ICON_DIRS.some(d => rel.includes(d))) return 512
  if (FULLSCREEN.some(n => rel.includes(n))) return 2048
  return 1600
}

const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name)
    if (e.isDirectory()) walk(full)
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) files.push(full)
  }
})(path.join(WWW, 'assets'))

const MB = x => (x / 1048576).toFixed(2)

;(async () => {
  let totalBefore = 0
  let totalAfter = 0
  let changed = 0
  const rows = []

  for (const file of files) {
    const rel = path.relative(WWW, file).split(path.sep).join('/')
    const before = fs.statSync(file).size
    totalBefore += before
    let after = before
    let note = ''

    try {
      const meta = await sharp(file).metadata()
      const cap = capFor(rel)
      const needResize = Math.max(meta.width || 0, meta.height || 0) > cap
      const resized = () => sharp(file).resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true })

      const candidates = []
      if (meta.format === 'png') {
        candidates.push(['png-palette', await resized().png({ palette: true, quality: 85, compressionLevel: 9, effort: 10, force: true }).toBuffer()])
        candidates.push(['png-truecolor', await resized().png({ compressionLevel: 9, effort: 10, force: true }).toBuffer()])
      } else if (meta.format === 'jpeg') {
        candidates.push(['jpeg-mozjpeg', await resized().jpeg({ quality: 82, mozjpeg: true }).toBuffer()])
      } else if (meta.format === 'webp') {
        candidates.push(['webp', await resized().webp({ quality: 82, effort: 5 }).toBuffer()])
      }
      candidates.sort((a, b) => a[1].length - b[1].length)
      const best = candidates[0]
      if (best && best[1].length < before * 0.95) {
        if (APPLY) {
          const tmp = file + '.opt.tmp'
          fs.writeFileSync(tmp, best[1])
          try {
            fs.renameSync(tmp, file)
          } catch (e) {
            fs.copyFileSync(tmp, file)
            fs.unlinkSync(tmp)
          }
          after = fs.statSync(file).size
        } else {
          after = best[1].length
        }
        note = `${best[0]}${needResize ? ` +resize>${cap}` : ''}`
        changed++
      }
    } catch (e) {
      note = 'SKIP ' + e.message.slice(0, 60)
    }

    totalAfter += after
    if (after < before) rows.push({ rel, before, after, note })
  }

  rows.sort((a, b) => b.before - b.after - (a.before - a.after))
  console.log(`${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${files.length} images, ${changed} optimized`)
  console.log(`total: ${MB(totalBefore)} MB -> ${MB(totalAfter)} MB (-${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`)
  console.log('top savings:')
  for (const r of rows.slice(0, 25)) console.log(`  ${MB(r.before).padStart(6)} -> ${MB(r.after).padStart(6)} MB  ${r.note}  ${r.rel}`)
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(rows, null, 1))
})()
