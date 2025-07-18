const express = require("express");
const mysql = require("mysql2");
const { activationPage } = require("./view");
const app = express();
const port = 3000;

app.use(express.static("public"));
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
  const {
    device_configuration,
    wifi_configuration,
    io_configuration,
    activation,
    endpoint_configuration: endpoint,
  } = req.body;

  const deviceId = device_configuration?.deviceId;
  const deviceName = device_configuration?.device_name || "Unknown";
  const owner = device_configuration?.owner_name || "Unknown";
  const author = device_configuration?.author || "Unknown";
  const macAddress = device_configuration?.mac_address || "";
  const manufacturer = device_configuration?.Manufacturer || "Unknown";
  const mikroType = device_configuration?.["MicroController Type"] || "Unknown";
  const firmwareVersion = device_configuration?.["Firmware Version"] || "1.0.0";
  const firmwareDescription = device_configuration?.["Firmware Description"] || "";
  const activationDate = activation?.activationDate || null;
  const deactivationDate = activation?.deactivationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const wifiSsid = wifi_configuration?.wifi_ssid || "";
  const wifiPassword = wifi_configuration?.wifi_password || "";
  const endpointHost = endpoint?.endpoint_host || "localhost";
  const endpointPort = endpoint?.port || 3000;
  const endpointPath = endpoint?.endpoint_path || "/api/endpoint";
  const ioPin = io_configuration?.io_pin || "";

  if (!deviceId) {
    return res.status(400).json({
      message: "deviceId wajib diisi.",
      status: false
    });
  }

  db.query(
    "SELECT * FROM activations WHERE device_id = ?",
    [deviceId],
    (err2, existing) => {
      if (err2) return res.status(500).json({ error: err2 });

      const queryParams = [
        owner,
        author,
        manufacturer,
        mikroType,
        firmwareVersion,
        firmwareDescription,
        deviceName,
        wifiSsid,
        wifiPassword,
        activationDate,
        deactivationDate,
        endpointHost,
        endpointPort,
        endpointPath,
        ioPin,
        macAddress,
        deviceId
      ];

      if (existing.length > 0) {
        // UPDATE DATA
        db.query(
          `UPDATE activations SET 
          owner = ?, 
          author = ?, 
          manufacturer = ?, 
          mikro_type = ?,
          firmware_version = ?, 
          firmware_description = ?, 
          device_name = ?,
          wifi_ssid = ?,
          wifi_password = ?,
          activation_date = ?, 
          deactivation_date = ?,
          endpoint_host = ?,
          endpoint_port = ?,
          endpoint_path = ?,
          io_pin = ?,
          mac_address = ?
        WHERE device_id = ?`,
          queryParams,
          (err3) => {
            if (err3)
              return res.status(500).json({
                message: "Gagal update aktivasi",
                error: err3
              });

            return res.status(200).json({
              message: "Aktivasi diperbarui",
              status: true,
              deviceId
            });
          }
        );

      } else {
        // INSERT DATA BARU
        db.query(
          `INSERT INTO activations (
          owner,
          author,
          manufacturer,
          mikro_type,
          firmware_version,
          firmware_description,
          device_name,
          wifi_ssid,
          wifi_password,
          activation_date,
          deactivation_date,
          endpoint_host,
          endpoint_port,
          endpoint_path,
          io_pin,
          mac_address,
          device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          queryParams,
          (err4, result) => {
            if (err4)
              return res.status(500).json({
                message: "Gagal insert aktivasi",
                error: err4
              });

            return res.status(201).json({
              message: "Aktivasi berhasil ditambahkan",
              status: true,
              activationId: result.insertId,
              deviceId
            });
          }
        );
      }
    }
  );
});

/* ========== FORM TAMBAH AKTIVASI ========== */
app.get("/activations/new", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Tambah DeviceID</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-blue-50 p-8 min-h-screen font-sans">

      <!-- Tombol Kembali -->
      <div class="mb-4">
        <a href="/activations" class="text-blue-700 hover:text-blue-900 text-lg font-medium">
          ← Kembali
        </a>
      </div>

      <!-- Judul -->
      <h1 class="text-3xl font-bold text-blue-800 mb-8">
        Tambah DeviceID
      </h1>

      <!-- Form -->
      <form id="deviceForm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
          <!-- Device ID -->
          <div class="mb-6">
            <label for="deviceId" class="block text-lg font-medium text-blue-800 mb-2">
              Device ID *
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

          <!-- Mikrolontroler Type -->
          <div class="mb-6">
            <label for="mikroType" class="block text-lg font-medium text-blue-800 mb-2">
              Mikrolontroler Type
            </label>
            <input
              type="text"
              id="mikroType"
              name="mikroType"
              class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Contoh: ESP32, Arduino Uno, etc."
            />
          </div>
        </div>

        <div class="mt-8">
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
          >
            Simpan Aktivasi
          </button>
        </div>
      </form>

    </body>
    </html>
  `);
});

app.post("/activations/new", async (req, res) => {
  const {
    deviceId,
    macAddress,
    manufacturer,
    mikroType,
    firmwareVersion,
    firmwareDescription,
    wifiConfiguration,
    ioConfiguration
  } = req.body;

  if (!deviceId) {
    return res.status(400).send(
      'Device ID wajib diisi. <a href="/activations/new">Kembali</a>'
    );
  }

  const owner = "Unknown";
  const author = "System";
  const activationDate = null;
  const deactivationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 tahun

  try {
    // 1. Pastikan device ada di tabel devices
    const [deviceExists] = await db.promise().query(
      "SELECT id FROM devices WHERE id = ?",
      [deviceId]
    );

    if (deviceExists.length === 0) {
      // Tambahkan device jika belum ada
      await db.promise().query(
        "INSERT INTO devices (id, name) VALUES (?, ?)",
        [deviceId, "Unknown"]
      );
    }

    // 2. Simpan aktivasi
    await db.promise().query(
      `INSERT INTO activations (
        device_id, 
        owner,
        author,
        activation_date, 
        deactivation_date,
        mac_address,
        manufacturer,
        mikro_type,
        firmware_version,
        firmware_description,
        wifi_ssid,
        wifi_password,
        io_pin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        owner,
        author,
        activationDate,
        deactivationDate,
        macAddress || "",
        manufacturer || "Unknown",
        mikroType || "Unknown",
        firmwareVersion || "1.0.0",
        firmwareDescription || "",
        wifiConfiguration?.ssid || "",
        wifiConfiguration?.password || "",
        ioConfiguration || ""
      ]
    );

    res.redirect("/activations?success=true");

  } catch (err) {
    console.error("Error saat menyimpan aktivasi:", err);
    res.status(500).send(`
      <div class="p-4 bg-red-100 text-red-800 rounded mb-4">
        Gagal menyimpan aktivasi: ${err.message}
      </div>
      <a href="/activations/new" class="text-blue-600 hover:underline">Coba lagi</a>
    `);
  }
});

/* ========== TABEL AKTIVASI ========== */
app.get("/activations", (req, res) => {
  const sql = `
    SELECT 
      device_id,
      mac_address,
      owner,
      author,
      manufacturer,
      mikro_type,
      firmware_version,
      firmware_description,
      device_name,
      wifi_ssid,
      wifi_password,
      activation_date,
      deactivation_date,
      endpoint_host,
      endpoint_port,
      endpoint_path,
      io_pin,
      CASE 
        WHEN NOW() BETWEEN activation_date AND deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status
    FROM activations
    ORDER BY activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err)
      return res.send("❌ Gagal ambil data.");
    };

    let html = `
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Daftar Aktivasi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-blue-50 p-8 min-h-screen font-sans">

    <div class="flex items-center mb-6">
      <img src="/Logo_Makerindo.png" alt="Logo" class="w-20 h-20 mr-5" />
    </div>
    <div class="flex border justify-between items-center px-4 py-2">
      <h2 class="text-3xl font-bold text-blue-800">Daftar Aktivasi Perangkat</h2>
      <button onclick="toggleModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
        Tambah DeviceId
      </button>
    </div>
    <div class="shadow rounded-lg border border-blue-200 overflow-x-auto">
      <div class="max-h-[600px] overflow-y-auto">
        <table class="min-w-full text-sm text-left divide-y divide-blue-200">
          <thead class="bg-blue-100 text-blue-800 uppercase text-xs font-semibold sticky top-0 z-10">
            <tr>
              <th class="px-3 py-3">Device ID</th>
              <th class="px-3 py-3">MAC</th>
              <th class="px-3 py-3">Owner</th>
              <th class="px-3 py-3">Author</th>
              <th class="px-3 py-3">Manufacturer</th>
              <th class="px-3 py-3">Mikro Type</th>
              <th class="px-3 py-3">Firmware</th>
              <th class="px-3 py-3">Description</th>
              <th class="px-3 py-3">Device Name</th>
              <th class="px-3 py-3">WiFi SSID</th>
              <th class="px-3 py-3">Activation</th>
              <th class="px-3 py-3">Deactivation</th>
              <th class="px-3 py-3">Endpoint</th>
              <th class="px-3 py-3">I/O Pin</th>
              <th class="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-blue-100">
    `;

    results.forEach(row => {
      html += `
        <tr class="hover:bg-blue-50">
          <td class="px-3 py-3 font-mono text-xs">${row.device_id}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.mac_address}</td>
          <td class="px-3 py-3">${row.owner}</td>
          <td class="px-3 py-3">${row.author}</td>
          <td class="px-3 py-3">${row.manufacturer}</td>
          <td class="px-3 py-3">${row.mikro_type || "Unknown"}</td>
          <td class="px-3 py-3">${row.firmware_version}</td>
          <td class="px-3 py-3">${row.firmware_description}</td>
          <td class="px-3 py-3">${row.device_name}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.wifi_ssid}</td>
          <td class="px-3 py-3 text-xs">${new Date(row.activation_date).toLocaleString()}</td>
          <td class="px-3 py-3 text-xs">${new Date(row.deactivation_date).toLocaleString()}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.endpoint_host}:${row.endpoint_port}${row.endpoint_path}</td>
          <td class="px-3 py-3">${row.io_pin}</td>
          <td class="px-3 py-3 ${row.status === "Aktif"
          ? "text-green-600 font-bold"
          : "text-red-600 font-bold"
        }">${row.status}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Dialog -->
    <div id="modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-40">
      <div class="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto border border-blue-200">

        <!-- Tombol Close -->
        <button
          onclick="toggleModal()"
          class="absolute top-2 right-3 text-gray-600 hover:text-red-500 text-xl"
        >
          &times;
        </button>

        <!-- Judul Modal -->
        <h3 class="text-2xl font-bold text-blue-800 mb-6">Tambah DeviceID</h3>

        <div class="p-4 bg-blue-100 text-blue-800 rounded-md shadow">
          Informasi
           <h1> - Format DeviceID [123ABC]</h1>
        </div>

        <!-- Form -->
        <form method="POST" action="/activations/new">
          <div class="mb-4">
            <label for="modalDeviceId" class="block text-sm font-medium text-blue-800 mb-2">
              Device ID *
            </label>
            <input
              type="text"
              id="modalDeviceId"
              name="deviceId"
              required
              class="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="123ABC"
            />
          </div>

          <!-- Tombol Simpan -->
          <div class="text-right mt-6">
            <button
              type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded shadow"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Script Modal -->
    <script>
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        alert("Aktivasi berhasil disimpan!");
      }

      function toggleModal() {
        const modal = document.getElementById("modal");
        modal.classList.toggle("hidden");
        modal.classList.toggle("flex");
      }
    </script>
  </body>
</html>
    `;

    res.send(html);
  });
});

/* ========== API ENDPOINTS UNTUK MOBILE ========== */

// GET - Ambil semua data aktivasi (untuk mobile)
app.get("/api/activations", (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      d.name AS device_name, 
      a.owner, 
      a.activation_date, 
      a.deactivation_date,
      a.mac_address,
      a.manufacturer,
      a.mikro_type,
      a.firmware_version,
      a.firmware_description,
      a.wifi_ssid,
      a.wifi_password,
      a.io_pin,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN true
        ELSE false
      END AS is_active
    FROM activations a
    LEFT JOIN devices d ON a.device_id = d.id
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data aktivasi",
        error: err.message
      });
    }

    // Format data untuk mobile
    const formattedResults = results.map(row => ({
      device_id: row.device_id,
      device_name: row.device_name || "Unknown",
      owner: row.owner,
      activation_date: row.activation_date,
      deactivation_date: row.deactivation_date,
      mac_address: row.mac_address || "",
      manufacturer: row.manufacturer || "Unknown",
      mikro_type: row.mikro_type || "Unknown",
      firmware_version: row.firmware_version || "1.0.0",
      firmware_description: row.firmware_description || "",
      wifi_ssid: row.wifi_ssid || "",
      wifi_password: row.wifi_password || "",
      io_pin: row.io_pin || "",
      status: row.status,
      is_active: row.is_active,
      activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
      deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
    }));

    res.json({
      success: true,
      message: "Data aktivasi berhasil diambil",
      data: formattedResults,
      total: formattedResults.length
    });
  });
});

// GET - Ambil data aktivasi berdasarkan device_id (untuk mobile)
app.get("/api/activations/:deviceId", (req, res) => {
  const { deviceId } = req.params;

  const sql = `
    SELECT 
      a.device_id, 
      d.name AS device_name, 
      a.owner, 
      a.activation_date, 
      a.deactivation_date,
      a.mac_address,
      a.manufacturer,
      a.mikro_type,
      a.firmware_version,
      a.firmware_description,
      a.wifi_ssid,
      a.wifi_password,
      a.io_pin,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN true
        ELSE false
      END AS is_active
    FROM activations a
    LEFT JOIN devices d ON a.device_id = d.id
    WHERE a.device_id = ?
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, [deviceId], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data aktivasi",
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Device ID '${deviceId}' tidak ditemukan`
      });
    }

    const row = results[0];
    const formattedResult = {
      device_id: row.device_id,
      device_name: row.device_name || "Unknown",
      owner: row.owner,
      activation_date: row.activation_date,
      deactivation_date: row.deactivation_date,
      mac_address: row.mac_address || "",
      manufacturer: row.manufacturer || "Unknown",
      mikro_type: row.mikro_type || "Unknown",
      firmware_version: row.firmware_version || "1.0.0",
      firmware_description: row.firmware_description || "",
      wifi_ssid: row.wifi_ssid || "",
      wifi_password: row.wifi_password || "",
      io_pin: row.io_pin || "",
      status: row.status,
      is_active: row.is_active,
      activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
      deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
    };

    res.json({
      success: true,
      message: "Data aktivasi berhasil diambil",
      data: formattedResult
    });
  });
});

// GET - Ambil hanya perangkat yang aktif (untuk mobile)
app.get("/api/activations/active", (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      d.name AS device_name, 
      a.owner, 
      a.activation_date, 
      a.deactivation_date,
      a.mac_address,
      a.manufacturer,
      a.mikro_type,
      a.firmware_version,
      a.firmware_description,
      a.wifi_ssid,
      a.wifi_password,
      a.io_pin,
      'Aktif' AS status,
      true AS is_active
    FROM activations a
    LEFT JOIN devices d ON a.device_id = d.id
    WHERE NOW() BETWEEN a.activation_date AND a.deactivation_date
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data perangkat aktif",
        error: err.message
      });
    }

    const formattedResults = results.map(row => ({
      device_id: row.device_id,
      device_name: row.device_name || "Unknown",
      owner: row.owner,
      activation_date: row.activation_date,
      deactivation_date: row.deactivation_date,
      mac_address: row.mac_address || "",
      manufacturer: row.manufacturer || "Unknown",
      mikro_type: row.mikro_type || "Unknown",
      firmware_version: row.firmware_version || "1.0.0",
      firmware_description: row.firmware_description || "",
      wifi_ssid: row.wifi_ssid || "",
      wifi_password: row.wifi_password || "",
      io_pin: row.io_pin || "",
      status: row.status,
      is_active: row.is_active,
      activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
      deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
    }));

    res.json({
      success: true,
      message: "Data perangkat aktif berhasil diambil",
      data: formattedResults,
      total: formattedResults.length
    });
  });
});

// GET - Cek status aktivasi perangkat tertentu (untuk mobile)
app.get("/api/status/:deviceId", (req, res) => {
  const { deviceId } = req.params;

  const sql = `
    SELECT 
      a.device_id,
      a.mikro_type,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN true
        ELSE false
      END AS is_active,
      a.activation_date,
      a.deactivation_date
    FROM activations a
    WHERE a.device_id = ?
    ORDER BY a.activation_date DESC
    LIMIT 1
  `;

  db.query(sql, [deviceId], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengecek status perangkat",
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Device ID '${deviceId}' tidak ditemukan`
      });
    }

    const row = results[0];
    res.json({
      success: true,
      message: "Status perangkat berhasil diambil",
      data: {
        device_id: row.device_id,
        mikro_type: row.mikro_type || "Unknown",
        status: row.status,
        is_active: row.is_active,
        activation_date: row.activation_date,
        deactivation_date: row.deactivation_date,
        activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
        deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
      }
    });
  });
});

// GET - Statistik aktivasi (untuk mobile dashboard)
app.get("/api/stats", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_activations,
      SUM(CASE WHEN NOW() BETWEEN activation_date AND deactivation_date THEN 1 ELSE 0 END) as active_devices,
      SUM(CASE WHEN NOW() NOT BETWEEN activation_date AND deactivation_date THEN 1 ELSE 0 END) as inactive_devices,
      COUNT(DISTINCT manufacturer) as total_manufacturers,
      COUNT(DISTINCT mikro_type) as total_mikro_types
    FROM activations
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil statistik",
        error: err.message
      });
    }

    const stats = results[0];
    res.json({
      success: true,
      message: "Statistik berhasil diambil",
      data: {
        total_activations: stats.total_activations,
        active_devices: stats.active_devices,
        inactive_devices: stats.inactive_devices,
        total_manufacturers: stats.total_manufacturers,
        total_mikro_types: stats.total_mikro_types
      }
    });
  });
});

/* ========== JALANKAN SERVER ========== */
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://192.168.1.30:${port}`);
});