// Unit tests for the pure maths of the cutout engine (js/cutout.js): blur, resize, guided filter, clean-up, refine, bbox.
//   node cutout.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({ console, Math, Float32Array, Uint8Array, Int32Array, Object, Array });
vm.runInContext('var window = globalThis; Stick = {};', ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', '..', 'js', 'cutout.js'), 'utf8'), ctx);
const M = ctx.Stick.cutout.math;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const near = (a, b, e = 1e-4) => Math.abs(a - b) <= e;

// ---- boxBlur: flat stays flat (edges are normalised, not darkened), a spike spreads and keeps its mass
{
  const flat = new Float32Array(20 * 10).fill(0.7), b = M.boxBlur(flat, 20, 10, 3);
  ok([...b].every(v => near(v, 0.7)), 'blur of a flat image is the same flat image (borders are not darkened)');
  const spike = new Float32Array(21 * 21); spike[10 * 21 + 10] = 441;
  const s = M.boxBlur(spike, 21, 21, 2);
  ok(near(s[10 * 21 + 10], 441 / 25, 1e-3) && s[10 * 21 + 13] === 0, 'a spike spreads over the 5x5 window and no further');
  ok(M.boxBlur(spike, 21, 21, 0)[10 * 21 + 10] === 441, 'radius 0 is a copy');
}
// ---- resizeBilinear
{
  const src = Float32Array.from([0, 1, 1, 0]);
  const up = M.resizeBilinear(src, 2, 2, 4, 4);
  ok(up.length === 16 && up[0] === 0 && up[3] === 1 && up[12] === 1 && up[15] === 0, 'bilinear resize keeps the corner values');
  const same = M.resizeBilinear(Float32Array.from([0.2, 0.4, 0.6, 0.8]), 2, 2, 2, 2);
  ok(near(same[0], 0.2) && near(same[3], 0.8), 'resize to the same size is the identity');
}
// ---- guidedFilter: a mask whose edge is a few pixels off is snapped onto the sharp edge in the photo
{
  const w = 96, h = 32, guide = new Float32Array(w * h), step = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    guide[y * w + x] = x < 50 ? 0.9 : 0.1;                   // the true edge is at x = 50
    step[y * w + x] = x < 46 ? 1 : 0;                        // the model put it at x = 46 ...
  }
  const rough = M.boxBlur(step, w, h, 3);                    // ... and it is soft (like an upsampled low-resolution mask)
  const q = M.guidedFilter(guide, rough, w, h, 6, 0.004);
  const row = 16 * w;
  ok(q[row + 20] > 0.9 && q[row + 80] < 0.1, 'guided filter: far from the edge the mask is solid inside and empty outside');
  const jump = (arr, x) => arr[row + x - 1] - arr[row + x];
  ok(jump(q, 50) > 0.3 && jump(rough, 50) < 0.1, 'the filtered mask drops sharply exactly at the photo edge (x = 50); the rough mask had no step there');
}
// ---- cleanMask: keeps the big subject and the other sizeable one, drops specks, fills tiny holes, keeps big holes
{
  const w = 120, h = 100, a = new Uint8Array(w * h);
  const rect = (x0, y0, x1, y1, v = 255) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[y * w + x] = v; };
  rect(10, 10, 70, 90);                                      // main subject
  rect(80, 40, 110, 90);                                     // second subject (about 30% of main): kept
  rect(100, 5, 104, 9);                                      // a speck: removed
  rect(30, 30, 33, 33, 0);                                   // a tiny hole inside the subject: filled
  rect(45, 50, 65, 80, 0);                                   // a big hole (a real gap): kept
  M.cleanMask(a, w, h, { grid: 2 });
  ok(a[50 * w + 20] === 255 && a[60 * w + 90] === 255, 'both sizeable subjects survive');
  ok(a[6 * w + 101] === 0, 'a stray speck is removed');
  ok(a[31 * w + 31] === 255, 'a tiny hole inside the subject is filled');
  ok(a[65 * w + 55] === 0, 'a large gap (e.g. between legs) stays a gap');
}
// ---- refineAlpha
{
  const w = 1000, h = 60, a = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 300; x < 700; x++) a[y * w + x] = 255;
  const sum = (arr) => { let s = 0; for (const v of arr) s += v; return s; };
  ok(M.refineAlpha(a, w, h, 0, 0).every((v, i) => v === a[i]), 'no softness and no trim returns the mask unchanged');
  const tight = M.refineAlpha(a, w, h, 0.3, -1), loose = M.refineAlpha(a, w, h, 0.3, 1);
  ok(sum(tight) < sum(a) && sum(loose) > sum(a), 'negative trim shrinks the mask, positive trim grows it');
  const soft = M.refineAlpha(a, w, h, 1, 0);
  let mid = 0; for (let x = 280; x < 320; x++) if (soft[30 * w + x] > 20 && soft[30 * w + x] < 235) mid++;
  ok(mid >= 3, 'softness produces a feathered edge');
}
// ---- bbox and probToAlpha
{
  const w = 20, h = 10, a = new Uint8Array(w * h); a[3 * w + 4] = 200; a[6 * w + 12] = 255;
  const b = M.bbox(a, w, h);
  ok(b.x === 4 && b.y === 3 && b.w === 9 && b.h === 4, 'bbox covers every pixel above the threshold');
  ok(M.bbox(new Uint8Array(w * h), w, h) === null, 'bbox of an empty mask is null');
  const pw = 8, ph = 8, prob = new Float32Array(pw * ph), W = 64, H = 64, guide = new Float32Array(W * H);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) prob[y * pw + x] = (x >= 2 && x < 6 && y >= 2 && y < 6) ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) guide[y * W + x] = (x >= 16 && x < 48 && y >= 16 && y < 48) ? 0.2 : 0.8;
  const al = M.probToAlpha(prob, pw, ph, guide, W, H);
  ok(al[32 * W + 32] === 255 && al[2 * W + 2] === 0 && al.length === W * H, 'probToAlpha: subject solid, background empty, full-size output');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
