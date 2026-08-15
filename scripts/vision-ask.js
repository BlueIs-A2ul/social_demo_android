// 调用智谱视觉模型，统计图中五角星数量（复用 vision-eye 逻辑）
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ZHIPU_API_KEY;
const MODEL = process.env.ZHIPU_VISION_MODEL || 'glm-4.6v-flash';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callVision(imagePath, question) {
  const abs = path.resolve(imagePath);
  if (!fs.existsSync(abs)) throw new Error(`图片不存在: ${abs}`);
  const mime = MIME[path.extname(abs).toLowerCase()] || 'image/jpeg';
  const b64 = fs.readFileSync(abs).toString('base64');
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
  for (let attempt = 0; attempt < 4; attempt++) {
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
    } else if (res.status === 429 && attempt < 3) {
      lastError = new Error(`429 限流: ${data?.error?.message || ''}`);
      await sleep(2000 * Math.pow(2, attempt));
    } else {
      lastError = new Error(`智谱 API 错误 ${res.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 300)}`);
      break;
    }
  }
  throw lastError || new Error('未知错误');
}

const file = process.argv[2];
const question = process.argv[3] || '请仔细、完整地描述这张图片，供一个只能读文字的纯文本模型理解：1) 图片里的所有物体、人物、场景布局；2) 颜色、光线、风格等视觉细节；3) 图中出现的所有文字，逐字 OCR 出来。描述要详尽具体，不要遗漏细节。';

callVision(file, question)
  .then((t) => { console.log('=== RESULT ==='); console.log(t); })
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
