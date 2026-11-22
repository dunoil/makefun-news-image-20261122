// The World Today: Sunday 22 November 2026
// A one-page broadsheet summing up the world news of Sunday 22 November 2026.
// Pure Node 22 standard library. Deterministic. Writes /output/entry.png
// (or $MAKEFUN_OUTPUT_DIR/entry.png). Serif glyph outlines are embedded in
// font.ts (generated at build time from DejaVu Serif / Sans system fonts).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { FONT } from './font.ts';

const W = 1024, H = 1024;
const px = new Uint8Array(W * H * 4);
type RGB = [number, number, number];
const CREAM: RGB = [247, 241, 227], INK: RGB = [24, 22, 18], RED: RGB = [164, 32, 28],
  BLUE: RGB = [35, 74, 128], TEAL: RGB = [24, 110, 100], GOLD: RGB = [196, 142, 32],
  GREEN: RGB = [52, 110, 52], GREY: RGB = [110, 104, 94], WHITE: RGB = [255, 255, 255],
  SKY: RGB = [174, 205, 228], SEA: RGB = [84, 138, 178], SAND: RGB = [226, 199, 148];
let CLIP = [0, 0, W, H];
function set(x: number, y: number, c: RGB, a = 255) {
  x |= 0; y |= 0; if (x < CLIP[0] || y < CLIP[1] || x >= CLIP[2] || y >= CLIP[3]) return; if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  if (a === 255) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; }
  else { const t = a / 255; px[i] = px[i] * (1 - t) + c[0] * t; px[i + 1] = px[i + 1] * (1 - t) + c[1] * t; px[i + 2] = px[i + 2] * (1 - t) + c[2] * t; px[i + 3] = 255; }
}
function rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c, a); }
function hline(x: number, y: number, w: number, c: RGB, t = 1) { rect(x, y, w, t, c); }
function vline(x: number, y: number, h: number, c: RGB, t = 1) { rect(x, y, t, h, c); }
function box(x: number, y: number, w: number, h: number, c: RGB, t = 2) { hline(x, y, w, c, t); hline(x, y + h - t, w, c, t); vline(x, y, h, c, t); vline(x + w - t, y, h, c, t); }
function circle(cx: number, cy: number, r: number, c: RGB, a = 255) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) set(cx + i, cy + j, c, a); }
function disc(cx: number, cy: number, rx: number, ry: number, c: RGB) { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) set(cx + i, cy + j, c); }
function tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB) {
  const minx = Math.min(x1, x2, x3), maxx = Math.max(x1, x2, x3), miny = Math.min(y1, y2, y3), maxy = Math.max(y1, y2, y3);
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d, b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d, g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) set(x, y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; for (let a = -t / 2; a < t / 2; a++) for (let b = -t / 2; b < t / 2; b++) set(x + a, y + b, c); }
}
function poly(pts: number[][], c: RGB) {
  let miny = 1e9, maxy = -1e9; for (const p of pts) { miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
  for (let y = Math.floor(miny); y <= maxy; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k]); x <= xs[k + 1]; x++) set(x, y, c);
  }
}
// ---- text (embedded serif outlines, scan-filled) ----
function glyph(font: string, ch: string) { const f = FONT[font]; return f.glyphs[ch] || f.glyphs['?']; }
function textW(s: string, size: number, font = 'serifB') { const f = FONT[font]; let w = 0; for (const ch of s) w += glyph(font, ch)[0] * size / f.upem; return w; }
function drawText(x: number, yTop: number, s: string, size: number, c: RGB, font = 'serifB') {
  const f = FONT[font], sc = size / f.upem; let cx = x;
  for (const ch of s) {
    const [adv, contours] = glyph(font, ch);
    for (const cont of contours) {
      const pts = cont.map((p: number[]) => [cx + p[0] * sc, yTop + size - p[1] * sc]);
      // scan fill this contour set together handled below via poly per contour with even-odd approx:
      poly(pts, c);
    }
    // punch counters: redraw holes by filling contour interiors in bg is complex; DejaVu counters are separate contours
    cx += adv * sc;
  }
  return cx - x;
}
// Holes in letters (a, e, o...) need even-odd across all contours of a glyph:
function drawTextEO(x: number, yTop: number, s: string, size: number, c: RGB, font = 'serifB', bg: RGB = CREAM) {
  // First pass normal fill, then for glyphs with >1 contour, refill inner contours with bg where they are holes.
  // Determine hole contours by point-in-polygon nesting depth.
  const f = FONT[font], sc = size / f.upem; let cx = x;
  for (const ch of s) {
    const [adv, contours] = glyph(font, ch);
    const all = contours.map((cont: number[][]) => cont.map((p: number[]) => [cx + p[0] * sc, yTop + size - p[1] * sc]));
    for (const pts of all) poly(pts, c);
    // nesting: a contour whose first point lies inside an odd number of others is a hole
    for (let i = 0; i < all.length; i++) {
      let depth = 0; const p = all[i][0];
      for (let j = 0; j < all.length; j++) { if (i === j) continue; if (inside(p, all[j])) depth++; }
      if (depth % 2 === 1) poly(all[i], bg);
    }
    cx += adv * sc;
  }
  return cx - x;
}
function inside(p: number[], pts: number[][]) { let n = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) n = !n; } return n; }
function T(x: number, y: number, s: string, size: number, c: RGB = INK, font = 'serifB', bg: RGB = CREAM) { return drawTextEO(x, y, s, size, c, font, bg); }
function TC(cx: number, y: number, s: string, size: number, c: RGB = INK, font = 'serifB', bg: RGB = CREAM) { return T(cx - textW(s, size, font) / 2, y, s, size, c, font, bg); }
function wrap(s: string, size: number, maxw: number, font = 'serif'): string[] {
  const words = s.split(' '), lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t, size, font) > maxw && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function para(x: number, y: number, s: string, size: number, maxw: number, lh: number, c: RGB = INK, font = 'serif', bg: RGB = CREAM) {
  const ls = wrap(s, size, maxw, font); ls.forEach((l, i) => T(x, y + i * lh, l, size, c, font, bg)); return ls.length;
}
// ---- people / objects ----
function person(x: number, y: number, h: number, c: RGB) { circle(x, y - h + h * 0.14, h * 0.14, c); line(x, y - h * 0.72, x, y - h * 0.3, c, 3); line(x, y - h * 0.3, x - h * 0.18, y, c, 3); line(x, y - h * 0.3, x + h * 0.18, y, c, 3); line(x, y - h * 0.62, x - h * 0.2, y - h * 0.4, c, 2); line(x, y - h * 0.62, x + h * 0.2, y - h * 0.4, c, 2); }
function numBadge(x: number, y: number, n: number, bg: RGB = RED) { circle(x + 9, y + 9, 9, bg); const s = String(n); T(x + 9 - textW(s, 11, 'sansB') / 2, y + 2, s, 11, WHITE, 'sansB', bg); }
function sun(x: number, y: number, r: number) { circle(x, y, r, GOLD); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; line(x + Math.cos(t) * (r + 2), y + Math.sin(t) * (r + 2), x + Math.cos(t) * (r + 7), y + Math.sin(t) * (r + 7), GOLD, 2); } }

// ---- illustrated scenes: each draws inside (x,y,w,h) ----
type Scene = (x: number, y: number, w: number, h: number) => void;
const scenes: Record<string, Scene> = {
  cop31(x, y, w, h) { rect(x, y, w, h, SKY); sun(x + w - 26, y + 20, 11); rect(x, y + h - 26, w, 26, SAND);
    poly([[x + w / 2 - 52, y + h - 26], [x + w / 2, y + 22], [x + w / 2 + 52, y + h - 26]], [238, 232, 210]); box(x + w / 2 - 52, y + h - 26, 104, 1, INK, 1);
    for (let i = -2; i <= 2; i++) { vline(x + w / 2 + i * 18, y + h - 52, 26, GREY, 2); }
    for (const [fx, fc] of [[-70, TEAL], [-38, RED], [38, BLUE], [70, GREEN]] as [number, RGB][]) { vline(x + w / 2 + fx, y + 34, 34, INK, 2); rect(x + w / 2 + fx + 1, y + 34, 16, 10, fc); }
    person(x + 30, y + h - 4, 34, INK); person(x + w - 30, y + h - 4, 34, BLUE); person(x + w / 2 - 14, y + h - 2, 28, RED); },
  quake(x, y, w, h) { rect(x, y, w, h, [196, 214, 230]); tri(x, y + h, x + 60, y + 26, x + 120, y + h, [120, 130, 140]); tri(x + 70, y + h, x + 140, y + 14, x + w, y + h, [100, 112, 124]); circle(x + 95, y + 30, 8, WHITE); rect(x, y + h - 22, w, 22, [150, 128, 96]);
    line(x + 20, y + h - 22, x + 70, y + h - 10, INK, 3); line(x + 70, y + h - 10, x + 105, y + h - 20, INK, 3); line(x + 105, y + h - 20, x + 160, y + h - 8, INK, 3);
    rect(x + w - 62, y + h - 58, 40, 36, [210, 180, 140]); line(x + w - 58, y + h - 40, x + w - 28, y + h - 26, RED, 3); line(x + w - 40, y + h - 56, x + w - 30, y + h - 30, RED, 2); person(x + 26, y + h - 2, 30, RED); },
  ship(x, y, w, h) { rect(x, y, w, h, SKY); rect(x, y + h - 34, w, 34, SEA); for (let i = 0; i < 5; i++) hline(x + 8 + i * 38, y + h - 20 + (i % 2) * 8, 24, WHITE, 2);
    poly([[x + 30, y + h - 36], [x + w - 30, y + h - 36], [x + w - 44, y + h - 22], [x + 44, y + h - 22]], [70, 70, 76]); rect(x + 52, y + h - 52, 90, 16, RED); rect(x + 60, y + h - 66, 26, 14, WHITE); rect(x + 92, y + h - 66, 26, 14, TEAL);
    // drone
    rect(x + w - 66, y + 14, 26, 8, INK); circle(x + w - 68, y + 12, 5, INK); circle(x + w - 38, y + 12, 5, INK); line(x + w - 52, y + 22, x + w - 60, y + 44, RED, 2); circle(x + w - 62, y + 50, 5, GOLD); },
  cartel(x, y, w, h) { rect(x, y, w, h, [232, 220, 190]); rect(x, y + h - 20, w, 20, [170, 150, 110]);
    rect(x + 16, y + 14, 52, 64, WHITE); box(x + 16, y + 14, 52, 64, INK, 2); circle(x + 42, y + 36, 11, SAND); rect(x + 28, y + 48, 28, 16, BLUE); T(x + 20, y + 66, 'WANTED', 9, RED, 'sansB', WHITE);
    person(x + 110, y + h - 6, 52, INK); person(x + 140, y + h - 6, 52, [60, 60, 60]); rect(x + 96, y + h - 52, 60, 10, INK); circle(x + 182, y + h - 34, 13, GOLD); T(x + 174, y + h - 40, '$', 13, INK, 'serifB', GOLD);
    rect(x + w - 56, y + 16, 42, 30, [52, 52, 56]); hline(x + w - 56, y + 30, 42, WHITE, 2); vline(x + w - 35, y + 16, 30, WHITE, 2); },
  gulf(x, y, w, h) { rect(x, y, w, h, [250, 214, 170]); sun(x + 28, y + 20, 12); rect(x, y + h - 24, w, 24, SEA);
    poly([[x + 40, y + h - 24], [x + 58, y + 30], [x + 76, y + h - 24]], [90, 90, 96]); rect(x + 52, y + 52, 12, 20, GREY);
    for (let i = 0; i < 3; i++) { line(x + 110 + i * 26, y + 16 + i * 6, x + 150 + i * 26, y + 46 + i * 6, RED, 3); circle(x + 156 + i * 26, y + 50 + i * 6, 6, GOLD); }
    rect(x + w - 70, y + h - 58, 52, 34, [120, 110, 96]); tri(x + w - 74, y + h - 58, x + w - 44, y + h - 78, x + w - 14, y + h - 58, [90, 84, 74]); },
  bridge(x, y, w, h) { rect(x, y, w, h, SKY); rect(x, y + h - 26, w, 26, SEA); hline(x, y + 44, w, INK, 4);
    for (const tx of [30, w - 40]) { vline(x + tx, y + 18, h - 40, INK, 5); for (let i = 0; i < 5; i++) line(x + tx, y + 20, x + w / 2, y + 44, GREY, 1); }
    for (let i = 0; i < 4; i++) { rect(x + 26 + i * 44, y + 36, 26, 9, [RED, BLUE, GOLD, TEAL][i]); circle(x + 32 + i * 44, y + 48, 4, INK); circle(x + 46 + i * 44, y + 48, 4, INK); }
    person(x + 16, y + h - 4, 30, RED); person(x + w - 16, y + h - 4, 30, TEAL); },
  plane(x, y, w, h) { rect(x, y, w, h, SKY); for (const [cx, cy] of [[30, 22], [90, 14], [160, 26]] as number[][]) { disc(x + cx, y + cy, 16, 6, WHITE); }
    poly([[x + 22, y + 52], [x + w - 40, y + 40], [x + w - 18, y + 52], [x + w - 44, y + 62], [x + 30, y + 64]], WHITE); poly([[x + 22, y + 52], [x + 8, y + 34], [x + 26, y + 34], [x + 38, y + 48]], BLUE);
    for (let i = 0; i < 7; i++) circle(x + 52 + i * 18, y + 52, 3, BLUE);
    line(x + w - 50, y + 44, x + w - 30, y + 30, GOLD, 3); circle(x + w - 26, y + 27, 6, RED); rect(x, y + h - 14, w, 14, [110, 110, 110]); hline(x, y + h - 8, w, WHITE, 2); },
  court(x, y, w, h) { rect(x, y, w, h, [226, 214, 192]); for (const cx of [24, 62, 100, 138]) { rect(x + cx, y + 22, 12, 52, WHITE); box(x + cx, y + 22, 12, 52, GREY, 1); } hline(x + 10, y + 18, w - 20, INK, 4); hline(x + 10, y + 76, w - 20, INK, 4);
    T(x + w / 2 - textW('$7.25bn', 20, 'serifB') / 2, y + h - 30, '$7.25bn', 20, RED, 'serifB', [226, 214, 192]); },
  strike(x, y, w, h) { rect(x, y, w, h, [196, 190, 200]); rect(x + 12, y + 30, 34, 48, [150, 148, 152]); rect(x + 56, y + 20, 30, 58, [138, 136, 142]); rect(x + 96, y + 36, 36, 42, [150, 148, 152]);
    line(x + 20, y + 38, x + 40, y + 66, RED, 3); line(x + 64, y + 28, x + 80, y + 58, RED, 3); circle(x + w - 34, y + 22, 10, GOLD); line(x + w - 60, y + 10, x + w - 38, y + 20, INK, 3);
    rect(x, y + h - 16, w, 16, [96, 92, 96]); person(x + 24, y + h - 2, 26, WHITE); person(x + 48, y + h - 2, 26, GOLD); },
  markets(x, y, w, h) { rect(x, y, w, h, [28, 34, 48]); for (let i = 0; i < 4; i++) vline(x + 24 + i * 42, y + 12, h - 24, [52, 66, 84], 1);
    const pts = [[8, 18], [44, 26], [76, 22], [108, 44], [140, 40], [172, 66]]; for (let i = 0; i + 1 < pts.length; i++) line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], RED, 3);
    for (const p of pts) circle(x + p[0], y + p[1], 3, GOLD); tri(x + 168, y + 74, x + 180, y + 74, x + 174, y + 84, RED); T(x + 10, y + h - 20, 'NASDAQ  -5.3%', 12, WHITE, 'sansB', [28, 34, 48]); },
  visit(x, y, w, h) { rect(x, y, w, h, [214, 230, 214]); tri(x + w / 2 - 44, y + 12, x + w / 2, y + 2, x + w / 2 + 44, y + 12, GOLD); rect(x + w / 2 - 40, y + 14, 80, 34, [238, 232, 210]); for (const dx of [-28, 0, 28]) vline(x + w / 2 + dx, y + 16, 30, GREY, 3);
    rect(x + w / 2 - 52, y + 48, 104, 6, INK); person(x + 34, y + h - 4, 38, BLUE); person(x + 58, y + h - 4, 38, RED); person(x + w - 40, y + h - 4, 38, TEAL); line(x + 46, y + h - 30, x + 66, y + h - 34, INK, 2); },
  sail(x, y, w, h) { rect(x, y, w, h, SKY); rect(x, y + h - 28, w, 28, SEA); for (let i = 0; i < 4; i++) hline(x + 10 + i * 46, y + h - 16 + (i % 2) * 6, 26, WHITE, 2);
    for (const [bx, tc] of [[44, WHITE], [128, GOLD]] as [number, RGB][]) { poly([[x + bx, y + 18], [x + bx, y + h - 30], [x + bx + 30, y + h - 30]], tc); poly([[x + bx, y + 30], [x + bx, y + h - 30], [x + bx - 20, y + h - 30]], [240, 240, 240]); hline(x + bx - 22, y + h - 29, 56, INK, 3); } },
  border(x, y, w, h) { rect(x, y, w, h, [206, 220, 196]); rect(x, y + h - 20, w, 20, [150, 140, 110]);
    for (let i = 0; i < 6; i++) { vline(x + 16 + i * 30, y + 22, 44, INK, 3); hline(x + 10, y + 30 + (i % 2) * 14, 24, INK, 2); }
    rect(x + w - 58, y + 10, 44, 30, WHITE); box(x + w - 58, y + 10, 44, 30, RED, 2); line(x + w - 52, y + 34, x + w - 20, y + 16, RED, 3); person(x + 24, y + h - 4, 32, BLUE); },
  generic(x, y, w, h) { rect(x, y, w, h, SKY); circle(x + w / 2, y + h / 2, 22, GOLD); person(x + 30, y + h - 4, 34, INK); person(x + w - 30, y + h - 4, 34, BLUE); },
};

// ---- content ----
interface Card { n: number; scene: string; head: string; body: string; tag: string }
const leads: Card[] = [
  { n: 1, scene: 'cop31', tag: 'CLIMATE / TURKIYE', head: 'COP31 Goes Into Overtime, Then Nears a Final Deal in Antalya', body: 'Australia and Turkiye unveiled a new package late on Sunday and said the plenary would reconvene to approve it, after a fossil fuel fight deadlocked the talks.' },
  { n: 2, scene: 'quake', tag: 'SOUTH AMERICA / PERU', head: 'Magnitude 6.9 Earthquake Shakes Peru Andes, No Early Casualties', body: 'A powerful quake struck the Peruvian Andes on Sunday. No damage or casualties were reported in the first hours as teams checked mountain towns.' },
  { n: 3, scene: 'ship', tag: 'EUROPE / BALTIC SEA', head: 'Drones Hit Russian Cargo Ship in the Baltic as Finland Tightens Security', body: 'A Russia-bound ship was attacked in the Gulf of Finland on Sunday. Finland tightened Baltic security and said Ukraine was likely behind it.' },
];
const smalls: Card[] = [
  { n: 4, scene: 'cartel', tag: 'NORTH AMERICA / MEXICO', head: 'Mexican Forces Arrest Cartel Boss El Chapo Isidro', body: 'The FBI most-wanted drug lord was captured in a raid.' },
  { n: 5, scene: 'gulf', tag: 'MIDDLE EAST / GULF', head: 'Iran Strikes US Base in Kuwait, Targets Bahrain', body: 'Tehran widened Gulf attacks on Sunday.' },
  { n: 6, scene: 'bridge', tag: 'ASIA / INDIA', head: 'Modi Opens Nitish Setu Bridge in Bihar', body: 'The bridge links Patna and Vaishali districts.' },
  { n: 7, scene: 'plane', tag: 'OCEANIA / PHILIPPINES', head: 'Air Niugini Jet Lands Safe: All 146 Aboard Survive', body: 'Emergency landing after an engine fire warning.' },
  { n: 8, scene: 'court', tag: 'NORTH AMERICA / US', head: 'Judge Approves $7.25bn Roundup Settlement', body: 'The deal covers cancer claims over the weedkiller.' },
  { n: 9, scene: 'strike', tag: 'EUROPE / UKRAINE', head: 'Russian Strike on Zelensky Home Town Kills 2', body: 'About 60 were injured in Kryvyi Rih on Sunday.' },
  { n: 10, scene: 'markets', tag: 'ECONOMY / GLOBAL', head: 'Tech Sell-Off Drags Markets Down Worldwide', body: 'Anthropic shares slid. The Nasdaq fell 5.3 percent.' },
  { n: 11, scene: 'visit', tag: 'ASIA / NEPAL-INDIA', head: 'Nepal PM Shah Begins State Visit to India', body: 'A 22 to 23 November visit at PM Modi invitation.' },
  { n: 12, scene: 'sail', tag: 'SPORT / SAILING', head: 'Malaysian Monsoon Win Sailing Race by 26 Seconds', body: 'Estonia perfect record ends in the World Cup finals.' },
  { n: 13, scene: 'border', tag: 'EUROPE / ESTONIA', head: 'Estonia to Close Its Border With Russia', body: 'Moscow decried a new Iron Curtain on Sunday.' },
];
const briefs: string[] = [
  'ICMR completes 100 tech transfers, 20 health deals',
  'William backs insurance for 10,000 forest staff',
  'Japan forces to train live-fire in India, a first',
  'Cyclone Akvan: 14 flights cancelled at Ranchi',
  'Air India extends Jeddah suspension to 24 Nov',
  'Crude oil futures fall 3 percent to Rs 7,842',
  'Cummins keeps Australia Test captaincy, unanimous',
  'KL Rahul Test evolution leads India talk in NZ',
  'Cricketer Chahal joins BJP, gets OBC Morcha role',
  'Ex-PM backs Eisenkot, will not serve Netanyahu',
  'Eisenkot invites Likud into Israel coalition talks',
  'FBI reportedly probes hack of criminal database',
  'Lock of Washington hair sells for $4,000 in US',
  'Man convicted of starting Palisades fire in LA',
  'Denmark: Russia plotted to kill US-Ukrainian rapper',
  'French officers sentenced in Zecler beating case',
  'Zelensky meets UK minister Streeting in Kyiv talks',
  'US declassifies more UFO footage from Middle East',
  'ANC fights to keep South Africa key cities',
  'Teen gamer and mother help rescue missing US girl',
  'Hegseth sets new limits on US-Canada defence ties',
  'South Korea: $75,000 bounty for exam cheat reports',
  'El Salvador troops retake Haiti stadium from gangs',
  'Brazil ex-president Bolsonaro in ICU, bowel block',
  'Sinaloa violence after cartel arrest: 11 killed',
  'Diljit Dosanjh concert speech stirs Ahmedabad',
  'Chennai Book Fair 2027 set for 16 to 18 January',
  'Blair: rejoin EU only if UK innovates on tech',
  'Newcastle v Arsenal ratings lead football reaction',
  'New York weighs tougher e-bike battery laws',
  'ECOWAS launches women green leadership programme',
];
// ---- page ----
rect(0, 0, W, H, CREAM);
box(6, 6, W - 12, H - 12, INK, 3);
// masthead
TC(W / 2, 12, 'THE WORLD TODAY', 46, INK, 'serifB');
hline(14, 66, W - 28, INK, 3);
T(16, 70, 'Vol. I  No. 22', 11, GREY, 'serif');
TC(W / 2, 69, 'Sunday 22 November 2026', 22, RED, 'serifB');
const r1 = 'One day. One page. The whole world.'; T(W - 16 - textW(r1, 11, 'serif'), 70, r1, 11, GREY, 'serif');
hline(14, 94, W - 28, INK, 1);
// count strip
rect(14, 98, W - 28, 20, INK);
TC(W / 2, 101, '44 STORIES  -  13 ILLUSTRATED  -  31 BRIEFS  -  7 REGIONS  -  8 FIELDS  -  44 MAP PINS', 13, WHITE, 'sansB', INK);
// region + field bars
T(16, 122, 'REGIONS:  Asia 9  -  Europe 8  -  North America 9  -  South America 2  -  Africa 3  -  Middle East 4  -  Oceania 3  -  Global 6', 11.5, BLUE, 'serifB');
T(16, 138, 'FIELDS:  Politics 12  -  Economy 5  -  Climate 4  -  Science and Tech 5  -  Health 3  -  Sport 5  -  Culture 5  -  Disaster and Law 5', 11.5, TEAL, 'serifB');
hline(14, 156, W - 28, INK, 2);
// lead cards
function card(x: number, y: number, w: number, h: number, c: Card, big: boolean) {
  box(x, y, w, h, INK, 2); const ih = 76;
  CLIP = [x + 2, y + 2, x + w - 2, y + 2 + ih]; (scenes[c.scene] || scenes.generic)(x + 2, y + 2, w - 4, ih); CLIP = [0, 0, W, H];
  numBadge(x + 6, y + 6, c.n);
  T(x + 8, y + ih + 5, c.tag, 9, RED, 'sansB');
  const hs = 15.5;
  const hl = wrap(c.head, hs, w - 16, 'serifB'); hl.slice(0, 3).forEach((l, i) => T(x + 8, y + ih + 18 + i * 18, l, hs, INK, 'serifB'));
  const by = y + ih + 18 + Math.min(hl.length, 3) * 18 + 1;
  para(x + 8, by, c.body, 10.5, w - 16, 12.5, [52, 48, 42], 'serif');
}
function smallCard(x: number, y: number, w: number, h: number, c: Card) {
  box(x, y, w, h, INK, 2);
  CLIP = [x + 2, y + 2, x + 94, y + h - 2]; (scenes[c.scene] || scenes.generic)(x + 2, y + 2, 92, h - 4); CLIP = [0, 0, W, H];
  numBadge(x + 5, y + 5, c.n);
  const tx = x + 102;
  T(tx, y + 5, c.tag, 8.5, RED, 'sansB');
  const hl = wrap(c.head, 12, w - 110, 'serifB'); hl.slice(0, 3).forEach((l, i) => T(tx, y + 17 + i * 14, l, 12, INK, 'serifB'));
  const by = y + 17 + Math.min(hl.length, 3) * 14 + 1;
  if (by + 22 < y + h) para(tx, by, c.body, 9.5, w - 110, 11.5, [52, 48, 42], 'serif');
}
leads.forEach((c, i) => card(14 + i * 334, 160, 326, 198, c, true));
// small cards: 2 columns x 5 rows on the left, scene as a left thumbnail
smalls.forEach((c, i) => { const col = i % 2, row = Math.floor(i / 2); smallCard(14 + col * 334, 364 + row * 88, 326, 84, c); });
// right column: map, numbers, date check
const RX = 682, RW = 328;
box(RX, 364, RW, 150, INK, 2); rect(RX + 2, 366, RW - 4, 20, BLUE);
T(RX + 8, 369, 'WORLD MAP: 44 PINS, NUMBERS MATCH THE STORIES', 10.5, WHITE, 'sansB', BLUE);
rect(RX + 2, 388, RW - 4, 124, [186, 214, 196]);
// crude continents
poly([[RX + 30, 430], [RX + 70, 406], [RX + 96, 424], [RX + 78, 456], [RX + 52, 464]], [110, 150, 96]);
poly([[RX + 66, 468], [RX + 92, 464], [RX + 98, 494], [RX + 80, 508], [RX + 68, 486]], [110, 150, 96]);
poly([[RX + 140, 416], [RX + 176, 406], [RX + 186, 430], [RX + 160, 440], [RX + 142, 432]], [110, 150, 96]);
poly([[RX + 152, 444], [RX + 178, 440], [RX + 184, 474], [RX + 168, 494], [RX + 154, 468]], [120, 140, 90]);
poly([[RX + 196, 412], [RX + 258, 404], [RX + 282, 426], [RX + 260, 448], [RX + 210, 444], [RX + 196, 430]], [110, 150, 96]);
poly([[RX + 252, 470], [RX + 282, 466], [RX + 290, 486], [RX + 264, 496]], [110, 150, 96]);
const pins: [number, number, number][] = [[1, 214, 422], [2, 82, 478], [3, 168, 414], [4, 44, 440], [5, 196, 430], [6, 238, 436], [7, 278, 478], [8, 48, 430], [9, 172, 418], [10, 52, 426], [11, 232, 430], [12, 262, 440], [13, 174, 408], [14, 240, 440], [15, 158, 418], [16, 252, 434], [17, 236, 444], [18, 242, 448], [19, 238, 428], [20, 284, 484], [21, 46, 434], [22, 46, 444], [23, 206, 434], [24, 202, 428], [25, 60, 436], [26, 172, 412], [27, 166, 416], [28, 170, 424], [29, 214, 428], [30, 50, 420], [31, 176, 458], [32, 80, 484], [33, 58, 448], [34, 42, 424], [35, 258, 424], [36, 62, 454], [37, 88, 492], [38, 50, 446], [39, 234, 432], [40, 238, 420], [41, 160, 422], [42, 156, 414], [43, 56, 432], [44, 162, 426]];
for (const [n, dx, dy] of pins) { circle(RX + dx, dy, 6, RED); const s = String(n); T(RX + dx - textW(s, 8, 'sansB') / 2, dy - 4, s, 7.5, WHITE, 'sansB', RED); }
// numbers
box(RX, 520, RW, 122, INK, 2); rect(RX + 2, 522, RW - 4, 20, RED);
T(RX + 8, 525, 'DAY IN NUMBERS: SUNDAY 22 NOVEMBER 2026', 11, WHITE, 'sansB', RED);
const nums: [string, string][] = [['6.9', 'Peru quake'], ['$7.25bn', 'Roundup deal'], ['146', 'safe on jet'], ['14', 'flights off'], ['100', 'ICMR transfers'], ['10,000', 'forest staff'], ['$4,000', 'Washington hair'], ['5.3%', 'Nasdaq fall']];
nums.forEach((v, i) => { const cx = RX + 10 + (i % 4) * 80, cy = 550 + Math.floor(i / 4) * 48; TC(cx + 34, cy, v[0], 15, RED, 'serifB'); TC(cx + 34, cy + 19, v[1], 9, INK, 'serif'); });
// date check
box(RX, 648, RW, 152, INK, 2); rect(RX + 2, 650, RW - 4, 20, GOLD);
T(RX + 8, 653, 'DATE CHECK: DELIBERATELY EXCLUDED', 11, WHITE, 'sansB', GOLD);
para(RX + 8, 674, 'Not 22 Nov news, so left out: (a) France cost-of-living marches, 82,500 people, first reported 21 Nov; (b) Depardieu and Houellebecq investigation opened, reported 21 Nov; (c) Russia 400-drone and 110-missile barrage on Kyiv, reported 21 Nov; (d) Cyclone Akvan landfall in Odisha, 20 Nov; (e) India 159 for 1 at Wellington, stumps 21 Nov.', 10.5, RW - 16, 13, INK, 'serif');
// briefs
hline(14, 806, W - 28, INK, 2);
T(16, 810, 'THE BRIEFS: STORIES 14 TO 44, EACH TOLD IN ONE LINE', 12, RED, 'sansB');
briefs.forEach((b, i) => {
  const col = Math.floor(i / 11), row = i % 11; const x = 16 + col * 336, y = 830 + row * 13.5;
  T(x, y, String(i + 14) + '.', 10.5, RED, 'sansB');
  // fit one line: shrink if needed
  let s = b, sz = 10.5; while (textW(s, sz, 'serif') > 300 && sz > 8.5) sz -= 0.5;
  T(x + 24, y, s, sz, INK, 'serif');
});
hline(14, 998, W - 28, INK, 1);
TC(W / 2, 1002, 'The World Today - Sunday 22 November 2026 - All 44 stories happened or were first reported on this day, in some time zone of the world.', 10.5, GREY, 'serif');
// paper grain: deterministic LCG noise, subtle, lifts the print texture
{ let seed = 20261122; for (let i = 0; i < px.length; i += 4) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const n = (seed % 13) - 6; px[i] = Math.max(0, Math.min(255, px[i] + n)); px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n)); px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n)); } }
// ---- PNG encode ----
const crcTable: number[] = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(buf: Buffer) { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type: string, data: Buffer) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output'; mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'entry.png'), png);
console.log('wrote', png.length, 'bytes');
