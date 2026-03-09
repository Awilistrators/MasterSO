const API_URL = "https://script.google.com/macros/s/AKfycbxQgGesidNRxkwHEAri3Aoq6k4cx9uUj9F7MjLhARBMBTK251jKg18fZSFC88iQCVc6/exec";

/* ============================= */
/* STATE GLOBAL                  */
/* ============================= */
let masterProduk = {};
let masterReady = false;
let qrScanner = null;
let scanTimer = null;
let lastScanCode = "";
let scanLockTime = 0;

const petugas = localStorage.getItem("petugas");
if (!petugas) {
  location.href = "index.html";
}

/* ============================= */
/* ELEMENT DOM                   */
/* ============================= */
const barcode = document.getElementById("barcode");
const qty = document.getElementById("qty");
const nama = document.getElementById("nama");
const status = document.getElementById("status");
const info = document.getElementById("info");
const qohEl = document.getElementById("qoh");

info.innerText = "Petugas: " + petugas;

/* ============================= */
/* LOAD MASTER PRODUK            */
/* ============================= */
loadMasterProduk();

function loadMasterProduk() {
  status.innerText = "📦 Memuat data produk...";

  fetch("https://raw.githubusercontent.com/awilistrators/MasterSO/main/master_produk.json")
    .then(r => r.json())
    .then(data => {
      masterProduk = data;
      masterReady = true;
      status.innerText = "✅ Data produk siap";
      setTimeout(() => status.innerText = "", 1000);
    })
    .catch(() => {
      status.innerText = "❌ Gagal memuat master produk";
    });
}

/* ============================= */
/* EVENT SCAN BARCODE            */
/* ============================= */
barcode.addEventListener("keydown", e => {

  // ENTER (scanner mode enter)
  if (e.key === "Enter") {
    e.preventDefault();
    cariProduk();
    return;
  }

  // TAB (scanner mode tab)
  if (e.key === "Tab") {
  // biarkan blur / input yang memicu cariProduk
  setTimeout(() => {
    qty.focus();
    qty.select();
  }, 0);
}
});


barcode.addEventListener("input", () => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(cariProduk, 300);
});

barcode.addEventListener("blur", () => {
  setTimeout(cariProduk, 0);
});

/* ============================= */
/* CARI PRODUK                   */
/* ============================= */
function cariProduk() {
  const code = barcode.value.trim();
  if (!code) return;

  const now = Date.now();

  // ⛔ CEGAH PROSES DOBEL BARCODE YANG SAMA
  if (code === lastScanCode && now - scanLockTime < 400) {
    return;
  }

  lastScanCode = code;
  scanLockTime = now;

  if (!masterReady) {
    status.innerText = "⏳ Data produk belum siap...";
    return;
  }

  const produk = masterProduk[code];

  if (produk) {
    nama.innerText = produk.nama;
    qohEl.innerText = "Stok sistem : " + produk.qoh;
    status.innerText = "✔ Produk ditemukan";

    bunyiBeep();   // 🔊 BEEP 1x SAJA (FINAL)
    qty.focus();
    qty.select();
  } else {
  nama.innerText = "";
  qohEl.innerText = "";
  status.innerText = "⚠️ Produk tidak ditemukan";
}
}


/* ============================= */
/* SIMPAN OPNAME                 */
/* ============================= */
function simpan() {
  if (!barcode.value.trim()) {
    tampilkanPopup("Scan / isi kode item dulu");
    return;
  }

  if (!qty.value) {
    tampilkanPopup("Qty wajib diisi");
    return;
  }

  const payload = {
    action: "simpanOpname",
    kode_input: barcode.value,
    nama: nama.innerText,
    qty: qty.value,
    petugas: petugas
  };

  // Optimistic UI
  barcode.value = "";
  qty.value = "";
  nama.innerText = "";
  qohEl.innerText = "";
  status.innerText = "💾 Tersimpan";
  barcode.focus();

  setTimeout(() => (status.innerText = ""), 500);

  fetch(API_URL, {
  method: "POST",
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(res => console.log(res))
.catch(err => console.error("Gagal simpan opname", err));
}

/* ============================= */
/* GANTI PETUGAS                 */
/* ============================= */
function ganti() {
  localStorage.clear();
  location.href = "index.html";
}

/* ============================= */
/* KAMERA (1D ONLY)              */
/* ============================= */
function bukaKamera() {
  const kameraDiv = document.getElementById("kamera");
  kameraDiv.style.display = "block";

  if (qrScanner) return;

  qrScanner = new Html5Qrcode("kamera");

  qrScanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E
      ]
    },
    (decodedText) => {
      barcode.value = decodedText;
      qrScanner.stop();
      qrScanner = null;
      kameraDiv.style.display = "none";
      cariProduk(); // beep dipanggil di sini
    },
    () => {}
  );
}

/* ============================= */
/* POPUP CUSTOM                  */
/* ============================= */
function tampilkanPopup(teks) {
  document.getElementById("popup-text").innerText = teks;
  document.getElementById("popup").classList.remove("hidden");
}

function tutupPopup() {
  document.getElementById("popup").classList.add("hidden");
}

/* ============================= */
/* SUARA                         */
/* ============================= */
let lastBeep = 0;

function bunyiBeep() {
  const now = Date.now();
  if (now - lastBeep < 200) return;
  lastBeep = now;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 700;

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.18;

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}
