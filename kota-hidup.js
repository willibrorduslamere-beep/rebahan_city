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
  { id: "bandara",   n: "Petugas Bandara",        e: "✈️", wp: "bandara",     g: 80,  d: 90,  lv: 2, q: 4 },
  { id: "penambang", n: "Penambang",              e: "⛏️", wp: "tambang",     g: 110, d: 120, lv: 3, q: 5 },
  { id: "dokter",    n: "Dokter",                 e: "🩺", wp: "rumahsakit",  g: 95,  d: 90,  lv: 2, q: 3 },
  { id: "perawat",   n: "Perawat",                e: "💉", wp: "rumahsakit",  g: 70,  d: 75,  lv: 2, q: 5 }
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
    const o = { n: d[0], k: d[1], i: t[0], j: t[1], hh: d[1] === "rumahsakit" ? 96 : d[1] === "kantor" ? 108 : d[1] === "pabrik" ? 100 : d[1] === "supermarket" ? 62 : 56 };
    PO[t[0] + "," + t[1]] = o; POL.push(o);
  });
  const nb = d => { const r = [d]; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(p => { const t = [d[0] + p[0], d[1] + p[1]]; if (walkOK(t[0], t[1])) r.push(t); }); return r; };
  HX.POL = POL;
  POL.forEach(o => { const dd = door(o.i, o.j); WPT[o.k] = nb(dd); POD.push(dd); });
  const zt = k => { const z = ZN.find(q => q.k === k), r = []; for (let i = z.i0; i <= z.i1; i++) for (let j = z.j0; j <= z.j1; j++) if (!ZBLK[i + "," + j]) r.push([i, j]); return r; };
  WPT.sawah = zt("sawah"); WPT.ternak = zt("ternak"); WPT.tambang = zt("tambang"); WPT.bandara = zt("bandara").filter(q => q[0] === -10); TWK = zt("tugu");
  WPT.pasar = MZ; WPT.pelabuhan = PZ; WPT.rumahsakit = zt("rs");
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
HX.late = function (s) { if (s === -12) tower(performance.now()); if (s === -13) planesWorld(performance.now()); };

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

/* ---- Bandara ---- */
const TERM = [-10, -7], ATC = [-10, -5], WSOCK = [-10, -10], PARKED = [-10, -9];
function planeBody(sc, col) {
  ctx.fillStyle = col || "#fff"; ctx.strokeStyle = "#555"; ctx.lineWidth = 1 / sc; ctx.beginPath(); ctx.ellipse(0, 0, 24, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke();
  poly([-2, -3, -9, -22, -3, -22, 6, -3], "#e6e6e6"); poly([-2, 3, -9, 22, -3, 22, 6, 3], "#d2d2d2");
  poly([-21, -1, -28, -10, -23, -10, -15, -1], "#e07b39"); cir(18, -1, 2, "#6fa8c8");
}
function worldPlane(x, y, alt, ang, sc) {
  ctx.fillStyle = "rgba(0,0,0," + (.22 - Math.min(.15, alt / 500)).toFixed(2) + ")"; ctx.beginPath(); ctx.ellipse(x, y + 2, 22 * sc, 5 * sc, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y - alt - 6); ctx.rotate(ang); ctx.scale(sc, sc * .8); planeBody(sc); ctx.restore();
}
const RUNANG = Math.atan2(16, -32);
function runwayPt(j) { return [(-11 - j) * 32, (-11 + j) * 16]; }
function bandara(i, j, x, y, now, names) {
  const night = HX.night, par = (i + j) % 2;
  if (i === -11) {
    tile(x, y, "#5a5d66"); ctx.strokeStyle = "#f4f4f4"; ctx.lineWidth = 2; ctx.beginPath();
    [[-.38, -.16], [.14, .36]].forEach(d => { const p = pt(x, y, 0, d[0]), q = pt(x, y, 0, d[1]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); });
    ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.beginPath();
    [-.42, .42].forEach(a => { const p = pt(x, y, a, -.5), q = pt(x, y, a, .5); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }); ctx.stroke();
    if (j === -11 || j === -4) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -2; k <= 2; k++) { const p = pt(x, y, k * .15, j === -11 ? -.4 : .4), q = pt(x, y, k * .15, j === -11 ? -.22 : .22); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } ctx.stroke(); }
    if (night) { const bl = Math.sin(now / 350 + j) > -.2; [-.46, .46].forEach(a => { const p = pt(x, y, a, 0); cir(p[0], p[1], 1.8, bl ? "#ffd24a" : "#8a6d1c"); }); gl(x, y, 40, .5); }
    return;
  }
  tile(x, y, par ? "#9a9da5" : "#8f929a");
  ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 1.4; ctx.beginPath(); const p = pt(x, y, -.3, -.5), q = pt(x, y, -.3, .5); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  if (i === TERM[0] && j === TERM[1]) {
    const g = isoBox(x, y, 15, 15, 20, "#eef1f5", "#d3dae3", "#b6c0ce");
    faceQ(g.Fr, g.Rt, .06, .94, 3, 13, night ? "#ffe9a8" : "#8cc4ea"); faceQ(g.Lf, g.Fr, .08, .92, 3, 13, night ? "#ffdf8a" : "#7db6de");
    faceQ(g.Fr, g.Rt, 0, 1, 15.5, 20, "#2a6fd0"); faceQ(g.Lf, g.Fr, 0, 1, 15.5, 20, "#1f58ab"); faceQ(g.Fr, g.Rt, .4, .6, 0, 8, "#3b5a78");
    isoBox(x, y - 20, 16, 16, 3, "#dfe5ec", "#c5cdd8", "#aab4c2");
    ctx.save(); ctx.translate(g.Fr[0], g.Fr[1] - 17.5); ctx.transform(1, -.5, 0, 1, 0, 0); ctx.font = "bold 6.5px Segoe UI,sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("BANDARA", 15, 0); ctx.restore();
    names.unshift(["✈ " + nm("Bandara Rebahan"), x, y - 70]); if (night) gl(x, y - 10, 70, .8);
  } else if (i === ATC[0] && j === ATC[1]) {
    isoBox(x, y, 3.5, 3.5, 52, "#e8ecf1", "#cfd6df", "#b3bcc9"); isoBox(x, y - 52, 6.5, 6.5, 9, "#9fd0ee", "#7fb8dc", "#5f9cc4"); isoBox(x, y - 61, 7.5, 7.5, 2, "#cfd6df", "#b3bcc9", "#9aa5b4");
    ctx.strokeStyle = "#8a8f98"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 63); ctx.lineTo(x, y - 76); ctx.stroke();
    const on = Math.sin(now / 500) > 0; cir(x, y - 77, 2.4, on ? "#ff4d3d" : "#7a2a22"); if (on && night) gl(x, y - 77, 40, .9);
  } else if (i === WSOCK[0] && j === WSOCK[1]) {
    ctx.strokeStyle = "#777"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 30); ctx.stroke();
    const w = Math.sin(now / 500) * 3; poly([x, y - 30, x + 14, y - 27 + w, x + 14, y - 22 + w, x, y - 24], "#f08a2a"); poly([x + 5, y - 29, x + 8, y - 28 + w, x + 8, y - 23 + w, x + 5, y - 24], "#fff");
  } else if (i === PARKED[0] && j === PARKED[1]) worldPlane(x, y - 2, 0, RUNANG, .75);
}
function planesWorld(now) {
  if (!visT(-340, -200, 260) && !visT(-330, -240, 260)) return;
  (typeof planes !== "undefined" ? planes : []).forEach(p => {
    const u = (now - p.t0) / p.dur; if (u < 0 || u > 1) return;
    let j, alt;
    if (u < .3) { const k = u / .3, e = 1 - Math.pow(1 - k, 2); j = -17 + 9 * e; alt = 80 * Math.pow(1 - k, 1.6); }
    else if (u < .8) { j = -8; alt = 0; }
    else { const k = (u - .8) / .2; j = -8 + 14 * k * k; alt = 110 * k * k; }
    const q = runwayPt(j); worldPlane(q[0], q[1], alt, RUNANG, 1.1);
    if (u >= .3 && u < .8) pill(String(p.txt).slice(0, 34), q[0], q[1] - 34);
  });
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
function rumahsakit(x, y, name) {
  y -= 2; poly([x - 36, y, x, y - 18, x + 36, y, x, y + 18], "#e8ecef");
  const w = 17, H = 62, g = isoBox(x, y, w, w, H, "#f4f8fb", "#e3ebf1", "#cfdae3"), lit = HX.night;
  for (let f = 0; f < 5; f++) for (let c = 0; c < 4; c++) {
    const on = lit && rr(f * 5 + c, 9) > .35, col = on ? "#fff0b0" : "#bfe3f4";
    faceQ(g.Fr, g.Rt, .08 + c * .23, .08 + c * .23 + .15, 14 + f * 9, 14 + f * 9 + 5.6, col);
    faceQ(g.Lf, g.Fr, .08 + c * .23, .08 + c * .23 + .15, 14 + f * 9, 14 + f * 9 + 5.6, on ? "#ffe39a" : "#a9d3e8");
  }
  faceQ(g.Fr, g.Rt, .36, .64, 0, 11, "#6d8ba3"); faceQ(g.Fr, g.Rt, .4, .6, 0, 10, lit ? "#fff0b0" : "#cfe9f6");
  faceQ(g.Fr, g.Rt, 0, 1, H - 6, H - 3, "#e5484d");
  ctx.save(); ctx.translate(g.Fr[0], g.Fr[1] - H * .5 - 2); ctx.transform(1, -.5, 0, 1, 0, 0);
  ctx.fillStyle = "#fff"; ctx.fillRect(w - 9, -9, 18, 18); ctx.fillStyle = "#e5484d"; ctx.fillRect(w - 2.5, -8, 5, 16); ctx.fillRect(w - 8, -2.5, 16, 5); ctx.restore();
  isoBox(x, y - H, 12, 12, 4, "#d6dde3", "#bfc9d1", "#a9b5bf");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - H - 6, 8, 4, 0, 0, 7); ctx.stroke();
  ctx.font = "bold 8px Segoe UI,sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("H", x, y - H - 6);
  const on2 = Math.sin(performance.now() / 420) > 0; cir(x + 10, y - H - 8, 2.2, on2 ? "#ff4d3d" : "#7a2a22");
  if (lit) gl(x, y - H * .5, 84, 1);
  if (S.reno && S.reno[name]) { ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✨", x + 32, y - H * .7 + Math.sin(performance.now() / 250) * 3); }
}
function rsTile(i, j, x, y, now, names) {
  tile(x, y, (i + j) % 2 ? "#e6edf2" : "#dae3ea");
  if (i === 5 && j === -8) { rumahsakit(x, y, "Rumah Sakit Rebahan"); names.unshift(["Rumah Sakit Rebahan" + ((S.reno && S.reno["Rumah Sakit Rebahan"]) ? " ✨" : ""), x, y - 98]); return; }
  if ((i === 4 || i === 6) && (j === -9 || j === -7)) { [[-9, -2], [8, 1], [-2, 6], [10, -4]].forEach((p, k) => cir(x + p[0], y + p[1] - 5, 5 - (k % 2), k % 2 ? "#3f9a5b" : "#4fae6a")); return; }
  if (i === 6 && j === -8) {
    const g = isoBox(x - 4, y, 7, 10, 8, "#ffffff", "#f2f4f6", "#dde2e7"); faceQ(g.Fr, g.Rt, 0, 1, 3, 5, "#e5484d"); faceQ(g.Lf, g.Fr, .15, .85, 4, 7, "#9fd4ee");
    const on = Math.sin(performance.now() / 160) > 0; cir(x - 4, y - 10, 1.8, on ? "#ff3b30" : "#3b82f6"); return;
  }
  if (i === 5 && j === -7) { ctx.fillStyle = "#e5484d"; ctx.beginPath(); ctx.roundRect(x - 13, y - 22, 26, 11, 3); ctx.fill(); ctx.font = "bold 8px Segoe UI,sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("IGD 24 JAM", x, y - 16.5, 24); ctx.strokeStyle = "#8a8f98"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 2); ctx.stroke(); }
  if (i === 5 && j === -9) { cir(x, y - 3, 7, "#a9d8ef"); cir(x, y - 3, 4, "#cdebf8"); }
}
function drawPO(o, x, y, now) {
  if (SHOP[o.k]) shop(x, y, SHOP[o.k], o.n); else if (o.k === "rumahsakit") rumahsakit(x, y, o.n); else if (o.k === "kantor") kantor(x, y, o.n); else pabrik(x, y, now, o.n);
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
    else if (z === "bandara") bandara(i, j, x, y, now, names);
    else if (z === "rs") rsTile(i, j, x, y, now, names);
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
  ["kasir-s", 2, "supermarket", "Pramuniaga", "#2a9d5c", 0], ["karyawan", 3, "kantor", "Karyawan", "#5a6f8f", 0], ["bandara", 2, "bandara", "Petugas", "#f28c1e", 0], ["operator", 2, "pabrik", "Operator", "#e07b39", 0], ["dokter-npc", 2, "rumahsakit", "Dokter", "#f4f8fb", 0], ["perawat-npc", 2, "rumahsakit", "Perawat", "#7fd1c7", 0]
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
  if (a.buy) {
    const t = WPT[a.buy.k];
    if (t && t.length) { if (near(t)) { const b = a.buy; a.buy = null; try { b.done(); } catch (e) {} return stay(3500); } return go(rnd(t)); }
  }
  if (w.rwt && w.rwt.u > Date.now() && WPT.rumahsakit && WPT.rumahsakit.length) return near(WPT.rumahsakit) ? stay(5000 + Math.random() * 4000) : go(rnd(WPT.rumahsakit));
  if (w.sh && w.sh.e > Date.now() && jobOf(w.job)) {
    const t = WPT[jobOf(w.job).wp]; a.wk = w.job;
    if (t && t.length) return near(t) && Math.random() < .6 ? stay(3000 + Math.random() * 3000) : go(rnd(t));
  }
  const md = act.find(d => (d.dukung || []).includes(a.u));
  if (md) { a.dm = md; return Math.random() < .5 ? stay(3000 + Math.random() * 4000) : go(rnd(SPOT)); }
  const r = Math.random();
  if (r < .12 && TWK.length) return go(rnd(TWK));
  if (r < .2 && POD.length) return go(rnd(POD));
  if (r < .27) { const sh = POL.filter(o => SHOP[o.k]); if (sh.length && WPT[rnd(sh).k]) { const s = rnd(sh); return near(WPT[s.k]) ? stay(2500 + Math.random() * 2500) : go(rnd(WPT[s.k])); } }
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
  if (a.k === "r") { const w = S.warga[a.u]; if (w) { const e = (w.rwt && w.rwt.u > Date.now()) ? "🏥" : w.sk ? "🤒" : (a.buy ? a.buy.it.e : (w.hs != null && w.hs < 25) ? "🥤" : (w.kn != null && w.kn < 25) ? "🍙" : ""); if (e) { ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(e, x, y - 56 + Math.sin(t / 300) * 2); } } }
  if (a.k === "r" && a.wk && a.mode !== "in") { const j = jobOf(a.wk); if (j) { ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(j.e, x, y - 44 + Math.sin(t / 300) * 2); } }
};

/* ===================== UI: gaya tambahan ===================== */
(function () {
  const st = document.createElement("style");
  st.textContent = "nav button{position:relative}.bdg{position:absolute;top:2px;right:calc(50% - 24px);background:#e5484d;color:#fff;border-radius:10px;font-size:10px;padding:0 5px;font-style:normal;font-weight:700}" +
    ".jc{border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0;background:rgba(255,255,255,.45)}.jc.on{border:2px solid var(--ok)}" +
    ".pbar{height:12px;border-radius:8px;background:rgba(0,0,0,.14);overflow:hidden;margin:6px 0}.pbar i{display:block;height:100%;background:var(--ok);transition:width 1s linear}" +
    ".bub{display:inline-block;max-width:82%;padding:5px 10px;border-radius:14px;background:rgba(255,255,255,.75);text-align:left}.bub.me{background:var(--acc);color:#fff}.bub b{font-size:12px}.bub small{opacity:.65;margin-left:6px;font-size:10px}" +
    ".tag{display:inline-block;border-radius:8px;padding:0 8px;font-size:12px;font-weight:700;color:#fff;margin-right:4px}" +
    ".hbrow{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:14px}.hbrow>span{width:132px}.hbrow b{width:44px;text-align:right}.hb{flex:1;height:12px;border-radius:8px;background:rgba(0,0,0,.14);overflow:hidden}.hb i{display:block;height:100%;transition:width .8s}" +
    ".bub.dr{background:#dff5ea;border:1px solid #9bd6b5}" +
    "#hud{position:absolute;left:10px;top:64px;z-index:5;display:none;background:rgba(255,255,255,.78);border-radius:12px;padding:5px 8px;font-size:12px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 8px rgba(0,0,0,.15)}#hud span{display:flex;align-items:center;gap:5px;margin:2px 0}#hud i{display:block;width:54px;height:7px;border-radius:5px;background:rgba(0,0,0,.15);overflow:hidden}#hud i b{display:block;height:100%}";
  document.head.appendChild(st);
})();

/* ===================== LOAD: sambungkan ke UI & database ===================== */
window.addEventListener("load", function () {
  const db = DBX();
  try { if (S.fitur) HX.CFG = Object.assign({ kuota: {}, lamp: "" }, S.fitur); } catch (e) {}
  HX.DM = S.demos || [];

  /* ---------- tab baru ---------- */
  const nav = $("#nav"), adm = nav.querySelector('[data-t="admin"]');
  [["demo", "📣", "Demo"], ["kerja", "💼", "Kerja"], ["sehat", "🩺", "Sehat"], ["obrol", "💬", "Obrolan"]].forEach(a => {
    const b = document.createElement("button"); b.dataset.t = a[0]; b.innerHTML = "<span>" + a[1] + "</span>" + a[2]; nav.insertBefore(b, adm);
  });
  const TABS = { demo: vDemo, kerja: vKerja, sehat: vSehat, obrol: vObrol };
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
  const TARGETS = () => ["Kota secara umum"].concat(LML.map(o => o.n), POL.map(o => o.n), ["Taman Tugu Rebahan", "Rumah Sakit Rebahan", "Persawahan Rebahan", "Peternakan Rebahan", "Tambang Rebahan", "Bandara Rebahan", "Pasar Rebahan", "Pelabuhan"]);

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
        if (w2.rwt && w2.rwt.u > Date.now()) return err("Kamu sedang dirawat di Rumah Sakit.");
        if (w2.sk) return err("Kamu sedang sakit (" + w2.sk.n + "). Periksa ke Rumah Sakit di tab Sehat dulu.");
        if (w2.hs != null && (w2.hs <= 0 || w2.kn <= 0)) return err("Kamu terlalu lapar/haus untuk bekerja. Makan atau minum dulu (tab Sehat).");
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

  /* =====================================================================
     SEHAT: darah, kenyang (lapar), segar (haus), toko, rumah sakit, dokter
     - Data kesehatan disimpan di data warga (S.warga[u]) di perangkat pemain
     - Konsultasi dokter real-time lewat ruang obrolan "dr_<username>"
     - Antrean pasien lewat koleksi Firestore "rs" (atau lokal bila offline)
     - 1 "hari" rawat inap = HARI_RS milidetik (supaya cepat dimainkan)
     ===================================================================== */
  const HARI_RS = 180000;                    /* 1 hari rawat = 3 menit nyata (ubah di sini) */
  const BIAYA_KONSUL = 15, BIAYA_RAWAT = 25; /* koin; kalau koin kurang, ditanggung kota */
  const ITEMS = [
    { id: "air",     n: "Air mineral",         e: "💧", p: 5,  k: "minum", h: 38, s: 1 },
    { id: "teh",     n: "Es teh manis",        e: "🧋", p: 8,  k: "minum", h: 45, l: 5, s: 1 },
    { id: "jus",     n: "Jus buah segar",      e: "🥤", p: 12, k: "minum", h: 55, hp: 2, s: 2 },
    { id: "roti",    n: "Roti isi",            e: "🥪", p: 8,  k: "makan", l: 30, s: 1 },
    { id: "mie",     n: "Mie instan",          e: "🍜", p: 10, k: "makan", l: 42, h: -5, s: 1 },
    { id: "nasi",    n: "Nasi bungkus",        e: "🍱", p: 15, k: "makan", l: 58, s: 2 },
    { id: "komplit", n: "Paket sehat komplit", e: "🥗", p: 28, k: "makan", l: 80, h: 15, hp: 6, s: 2 },
    { id: "vit",     n: "Vitamin C",           e: "💊", p: 18, k: "obat",  hp: 12, s: 1 }
  ];
  const PEN = [{ n: "Flu", s: 1 }, { n: "Demam", s: 1 }, { n: "Sakit kepala", s: 1 }, { n: "Radang tenggorokan", s: 1 }, { n: "Tifus ringan", s: 2 }];
  const NPC_DR = "dr.jaga";
  const DRN = "dr. Jaga (dokter jaga RS Rebahan)";
  const rsDoc = u => { const d = DBX(); return d ? d.doc("rs/" + u) : null; };
  HX.RS = Object.values(S.rs || {});
  const pc = v => Math.round(clamp(v, 0, 100));
  const barCol = v => v >= 60 ? "#2fb36a" : v >= 30 ? "#f0a828" : "#e0463c";
  const isDokter = w => !!(w && w.job === "dokter");

  function hInit(w) {
    if (w.hp == null) { w.hp = 100; w.kn = 85; w.hs = 85; w.ht = Date.now(); }
    if (w.kn == null) w.kn = 85; if (w.hs == null) w.hs = 85; if (!w.ht) w.ht = Date.now();
    return w;
  }
  const rawatAktif = w => !!(w && w.rwt && w.rwt.u > Date.now());
  const sakitNow = w => !!(w && w.sk);
  function nearestShop(w, kind) {
    const L = w && lots[w.lot]; const from = L || [0, 0];
    return POL.filter(o => SHOP[o.k])
      .map(o => ({ o, d: Math.hypot(o.i - from[0], o.j - from[1]) })).sort((a, b) => a.d - b.d);
  }
  const sells = (shopK, it) => shopK === "supermarket" || (it.s === 1);

  /* ---------- mesin waktu kesehatan ---------- */
  function sickOnset(w, cause) {
    let p = cause === "haus" ? { n: "Dehidrasi", s: 1 } : cause === "lapar" ? { n: "Maag", s: 1 } : PEN[Math.floor(Math.random() * PEN.length)];
    w.sk = { n: p.n, s: p.s, t: Date.now(), cause: cause || "umum" };
    log("🤒 @" + w.u + " jatuh sakit: " + p.n); toast("🤒 Kamu sakit: " + p.n + ". Periksa ke Rumah Sakit di tab Sehat.");
  }
  function pingsan(w) {
    w.hp = 20; w.sk = w.sk || { n: "Kelelahan berat", s: 3, t: Date.now(), cause: "pingsan" };
    startRawat(w, 1, "Tim ambulans RS Rebahan", true);
    log("🚑 @" + w.u + " pingsan dan dibawa ambulans ke Rumah Sakit"); toast("🚑 Kamu pingsan! Ambulans membawamu ke Rumah Sakit.");
    const a = AG[w.u]; if (a) a.until = 0;
  }
  function healthTick(w) {
    hInit(w); const now = Date.now(), m = Math.min(now - w.ht, 30 * 60e3) / 60e3; w.ht = now; if (m <= 0) return;
    const inRs = rawatAktif(w), work = !!(w.sh && w.sh.e > now), mult = work ? 1.6 : 1;
    if (w.rwt && !inRs) { selesaiRawat(w); return; }
    w.kn = clamp(w.kn - m * (inRs ? .3 : .9) * mult, 0, 100);
    w.hs = clamp(w.hs - m * (inRs ? .5 : 1.4) * mult, 0, 100);
    if (inRs) { w.kn = Math.max(w.kn, 55); w.hs = Math.max(w.hs, 55); w.hp = clamp(w.hp + m * 5, 0, 100); return; }
    let d = 0; if (w.kn <= 0) d -= 2; if (w.hs <= 0) d -= 2; if (w.sk) d -= 1.2;
    if (!d && w.kn >= 50 && w.hs >= 50 && !w.sk) d = 1.2;
    w.hp = clamp(w.hp + d * m, 0, 100);
    if (!w.sk) {
      const risk = (w.hs < 15 ? .12 : 0) + (w.kn < 15 ? .10 : 0) + (w.hp < 45 ? .08 : 0) + .004;
      if (Math.random() < 1 - Math.pow(1 - risk, m)) sickOnset(w, w.hs < 15 ? "haus" : w.kn < 15 ? "lapar" : "umum");
    }
    if (w.hp <= 0) pingsan(w);
  }
  function selesaiRawat(w) {
    const dr = w.rwt && w.rwt.dr; w.rwt = null; w.sk = null; w.hp = Math.max(w.hp || 0, 85); w.kn = Math.max(w.kn, 70); w.hs = Math.max(w.hs, 70);
    log("✅ @" + w.u + " sembuh dan pulang dari Rumah Sakit"); toast("✅ Kamu sudah sembuh dan boleh pulang. Jaga makan & minum ya!");
    const r = rsDoc(w.u); if (r) r.set({ u: w.u, st: "pulang", t: Date.now() }, { merge: true }).catch(() => {}); else if (S.rs && S.rs[w.u]) S.rs[w.u].st = "pulang";
    chatSend("dr_" + w.u, { k: "sys", u: NPC_DR, tx: "✅ @" + w.u + " dinyatakan sembuh dan pulang. " + (dr ? "(" + dr + ")" : "") }).catch(() => {});
    save(); const a = AG[w.u]; if (a) a.until = 0; softS();
  }
  function startRawat(w, days, drName, free) {
    const cost = free ? 0 : BIAYA_RAWAT * days, bayar = (w.coin || 0) >= cost ? cost : 0;
    w.coin = (w.coin || 0) - bayar; w.sh = null;
    w.rwt = { u: Date.now() + days * HARI_RS, h: days, dr: drName, t0: Date.now(), paid: bayar, gratis: bayar < cost || free };
    log("🏥 @" + w.u + " dirawat " + days + " hari di Rumah Sakit (" + drName + ")");
    toast("🏥 Dirawat " + days + " hari" + (bayar ? " · biaya " + bayar + " 🪙" : " · ditanggung kota")); save(); const a = AG[w.u]; if (a) a.until = 0;
  }

  /* ---------- beli makan / minum ---------- */
  function applyItem(w, it) {
    w.kn = clamp((w.kn == null ? 85 : w.kn) + (it.l || 0), 0, 100); w.hs = clamp((w.hs == null ? 85 : w.hs) + (it.h || 0), 0, 100); w.hp = clamp((w.hp == null ? 100 : w.hp) + (it.hp || 0), 0, 100);
    if (w.sk && w.sk.cause === "haus" && w.hs > 50) { w.sk = null; toast("💧 Dehidrasi teratasi"); }
    if (w.sk && w.sk.cause === "lapar" && w.kn > 50) { w.sk = null; toast("🍙 Maag mereda"); }
    save();
  }
  function buyItem(it, shopK, auto) {
    const w = wk(); if (!w || w.status !== "warga") return "Hanya warga resmi.";
    hInit(w); if (rawatAktif(w)) return "Kamu sedang dirawat. Makanan & minuman sudah disediakan RS.";
    if ((w.coin || 0) < it.p) return "Koin tidak cukup (butuh " + it.p + " 🪙).";
    const shop = POL.find(o => o.k === shopK); if (!shop) return "Toko tidak ditemukan.";
    if (!sells(shopK, it)) return shop.n + " tidak menjual " + it.n + ".";
    if (AG[me] && AG[me].buy) return "Kamu masih dalam perjalanan membeli sesuatu.";
    w.coin -= it.p; save();
    toast((auto ? "🤖 " : "🛒 ") + "Menuju " + shop.n + " untuk beli " + it.n + "...");
    const done = () => { const ww = wk(); if (!ww) return; const a = AG[me]; if (a) a.buy = null; applyItem(ww, it); toast(it.e + " " + it.n + " dikonsumsi " + (it.k === "minum" ? "· glek glek" : it.k === "makan" ? "· nyam nyam" : "")); softS(); };
    const a = AG[me]; if (a) { a.buy = { k: shopK, it, done, t: Date.now() }; a.until = 0; setTimeout(() => { if (a.buy && a.buy.done === done) done(); }, 15000); } else done();
    return "";
  }
  function autoBeli(w) {
    if (w.auto === false || rawatAktif(w) || (AG[me] && AG[me].buy)) return;
    const need = w.hs < 25 ? "minum" : w.kn < 25 ? "makan" : null; if (!need) return;
    const list = ITEMS.filter(i => i.k === need && i.p <= (w.coin || 0)).sort((a, b) => a.p - b.p); if (!list.length) return;
    const it = need === "minum" ? list[0] : list[Math.min(1, list.length - 1)];
    for (const s of nearestShop(w)) { if (sells(s.o.k, it)) { buyItem(it, s.o.k, true); return; } }
  }

  /* ---------- konsultasi dokter ---------- */
  let drOff = null, drStage = {}, drTimers = [], rsOff = null, rsMe = null, myRsOff = null;
  const clearTimers = () => { drTimers.forEach(clearTimeout); drTimers = []; };
  const later = (ms, f) => drTimers.push(setTimeout(f, ms));
  const room = u => "dr_" + u;
  async function sayDr(u, tx, npc, extra) { try { await chatSend(room(u), Object.assign({ k: "msg", u: npc ? NPC_DR : me, r: "d", npc: npc ? 1 : 0, tx }, extra || {})); } catch (e) {} }
  async function saveRs(rec) {
    const r = rsDoc(rec.u); if (r) { try { await r.set(rec, { merge: true }); } catch (e) {} } else { S.rs = S.rs || {}; S.rs[rec.u] = Object.assign(S.rs[rec.u] || {}, rec); HX.RS = Object.values(S.rs); save(); }
  }
  function npcDecide(w) {
    if (!w || drStage[w.u] === "decided") return; drStage[w.u] = "decided";
    const s = (w.sk && w.sk.s) || 1, hp = w.hp || 0, ringan = hp >= 70 && !w.sk;
    if (ringan) {
      sayDr(w.u, "Hasil pemeriksaan: kondisi Anda cukup baik, tidak perlu rawat inap. Saya resepkan vitamin dan istirahat. Pastikan makan teratur dan cukup minum ya.", true);
      w.hp = clamp(w.hp + 10, 0, 100); w.sk = null; saveRs({ u: w.u, st: "rawatjalan", hari: 0, dr: NPC_DR, dec: Date.now(), t: Date.now() }); save(); softS(); return;
    }
    const days = hp < 25 ? 3 : (hp < 50 || s > 1) ? 2 : 1;
    sayDr(w.u, "Keputusan saya: Anda perlu rawat inap selama " + days + " hari (±" + Math.round(days * HARI_RS / 60000) + " menit waktu nyata). Selama dirawat, makan & minum ditanggung rumah sakit. Silakan beristirahat, dan boleh mengobrol dengan saya di sini kapan saja.", true);
    startRawat(w, days, DRN);
    saveRs({ u: w.u, st: "dirawat", hari: days, dr: NPC_DR, dec: Date.now(), t: Date.now() }); softS();
  }
  function npcAssess(w) {
    if (!w || drStage[w.u] !== "new") return; drStage[w.u] = "assessed";
    sayDr(w.u, "Saya sudah cek data Anda: darah " + pc(w.hp) + "%, kenyang " + pc(w.kn) + "%, segar " + pc(w.hs) + "%." + (w.sk ? " Dugaan saya: " + w.sk.n + "." : " Tidak ada penyakit serius terdeteksi.") + " Ada keluhan tambahan?", true);
    later(8000, () => npcDecide(wk()));
  }
  function npcFlow(w) {
    drStage[w.u] = "new"; clearTimers();
    later(1200, () => sayDr(w.u, "Selamat datang di RS Rebahan, @" + w.u + ". Saya dr. Jaga. Boleh ceritakan keluhan Anda?", true));
    later(6000, () => npcAssess(wk()));
  }
  const KW = [
    [/pusing|kepala/, "Pusing bisa karena kurang cairan atau kurang istirahat. Minum air putih dan tidur cukup ya."],
    [/demam|panas|meriang/, "Demam tandanya tubuh sedang melawan infeksi. Kami pantau suhu dan beri obat penurun panas."],
    [/mual|muntah|perut|maag/, "Keluhan perut biasanya terkait telat makan. Jangan lupa makan teratur, hindari yang pedas dulu."],
    [/haus|minum|dehidrasi/, "Cairan Anda sangat penting. Selama di sini minum disediakan, dan nanti beli minum di toko terdekat."],
    [/lapar|makan/, "Makanan rumah sakit sudah disiapkan untuk pasien. Kalau sudah pulang, beli makan di supermarket atau minimarket terdekat."],
    [/lemas|capek|lelah/, "Lemas wajar kalau tubuh kekurangan energi. Istirahat total dulu, jangan bekerja sebelum pulih."],
    [/pulang|boleh pulang|kapan/, null], [/terima kasih|makasih|thanks/, "Sama-sama. Cepat sembuh, @USER!"]
  ];
  function npcReply(w, tx) {
    const st = drStage[w.u], rem = rawatAktif(w) ? Math.max(1, Math.ceil((w.rwt.u - Date.now()) / 60000)) : 0;
    let out = null; const low = tx.toLowerCase();
    for (const [re, r] of KW) if (re.test(low)) { out = r === null ? (rem ? "Masih perlu observasi. Sisa waktu rawat sekitar " + rem + " menit lagi, mohon bersabar." : "Setelah pemeriksaan selesai, Anda boleh pulang.") : r.replace("@USER", "@" + w.u); break; }
    if (!out) out = st === "decided" ? ["Baik, saya catat. Tetap istirahat ya.", "Terima kasih infonya. Tim perawat akan memantau Anda.", "Tenang, kondisi Anda terus membaik."][Math.floor(Math.random() * 3)] : "Terima kasih, saya catat keluhan itu.";
    later(1400, () => sayDr(w.u, out, true));
    if (st === "new") later(2600, () => npcAssess(wk()));
    else if (st === "assessed") later(4200, () => npcDecide(wk()));
  }
  async function mintaPeriksa() {
    const w = wk(); if (!w || w.status !== "warga") return;
    hInit(w); if (rawatAktif(w)) { openDr(); return; }
    const fee = (w.coin || 0) >= BIAYA_KONSUL ? BIAYA_KONSUL : 0; w.coin -= fee; w.cs = { t: Date.now(), fee }; save();
    await saveRs({ u: w.u, kel: w.sk ? w.sk.n : "Cek kesehatan", st: "menunggu", t: Date.now(), hp: pc(w.hp), kn: pc(w.kn), hs: pc(w.hs), dr: "", dec: 0 });
    chatSend(room(w.u), { k: "sys", u: NPC_DR, tx: "🩺 @" + w.u + " mendaftar periksa" + (fee ? " (biaya " + fee + " 🪙)" : " (gratis)") }).catch(() => {});
    log("🩺 @" + w.u + " memeriksakan diri ke Rumah Sakit");
    const humanDr = DBX() && Object.values(S.warga).some(x => x.status === "warga" && x.job === "dokter" && x.u !== w.u);
    if (!humanDr) npcFlow(w);
    else { drStage[w.u] = "wait"; clearTimers(); later(25000, () => { const ww = wk(); if (ww && drStage[ww.u] === "wait") { sayDr(ww.u, "Dokter sedang menangani pasien lain, saya dokter jaga yang mengambil alih.", true); npcFlow(ww); } }); }
    openDr(); softS();
  }
  function renderDr(L) {
    const b = $("#dcb"); if (!b) return; const w = wk();
    if (w && drStage[w.u] === "wait" && L.some(m => m.r === "d" && !m.npc && m.u !== me)) { drStage[w.u] = "human"; clearTimers(); }
    b.innerHTML = L.map(m => {
      if (m.k === "sys") return `<div class="m s">${esc(m.tx)}</div>`;
      const mine = m.u === me, dr = m.r === "d", tm = new Date(m.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
      return `<div class="m" style="text-align:${mine ? "right" : "left"}"><span class="bub${mine ? " me" : dr ? " dr" : ""}"><b>${mine ? "kamu" : dr ? "🩺 " + (m.npc ? "dr. Jaga" : "dr. @" + esc(m.u)) : "@" + esc(m.u)}</b><br>${esc(m.tx)}<small>${tm}</small></span></div>`;
    }).join("") || `<div class="m s">Belum ada percakapan. Tulis keluhanmu untuk dokter.</div>`;
    b.scrollTop = b.scrollHeight;
  }
  function openDr(target) {
    const pu = target || me; if (!pu) return; if (drOff) { drOff(); drOff = null; }
    const box = $("#dcw"); if (!box) return;
    box.innerHTML = `<h3>💬 Ruang konsultasi · ${pu === me ? "kamu & dokter" : "pasien @" + esc(pu)}</h3><div class="chatbox" id="dcb" style="height:34vh"></div>
    <div style="display:flex;gap:6px"><input id="dct" maxlength="200" placeholder="${pu === me ? "Tulis keluhanmu..." : "Balas pasien..."}" autocomplete="off"><button class="btn" id="dcs">Kirim</button></div><div class="err" id="dce"></div>`;
    drOff = chatSub(room(pu), renderDr);
    const send = async () => {
      const i = $("#dct"), tx = i.value.trim(); if (!tx) return; i.value = "";
      try {
        if (pu === me) { await chatSend(room(pu), { k: "msg", u: me, r: "p", tx }); const w = wk(); if (w && !isDokter(w) && drStage[w.u] && drStage[w.u] !== "wait" && drStage[w.u] !== "human") npcReply(w, tx); }
        else await chatSend(room(pu), { k: "msg", u: me, r: "d", tx });
        const e = $("#dce"); if (e) e.textContent = "";
      } catch (e) { const el = $("#dce"); if (el) el.textContent = ERRW; }
    };
    $("#dcs").onclick = send; $("#dct").onkeydown = e => { if (e.key === "Enter") send(); };
  }
  function dokterTetapkan(pu, mode, days) {
    const rec = (HX.RS || []).find(r => r.u === pu); if (!rec) return;
    const patch = { st: mode === "rawat" ? "dirawat" : "rawatjalan", hari: mode === "rawat" ? days : 0, dr: me, dec: Date.now() };
    saveRs(Object.assign({ u: pu }, patch));
    const tx = mode === "rawat" ? "Hasil pemeriksaan: Anda harus dirawat inap " + days + " hari (±" + Math.round(days * HARI_RS / 60000) + " menit waktu nyata). Silakan istirahat di rumah sakit." : "Hasil pemeriksaan: tidak perlu rawat inap. Silakan pulang, minum obat dan istirahat.";
    sayDr(pu, tx, false, { k: "msg" });
    log("🩺 dr. @" + me + " menetapkan " + (mode === "rawat" ? "rawat inap " + days + " hari" : "rawat jalan") + " untuk @" + pu);
    const pw = S.warga[pu]; if (pw && !DBX()) applyRs(pw, Object.assign({ u: pu }, patch));
  }
  function applyRs(w, r) {
    if (!r || !r.dec || r.dec === w.rdec || r.dec < (w.cs ? w.cs.t : 0)) return; w.rdec = r.dec;
    if (r.st === "dirawat" && !rawatAktif(w)) { startRawat(w, Math.max(1, +r.hari || 1), "dr. @" + (r.dr || "dokter")); clearTimers(); drStage[w.u] = "decided"; }
    else if (r.st === "rawatjalan") { w.sk = null; w.hp = clamp((w.hp || 0) + 10, 0, 100); clearTimers(); drStage[w.u] = "decided"; toast("🩺 Dokter: rawat jalan, istirahat & minum obat."); save(); }
    softS();
  }
  function bindDb() {
    const d = DBX(); if (!d || !me) return;
    if (rsMe !== me) {
      if (myRsOff) myRsOff(); rsMe = me;
      myRsOff = d.doc("rs/" + me).onSnapshot(x => { const w = wk(); if (x.exists && w) applyRs(w, x.data()); }, () => {});
      if (rsOff) rsOff();
      rsOff = d.collection("rs").orderBy("t", "desc").limit(40).onSnapshot(s => { HX.RS = s.docs.map(x => Object.assign({ u: x.id }, x.data())); softS(); }, () => {});
    }
  }
  const typing = () => document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

  /* ---------- tampilan tab Sehat ---------- */
  const bar = (lbl, v, hint) => `<div class="hbrow"><span>${lbl}</span><div class="hb"><i style="width:${pc(v)}%;background:${barCol(v)}"></i></div><b style="color:${barCol(v)}">${pc(v)}%</b></div>${hint ? `<small class="mut">${hint}</small>` : ""}`;
  let shopSel = "", cekMsg = "";
  function topHtml(w) {
    hInit(w); const inRs = rawatAktif(w); const sh = nearestShop(w); if (!shopSel || !sh.find(s => s.o.k === shopSel)) shopSel = sh[0] ? sh[0].o.k : "";
    const so = POL.find(o => o.k === shopSel), dist = sh.find(s => s.o.k === shopSel);
    let st = inRs ? `🏥 <b>Dirawat</b> · sisa ${Math.max(1, Math.ceil((w.rwt.u - Date.now()) / 1000))} detik · ${w.rwt.h} hari oleh ${esc(w.rwt.dr)}` : w.sk ? `🤒 <b>Sakit: ${esc(w.sk.n)}</b> · tidak bisa bekerja` : (w.hp < 40 || w.kn < 25 || w.hs < 25) ? "⚠️ <b>Perlu perhatian</b>" : "😊 <b>Sehat</b>";
    let h = `<h2>🩺 Sehat</h2><p><b>🪙 ${w.coin || 0} koin</b> · ${st}</p>
    <div class="jc">${bar("❤️ Darah", w.hp)}${bar("🍗 Kenyang <small>(lapar)</small>", w.kn)}${bar("💧 Segar <small>(haus)</small>", w.hs)}</div>`;
    if (inRs) {
      const tot = w.rwt.u - w.rwt.t0, pr = clamp(100 - (w.rwt.u - Date.now()) / tot * 100, 0, 100), hk = Math.min(w.rwt.h, Math.floor(pr / 100 * w.rwt.h) + 1);
      h += `<div class="jc on"><b>🛏 Rawat inap</b> · hari ke-${hk} dari ${w.rwt.h}<div class="pbar"><i style="width:${pr}%"></i></div><small>Makan & minum ditanggung RS. Darah naik perlahan. Kamu pulang otomatis saat waktunya habis. ${w.rwt.gratis ? "Biaya ditanggung kota." : "Biaya " + w.rwt.paid + " 🪙."}</small></div>`;
    } else {
      h += `<div><button class="btn g" data-x="periksa">🏥 Periksa ke Rumah Sakit</button> <button class="btn s" data-x="cek">🔍 Cek kesehatan (gratis)</button></div>
      <small class="mut">Konsultasi ${BIAYA_KONSUL} 🪙 · rawat inap ${BIAYA_RAWAT} 🪙/hari (1 hari rawat = ${Math.round(HARI_RS / 60000)} menit nyata). Koin kurang? Ditanggung kota.</small>`;
      if (cekMsg) h += `<div class="jc">${cekMsg}</div>`;
    }
    if (!inRs) {
      const its = ITEMS.map(it => { const ok = so && sells(so.k, it); return `<div class="jc"><b>${it.e} ${it.n}</b> · ${it.p} 🪙<br><small>${[it.l ? "🍗 +" + it.l : "", it.h ? "💧 " + (it.h > 0 ? "+" : "") + it.h : "", it.hp ? "❤️ +" + it.hp : ""].filter(Boolean).join(" · ")}</small><br><button class="btn s" data-x="beli|${it.id}" ${!ok || (w.coin || 0) < it.p ? "disabled" : ""}>${!ok ? "Tidak dijual di sini" : "Beli"}</button></div>`; }).join("");
      h += `<h3>🛍 Beli makan & minum</h3><p class="mut">Toko terdekat dari rumahmu: <b>${dist ? esc(dist.o.n) : "-"}</b> (${dist ? Math.round(dist.d) : "?"} petak). Karaktermu akan berjalan ke sana.</p>
      <div>${sh.map(s => `<button class="btn s${s.o.k === shopSel ? " g" : ""}" data-x="toko|${s.o.k}">${esc(s.o.n.replace(" Rebahan", ""))} · ${Math.round(s.d)}</button>`).join("")}</div>
      <label class="mut"><input type="checkbox" id="hauto" ${w.auto === false ? "" : "checked"}> 🤖 Beli otomatis di toko terdekat saat lapar/haus (koin cukup)</label>${its}`;
    }
    return h + `<div class="err" id="hse"></div>`;
  }
  function docHtml() {
    const w = wk(), list = (HX.RS || []).filter(r => r.st === "menunggu" || r.st === "dirawat").sort((a, b) => (b.t || 0) - (a.t || 0));
    return `<h3>🩺 Ruang Dokter</h3><p class="mut">Pasien yang masuk RS Rebahan. Buka percakapan, lalu tetapkan lama rawat inap.</p>` + (list.length ? list.map(r => `<div class="jc"><b>@${esc(r.u)}</b> · ${esc(r.kel || "")} · <span class="mut">${r.st === "menunggu" ? "⏳ menunggu dokter" : "🛏 dirawat " + (r.hari || 0) + " hari"}</span><br><small>❤️ ${r.hp ?? "?"}% · 🍗 ${r.kn ?? "?"}% · 💧 ${r.hs ?? "?"}%</small><br>
      <button class="btn s" data-x="buka|${esc(r.u)}">💬 Buka percakapan</button>
      <select id="hd-${esc(r.u)}">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}">${n} hari</option>`).join("")}</select>
      <button class="btn g s" data-x="rawat|${esc(r.u)}">🏥 Rawat inap</button><button class="btn s" data-x="jalan|${esc(r.u)}">🏠 Rawat jalan</button></div>`).join("") : `<p class="mut">Belum ada pasien. Rumah sakit sepi.</p>`);
  }
  function vSehat() {
    const w = wk(), st = sheet.scrollTop;
    if (!w || w.status !== "warga") { sheet.innerHTML = `<h2>🩺 Sehat</h2><p>Hanya warga resmi yang punya data kesehatan. Daftar dan kirim kode ke bot dulu (tab Daftar).</p>`; sheet.onclick = null; return; }
    const cs = (S.rs && S.rs[w.u]) || (HX.RS || []).find(r => r.u === w.u);
    const showChat = drTarget || rawatAktif(w) || (cs && (cs.st === "menunggu" || cs.st === "dirawat"));
    if (drOff) { drOff(); drOff = null; }
    sheet.innerHTML = `<div id="hst">${topHtml(w)}</div><div id="dcw"></div>${(isDokter(w) || isAdmin) ? `<div id="hdoc">${docHtml()}</div>` : ""}`;
    if (showChat) openDr(drTarget || me);
    sheet.scrollTop = st; bindSheet(); const ck = $("#hauto"); if (ck) ck.onchange = () => { const ww = wk(); ww.auto = ck.checked; save(); };
  }
  const softS = () => { if (tab !== "sehat") return; if (typing()) refreshTop(); else vSehat(); };
  let drTarget = null;
  function bindSheet() {
    sheet.onclick = async e => {
      const a = (e.target.dataset.x || "").split("|"), w = wk(); if (!a[0] || !w) return; const he = t => { const el = $("#hse"); if (el) el.textContent = t; };
      if (a[0] === "periksa") { drTarget = null; await mintaPeriksa(); }
      else if (a[0] === "cek") {
        hInit(w); const adv = []; if (w.hs < 40) adv.push("💧 Kamu mulai dehidrasi, minum dulu."); if (w.kn < 40) adv.push("🍗 Perutmu kosong, segera makan."); if (w.hp < 60) adv.push("❤️ Darahmu rendah, istirahat & makan bergizi."); if (w.sk) adv.push("🤒 Kamu sakit " + w.sk.n + ", sebaiknya periksa ke dokter.");
        const sc = (w.hp + w.kn + w.hs) / 3; cekMsg = `<b>🔍 Hasil cek kesehatan:</b> ${sc >= 75 ? "Prima 😊" : sc >= 45 ? "Cukup 😐" : "Perlu perhatian 😟"}<br><small>${adv.length ? adv.join("<br>") : "Semua indikator baik. Pertahankan pola makan dan minum!"}</small>`; log("🔍 @" + w.u + " cek kesehatan"); vSehat();
      }
      else if (a[0] === "toko") { shopSel = a[1]; vSehat(); }
      else if (a[0] === "beli") { const it = ITEMS.find(i => i.id === a[1]); const r = buyItem(it, shopSel); he(r); if (!r) vSehat(); }
      else if (a[0] === "buka") { drTarget = a[1]; openDr(a[1]); }
      else if (a[0] === "rawat") { const n = +($("#hd-" + a[1]) || {}).value || 1; dokterTetapkan(a[1], "rawat", n); }
      else if (a[0] === "jalan") dokterTetapkan(a[1], "jalan", 0);
    };
  }
  /* segarkan ringan: hanya bagian atas, obrolan tetap */
  function refreshTop() {
    const w = wk(); if (!w || w.status !== "warga" || tab !== "sehat" || typing()) return;
    const t = $("#hst"); if (!t) return; const st = sheet.scrollTop; t.innerHTML = topHtml(w); sheet.scrollTop = st;
    const ck = $("#hauto"); if (ck) ck.onchange = () => { const ww = wk(); ww.auto = ck.checked; save(); };
    const hd = $("#hdoc"); if (hd && !typing()) hd.innerHTML = docHtml();
  }
  /* mini HUD di peta */
  const hud = document.createElement("div"); hud.id = "hud"; $("#stage").appendChild(hud);
  function hudUpd() {
    const w = wk(); if (!w || w.status !== "warga" || tab !== "peta") { hud.style.display = "none"; return; }
    hInit(w); hud.style.display = "block";
    const m = (e, v) => `<span>${e}<i><b style="width:${pc(v)}%;background:${barCol(v)}"></b></i></span>`;
    hud.innerHTML = m("❤️", w.hp) + m("🍗", w.kn) + m("💧", w.hs) + (rawatAktif(w) ? "<span>🏥</span>" : w.sk ? "<span>🤒</span>" : "");
  }
  hud.onclick = () => { const b = document.querySelector('#nav [data-t="sehat"]'); if (b) b.click(); };
  const sbadge = () => {
    const b = document.querySelector('#nav [data-t="sehat"]'); if (!b) return; const o = b.querySelector(".bdg"); if (o) o.remove();
    const w = wk(); if (w && w.status === "warga" && (w.sk || w.hs < 25 || w.kn < 25 || w.hp < 35)) { const i = document.createElement("i"); i.className = "bdg"; i.textContent = "!"; b.appendChild(i); }
  };
  /* pemberitahuan pesan dokter */
  let nOff = null, nMe = null, nLast = 0;
  function watchDr() {
    if (!me || nMe === me) return; if (nOff) nOff(); nMe = me; nLast = 0;
    nOff = chatSub(room(me), L => { const m = L[L.length - 1]; if (!m) return; if (nLast && m.t > nLast && m.r === "d" && m.u !== me && tab !== "sehat") toast("🩺 " + (m.npc ? "dr. Jaga" : "dr. @" + m.u) + ": " + String(m.tx).slice(0, 44)); nLast = Math.max(nLast, m.t); });
  }
  /* detak kesehatan */
  let sv = 0;
  setInterval(() => {
    bindDb(); watchDr(); const w = wk(); if (!w || w.status !== "warga") { hudUpd(); return; }
    healthTick(w); autoBeli(w); if (++sv % 6 === 0) save();
    hudUpd(); sbadge(); refreshTop();
  }, 5000);
  setTimeout(() => { const w = wk(); if (w && w.status === "warga") { hInit(w); healthTick(w); } hudUpd(); }, 1500);

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
      <p><b>🏥 Rumah Sakit Rebahan</b> <span class="mut">· dirawat ${(HX.RS || []).filter(r => r.st === "dirawat").length} · menunggu ${(HX.RS || []).filter(r => r.st === "menunggu").length} · dokter bertugas ${cnt("dokter")}</span></p>
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
