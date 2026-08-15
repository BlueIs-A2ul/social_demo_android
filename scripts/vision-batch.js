// 批量识别 用户vip等级 目录下所有图片的五角星数量
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ZHIPU_API_KEY;
const MODEL = process.env.ZHIPU_VISION_MODEL || 'glm-4.6v-flash';
const DIR = process.argv[2];

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callVision(imagePath, question) {
  const mime = MIME[path.extname(imagePath).toLowerCase()] || 'image/jpeg';
  const b64 = fs.readFileSync(imagePath).toString('base64');
  const body = {
    model: MODEL,
    messages: [
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        { type: 'text', text: question },
      ]},
    ],
    stream: false,
  };
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const content = data?.choices?.[0]?.message?.content;
      if (content) return content;
      lastError = new Error(`模型返回空内容: ${JSON.stringify(data).slice(0, 300)}`);
    } else if (res.status === 429 && attempt < 5) {
      lastError = new Error(`429 限流: ${data?.error?.message || ''}`);
      await sleep(5000 * (attempt + 1)); // 5s/10s/15s/20s/25s
    } else {
      lastError = new Error(`智谱 API 错误 ${res.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 300)}`);
      break;
    }
  }
  throw lastError || new Error('未知错误');
}

const QUESTION = '请仔细看这张图片。回答：图中有几个五角星（★/☆）？请只输出一个数字（如：3），然后再用一句话说明五角星的颜色和大致位置。不要输出其他内容。';

(async () => {
  const files = fs.readdirSync(DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  console.log(`共 ${files.length} 张图，开始识别...\n`);
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const full = path.join(DIR, f);
    console.log(`[${i + 1}/${files.length}] ${f} ...`);
    try {
      const text = await callVision(full, QUESTION);
      results.push({ file: f, text });
      console.log(`  -> ${text}\n`);
    } catch (e) {
      console.log(`  !! 失败: ${e.message}\n`);
      results.push({ file: f, text: `ERROR: ${e.message}` });
    }
    if (i < files.length - 1) await sleep(3000);
  }
  fs.writeFileSync(path.join(DIR, '_识别结果.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('完成，结果已写入 _识别结果.json');
})();
