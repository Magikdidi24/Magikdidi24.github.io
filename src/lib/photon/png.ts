/*
  Minimal PNG encoder for build-time use (poster images, Open Graph image).
  Pure: the caller passes a zlib deflate, for example `zlib.deflateSync` from
  node:zlib, so this module never imports Node or touches the DOM.
*/

/** Nearest-neighbor upscale of RGBA pixels by an integer factor. */
export function upscale(rgba: Uint8ClampedArray, width: number, height: number, factor: number): Uint8ClampedArray {
  const w = width * factor;
  const out = new Uint8ClampedArray(w * height * factor * 4);
  for (let y = 0; y < height * factor; y++) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < w; x++) {
      const s = (sy * width + Math.floor(x / factor)) * 4;
      const o = (y * w + x) * 4;
      out[o] = rgba[s];
      out[o + 1] = rgba[s + 1];
      out[o + 2] = rgba[s + 2];
      out[o + 3] = rgba[s + 3];
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Encode opaque RGBA pixels as an 8-bit RGB PNG. Each row gets the filter
 * (None, Sub, Up or Paeth) with the smallest sum of absolute residuals.
 */
export function encodePng(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  deflate: (data: Uint8Array) => Uint8Array,
): Uint8Array {
  const stride = width * 3;
  const raw = new Uint8Array((stride + 1) * height);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  const candidate = new Uint8Array(stride);
  const best = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      cur[x * 3] = rgba[s];
      cur[x * 3 + 1] = rgba[s + 1];
      cur[x * 3 + 2] = rgba[s + 2];
    }
    let bestFilter = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      if (f === 3) continue; /* Average rarely wins here; skip it. */
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? cur[i - 3] : 0;
        const b = y > 0 ? prev[i] : 0;
        const c = i >= 3 && y > 0 ? prev[i - 3] : 0;
        const predicted = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : paeth(a, b, c);
        const v = (cur[i] - predicted) & 0xff;
        candidate[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = f;
        best.set(candidate);
      }
    }
    raw[y * (stride + 1)] = bestFilter;
    raw.set(best, y * (stride + 1) + 1);
    prev.set(cur);
  }

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; /* bit depth */
  header[9] = 2; /* color type: RGB */
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [signature, chunk('IHDR', header), chunk('IDAT', deflate(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
