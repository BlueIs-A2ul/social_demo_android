const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')

const htmlFiles = fs
  .readdirSync(wwwDir)
  .filter(file => file.endsWith('.html'))
  .map(file => path.join(wwwDir, file))

const capacitorConfigPath = path.join(root, 'capacitor.config.json')

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

if (fs.existsSync(capacitorConfigPath)) {
  const capacitorConfig = JSON.parse(
    fs.readFileSync(capacitorConfigPath, 'utf8'),
  )
  const appStartPath = capacitorConfig.server?.appStartPath

  if (appStartPath && !appStartPath.startsWith('/')) {
    console.error(
      `server.appStartPath must start with "/" so Capacitor resolves it under localhost: ${appStartPath}`,
    )
    process.exit(1)
  }
}

const behaviorChecks = [
  {
    file: 'www/profile.html',
    forbidden: /location\.href = 'owner_profile\.html'/,
    message: 'profile room actions should show an in-place construction toast',
  },
]

behaviorChecks.forEach(check => {
  const filePath = path.join(root, check.file)
  const text = fs.readFileSync(filePath, 'utf8')
  if (check.forbidden.test(text)) {
    console.error(`${check.file}: ${check.message}`)
    process.exit(1)
  }
})

const roomListText = fs.readFileSync(path.join(root, 'www/room_list.html'), 'utf8')
const selectedRoomCards = [
  {
    name: '我的房间',
    start: '<!-- 房间 1: 青铜之门 -->',
    end: '<!-- 房间 2: 娜美的房间 -->',
  },
  {
    name: '直播间',
    start: '<!-- 房间 3: 直播间 -->',
    end: '<!-- 房间 4: 我的播客 -->',
  },
  {
    name: '我的播客',
    start: '<!-- 房间 4: 我的播客 -->',
    end: '<!-- 房间 4: 无 (占位) -->',
  },
]

selectedRoomCards.forEach(card => {
  const start = roomListText.indexOf(card.start)
  const end = roomListText.indexOf(card.end)
  const block = roomListText.slice(start, end)
  if (
    start === -1 ||
    end === -1 ||
    block.includes(
      `onclick="window.location.href='panorama_room.html?from=room_list'"`,
    )
  ) {
    console.error(
      `www/room_list.html: ${card.name} should show an in-place construction toast`,
    )
    process.exit(1)
  }
})

console.log('Responsive layout scan passed.')
