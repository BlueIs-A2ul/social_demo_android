const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const indexFile = path.join(wwwDir, 'index.html')
const mainActivity = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'metasocial',
  'demo',
  'MainActivity.java'
)

const htmlFiles = fs.readdirSync(wwwDir).filter(f => f.endsWith('.html'))
let failures = 0

function fail(name, details) {
  failures++
  console.log('FAIL: ' + name)
  ;(details || []).forEach(d => console.log('  - ' + d))
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

// 1. back.js 注入：除 index.html 外全部页面注入，index.html 不注入
const missingInject = htmlFiles.filter(
  f => f !== 'index.html' && !read(path.join(wwwDir, f)).includes('assets/vendor/back.js')
)
if (missingInject.length) fail('back.js 注入完整性', missingInject)

// 2. 无残留旧返回写法
const legacy = []
for (const f of htmlFiles) {
  const s = read(path.join(wwwDir, f))
  if (/onclick="history\.back\(\)"/.test(s)) legacy.push(f + ': onclick=history.back()')
  if (/javascript:goBack\(\)/.test(s)) legacy.push(f + ': javascript:goBack()')
  if (/goBack\('/.test(s)) legacy.push(f + ': goBack(...)')
}
if (legacy.length) fail('旧返回写法残留', legacy)

// 3. 返回按钮都走 appBack（publish.html 的 my-back 为页内视图切换，白名单）
const backLabelLegacy = []
for (const f of htmlFiles) {
  const s = read(path.join(wwwDir, f))
  const tags = s.match(/<[^>]*aria-label="返回"[^>]*>/g) || []
  for (const tag of tags) {
    if (!tag.includes('appBack()') && !tag.includes('switchPublishView')) {
      backLabelLegacy.push(f + ': ' + tag.slice(0, 80))
    }
  }
}
if (backLabelLegacy.length) fail('返回按钮未走 appBack', backLabelLegacy)

// 4. 浮层注册完整性
const overlayPages = [
  'room_list', 'radar', 'ai_voice', 'message_center', 'profile', 'group_chat',
  'publish', 'square', 'owner_room', 'owner_profile', 'favorites',
  'history_favorites', 'my_contacts', 'friend_contacts', 'radar_search',
  'radar_nearby', 'merchant_shop', 'radar_merchant', 'hot_products_virtual'
]
const missingRegister = overlayPages.filter(
  n => !read(path.join(wwwDir, n + '.html')).includes('BackLayers.register')
)
if (missingRegister.length) fail('浮层注册缺失', missingRegister)

// 5. 主壳协议
const indexHtml = read(indexFile)
if (!indexHtml.includes('tabStack')) fail('index.html 缺少 tabStack')
if (!indexHtml.includes('window.__appBack')) fail('index.html 缺少 __appBack')
if (indexHtml.includes('frameDepth')) fail('index.html 残留 frameDepth')
if (!indexHtml.includes('location.replace(url)')) fail('index.html Tab 切换未用 replace')

// 6. 原生薄中继
const java = read(mainActivity)
if (java.includes('canGoBack')) fail('MainActivity 残留 canGoBack')
if (!java.includes('__appBack')) fail('MainActivity 缺少 __appBack 协议')
if (!java.includes('moveTaskToBack')) fail('MainActivity 缺少 moveTaskToBack')

// 7. 引导流程 replace
const replacePoints = [
  ['splash.html', "location.replace('login.html')"],
  ['login.html', "location.replace('index.html')"],
  ['onboarding_interests.html', "location.replace('index.html')"],
  ['profile_init_resume.html', "location.replace('index.html')"],
  ['profile_init_idcard.html', "location.replace('profile_init_resume.html')"],
  ['group_create.html', "location.replace('group_settings.html?from=group_create')"]
]
const missingReplace = replacePoints
  .filter(([f, s]) => !read(path.join(wwwDir, f)).includes(s))
  .map(([f]) => f)
if (missingReplace.length) fail('流程 replace 缺失', missingReplace)

if (failures) {
  console.log('Back navigation scan failed: ' + failures)
  process.exit(1)
}
console.log('Back navigation scan passed.')
