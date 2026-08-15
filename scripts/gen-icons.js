// 生成 Android launcher 图标：把源 PNG 缩放到各密度尺寸
// 用法: node gen-icons.js <源png> <输出目录>
// 输出: ic_launcher.png / ic_launcher_round.png / ic_launcher_foreground.png (各密度)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG 解码 ----------
function decodePNG(file) {
  const buf = fs.readFileSync(file);
  let off = 8, w, h, bitDepth, colorType;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (colorType !== 6 && colorType !== 2) throw new Error('unsupported colorType ' + colorType);
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows = [];
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const row = Buffer.from(raw.slice(pos, pos + stride)); pos += stride;
    const prev = y > 0 ? rows[y - 1] : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
      }
      row[x] = v & 0xff;
    }
    rows.push(row);
  }
  // 输出 RGBA8 平面数据
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = x * bpp;
      const di = (y * w + x) * 4;
      out[di] = rows[y][si];
      out[di + 1] = rows[y][si + 1];
      out[di + 2] = rows[y][si + 2];
      out[di + 3] = colorType === 6 ? rows[y][si + 3] : 255;
    }
  }
  return { w, h, data: out };
}

// ---------- 面积平均缩放（box filter）----------
function resize(src, sw, sh, dw, dh, offsetX, offsetY) {
  // 目标画布 dw*dh，内容区域从 (offsetX,offsetY) 开始 src 缩放
  const out = Buffer.alloc(dw * dh * 4); // 全透明
  const sx = src.w / (offsetX + sw);   // 未用
  // 内容目标矩形 = [offsetX, offsetX+sw) x [offsetY, offsetY+sh)
  for (let dy = 0; dy < sh; dy++) {
    const sy0 = dy * src.h / sh;
    const sy1 = (dy + 1) * src.h / sh;
    for (let dx = 0; dx < sw; dx++) {
      const sx0 = dx * src.w / sw;
      const sx1 = (dx + 1) * src.w / sw;
      let r = 0, g = 0, b = 0, a = 0;
      let y0 = Math.floor(sy0), y1 = Math.min(src.h, Math.ceil(sy1));
      let x0 = Math.floor(sx0), x1 = Math.min(src.w, Math.ceil(sx1));
      let count = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * src.w + sx) * 4;
          const alpha = src.data[i + 3];
          // 预乘加权平均，避免半透明边缘发黑
          r += src.data[i] * alpha;
          g += src.data[i + 1] * alpha;
          b += src.data[i + 2] * alpha;
          a += alpha;
          count++;
        }
      }
      const oi = ((offsetY + dy) * dw + (offsetX + dx)) * 4;
      if (a > 0) {
        out[oi] = Math.round(r / a);
        out[oi + 1] = Math.round(g / a);
        out[oi + 2] = Math.round(b / a);
        out[oi + 3] = Math.round(a / count);
      }
    }
  }
  return out;
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 主流程 ----------
const srcFile = process.argv[2];
const outDir = process.argv[3];
const src = decodePNG(srcFile);

// 各密度尺寸
const sizes = {
  mdpi: { icon: 48, fg: 108 },
  hdpi: { icon: 72, fg: 162 },
  xhdpi: { icon: 96, fg: 216 },
  xxhdpi: { icon: 144, fg: 324 },
  xxxhdpi: { icon: 192, fg: 432 },
};

// 内容占画布比例
const RATIO_ICON = 0.90;      // legacy 方形图标
const RATIO_ROUND = 0.80;     // 圆形图标（内切圆安全）
const RATIO_FG = 0.66;        // 自适应前景安全区（66%）

for (const [dpi, { icon, fg }] of Object.entries(sizes)) {
  const dir = path.join(outDir, 'mipmap-' + dpi);
  fs.mkdirSync(dir, { recursive: true });

  // 源图接近正方形（1280x1307），取长边适配，保持比例居中
  const scaleTo = (size, ratio) => {
    const long = Math.max(src.w, src.h);
    const content = Math.round(size * ratio);
    const cw = Math.round(src.w * content / long);
    const ch = Math.round(src.h * content / long);
    return { cw, ch, ox: Math.round((size - cw) / 2), oy: Math.round((size - ch) / 2) };
  };

  // ic_launcher.png
  const L = scaleTo(icon, RATIO_ICON);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'),
    encodePNG(icon, icon, resize(src, L.cw, L.ch, icon, icon, L.ox, L.oy)));

  // ic_launcher_round.png
  const R = scaleTo(icon, RATIO_ROUND);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'),
    encodePNG(icon, icon, resize(src, R.cw, R.ch, icon, icon, R.ox, R.oy)));

  // ic_launcher_foreground.png（透明底，内容在 66% 安全区）
  const F = scaleTo(fg, RATIO_FG);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'),
    encodePNG(fg, fg, resize(src, F.cw, F.ch, fg, fg, F.ox, F.oy)));

  console.log(dpi + ': icon=' + icon + ' fg=' + fg + ' done');
}
console.log('ALL DONE');
