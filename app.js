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

app.get('/device-config/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;

  db.query(
    "SELECT * FROM device_configs WHERE device_id = ?",
    [deviceId],
    (err, result) => {
      if (err) return res.send("❌ Gagal mengambil konfigurasi.");
      if (result.length === 0) return res.send("⚠️ Konfigurasi tidak ditemukan.");

      const config = result[0];

      const html = generateDeviceConfigPage(deviceId, config);
      res.send(html);
    }
  );
});


app.post("/activate", (req, res) => {
  const {
    device_configuration,
    wifi_configuration,
    activation,
    endpoint_configuration,
    io_configuration
  } = req.body;

  if (!device_configuration || !activation) {
    return res.status(400).json({
      message: "Payload tidak lengkap. device_configuration dan activation wajib ada."
    });
  }

  const deviceId = device_configuration.deviceId;
  const deviceNameFinal = device_configuration.device_name || "Unknown";
  const finalOwner = device_configuration.owner_name || "Unknown";

  const activationDate = activation.activationDate;
  const deactivationDate = activation.deactivationDate;

  if (!deviceId || !activationDate || !deactivationDate) {
    return res.status(400).json({
      message: "deviceId, activationDate, dan deactivationDate wajib diisi."
    });
  }

  // 1. Cek apakah device sudah terdaftar
  db.query("SELECT * FROM devices WHERE id = ?", [deviceId], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.length === 0) {
      return res.status(404).json({
        message: `Device ID '${deviceId}' belum terdaftar di sistem.`,
      });
    }

    // 2. Update atau Insert aktivasi
    db.query(
      "SELECT * FROM activations WHERE device_id = ?",
      [deviceId],
      (err2, result2) => {
        if (err2) return res.status(500).json({ error: err2 });

        if (result2.length > 0) {
          db.query(
            "UPDATE activations SET device_name = ?, owner = ?, activation_date = ?, deactivation_date = ? WHERE device_id = ?",
            [deviceNameFinal, finalOwner, activationDate, deactivationDate, deviceId]
          );
        } else {
          db.query(
            "INSERT INTO activations (device_id, device_name, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?, ?)",
            [deviceId, deviceNameFinal, finalOwner, activationDate, deactivationDate]
          );
        }

        // 3. Simpan konfigurasi di device_configs
        db.query(
          `INSERT INTO device_configs
           (device_id, mac_address, author, manufacturer, firmware_version, firmware_description,
            wifi_ssid, wifi_password, endpoint_host, endpoint_port, endpoint_path, io_pin)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             mac_address = VALUES(mac_address),
             author = VALUES(author),
             manufacturer = VALUES(manufacturer),
             firmware_version = VALUES(firmware_version),
             firmware_description = VALUES(firmware_description),
             wifi_ssid = VALUES(wifi_ssid),
             wifi_password = VALUES(wifi_password),
             endpoint_host = VALUES(endpoint_host),
             endpoint_port = VALUES(endpoint_port),
             endpoint_path = VALUES(endpoint_path),
             io_pin = VALUES(io_pin)
          `,
          [
            deviceId,
            device_configuration.mac_address,
            device_configuration.author,
            device_configuration.Manufacturer,
            device_configuration["Firmware Version"],
            device_configuration["Firmware Description"],
            wifi_configuration?.wifi_ssid || null,
            wifi_configuration?.wifi_password || null,
            endpoint_configuration?.endpoint_host || null,
            endpoint_configuration?.port || null,
            endpoint_configuration?.endpoint_path || null,
            io_configuration?.io_pin || null
          ],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3 });

            res.status(200).json({
              message: "Aktivasi dan konfigurasi perangkat berhasil disimpan.",
              deviceId: deviceId,
              owner: finalOwner
            });
          }
        );
      }
    );
  });
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
  const deviceNameFinal = "Unknown";

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
      "INSERT INTO activations (device_id, device_name, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?, ?)",
      [deviceId, deviceNameFinal, owner, activationDate, deactivationDate],
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

function generateDeviceConfigPage(deviceId, config) {
  return `
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Konfigurasi Perangkat ${deviceId}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-blue-50 p-10 min-h-screen font-sans">

    <!-- Tombol Kembali -->
    <div class="mb-6">
      <a href="/activations" class="text-blue-700 hover:text-blue-900 text-lg font-medium">
        ← Kembali ke Daftar Aktivasi
      </a>
    </div>

    <!-- Judul -->
    <h1 class="text-3xl font-bold text-blue-800 mb-8">
      Konfigurasi Perangkat: ${deviceId}
    </h1>

    <!-- Tabel Konfigurasi -->
    <div class="bg-white border border-blue-200 rounded-lg shadow p-8">
      <table class="min-w-full text-base text-left">
        <tbody class="divide-y divide-blue-100">

          ${renderRow("MAC Address", config.mac_address)}
          ${renderRow("Author", config.author)}
          ${renderRow("Manufacturer", config.manufacturer)}
          ${renderRow("Firmware Version", config.firmware_version)}
          ${renderRow("Firmware Description", config.firmware_description)}
          ${renderRow("WiFi SSID", config.wifi_ssid)}
          ${renderRow("WiFi Password", config.wifi_password)}
          ${renderRow("Endpoint Host", config.endpoint_host)}
          ${renderRow("Endpoint Port", config.endpoint_port)}
          ${renderRow("Endpoint Path", config.endpoint_path)}
          ${renderRow("IO Pin", config.io_pin)}
          ${renderRow("Terakhir Diperbarui", new Date(config.updated_at).toLocaleString())}

        </tbody>
      </table>
    </div>

  </body>
</html>
`;
}

// Helper untuk baris tabel
function renderRow(label, value) {
  return `
    <tr>
      <td class="py-3 font-semibold text-blue-700 w-1/3">${label}</td>
      <td class="py-3">${value !== null ? value : "-"}</td>
    </tr>
  `;
}


/* ========== TABEL AKTIVASI ========== */
app.get("/activations", (req, res) => {
  const sql = `
  SELECT device_id, device_name, owner, activation_date, deactivation_date,
    CASE 
      WHEN NOW() BETWEEN activation_date AND deactivation_date THEN 'Aktif'
      ELSE 'Nonaktif'
    END AS status
  FROM activations
  ORDER BY activation_date DESC
`;


  db.query(sql, (err, results) => {
    if (err) return res.send("❌ Gagal ambil data.");

    let html = activationPage(results);
    res.send(html);
  });
  
});

/* ========== JALANKAN SERVER ========== */
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://192.168.1.30:${port}`);
});