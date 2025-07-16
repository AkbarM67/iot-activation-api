const express = require("express");
const mysql = require("mysql2");
const { activationPage } = require("./view");
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "iot_activation",
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB gagal terkoneksi:", err);
    process.exit(1);
  }
  console.log("✅ Koneksi DB berhasil");
});

/* ========== ENDPOINT IoT AKTIVASI ========== */
app.post("/activate", (req, res) => {
  const { deviceId, owner, activationDate, deactivationDate } = req.body;

  if (!deviceId || !activationDate || !deactivationDate) {
    return res
      .status(400)
      .json({
        message: "deviceId, activationDate, dan deactivationDate wajib diisi",
      });
  }

  const finalOwner = owner || "Unknown";

  // 1. Cek apakah device sudah terdaftar di tabel devices
  db.query("SELECT * FROM devices WHERE id = ?", [deviceId], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.length === 0) {
      // ❌ Device tidak ditemukan, tolak permintaan
      return res
        .status(404)
        .json({
          message: `Device ID '${deviceId}' belum terdaftar di sistem.`,
        });
    }

    // 2. Jika ada, simpan aktivasi
    db.query(
      "UPDATE activations SET owner = ?, activation_date = ?, deactivation_date = ? WHERE device_id = ?",
      [finalOwner, activationDate, deactivationDate, deviceId],
      (err2, result2) => {
        if (err2) return res.status(500).json({ error: err2 });
        res.status(200).json({
          message: "Aktivasi diperbarui",
          deviceId,
          owner: finalOwner,
        });
      }
    );
  });

  // 2. Simpan aktivasi
  function simpanAktivasi() {
    db.query(
      "INSERT INTO activations (device_id, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?)",
      [deviceId, finalOwner, activationDate, deactivationDate],
      (err3, result) => {
        if (err3) return res.status(500).json({ error: err3 });
        res.status(201).json({
          message: "Aktivasi sukses",
          activationId: result.insertId,
          deviceId,
          owner: finalOwner,
        });
      }
    );
  }
});

/* ========== FORM TAMBAH AKTIVASI ========== */
app.get("/activations/new", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Tambah Aktivasi Perangkat</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-blue-50 p-16 min-h-screen font-sans">

      <!-- Tombol Kembali -->
      <div class="mb-4">
        <a href="/activations" class="text-blue-700 hover:text-blue-900 text-lg font-medium">
          ← Kembali
        </a>
      </div>

      <!-- Judul -->
      <h1 class="text-3xl font-bold text-blue-800 mb-8">
        Tambah Aktivasi Perangkat
      </h1>

      <!-- Form -->
      <form method="POST" action="/activations/new" class="max-w-xl bg-white p-8 rounded shadow border border-blue-200">
        <div class="mb-6">
          <label for="deviceId" class="block text-lg font-medium text-blue-800 mb-2">
            Device ID
          </label>
          <input
            type="text"
            id="deviceId"
            name="deviceId"
            required
            class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            placeholder="Masukkan Device ID"
          />
        </div>

        <button
          type="submit"
          class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
        >
          Simpan
        </button>
      </form>

    </body>
    </html>
  `);
});

app.post("/activations/new", (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId)
    return res.send(
      'Device ID wajib diisi. <a href="/activations/new">Kembali</a>'
    );

  const owner = "Unknown";
  const activationDate = new Date();
  const deactivationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

  // 1. Pastikan deviceId sudah ada di tabel devices
  db.query("SELECT * FROM devices WHERE id = ?", [deviceId], (err, result) => {
    if (err) {
      console.error(err);
      return res.send(
        'Gagal cek device. <a href="/activations/new">Coba lagi</a>'
      );
    }

    if (result.length === 0) {
      // Tambahkan device jika belum ada
      db.query(
        "INSERT INTO devices (id, name) VALUES (?, ?)",
        [deviceId, "Unknown"],
        (err2) => {
          if (err2) {
            console.error(err2);
            return res.send(
              'Gagal menambahkan device. <a href="/activations/new">Coba lagi</a>'
            );
          }
          simpanAktivasi();
        }
      );
    } else {
      simpanAktivasi();
    }
  });

  // 2. Fungsi untuk menyimpan aktivasi
  function simpanAktivasi() {
    db.query(
      "INSERT INTO activations (device_id, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?)",
      [deviceId, owner, activationDate, deactivationDate],
      (err) => {
        if (err) {
          console.error(err);
          return res.send(
            'Gagal simpan aktivasi. <a href="/activations/new">Coba lagi</a>'
          );
        }
        res.redirect("/activations");
      }
    );
  }
});

/* ========== TABEL AKTIVASI ========== */
app.get("/activations", (req, res) => {
  const sql = `
    SELECT a.device_id, d.name AS device_name, a.owner, a.activation_date, a.deactivation_date,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status
    FROM activations a
    LEFT JOIN devices d ON a.device_id = d.id
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.send("❌ Gagal ambil data.");

      let html = `
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Daftar Aktivasi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-blue-50 p-16 min-h-screen font-sans">

    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-3xl font-bold text-blue-800">Daftar Aktivasi Perangkat</h2>
      <button onclick="document.getElementById('modal').classList.remove('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white text-xl px-6 py-3 rounded shadow">
        + Tambah Aktivasi
      </button>
    </div>

    <!-- Tabel Aktivasi -->
    <div class="shadow rounded-lg border border-blue-200 overflow-x-auto">
      <div class="max-h-[500px] overflow-y-auto">
        <table class="min-w-full text-base text-left divide-y divide-blue-200">
          <thead class="bg-blue-100 text-blue-800 uppercase text-lg font-semibold sticky top-0 z-10">
            <tr>
              <th class="px-4 py-3">Device ID</th>
              <th class="px-4 py-3">Nama Device</th>
              <th class="px-4 py-3">Owner</th>
              <th class="px-4 py-3">Tanggal Aktif</th>
              <th class="px-4 py-3">Tanggal Akhir</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-blue-100">
`;

  // Loop data
  results.forEach((row) => {
    html += `
    <tr class="hover:bg-blue-50 transition">
      <td class="px-4 py-3">${row.device_id}</td>
      <td class="px-4 py-3">${row.device_name || "-"}</td>
      <td class="px-4 py-3">${row.owner}</td>
      <td class="px-4 py-3">${new Date(
        row.activation_date
      ).toLocaleString()}</td>
      <td class="px-4 py-3">${new Date(
        row.deactivation_date
      ).toLocaleString()}</td>
      <td class="px-4 py-3 ${
        row.status === "Aktif"
          ? "text-green-600 font-bold"
          : "text-red-600 font-bold"
      }">${row.status}</td>
    </tr>
  `;
  });

  // Akhiran HTML
  html += `
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah Aktivasi -->
    <div id="modal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 hidden">
      <div class="bg-white p-8 rounded shadow-lg max-w-md w-full border border-blue-200 relative">
        <button onclick="document.getElementById('modal').classList.add('hidden')" class="absolute top-2 right-3 text-gray-600 hover:text-red-500 text-xl">&times;</button>
        <h3 class="text-2xl font-bold text-blue-800 mb-6">Tambah Aktivasi Perangkat</h3>
        <form method="POST" action="/activations/new">
          <div class="mb-6">
            <label for="deviceId" class="block text-lg font-medium text-blue-800 mb-2">
              Device ID
            </label>
            <input
              type="text"
              id="deviceId"
              name="deviceId"
              required
              class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Format: (123ABC)"
            />
          </div>
          <div class="text-right">
            <button
              type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>

  </body>
</html>
`;
    res.send(html);
  });
});

/* ========== JALANKAN SERVER ========== */
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://192.168.1.30:${port}`);
});
