/* =====================================================================
   kota-online.js : sinkronisasi realtime (Firebase Firestore) + Bot Asisten
   untuk Rebahan City. Tidak mengubah isi index.html selain 3 baris <script>.
   ===================================================================== */

/* 1) ISI DENGAN CONFIG FIREBASE KAMU (Project settings > Your apps > Web app) */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLA9fyNS3we6tuzHh8i7kcyAfBVX7UEgg",
  authDomain: "rebahan-city.firebaseapp.com",
  projectId: "rebahan-city",
  storageBucket: "rebahan-city.firebasestorage.app",
  messagingSenderId: "1069991947774",
  appId: "1:1069991947774:web:f1994b2ea0a5737de6a4af"
};

/* 2) Jalur database: dibuat sebelum script utama jalan, supaya initOnline() di index.html aktif */
(function () {
  const c = window.FIREBASE_CONFIG;
  if (!window.firebase || !c || /^ISI/.test(c.apiKey)) {
    console.warn("[Rebahan City] Config Firebase belum diisi. Berjalan dalam mode lokal.");
    return;
  }
  try {
    firebase.initializeApp(c);
    const db = firebase.firestore();
    db.settings({ ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true });
    window.__rbhDB = db;
    window.claude = { use: async n => (n === "db" ? db : null) };
  } catch (e) { console.error("[Rebahan City] Firebase gagal:", e); }
})();

/* 3) Setelah semua script utama selesai: sinkronisasi data kota + tab Bot */
window.addEventListener("load", function () {
  const db = window.__rbhDB;
  if (!db) return;

  const lastW = {}, logSent = new Set(), flSent = new Set();
  let firstP = true, firstF = true, lastState = null, rt = null;
  const persistLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const lid = e => e.t + "_" + Array.from(String(e.m)).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const stateNow = () => ({ start: S.start, jadwal: S.jadwal, wxForce: S.wxForce || "" });

  /* id perangkat: supaya kode pendaftaran hanya bisa dipakai di perangkat pendaftarnya */
  const dev = (() => {
    try {
      let d = localStorage.getItem(KEY + "-dev");
      if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(KEY + "-dev", d); }
      return d;
    } catch (e) { return "x"; }
  })();

  const oShow = showReg;
  window.showReg = function (u) {
    const w = S.warga[u];
    if (w && w.dev && w.dev !== dev) {
      me = ""; try { localStorage.removeItem(KEY + "-me"); } catch (e) {}
      $("#out").innerHTML = '<p class="err">Username @' + esc(u) + " sudah didaftarkan di perangkat lain. Pakai username Instagram milikmu sendiri.</p>";
      return;
    }
    if (w && !w.dev) { w.dev = dev; save(); }
    oShow(u);
  };

  /* ---------- refresh tampilan saat data masuk dari perangkat lain ---------- */
  function refresh() {
    clearTimeout(rt);
    rt = setTimeout(() => {
      tick();
      const a = document.activeElement;
      if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      if (tab === "admin" && isAdmin) { const st = sheet.scrollTop; vAdmin(); sheet.scrollTop = st; }
      else if (tab === "daftar" && me && S.warga[me] && $("#out")) showReg(me);
      else if (tab === "ktp" && $("#go")) $("#go").click();
    }, 300);
  }

  /* kota otomatis meluas agar semua kavling warga dari perangkat lain ikut tergambar */
  function growTo() {
    const mx = Math.max(-1, ...Object.values(S.warga).map(w => (typeof w.lot === "number" ? w.lot : -1)));
    let g = 0;
    while (lots.length <= mx && g++ < 50) { growB(); S.ring = (S.ring || 0) + 1; }
    if (g) buildNav();
    ensureCapacity();
  }

  /* dua orang mendaftar bersamaan lalu dapat kavling sama: yang daftar belakangan pindah */
  function fixLot() {
    const w = S.warga[me];
    if (!w || w.status === "warga" || typeof w.lot !== "number") return;
    const dup = Object.values(S.warga).find(o => o !== w && o.lot === w.lot &&
      ((o.reg || 0) < (w.reg || 0) || ((o.reg || 0) === (w.reg || 0) && o.u < w.u)));
    if (dup) { ensureCapacity(); w.lot = freeLot(); save(); }
  }

  /* ---------- tulis ke database (menggantikan syncWarga bawaan) ---------- */
  window.syncWarga = function () {
    Object.keys(S.warga).forEach(u => {
      const j = JSON.stringify(S.warga[u]);
      if (lastW[u] !== j) {
        lastW[u] = j;
        db.collection("pendaftar").doc(u).set(JSON.parse(j)).catch(e => console.warn(e));
      }
    });
    Object.keys(lastW).forEach(u => {
      if (!S.warga[u]) { delete lastW[u]; db.collection("pendaftar").doc(u).delete().catch(() => {}); }
    });
    S.log.forEach(e => {
      const id = lid(e);
      if (!logSent.has(id)) { logSent.add(id); db.collection("riwayat").doc(id).set({ t: e.t, m: e.m }).catch(() => {}); }
    });
    S.flights.forEach(f => {
      const id = String(f.t);
      if (!flSent.has(id)) { flSent.add(id); db.collection("terbang").doc(id).set({ t: f.t, txt: f.txt }).catch(() => {}); }
    });
    if (isAdmin) {
      const st = stateNow(), j = JSON.stringify(st);
      if (j !== lastState) { lastState = j; db.doc("kota/state").set(st).catch(() => {}); }
    }
  };

  /* ---------- baca dari database (realtime) ---------- */
  db.collection("pendaftar").onSnapshot(s => {
    s.docChanges().forEach(c => {
      const u = c.doc.id;
      if (c.type === "removed") { delete S.warga[u]; delete lastW[u]; return; }
      if (c.doc.metadata.hasPendingWrites) return;               // echo dari tulisan sendiri
      const cur = S.warga[u], d = c.doc.data();
      if (cur && lastW[u] !== undefined && JSON.stringify(cur) !== lastW[u]) return; // ada perubahan lokal belum terkirim
      if (cur) { Object.keys(cur).forEach(k => delete cur[k]); Object.assign(cur, d); } // ubah di tempat, referensi tetap valid
      else S.warga[u] = d;
      lastW[u] = JSON.stringify(S.warga[u]);
    });
    growTo(); fixLot(); persistLocal(); refresh();
    if (firstP) { firstP = false; window.syncWarga(); }   // unggah data lokal lama (mis. milik Walikota)
  }, e => console.warn("pendaftar:", e));

  db.collection("riwayat").orderBy("t", "desc").limit(80).onSnapshot(s => {
    const seen = new Set(S.log.map(lid));
    s.docs.forEach(x => { const d = x.data(); logSent.add(x.id); if (!seen.has(x.id)) S.log.push({ t: d.t, m: d.m }); });
    S.log.sort((a, b) => b.t - a.t); S.log = S.log.slice(0, 80);
    persistLocal(); refresh();
  }, () => {});

  db.collection("terbang").orderBy("t", "desc").limit(20).onSnapshot(s => {
    s.docChanges().forEach(c => {
      if (c.type !== "added") return;
      const d = c.doc.data(), id = c.doc.id;
      if (flSent.has(id)) return;
      flSent.add(id);
      if (!S.flights.some(f => f.t === d.t)) S.flights.push({ t: d.t, txt: d.txt });
      if (!firstF && Date.now() - d.t < 90000) launch(d.txt);   // pesawat muncul di semua perangkat
    });
    S.flights.sort((a, b) => b.t - a.t); S.flights = S.flights.slice(0, 20);
    firstF = false; persistLocal(); refresh();
  }, () => {});

  db.doc("kota/state").onSnapshot(x => {
    if (!x.exists) return;
    if (isAdmin && JSON.stringify(stateNow()) !== lastState) return;
    const d = x.data();
    if (d.start) S.start = d.start;
    if (d.jadwal) S.jadwal = d.jadwal;
    S.wxForce = d.wxForce || "";
    lastState = JSON.stringify(stateNow());
    persistLocal(); refresh();
  }, () => {});

  /* ======================= BOT ASISTEN ======================= */
  let BM = [];
  try { BM = JSON.parse(localStorage.getItem(KEY + "-bot") || "[]"); } catch (e) {}

  function say(t, bot) {
    BM.push({ b: !!bot, t }); BM = BM.slice(-40);
    try { localStorage.setItem(KEY + "-bot", JSON.stringify(BM)); } catch (e) {}
    paint();
  }
  function paint() {
    const el = $("#bc"); if (!el) return;
    el.innerHTML = BM.map(m =>
      '<div class="m"' + (m.b ? "" : ' style="text-align:right"') + "><b>" +
      (m.b ? "🤖 Bot" : "@" + esc(me || "kamu")) + "</b> " + esc(m.t) + "</div>").join("");
    el.scrollTop = el.scrollHeight;
  }

  function terbangkan(w) {
    w.status = "warga";
    if (w.lot == null) w.lot = freeLot();
    w.rt = Math.floor(w.lot / 20) % 5 + 1; w.rw = Math.floor(w.lot / 100) + 1;
    w.nik = nik(w.u); w.tgl = Date.now(); w.coin = 100;
    w.model = w.lot % 4; w.wall = walls[(w.lot >> 2) % 4]; w.roof = roofs[w.lot % 4]; w.lv = 1;
    const txt = "Warga baru: @" + w.u;
    S.flights.unshift({ t: Date.now(), txt });
    log("Bot menerbangkan @" + w.u + " menjadi warga baru");
    save(); launch(txt);
    setTimeout(() => {
      tab = "peta";
      document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x.dataset.t === "peta"));
      render();
    }, 2500);
  }

  function handle(raw) {
    const up = raw.trim().toUpperCase(), m = up.match(/RBH-[A-Z0-9]{5}/), w = me && S.warga[me];
    if (m) {
      if (!w) return "Kamu belum terdaftar di perangkat ini. Buka tab Daftar dulu, lalu kirim kodenya ke sini.";
      if (w.dev && w.dev !== dev) return "Akun @" + me + " didaftarkan di perangkat lain. Kirim kode dari perangkat yang tadi dipakai mendaftar.";
      if (w.status === "warga") return "@" + me + " sudah resmi jadi warga. Buka tab Peta atau KTP untuk melihatnya.";
      if (m[0] !== w.code) {
        const other = Object.values(S.warga).find(o => o.code === m[0]);
        return other ? "Kode itu bukan milik akunmu (@" + me + "). Pakai kode yang muncul di tab Daftar."
                     : "Kode tidak ditemukan. Cek lagi kodenya di tab Daftar.";
      }
      terbangkan(w);
      return "Kode diterima ✅ Selamat datang, @" + me + "! Pesawat berangkat sekarang dan rumahmu berdiri di Blok " + (w.lot + 1) + ". Mengantar kamu ke peta...";
    }
    if (/status|cek/i.test(raw)) {
      if (!w) return "Kamu belum mendaftar. Buka tab Daftar dulu.";
      return w.status === "warga" ? "@" + me + " sudah resmi jadi warga 🎉"
                                  : "@" + me + " masih menunggu. Kirim kodemu (format RBH-XXXXX) ke sini supaya langsung diterbangkan.";
    }
    if (/jadwal|kapan/i.test(raw)) return "Tidak perlu menunggu jadwal. Begitu kode yang benar kamu kirim ke sini, pesawat langsung berangkat.";
    if (/halo|hai|hi\b|hello/i.test(raw)) return "Halo! Kirim kode pendaftaranmu (contoh: RBH-AB12C) dan saya terbangkan kamu ke Rebahan City.";
    return "Saya bisa bantu: kirim kode pendaftaranmu (RBH-XXXXX) untuk langsung jadi warga, atau ketik 'status' untuk cek akunmu.";
  }

  function vBot() {
    sheet.onclick = null;
    sheet.innerHTML = '<h2>🤖 Bot Asisten Kota</h2><p class="mut">Kirim kode pendaftaranmu ke bot, lalu kamu langsung diterbangkan jadi warga. 🟢 online</p>' +
      '<div class="chatbox" id="bc" style="height:40vh"></div>' +
      '<div style="display:flex;gap:6px"><input id="bi" maxlength="60" placeholder="Ketik kode atau \'status\'..." autocomplete="off" autocapitalize="characters"><button class="btn" id="bs">Kirim</button></div>';
    if (!BM.length) say("Halo! Saya bot asisten Rebahan City. Daftar dulu di tab Daftar, lalu kirim kode RBH-XXXXX kamu ke sini dan saya langsung terbangkan kamu ke kota.", true);
    paint();
    const send = () => {
      const i = $("#bi"), t = i.value.trim(); if (!t) return;
      i.value = ""; say(t, false);
      setTimeout(() => say(handle(t), true), 450);
    };
    $("#bs").onclick = send;
    $("#bi").onkeydown = e => { if (e.key === "Enter") send(); };
  }

  const nav = $("#nav"), btn = document.createElement("button");
  btn.dataset.t = "bot"; btn.innerHTML = "<span>🤖</span>Bot";
  nav.insertBefore(btn, nav.querySelector('[data-t="admin"]'));

  const oRender = render;
  window.render = function () {
    if (tab === "bot") {
      if (chatOff) { chatOff(); chatOff = null; }
      tick(); sheet.className = "open"; vBot(); return;
    }
    oRender();
  };
});
