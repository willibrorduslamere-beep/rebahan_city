/* =====================================================================
   kota-hidup.js : fitur baru Rebahan City
   - Demo rakyat (aspirasi) + tanggapan Walikota
   - Taman Tugu Rebahan, Persawahan, Peternakan, Tambang
   - Indomaret, Alfamart, Alfamidi, Supermarket, Kantor, Pabrik
   - Pekerjaan & gaji (lowongan, shift, jabatan)
   - Obrolan dua arah real-time (Obrolan Kota + kotak masuk rumah)
   - Lampu jalan otomatis (nyala malam, padam pagi)
   Dimuat setelah kota-online.js. Semua penggambaran dipanggil dari index.html lewat window.HX.
   ===================================================================== */
(function () {
"use strict";

const HX = window.HX = { L: [], G: [], I: 0, night: false, CFG: { kuota: {}, lamp: "" }, DM: [], act: [], actIds: {}, unread: 0, cur: "", t0: Date.now() };
const DBX = () => window.__rbhDB || null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gl = (x, y, r, k) => HX.G.push([x, y, r, k || 1]);
const nm = n => n + ((S.reno && S.reno[n]) ? " ✨" : "");
const visT = (x, y, h) => { const sx = VW / 2 + V.x + x * V.z, sy = VH / 2 + V.y + y * V.z; return sx > -140 * V.z && sx < VW + 140 * V.z && sy > -70 * V.z && sy < VH + h * V.z; };

/* ============================ DATA ============================ */
const JOBS = [
  { id: "petani",    n: "Petani Padi",            e: "🌾", wp: "sawah",       g: 30,  d: 60,  lv: 1, q: 8 },
  { id: "peternak",  n: "Peternak Sapi",          e: "🐄", wp: "ternak",      g: 35,  d: 60,  lv: 1, q: 6 },
  { id: "kasir_i",   n: "Kasir Indomaret",        e: "🛒", wp: "indomaret",   g: 28,  d: 45,  lv: 1, q: 3 },
  { id: "kasir_a",   n: "Kasir Alfamart",         e: "🛒", wp: "alfamart",    g: 28,  d: 45,  lv: 1, q: 3 },
  { id: "kasir_m",   n: "Kasir Alfamidi",         e: "🛒", wp: "alfamidi",    g: 28,  d: 45,  lv: 1, q: 3 },
  { id: "pramu",     n: "Pramuniaga Supermarket", e: "🧺", wp: "supermarket", g: 32,  d: 60,  lv: 1, q: 5 },
  { id: "pedagang",  n: "Pedagang Pasar",         e: "🥬", wp: "pasar",       g: 40,  d: 75,  lv: 1, q: 6 },
  { id: "buruh",     n: "Buruh Pelabuhan",        e: "⚓", wp: "pelabuhan",   g: 50,  d: 90,  lv: 1, q: 6 },
  { id: "karyawan",  n: "Karyawan Kantor",        e: "💼", wp: "kantor",      g: 70,  d: 90,  lv: 2, q: 6 },
  { id: "operator",  n: "Operator Pabrik",        e: "🏭", wp: "pabrik",      g: 65,  d: 90,  lv: 2, q: 6 },
  { id: "guru",      n: "Guru",                   e: "📚", wp: "sekolah",     g: 60,  d: 90,  lv: 2, q: 4 },
  { id: "polisi",    n: "Polisi",                 e: "👮", wp: "polisi",      g: 60,  d: 90,  lv: 2, q: 3 },
  { id: "damkar",    n: "Petugas Damkar",         e: "🚒", wp: "damkar",      g: 60,  d: 90,  lv: 2, q: 3 },
  { id: "penambang", n: "Penambang",              e: "⛏️", wp: "tambang",     g: 110, d: 120, lv: 3, q: 5 }
];
const RK = ["Pemula", "Berpengalaman", "Senior"], MULT = [1, 1.3, 1.7], MAXS = 6;
const jobOf = id => JOBS.find(j => j.id === id);
const rankOf = w => (w.shifts || 0) >= 15 ? 2 : (w.shifts || 0) >= 5 ? 1 : 0;
const kuota = j => (HX.CFG.kuota && HX.CFG.kuota[j.id] != null) ? HX.CFG.kuota[j.id] : j.q;
const cnt = id => Object.values(S.warga).filter(w => w.status === "warga" && w.job === id).length;
HX.jobName = id => { const j = jobOf(id); return j ? j.n : "-"; };

const KAT = ["Keamanan & bentrokan", "Fasilitas rusak", "Harga & ekonomi", "Lapangan kerja", "Kinerja Walikota", "Lainnya"];
const KC = { "Keamanan & bentrokan": "#c0392b", "Fasilitas rusak": "#d98a1c", "Harga & ekonomi": "#8a4bd1", "Lapangan kerja": "#1f8a78", "Kinerja Walikota": "#2b5fd0", "Lainnya": "#555" };
const STL = { berlangsung: "🔥 sedang demo", didengar: "👂 didengar Walikota", ditindak: "🔧 sedang diperbaiki", selesai: "✅ selesai" };

const PDEF = [
  ["Indomaret", "indomaret", 5, 6], ["Alfamart", "alfamart", -3, 6], ["Alfamidi", "alfamidi", 3, -6],
  ["Supermarket Rebahan", "supermarket", -6, 3], ["Kantor Pusat Rebahan", "kantor", 7, 8], ["PT Rebahan Jaya", "pabrik", -3, -11]
];
const SHOP = {
  indomaret:   { c1: "#1f5fb4", c2: "#f2c230", txt: "indomaret", w: 11, H: 17 },
  alfamart:    { c1: "#d62b2b", c2: "#1c4f9c", txt: "Alfamart", w: 11, H: 17 },
  alfamidi:    { c1: "#d62b2b", c2: "#f2b81c", txt: "Alfamidi", w: 11, H: 17 },
  supermarket: { c1: "#2a9d5c", c2: "#f2c230", txt: "SUPERMARKET", w: 15, H: 21 }
};
const BARN = [10, -8], SILO = [11, -8], MINE = [-11, 7], FRAME = [-10, 9], HUT = [11, 9];

let inited = false, PO = {}, POL = [], WPT = {}, SPOT = [], TWK = [], POD = [];
function ensureInit() {
  if (inited) return; inited = true;
  const cand = [];
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++)
    if (isPark(i, j) && !isPos(i, j) && !isMkt(i, j) && !isSvc(i, j) && !LM[i + "," + j]) cand.push([i, j]);
  PDEF.forEach(d => {
    cand.sort((a, b) => Math.hypot(a[0] - d[2], a[1] - d[3]) - Math.hypot(b[0] - d[2], b[1] - d[3]));
    const t = cand.shift(); if (!t) return;
    const o = { n: d[0], k: d[1], i: t[0], j: t[1], hh: d[1] === "kantor" ? 108 : d[1] === "pabrik" ? 100 : d[1] === "supermarket" ? 62 : 56 };
    PO[t[0] + "," + t[1]] = o; POL.push(o);
  });
  const nb = d => { const r = [d]; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(p => { const t = [d[0] + p[0], d[1] + p[1]]; if (walkOK(t[0], t[1])) r.push(t); }); return r; };
  POL.forEach(o => { const dd = door(o.i, o.j); WPT[o.k] = nb(dd); POD.push(dd); });
  const zt = k => { const z = ZN.find(q => q.k === k), r = []; for (let i = z.i0; i <= z.i1; i++) for (let j = z.j0; j <= z.j1; j++) if (!ZBLK[i + "," + j]) r.push([i, j]); return r; };
  WPT.sawah = zt("sawah"); WPT.ternak = zt("ternak"); WPT.tambang = zt("tambang"); TWK = zt("tugu");
  WPT.pasar = MZ; WPT.pelabuhan = PZ;
  WPT.sekolah = LML.filter(o => ["sd", "smp", "sma", "univ"].includes(o.k)).map(o => door(o.i, o.j));
  WPT.damkar = [door(...FIRE)]; WPT.polisi = [door(...POLICE)];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i || j) SPOT.push([i, j]);
  SPOT.push([2, 0], [0, 2], [-2, 0], [0, -2]);
}

/* ======================= LAMPU & CAHAYA ======================= */
function lampHead(x, y) {
  const on = HX.I > 0.02;
  poly([x - 5, y + 2, x, y - 3, x + 5, y + 2], "#3b3f4a");
  cir(x, y + 3, 2.3, on ? "#fff3b8" : "#c9ced6");
  if (on && vis(x, y)) HX.L.push([x, y + 3]);
}
HX.pole = (x, y) => lampHead(x, y - 33);
function gLamp(x, y) {
  ctx.strokeStyle = "#33343c"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 30); ctx.stroke();
  cir(x, y + 1, 3, "#44454f"); lampHead(x, y - 33);
}
let SP = null;
function sprite() {
  if (SP) return SP;
  SP = document.createElement("canvas"); SP.width = SP.height = 128;
  const s = SP.getContext("2d"), g = s.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,238,170,1)"); g.addColorStop(.25, "rgba(255,214,110,.55)"); g.addColorStop(1, "rgba(255,190,80,0)");
  s.fillStyle = g; s.fillRect(0, 0, 128, 128); return SP;
}

/* ======================= DEMO: STATUS ======================= */
const isActive = d => (d.status === "berlangsung" || d.status === "didengar") && Date.now() - d.t < 48 * 3600e3;
HX.mood = () => { let m = 100; HX.act.forEach(d => { m -= Math.min(30, 6 + 3 * (d.dukung || []).length); }); return clamp(m, 5, 100); };

HX.begin = function (now) {
  HX.L.length = 0; HX.G.length = 0; ensureInit();
  const d = new Date(), t = d.getHours() + d.getMinutes() / 60;
  let I = (t >= 18.5 || t < 4.5) ? 1 : (t >= 17.5 && t < 18.5) ? t - 17.5 : (t >= 4.5 && t < 5.5) ? 1 - (t - 4.5) : 0;
  if (HX.CFG.lamp === "on") I = 1; else if (HX.CFG.lamp === "off") I = 0;
  HX.I = I; HX.night = phase(d)[1] >= .45;
  HX.act = HX.DM.filter(isActive); HX.actIds = {}; HX.act.forEach(x => HX.actIds[x.id] = 1);
};

HX.after = function (now, W, H) {
  const I = HX.I; ctx.save(); ctx.globalCompositeOperation = "lighter";
  const sp = sprite();
  if (I > .02) HX.L.forEach(p => {
    const sx = W / 2 + V.x + p[0] * V.z, sy = H / 2 + V.y + p[1] * V.z;
    if (sx < -90 || sx > W + 90 || sy < -90 || sy > H + 90) return;
    const r = 30 * V.z;
    ctx.globalAlpha = I * .55; ctx.drawImage(sp, sx - r, sy - r, 2 * r, 2 * r);
    ctx.globalAlpha = I * .3; ctx.drawImage(sp, sx - r * 1.2, sy + 26 * V.z - r * .4, 2.4 * r, .8 * r);
  });
  HX.G.forEach(g => {
    const sx = W / 2 + V.x + g[0] * V.z, sy = H / 2 + V.y + g[1] * V.z, r = g[2] * V.z;
    if (sx < -r || sx > W + r || sy < -r || sy > H + r) return;
    ctx.globalAlpha = clamp(g[3] * (HX.night ? .5 : .15), 0, 1); ctx.drawImage(sp, sx - r, sy - r, 2 * r, 2 * r);
  });
  ctx.restore();
};

/* ======================= BANGUNAN & ZONA ======================= */
function bench(x, y, o) {
  const dx = o ? -11 : 11, dy = 5.5; ctx.lineCap = "butt";
  ctx.strokeStyle = "#4a3520"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - dx, y - dy - 1); ctx.lineTo(x - dx, y - dy + 5); ctx.moveTo(x + dx, y + dy - 1); ctx.lineTo(x + dx, y + dy + 5); ctx.stroke();
  ctx.strokeStyle = "#9a6a3a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - dx, y - dy - 2); ctx.lineTo(x + dx, y + dy - 2); ctx.stroke();
  ctx.strokeStyle = "#b07a44"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - dx, y - dy - 8); ctx.lineTo(x + dx, y + dy - 8); ctx.stroke();
}
function fence(a, b) {
  ctx.strokeStyle = "#8a6a45"; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let k = 0; k <= 4; k++) { const px = a[0] + (b[0] - a[0]) * k / 4, py = a[1] + (b[1] - a[1]) * k / 4; ctx.moveTo(px, py); ctx.lineTo(px, py - 8); }
  ctx.moveTo(a[0], a[1] - 6); ctx.lineTo(b[0], b[1] - 6); ctx.moveTo(a[0], a[1] - 3); ctx.lineTo(b[0], b[1] - 3); ctx.stroke();
}
const pt = (x, y, a, b) => [x + 32 * (a - b), y + 16 * (a + b)];

/* ---- Taman Tugu ---- */
function tuguTile(i, j, x, y, now, names) {
  const u = i + 6, v = j + 6, m = Math.max(Math.abs(u), Math.abs(v)), h = hsh(i, j), cross = !u || !v, pav = (i + j) % 2 ? "#f1e3cc" : "#e8d6b8";
  if (!u && !v) { tile(x, y, "#e4d3b4"); names.unshift([nm("Tugu Rebahan"), x, y - 392]); return; }
  if (m === 2 && !cross) {
    tile(x, y, (i + j) % 2 ? "#7fc597" : "#8fd3a8");
    if (Math.abs(u) === 2 && Math.abs(v) === 2) { tree(x - 6, y + 2, 1.3, h % 2 ? 0 : 3); gLamp(x + 18, y + 5); }
    else {
      for (let k = 0; k < 7; k++) { const px = x + ((k * 11 + h) % 40) - 20, py = y + ((k * 7 + (h >> 3)) % 14) - 7; cir(px, py, 2.4, ["#f08fb4", "#ffd24a", "#fff", "#b48ae8", "#ff7a59"][(k + h) % 5]); }
      tree(x + (h % 2 ? -18 : 18), y + 2, .9, h % 3);
    }
    return;
  }
  if (m === 2) { tile(x, y, pav); gLamp(x + 14, y - 1); if (h % 2) cir(x - 16, y + 4, 4, "#f08fb4"); return; }
  tile(x, y, pav);
  if (cross) { bench(x, y + 2, !u ? 0 : 1); return; }
  if (u * v > 0) {
    ctx.fillStyle = "#8a5a35"; ctx.beginPath(); ctx.ellipse(x, y, 15, 7.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#4fa863"; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 13, 6, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 9; k++) cir(x + Math.cos(k * 2.1) * 9, y - 2 + Math.sin(k * 2.1) * 3.5, 2, ["#e84a5f", "#ffd24a", "#fff", "#f08fb4"][k % 4]);
  } else {
    ctx.fillStyle = "#cfc7b6"; ctx.beginPath(); ctx.ellipse(x, y, 17, 8.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#8fd6ea"; ctx.beginPath(); ctx.ellipse(x, y - 1, 14, 6.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#cfc7b6"; ctx.fillRect(x - 2, y - 14, 4, 13);
    for (let k = 0; k < 6; k++) { const q = ((now / 700) + k / 6) % 1; cir(x + Math.cos(k * 1.05) * q * 10, y - 13 - Math.sin(q * 3.14) * 12 + q * 8, 1.4, "#eaf9ff"); }
  }
}
function tower(now) {
  const x = 0, y = -192; if (!visT(x, y, 440)) return;
  isoBox(x, y + 3, 16, 16, 4, "#ece4d0", "#cfc7b0", "#b5ad96");
  isoBox(x, y - 1, 13, 13, 5, "#f1ead7", "#d8d0ba", "#beb69f");
  const N2 = 48, base = y - 6;
  for (let k = 0; k < N2; k++) {
    const gold = (k >= 7 && k <= 8) || (k >= 20 && k <= 21) || (k >= 33 && k <= 34) || (k >= 44 && k <= 45);
    let s = 9.5 - (k / N2) * 5; if (gold && (k === 20 || k === 33)) s += 1.3;
    isoBox(x, base - k * 6, s, s, 6.4, gold ? "#f6d98a" : "#f7f2e4", gold ? "#dcae3f" : "#e1dac5", gold ? "#b98a22" : "#c4bca6");
  }
  const ty = base - N2 * 6;
  poly([x - 9, ty, x, ty + 4.5, x, ty - 20], "#e6b94a"); poly([x, ty + 4.5, x + 9, ty, x, ty - 20], "#c4952a");
  cir(x, ty - 23, 4.6, "#f6d36a");
  const fl = Math.sin(now / 110) * 1.7, fy = ty - 29;
  ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.moveTo(x, fy - 16 - fl); ctx.quadraticCurveTo(x + 9, fy - 2, x, fy + 3); ctx.quadraticCurveTo(x - 9, fy - 2, x, fy - 16 - fl); ctx.fill();
  ctx.fillStyle = "#ffd95a"; ctx.beginPath(); ctx.moveTo(x, fy - 10); ctx.quadraticCurveTo(x + 4.5, fy - 2, x, fy + 2); ctx.quadraticCurveTo(x - 4.5, fy - 2, x, fy - 10); ctx.fill();
  gl(x, fy - 6, 120, 1.5); gl(x, y - 40, 90, .8);
  if (S.reno && S.reno["Taman Tugu Rebahan"]) { ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✨", x + 22, y - 120 + Math.sin(now / 250) * 3); ctx.fillText("✨", x - 22, y - 200 - Math.sin(now / 300) * 3); }
}
HX.late = function (s) { if (s === -12) tower(performance.now()); };

/* ---- Sawah ---- */
function scarecrow(x, y) {
  ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 26); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.stroke();
  ctx.fillStyle = "#c0453a"; ctx.fillRect(x - 4, y - 24, 8, 9); cir(x, y - 29, 4, "#e8c58a"); poly([x - 8, y - 31, x, y - 40, x + 8, y - 31], "#d9b45a");
}
function hut(x, y) {
  isoBox(x, y, 9, 9, 10, "#a07a4a", "#8f6c40", "#755833");
  poly([x - 22, y - 10, x, y - 34, x, y + 2], "#d9bd6a"); poly([x, y + 2, x + 22, y - 10, x, y - 34], "#b8974a");
}
function sawah(i, j, x, y, now, names) {
  const h = hsh(i, j), v = h % 6;
  tile(x, y, ["#9fd16a", "#94c860", "#aadb72", "#dcd06a", "#9fd16a", "#a4d7de"][v]);
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.strokeStyle = v === 3 ? "#caa93a" : v === 5 ? "#3e8f4a" : "#3f9a3f";
  for (let r = -2; r <= 2; r++) for (let m = 0; m < 4; m++) {
    const p = pt(x, y, -.36 + m * .24, r * .17), sw = Math.sin(now / 600 + h + r + m) * 1.3;
    ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 1.6 + sw, p[1] - 5); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 1.6 + sw, p[1] - 5.5);
  }
  ctx.stroke();
  if (v === 5) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x - 2, y + 5); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 12, y - 1); ctx.stroke(); }
  ctx.strokeStyle = "#b69a62"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 32, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 32, y); ctx.closePath(); ctx.stroke();
  if ((i === 10 && j === 6) || (i === 11 && j === 10)) scarecrow(x, y);
  if (i === HUT[0] && j === HUT[1]) { hut(x, y); }
  if (i === 10 && j === 7) names.unshift([nm("Persawahan Rebahan"), x, y - 40]);
}

/* ---- Peternakan ---- */
function cow(x, y, t, h) {
  const b = Math.sin(t / 900 + h) * 1.2, f = h & 1 ? 1 : -1;
  ctx.strokeStyle = "#e4e4e4"; ctx.lineWidth = 2; ctx.beginPath(); [[-5, 0], [-2, 1], [3, 0], [6, 1]].forEach(p => { ctx.moveTo(x + p[0] * f, y - 5); ctx.lineTo(x + p[0] * f, y); }); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x, y - 8, 9, 5.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#2b2b2f"; ctx.beginPath(); ctx.ellipse(x - 3 * f, y - 9, 3, 2.3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 3 * f, y - 6, 2.4, 1.8, 0, 0, 7); ctx.fill();
  cir(x + 9 * f, y - 10 + b, 3.4, "#fff"); cir(x + 11.5 * f, y - 9 + b, 1.8, "#f2b8b0"); cir(x + 9 * f, y - 13 + b, 1, "#2b2b2f");
}
function chick(x, y) { cir(x, y - 3, 2.6, "#fff"); cir(x + 2.6, y - 5, 1.6, "#fff"); cir(x + 2.8, y - 6.6, .8, "#d22"); cir(x + 4.2, y - 5, .7, "#f2b01e"); }
function silo(x, y) {
  ctx.fillStyle = "#cfd6dc"; ctx.fillRect(x - 8, y - 42, 16, 44); ctx.fillStyle = "#b9c2ca"; ctx.fillRect(x + 2, y - 42, 6, 44);
  ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 4, 0, 0, 7); ctx.fillStyle = "#b9c2ca"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 42, 8, 4, 0, 0, 7); ctx.fillStyle = "#e8ecef"; ctx.fill(); poly([x - 8, y - 42, x, y - 54, x + 8, y - 42], "#c0453a");
}
function ternak(i, j, x, y, now, names) {
  const h = hsh(i, j);
  tile(x, y, (i + j) % 2 ? "#a0d98a" : "#94cf80");
  if (i === 10) fence([x - 32, y], [x, y - 16]);
  if (j === -11) fence([x, y - 16], [x + 32, y]);
  if (i === BARN[0] && j === BARN[1]) house(x, y - 4, 1.15, "#6e3b2a", "#c9473b", 0, 1, 0, false);
  else if (i === SILO[0] && j === SILO[1]) silo(x, y);
  else {
    if (h % 3 !== 0) cow(x + ((h >> 3) % 17) - 8, y + ((h >> 6) % 7) - 3, now, h);
    if (h % 7 === 1) { chick(x - 14, y + 4); chick(x - 8, y + 7); }
    if (h % 5 === 2) { cir(x + 14, y + 2, 5, "#e6c45a"); cir(x + 14, y + 2, 2.4, "#cfa93a"); }
  }
  if (i === 11) fence([x + 32, y], [x, y + 16]);
  if (j === -4) fence([x - 32, y], [x, y + 16]);
  if (i === 10 && j === -6) names.unshift([nm("Peternakan Rebahan"), x, y - 44]);
}

/* ---- Tambang ---- */
function mineEntrance(x, y) {
  poly([x - 30, y + 6, x - 22, y - 26, x - 6, y - 44, x + 10, y - 40, x + 26, y - 18, x + 30, y + 6, x, y + 16], "#8d8579");
  poly([x + 10, y - 40, x + 26, y - 18, x + 30, y + 6, x, y + 16, x + 4, y - 10], "#756e63");
  ctx.fillStyle = "#26221e"; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 11, 14, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 13, y + 8); ctx.lineTo(x - 13, y - 8); ctx.quadraticCurveTo(x - 2, y - 22, x + 9, y - 8); ctx.lineTo(x + 9, y + 8); ctx.stroke();
}
function frame(x, y, now) {
  isoBox(x + 16, y + 4, 9, 9, 12, "#8a7b66", "#776a58", "#615646");
  ctx.strokeStyle = "#5b4630"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 14, y + 6); ctx.lineTo(x, y - 64); ctx.moveTo(x + 14, y + 6); ctx.lineTo(x, y - 64); ctx.moveTo(x - 9, y - 14); ctx.lineTo(x + 9, y - 14); ctx.moveTo(x - 5, y - 38); ctx.lineTo(x + 5, y - 38); ctx.stroke();
  const a = now / 500; cir(x, y - 66, 8, "#7a7f8a"); ctx.strokeStyle = "#c9cdd6"; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let k = 0; k < 4; k++) { ctx.moveTo(x, y - 66); ctx.lineTo(x + Math.cos(a + k * 1.57) * 7, y - 66 + Math.sin(a + k * 1.57) * 7); } ctx.stroke(); cir(x, y - 66, 2, "#333");
}
function tambang(i, j, x, y, now, names) {
  const h = hsh(i, j), rail = i === -10;
  tile(x, y, (i + j) % 2 ? "#b9b3a6" : "#aea798");
  for (let k = 0; k < 6; k++) cir(x + ((k * 13 + h) % 44) - 22, y + ((k * 5 + (h >> 4)) % 14) - 7, 1.4, "#8d877b");
  if (rail && !(i === FRAME[0] && j === FRAME[1])) {
    ctx.strokeStyle = "#5e5a55"; ctx.lineWidth = 1.6; ctx.beginPath();
    [-.09, .09].forEach(a => { const p = pt(x, y, a, -.5), q = pt(x, y, a, .5); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); });
    ctx.stroke(); ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = -2; k <= 2; k++) { const p = pt(x, y, -.13, k * .2), q = pt(x, y, .13, k * .2); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } ctx.stroke();
    if (j === 6 || j === 10) { isoBox(x, y - 2, 7, 5, 6, "#2d2d33", "#6b6b74", "#55555d"); cir(x - 2, y - 11, 3, "#3a3a42"); cir(x + 3, y - 10, 2.6, "#4a4a54"); }
  } else if (h % 3 === 0) { cir(x - 8, y, 7, "#2d2d33"); cir(x, y - 3, 6, "#3a3a42"); cir(x + 7, y + 1, 5, "#4a4a54"); cir(x + 2, y - 6, 1.6, "#f2c14e"); }
  else if (h % 4 === 1) { cir(x - 6, y + 1, 6, "#8d8579"); cir(x + 5, y - 1, 7, "#a39b8e"); }
  if (i === MINE[0] && j === MINE[1]) { mineEntrance(x, y); names.unshift([nm("Tambang Rebahan"), x, y - 64]); }
  if (i === FRAME[0] && j === FRAME[1]) frame(x, y, now);
}

/* ---- Toko, kantor, pabrik ---- */
function shop(x, y, o, name) {
  y -= 2; poly([x - 30, y, x, y - 15, x + 30, y, x, y + 15], "#e9e2d3");
  const w = o.w, H = o.H, g = isoBox(x, y, w, w, H, "#f5f2ea", "#e6e1d3", "#d2cbb9"), lit = HX.night;
  faceQ(g.Fr, g.Rt, 0, 1, H - 8, H, o.c1); faceQ(g.Lf, g.Fr, 0, 1, H - 8, H, o.c2);
  faceQ(g.Fr, g.Rt, .08, .92, 2, H - 11, lit ? "#ffe9a8" : "#a8d6ee"); faceQ(g.Fr, g.Rt, .42, .58, 0, H - 12, "#7a5a3a");
  faceQ(g.Lf, g.Fr, .12, .88, 4, H - 11, lit ? "#ffdf8a" : "#92c3dd");
  for (let k = 0; k < 7; k++) faceQ(g.Fr, g.Rt, k / 7, (k + 1) / 7, H - 12.5, H - 9.5, k % 2 ? "#fff" : o.c1);
  ctx.save(); ctx.translate(g.Fr[0], g.Fr[1] - H + 4); ctx.transform(1, -.5, 0, 1, 0, 0);
  ctx.font = "bold 6.5px Segoe UI,sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.txt, w, 0, w * 1.8); ctx.restore();
  if (lit) gl(x + w, y - H * .45, 56, 1.1);
  if (S.reno && S.reno[name]) { ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✨", x + 28, y - H - 6 + Math.sin(performance.now() / 250) * 3); }
}
function kantor(x, y, name) {
  y -= 2; poly([x - 30, y, x, y - 15, x + 30, y, x, y + 15], "#e4e0d6");
  const H = 78, w = 13, g = isoBox(x, y, w, w, H, "#9ec4e2", "#7aa9cf", "#5f8fb7");
  for (let f = 0; f < 7; f++) for (let c = 0; c < 4; c++) {
    const lit = HX.night && rr(f * 7 + c, 3) > .42, col = lit ? "#ffe9a0" : "#d5ecfb";
    faceQ(g.Fr, g.Rt, .08 + c * .23, .08 + c * .23 + .17, 6 + f * 10.2, 6 + f * 10.2 + 6.4, col);
    faceQ(g.Lf, g.Fr, .08 + c * .23, .08 + c * .23 + .17, 6 + f * 10.2, 6 + f * 10.2 + 6.4, lit ? "#ffd876" : "#bfdcf1");
  }
  faceQ(g.Fr, g.Rt, .38, .62, 0, 8, "#3b5a78");
  isoBox(x, y - H, 9, 9, 6, "#c7d3df", "#aebccb", "#93a3b3");
  ctx.strokeStyle = "#8a8f98"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - H - 6); ctx.lineTo(x, y - H - 30); ctx.stroke();
  const on = Math.sin(performance.now() / 500) > 0; cir(x, y - H - 31, 2.4, on ? "#ff4d3d" : "#7a2a22");
  if (HX.night) gl(x, y - H * .5, 70, .9);
  if (S.reno && S.reno[name]) { ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✨", x + 30, y - H * .6 + Math.sin(performance.now() / 250) * 3); }
}
function pabrik(x, y, now, name) {
  y -= 2; poly([x - 32, y, x, y - 16, x + 32, y, x, y + 16], "#d6d2c8");
  const g = isoBox(x, y, 17, 12, 22, "#cfd3da", "#b9bec8", "#9ea4b0");
  for (let k = 0; k < 4; k++) { faceQ(g.Fr, g.Rt, .08 + k * .22, .08 + k * .22 + .14, 8, 15, HX.night ? "#ffd876" : "#7ab3d4"); }
  faceQ(g.Fr, g.Rt, .46, .62, 0, 8, "#6b6f78");
  for (let k = 0; k < 3; k++) { const a = pt(x, y - 22, -.5 + k * .33, 0); poly([a[0] - 6, a[1] - 3, a[0] + 6, a[1] - 15, a[0] + 6, a[1] - 3], "#e9ecf1"); }
  isoBox(x + 16, y + 6, 3.5, 3.5, 56, "#c85a3a", "#a9452a", "#8a361f"); isoBox(x + 16, y - 36, 3.8, 3.8, 3, "#f0f0f0", "#d8d8d8", "#bbb");
  for (let k = 0; k < 5; k++) { const u = ((now / 1900) + k / 5) % 1; cir(x + 16 + u * 18, y - 62 - u * 40, 4 + u * 9, "rgba(225,226,232," + (.75 * (1 - u)).toFixed(2) + ")"); }
  if (HX.night) gl(x, y - 14, 60, .8);
  if (S.reno && S.reno[name]) { ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✨", x + 30, y - 40 + Math.sin(now / 250) * 3); }
}
function drawPO(o, x, y, now) {
  if (SHOP[o.k]) shop(x, y, SHOP[o.k], o.n); else if (o.k === "kantor") kantor(x, y, o.n); else pabrik(x, y, now, o.n);
}

/* ===================== HOOK TILE ===================== */
HX.tile = function (i, j, x, y, now, names) {
  ensureInit();
  const z = zoneOf(i, j);
  if (z) {
    if (!vis(x, y)) return true;
    if (z === "tugu") tuguTile(i, j, x, y, now, names);
    else if (z === "sawah") sawah(i, j, x, y, now, names);
    else if (z === "ternak") ternak(i, j, x, y, now, names);
    else tambang(i, j, x, y, now, names);
    return true;
  }
  const o = PO[i + "," + j];
  if (o) {
    tile(x, y, (i + j) % 2 ? "#82c79b" : "#8fd3a8");
    if (vis(x, y)) { drawPO(o, x, y, performance.now()); names.unshift([o.n + ((S.reno && S.reno[o.n]) ? " ✨" : ""), x, y - o.hh]); }
    return true;
  }
  if (i === 0 && j === 0 && HX.act.length) {
    tile(x, y, "#f3e4d0");
    const d = HX.act[0], more = HX.act.length > 1 ? " (+" + (HX.act.length - 1) + ")" : "";
    names.unshift(["📣 DEMO RAKYAT: " + String(d.jd || "").slice(0, 28) + more, 0, -176]);
    return true;
  }
  return false;
};

/* ===================== AGEN: pekerja NPC, massa aksi, perilaku ===================== */
const NPCS = [
  ["petani", 3, "sawah", "Petani", "#6aa84f", 1, "hat"], ["peternak", 3, "ternak", "Peternak", "#c0453a", 1, "hat"], ["penambang", 3, "tambang", "Penambang", "#f2b01e", 1, "helm"],
  ["kasir-i", 1, "indomaret", "Kasir", "#1f5fb4", 0], ["kasir-a", 1, "alfamart", "Kasir", "#d62b2b", 0], ["kasir-m", 1, "alfamidi", "Kasir", "#d62b2b", 0],
  ["kasir-s", 2, "supermarket", "Pramuniaga", "#2a9d5c", 0], ["karyawan", 3, "kantor", "Karyawan", "#5a6f8f", 0], ["operator", 2, "pabrik", "Operator", "#e07b39", 0]
];
HX.mk = function (mk, now) {
  ensureInit();
  NPCS.forEach(d => {
    const t = WPT[d[2]]; if (!t || !t.length) return;
    for (let n = 0; n < d[1]; n++) {
      const u = d[0] + "-" + n; mk(u, "w", 0, t[n % t.length], t, d[3]);
      const a = AG[u]; if (a && !a.hx) { a.hx = 1; a.c = d[4]; a.anim = !!d[5]; a.role = d[6] || ""; }
    }
  });
  let total = 0;
  HX.act.forEach(d => {
    const c = Math.min(10, 2 + 2 * (d.dukung || []).length);
    for (let k = 0; k < c && total < 26; k++, total++) {
      const u = "massa-" + d.id + "-" + k; mk(u, "d", 0, SPOT[(k + total) % SPOT.length], SPOT, "Massa aksi");
      const a = AG[u]; if (a) { a.dm = d; if (!a.hx) { a.hx = 1; const h = hsh(k, total + 7); a.jx = (h % 25) - 12; a.jy = ((h >> 5) % 9) - 4; a.c = KC[d.kat] || "#d94040"; } }
    }
  });
};

HX.pick = function (a, now) {
  const go = t => { const p = bfs([Math.round(a.i), Math.round(a.j)], t); if (!p) { a.until = now + 2000; return true; } a.path = p; a.dest = -1; a.mode = "walk"; return true; };
  const stay = ms => { a.mode = "stand"; a.until = now + ms; return true; };
  const act = HX.act, near = (tiles) => tiles.some(q => q[0] === a.i && q[1] === a.j);
  if (a.k === "d") return Math.random() < .6 ? stay(3500 + Math.random() * 4000) : go(rnd(SPOT));
  if (a.k === "m" && act.length) return (a.i === 0 && a.j === 2) ? stay(4000) : go([0, 2]);
  if (a.u === "polisi" && act.length) return (a.i === 3 && a.j === 0) ? stay(5000) : go([3, 0]);
  if (a.k !== "r") return false;
  const w = S.warga[a.u]; if (!w) return false;
  a.dm = null; a.wk = null;
  if (w.sh && w.sh.e > Date.now() && jobOf(w.job)) {
    const t = WPT[jobOf(w.job).wp]; a.wk = w.job;
    if (t && t.length) return near(t) && Math.random() < .6 ? stay(3000 + Math.random() * 3000) : go(rnd(t));
  }
  const md = act.find(d => (d.dukung || []).includes(a.u));
  if (md) { a.dm = md; return Math.random() < .5 ? stay(3000 + Math.random() * 4000) : go(rnd(SPOT)); }
  const r = Math.random();
  if (r < .12 && TWK.length) return go(rnd(TWK));
  if (r < .2 && POD.length) return go(rnd(POD));
  return false;
};

const placard = (x, y, d, t, a) => {
  const calm = d.status === "didengar", bob = Math.sin(t / (calm ? 420 : 190) + (a.jx || 0)) * (calm ? 1 : 3.5), col = KC[d.kat] || "#d94040";
  ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 6, y - 12); ctx.lineTo(x + 7, y - 50 + bob); ctx.stroke();
  const bx = x - 8, by = y - 64 + bob;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.roundRect(bx - 4, by, 40, 14, 2); ctx.fill(); ctx.stroke();
  ctx.font = "bold 6.5px Segoe UI,sans-serif"; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(d.jd || "").toUpperCase().slice(0, 16), bx + 16, by + 7.5, 36);
  if (!calm && V.z >= .9 && ((a.jx || 0) & 1)) { ctx.font = "11px sans-serif"; ctx.fillText("📣", x - 10, y - 38); }
};
HX.ag = function (a, x, y) {
  const t = performance.now();
  if (a.dm && HX.actIds[a.dm.id] && (a.k === "d" || a.k === "r")) placard(x, y, a.dm, t, a);
  if (a.role === "hat") { ctx.fillStyle = "#e8cf6a"; ctx.beginPath(); ctx.ellipse(x, y - 27, 9, 2.4, 0, 0, 7); ctx.fill(); poly([x - 6, y - 27, x, y - 36, x + 6, y - 27], "#e8cf6a"); }
  else if (a.role === "helm") { ctx.fillStyle = "#f2c230"; ctx.beginPath(); ctx.arc(x, y - 27, 5.6, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 6.5, y - 27, 13, 1.6); cir(x, y - 31, 1.4, "#fff7c0"); }
  if (a.k === "r" && a.wk && a.mode !== "in") { const j = jobOf(a.wk); if (j) { ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(j.e, x, y - 44 + Math.sin(t / 300) * 2); } }
};

/* ===================== UI: gaya tambahan ===================== */
(function () {
  const st = document.createElement("style");
  st.textContent = "nav button{position:relative}.bdg{position:absolute;top:2px;right:calc(50% - 24px);background:#e5484d;color:#fff;border-radius:10px;font-size:10px;padding:0 5px;font-style:normal;font-weight:700}" +
    ".jc{border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0;background:rgba(255,255,255,.45)}.jc.on{border:2px solid var(--ok)}" +
    ".pbar{height:12px;border-radius:8px;background:rgba(0,0,0,.14);overflow:hidden;margin:6px 0}.pbar i{display:block;height:100%;background:var(--ok);transition:width 1s linear}" +
    ".bub{display:inline-block;max-width:82%;padding:5px 10px;border-radius:14px;background:rgba(255,255,255,.75);text-align:left}.bub.me{background:var(--acc);color:#fff}.bub b{font-size:12px}.bub small{opacity:.65;margin-left:6px;font-size:10px}" +
    ".tag{display:inline-block;border-radius:8px;padding:0 8px;font-size:12px;font-weight:700;color:#fff;margin-right:4px}";
  document.head.appendChild(st);
})();

/* ===================== LOAD: sambungkan ke UI & database ===================== */
window.addEventListener("load", function () {
  const db = DBX();
  try { if (S.fitur) HX.CFG = Object.assign({ kuota: {}, lamp: "" }, S.fitur); } catch (e) {}
  HX.DM = S.demos || [];

  /* ---------- tab baru ---------- */
  const nav = $("#nav"), adm = nav.querySelector('[data-t="admin"]');
  [["demo", "📣", "Demo"], ["kerja", "💼", "Kerja"], ["obrol", "💬", "Obrolan"]].forEach(a => {
    const b = document.createElement("button"); b.dataset.t = a[0]; b.innerHTML = "<span>" + a[1] + "</span>" + a[2]; nav.insertBefore(b, adm);
  });
  const TABS = { demo: vDemo, kerja: vKerja, obrol: vObrol };
  const prevRender = window.render;
  window.render = function () {
    if (tab !== "obrol") HX.cur = "";
    if (TABS[tab]) {
      if (chatOff) { chatOff(); chatOff = null; }
      tick(); sheet.className = "open"; sheet.onclick = null; TABS[tab](); return;
    }
    prevRender();
  };

  const wk = () => S.warga[me];
  const err = t => { const el = $("#e"); if (el) el.textContent = t; };
  const poke = () => { const a = AG[me]; if (a) a.until = 0; };

  /* ---------- DEMO ---------- */
  const locDM = () => (S.demos = S.demos || []);
  async function dmAdd(o) { const d = DBX(); if (d) await d.collection("demo").add(o); else { o.id = "l" + o.t; locDM().unshift(o); HX.DM = S.demos; save(); } }
  async function dmUpd(id, p) { const d = DBX(); if (d) await d.doc("demo/" + id).update(p); else { const x = locDM().find(q => q.id === id); if (x) Object.assign(x, p); HX.DM = S.demos; save(); } }
  async function dmJoin(id, on) {
    const d = DBX();
    if (d) { const F = firebase.firestore.FieldValue; await d.doc("demo/" + id).update({ dukung: on ? F.arrayUnion(me) : F.arrayRemove(me) }); }
    else { const x = locDM().find(q => q.id === id); if (x) { x.dukung = (x.dukung || []).filter(u => u !== me); if (on) x.dukung.push(me); } HX.DM = S.demos; save(); }
  }
  const mEmo = m => m >= 80 ? "😊" : m >= 55 ? "😐" : m >= 30 ? "😠" : "😡";
  const TARGETS = () => ["Kota secara umum"].concat(LML.map(o => o.n), POL.map(o => o.n), ["Taman Tugu Rebahan", "Persawahan Rebahan", "Peternakan Rebahan", "Tambang Rebahan", "Pasar Rebahan", "Pelabuhan"]);

  function demoCard(d, adm) {
    const n = (d.dukung || []).length, mine = (d.dukung || []).includes(me), on = isActive(d);
    let btn = "";
    if (!adm && isRes(me) && (d.status === "berlangsung" || d.status === "didengar")) btn = `<button class="btn s ${mine ? "x" : "g"}" data-x="${mine ? "leave" : "join"}|${esc(d.id)}">${mine ? "Tarik dukungan" : "✊ Ikut demo"}</button>`;
    return `<div class="jc${on ? " on" : ""}"><span class="tag" style="background:${KC[d.kat] || "#555"}">${esc(d.kat || "")}</span><b>${esc(d.jd)}</b><br>
      <small>@${esc(d.u)} · ${fmt(d.t)} · 👥 ${n} pendukung · ${STL[d.status] || STL.berlangsung}${d.tg && d.tg !== "Kota secara umum" ? " · 🏗 " + esc(d.tg) : ""}</small>
      ${d.balas ? `<p class="mut">🏛 Tanggapan Walikota: ${esc(d.balas)}</p>` : ""}${btn}</div>`;
  }
  function fillDemo() {
    const el = $("#dl"); if (!el) return;
    const L = HX.DM.slice().sort((a, b) => b.t - a.t);
    el.innerHTML = L.length ? L.map(d => demoCard(d, false)).join("") : `<p class="mut">Belum ada demo. Kota sedang tenang.</p>`;
  }
  function vDemo() {
    const m = HX.mood(), act = HX.DM.filter(isActive).length, done = HX.DM.filter(d => d.status === "selesai" || d.status === "ditindak").length;
    sheet.innerHTML = `<h2>📣 Aspirasi & Demo Rakyat</h2>
    <p>Kalau ada peristiwa, bentrokan, atau kota kurang terurus, warga berhak berdemo. Massa akan berkumpul di Alun-alun Balai Kota sampai Walikota menanggapi.</p>
    <div class="stats"><div><b>${mEmo(m)} ${m}%</b>kepuasan kota</div><div><b>${act}</b>demo aktif</div><div><b>${done}</b>ditindak</div></div>`
    + (isRes(me) ? `<p><b>Suarakan aspirasimu</b></p>
      <select id="dk">${KAT.map(k => `<option>${esc(k)}</option>`).join("")}</select>
      <select id="dt">${TARGETS().map(k => `<option>${esc(k)}</option>`).join("")}</select>
      <input id="dj" maxlength="140" placeholder="Tuntutanmu, misal: Perbaiki jalan dan lampu!" autocomplete="off">
      <div class="err" id="e"></div><button class="btn" id="dgo">📣 Mulai demo</button>`
      : `<p class="mut">Hanya warga resmi yang bisa memulai atau ikut demo. Daftar dan verifikasi kode dulu.</p>`)
    + `<h3>Daftar demo</h3><div id="dl"></div>`;
    fillDemo();
    const go = $("#dgo");
    if (go) go.onclick = async () => {
      const jd = $("#dj").value.trim();
      if (jd.length < 6) return err("Tuntutan terlalu pendek (minimal 6 huruf).");
      if (HX.DM.some(d => d.u === me && isActive(d))) return err("Kamu masih punya demo yang berjalan.");
      try {
        await dmAdd({ u: me, kat: $("#dk").value, tg: $("#dt").value, jd, t: Date.now(), dukung: [me], status: "berlangsung", balas: "" });
        log("📣 @" + me + " memulai demo: " + jd); save(); poke(); $("#dj").value = ""; err("");
      } catch (e) { err("Gagal. Pastikan aturan Firestore mengizinkan koleksi 'demo'."); }
    };
    sheet.onclick = async e => {
      const a = (e.target.dataset.x || "").split("|"); if (a[0] !== "join" && a[0] !== "leave") return;
      try { await dmJoin(a[1], a[0] === "join"); poke(); } catch (x) { err("Gagal. Pastikan aturan Firestore mengizinkan koleksi 'demo'."); }
    };
  }

  /* ---------- PEKERJAAN ---------- */
  function vKerja() {
    const st = sheet.scrollTop, w = wk();
    if (!w || w.status !== "warga") { sheet.innerHTML = `<h2>💼 Pekerjaan</h2><p>Hanya warga resmi yang bisa bekerja. Daftar dan kirim kode ke bot dulu (tab Daftar).</p>`; sheet.onclick = null; return; }
    const J = w.job ? jobOf(w.job) : null, day = new Date().toDateString(), sn = w.sd === day ? (w.sn || 0) : 0;
    const card = j => {
      const f = cnt(j.id), q = kuota(j), ok = (w.lv || 1) >= j.lv, full = f >= q;
      return `<div class="jc"><b>${j.e} ${esc(j.n)}</b><br><small>Gaji ${j.g} 🪙 per shift (${j.d} detik) · butuh rumah level ${j.lv} · terisi ${f}/${q}</small><br>
      <button class="btn s" data-x="lamar|${j.id}" ${(!ok || full) ? "disabled" : ""}>${full ? "Lowongan penuh" : !ok ? "Butuh rumah level " + j.lv : "Lamar"}</button></div>`;
    };
    let h = `<h2>💼 Pekerjaan</h2><p><b>🪙 ${w.coin || 0} koin</b> · rumah level ${w.lv || 1}</p><div class="err" id="e"></div>`;
    if (J) {
      const rk = rankOf(w), g = Math.round(J.g * MULT[rk]), on = w.sh && w.sh.e > Date.now();
      h += `<div class="jc on"><b>${J.e} ${esc(J.n)}</b> <span class="mut">· ${RK[rk]} · ${w.shifts || 0} shift</span><br>
      <small>Tempat kerja: ${esc(J.wp.replace(/^\w/, c => c.toUpperCase()))} · gaji ${g} 🪙 per shift · shift hari ini ${sn}/${MAXS}</small>`;
      if (on) h += `<div class="pbar"><i id="pb" style="width:${clamp(100 - (w.sh.e - Date.now()) / (J.d * 10), 0, 100)}%"></i></div><small id="pt">Sedang bekerja...</small>`;
      else h += `<br><button class="btn g" data-x="mulai">▶ Mulai kerja (${J.d} detik)</button>`;
      h += ` <button class="btn x s" data-x="resign">Berhenti</button></div>`;
    } else h += `<p>Kamu belum punya pekerjaan. Pilih lowongan, lalu mulai kerja untuk dapat gaji. Makin sering kerja, makin tinggi jabatan dan gajimu.</p>`;
    h += `<h3>${J ? "Lowongan lain" : "Lowongan kerja"}</h3>` + JOBS.filter(j => !J || j.id !== J.id).map(card).join("");
    sheet.innerHTML = h; sheet.scrollTop = st;
    sheet.onclick = e => {
      const a = (e.target.dataset.x || "").split("|"), w2 = wk(); if (!w2) return;
      if (a[0] === "lamar") {
        const j = jobOf(a[1]); if (!j) return;
        if ((w2.lv || 1) < j.lv) return err("Butuh rumah level " + j.lv + ".");
        if (cnt(j.id) >= kuota(j)) return err("Lowongan sudah penuh.");
        w2.job = j.id; w2.shifts = 0; w2.sh = null; log("💼 @" + w2.u + " diterima bekerja sebagai " + j.n); save(); vKerja();
      } else if (a[0] === "mulai") {
        const j = jobOf(w2.job); if (!j) return; const d2 = new Date().toDateString();
        if (w2.sd !== d2) { w2.sd = d2; w2.sn = 0; }
        if (w2.sn >= MAXS) return err("Jatah shift hari ini habis. Istirahat dulu, besok lanjut.");
        if (w2.sh && w2.sh.e > Date.now()) return;
        w2.sn++; w2.sh = { s: Date.now(), e: Date.now() + j.d * 1000, g: Math.round(j.g * MULT[rankOf(w2)]) }; save(); poke(); vKerja();
      } else if (a[0] === "resign") {
        if (!confirm("Berhenti dari pekerjaan ini?")) return;
        log("@" + w2.u + " berhenti bekerja"); w2.job = null; w2.sh = null; save(); vKerja();
      }
    };
  }
  function pay(w) {
    const j = jobOf(w.job), g = w.sh.g, r0 = rankOf(w);
    w.coin = (w.coin || 0) + g; w.shifts = (w.shifts || 0) + 1; w.sh = null;
    const r1 = rankOf(w); if (r1 > r0) log("🎖 @" + w.u + " naik jabatan menjadi " + RK[r1] + (j ? " (" + j.n + ")" : ""));
    save(); toast("💰 Gaji " + g + " 🪙 masuk" + (r1 > r0 ? " · naik jabatan!" : ""));
    if (tab === "kerja") vKerja();
  }
  setInterval(() => {
    const w = me && S.warga[me]; if (!w || !w.sh) return;
    if (w.sh.e <= Date.now()) { pay(w); return; }
    const pb = $("#pb"), pt = $("#pt"), j = jobOf(w.job);
    if (pb && j) { pb.style.width = clamp(100 - (w.sh.e - Date.now()) / (j.d * 10), 0, 100) + "%"; if (pt) pt.textContent = "Selesai dalam " + Math.ceil((w.sh.e - Date.now()) / 1000) + " detik"; }
  }, 1000);
  setInterval(() => { if (tab === "kerja" && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) && !(wk() && wk().sh)) vKerja(); }, 8000);

  /* ---------- OBROLAN ---------- */
  const badge = () => {
    const b = document.querySelector('#nav [data-t="obrol"]'); if (!b) return;
    const o = b.querySelector(".bdg"); if (o) o.remove();
    if (HX.unread > 0) { const i = document.createElement("i"); i.className = "bdg"; i.textContent = HX.unread > 9 ? "9+" : HX.unread; b.appendChild(i); }
  };
  function openRoom(h, title) {
    if (chatOff) { chatOff(); chatOff = null; }
    HX.cur = h; HX.unread = 0; badge();
    $("#rm").innerHTML = `<h3>${title}</h3><div class="chatbox" id="cb" style="height:44vh"></div>
    <div style="display:flex;gap:6px"><input id="ct" maxlength="200" placeholder="Tulis pesan..." autocomplete="off"><button class="btn" id="sd">Kirim</button></div><div class="err" id="e"></div>`;
    chatOff = chatSub(h, L => {
      const b = $("#cb"); if (!b) return;
      b.innerHTML = L.map(m => {
        if (m.k === "tok") return `<div class="m s">🚪 @${esc(m.u)} mengetuk pintu</div>`;
        const mine = m.u === me, tm = new Date(m.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
        return `<div class="m" style="text-align:${mine ? "right" : "left"}"><span class="bub${mine ? " me" : ""}"><b>${mine ? "kamu" : "@" + esc(m.u)}</b><br>${esc(m.tx)}<small>${tm}</small></span></div>`;
      }).join("") || `<div class="m s">Belum ada obrolan. Sapa dulu!</div>`;
      b.scrollTop = b.scrollHeight;
    });
    const send = async () => {
      const i = $("#ct"), tx = i.value.trim(); if (!tx) return; i.value = "";
      try { await chatSend(h, { k: "msg", u: me, tx }); err(""); } catch (e) { err(ERRW); }
    };
    $("#sd").onclick = send; $("#ct").onkeydown = e => { if (e.key === "Enter") send(); };
  }
  function vObrol() {
    if (!isRes(me)) { sheet.innerHTML = `<h2>💬 Obrolan</h2><p>Hanya warga resmi yang bisa ikut mengobrol. Daftar dan verifikasi kode dulu.</p>`; return; }
    sheet.innerHTML = `<h2>💬 Obrolan</h2><p class="mut">Ngobrol bareng warga secara real-time ${DBX() ? "🟢 online" : "⚪ mode lokal"}. Teman yang berkunjung ke rumahmu bisa kamu balas dari sini.</p>
    <div><button class="btn s" data-x="kota">🏙 Obrolan Kota</button><button class="btn s" data-x="rumah">🏠 Kotak masuk rumahku</button></div><div id="rm"></div>`;
    sheet.onclick = e => { const a = e.target.dataset.x; if (a === "kota") openRoom("_kota", "🏙 Obrolan Kota (semua warga)"); else if (a === "rumah") openRoom(me, "🏠 Rumah @" + esc(me) + " (tamu & kamu)"); };
    HX.unread = 0; badge(); openRoom("_kota", "🏙 Obrolan Kota (semua warga)");
  }

  /* pemberitahuan pesan masuk (obrolan kota + rumah sendiri) */
  let wMe = null, wOff = [];
  setInterval(() => {
    const d = DBX(); if (!d || !me || me === wMe) return;
    wOff.forEach(f => f()); wOff = []; wMe = me; const t0 = Date.now() - 5000;
    const sub = (h, kota) => d.collection("chat/" + h + "/msgs").orderBy("t", "desc").limit(5).onSnapshot(s => s.docChanges().forEach(c => {
      if (c.type !== "added") return; const x = c.doc.data();
      if (x.k !== "msg" || x.u === me || x.t <= t0 || (tab === "obrol" && HX.cur === h)) return;
      HX.unread++; badge(); toast("💬 " + (kota ? "Obrolan Kota · " : "") + "@" + x.u + ": " + String(x.tx).slice(0, 40));
    }), () => {});
    wOff.push(sub("_kota", true), sub(me, false));
  }, 3000);

  /* ---------- LISTENER DATABASE: demo & pengaturan kota ---------- */
  if (db) {
    let first = true; const prev = {};
    db.collection("demo").orderBy("t", "desc").limit(40).onSnapshot(s => {
      HX.DM = s.docs.map(x => Object.assign({ dukung: [], status: "berlangsung" }, x.data(), { id: x.id }));
      if (!first) s.docChanges().forEach(c => {
        const d = c.doc.data();
        if (c.type === "added" && d.t > HX.t0 && d.u !== me) toast("📣 @" + d.u + " memulai demo: " + String(d.jd).slice(0, 40));
        if (c.type === "modified" && prev[c.doc.id] && prev[c.doc.id] !== d.status && d.u !== me && d.status !== "berlangsung") toast("🏛 Walikota: " + (STL[d.status] || "") + " · " + String(d.jd).slice(0, 30));
      });
      s.docs.forEach(x => prev[x.id] = x.data().status); first = false;
      if (tab === "demo" && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { const st = sheet.scrollTop; vDemo(); sheet.scrollTop = st; }
      else fillDemo();
      if (tab === "admin" && isAdmin && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { const st = sheet.scrollTop; vAdmin(); sheet.scrollTop = st; }
    }, e => console.warn("demo:", e));
    db.doc("kota/fitur").onSnapshot(x => { if (x.exists) { HX.CFG = Object.assign({ kuota: {}, lamp: "" }, x.data()); if (tab === "kerja") vKerja(); } }, () => {});
  }

  /* ---------- rumah warga yang tertimpa zona baru dipindahkan ---------- */
  setInterval(() => {
    let ch = false;
    Object.values(S.warga).forEach(w => {
      if (w.status !== "warga" || typeof w.lot !== "number" || !lots[w.lot]) return;
      if (!(isAdmin || w.u === me) || !zoneOf(lots[w.lot][0], lots[w.lot][1])) return;
      ensureCapacity(); const n = freeLot(); if (n >= 0) { w.lot = n; log("🏗 Rumah @" + w.u + " dipindah karena pembangunan fasilitas kota"); ch = true; }
    });
    if (ch) save();
  }, 5000);

  /* ---------- PANEL WALIKOTA ---------- */
  const oAdmin = window.vAdmin;
  window.vAdmin = function () {
    oAdmin(); if (!isAdmin) return;
    const stats = sheet.querySelector(".stats"); if (!stats) return;
    const m = HX.mood(), dl = HX.DM.slice().sort((a, b) => b.t - a.t).filter(d => d.status !== "selesai").slice(0, 12);
    const lampB = [["", "Otomatis"], ["on", "Paksa nyala"], ["off", "Paksa padam"]];
    stats.insertAdjacentHTML("afterend", `<div id="hxa">
      <p><b>📣 Aspirasi & demo warga</b> <span class="mut">· kepuasan kota ${mEmo(m)} ${m}%</span></p>
      ${dl.length ? dl.map(d => `<div class="jc"><span class="tag" style="background:${KC[d.kat] || "#555"}">${esc(d.kat || "")}</span><b>${esc(d.jd)}</b><br>
        <small>@${esc(d.u)} · 👥 ${(d.dukung || []).length} · ${STL[d.status] || ""}${d.tg && d.tg !== "Kota secara umum" ? " · 🏗 " + esc(d.tg) : ""}</small>
        <input id="hxr-${esc(d.id)}" maxlength="160" placeholder="Tanggapan Walikota (opsional)" value="${esc(d.balas || "")}">
        <button class="btn s" data-x="dm|didengar|${esc(d.id)}">👂 Tangkap aspirasi</button><button class="btn s" data-x="dm|ditindak|${esc(d.id)}">🔧 Mulai perbaikan</button><button class="btn g s" data-x="dm|selesai|${esc(d.id)}">✅ Selesai</button></div>`).join("") : `<p class="mut">Tidak ada demo aktif. Kota tenang.</p>`}
      <div class="err" id="hxe"></div>
      <p><b>💼 Lowongan kerja</b> <span class="mut">(kuota per jabatan)</span></p>
      ${JOBS.map(j => `<div class="row"><span>${j.e} ${esc(j.n)}<br><small>terisi ${cnt(j.id)}/${kuota(j)}</small></span><span><button class="btn s" data-x="kq|${j.id}|-1">−</button><button class="btn s" data-x="kq|${j.id}|1">+</button></span></div>`).join("")}
      <p><b>💡 Lampu jalan</b> <span class="mut">(otomatis: nyala malam, padam pagi)</span></p>
      <div>${lampB.map(l => `<button class="btn s${HX.CFG.lamp === l[0] ? " g" : ""}" data-x="lamp|${l[0] || "auto"}">${l[1]}</button>`).join("")}</div></div>`);
    $("#hxa").onclick = async e => {
      const a = (e.target.dataset.x || "").split("|"); if (!a[0]) return; e.stopPropagation();
      const he = t => { const el = $("#hxe"); if (el) el.textContent = t; };
      if (a[0] === "dm") {
        const d = HX.DM.find(q => q.id === a[2]); if (!d) return;
        const inp = $("#hxr-" + a[2]), balas = inp ? inp.value.trim() : "";
        try {
          await dmUpd(a[2], { status: a[1], balas, tgl: Date.now() });
          log("🏛 Walikota " + ({ didengar: "menangkap aspirasi demo", ditindak: "mulai memperbaiki", selesai: "menyelesaikan tuntutan demo" })[a[1]] + ": " + d.jd);
          if (a[1] === "selesai" && d.tg && d.tg !== "Kota secara umum") await doReno(d.tg);
          save();
        } catch (x) { return he("Gagal menyimpan. Pastikan aturan Firestore mengizinkan koleksi 'demo'."); }
        vAdmin();
      } else if (a[0] === "kq") {
        const j = jobOf(a[1]); if (!j) return; HX.CFG.kuota = HX.CFG.kuota || {}; HX.CFG.kuota[j.id] = clamp(kuota(j) + (+a[2]), 0, 50); saveCFG(); vAdmin();
      } else if (a[0] === "lamp") { HX.CFG.lamp = a[1] === "auto" ? "" : a[1]; saveCFG(); vAdmin(); }
    };
  };
  function saveCFG() { S.fitur = HX.CFG; save(); const d = DBX(); if (d) d.doc("kota/fitur").set(HX.CFG).catch(() => {}); }
});
})();
