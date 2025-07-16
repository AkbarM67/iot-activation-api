const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Middleware untuk parsing JSON
app.use(express.json());

// Koneksi ke database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // kosongkan jika pakai Laragon default
  database: 'iot_activation'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Gagal konek ke MySQL:', err);
    process.exit(1);
  }
  console.log('✅ Terhubung ke database MySQL');
});

// Endpoint POST /activate — menerima aktivasi dari IoT
app.post('/activate', (req, res) => {
  const { deviceId, owner, activationDate, deactivationDate } = req.body;

  if (!deviceId || !owner || !activationDate || !deactivationDate) {
    return res.status(400).json({ message: 'deviceId, owner, activationDate, dan deactivationDate wajib diisi.' });
  }

  const checkDevice = 'SELECT * FROM devices WHERE id = ?';
  db.query(checkDevice, [deviceId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal cek device', error: err });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Device ID tidak ditemukan. Aktivasi ditolak.' });
    }

    const insert = `
      INSERT INTO activations (device_id, owner, activation_date, deactivation_date)
      VALUES (?, ?, ?, ?)
    `;
    db.query(insert, [deviceId, owner, activationDate, deactivationDate], (err, resultInsert) => {
      if (err) return res.status(500).json({ message: 'Gagal menyimpan aktivasi', error: err });

      res.status(201).json({
        message: 'Aktivasi sukses',
        activationId: resultInsert.insertId,
        deviceId,
        owner
      });
    });
  });
});

// Endpoint GET /activations — tampilkan data dalam HTML
app.get('/activations', (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      d.name AS device_name, 
      a.owner, 
      a.activation_date,
      a.deactivation_date,
      CASE
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status
    FROM activations a
    JOIN devices d ON a.device_id = d.id
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('❌ Gagal ambil data aktivasi');

    let html = `
      <html>
        <head>
          <title>Daftar Aktivasi IoT</title>
          <style>
            body { font-family: Arial; margin: 40px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background-color: #f4f4f4; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Daftar Aktivasi Perangkat IoT</h2>
          <table>
            <tr>
              <th>Device ID</th>
              <th>Nama Device</th>
              <th>Owner</th>
              <th>Tanggal Aktivasi</th>
              <th>Tanggal Nonaktif</th>
              <th>Status</th>
            </tr>
    `;

    results.forEach(row => {
      html += `
        <tr>
          <td>${row.device_id}</td>
          <td>${row.device_name}</td>
          <td>${row.owner}</td>
          <td>${new Date(row.activation_date).toLocaleString()}</td>
          <td>${row.deactivation_date ? new Date(row.deactivation_date).toLocaleString() : '-'}</td>
          <td>${row.status}</td>
        </tr>
      `;
    });

    html += `
          </table>
        </body>
      </html>
    `;

    res.send(html);
  });
});

// Endpoint GET /activations/json — tampilkan data aktivasi sebagai JSON
app.get('/activations/json', (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      d.name AS device_name, 
      a.owner, 
      a.activation_date,
      a.deactivation_date
    FROM activations a
    JOIN devices d ON a.device_id = d.id
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil data aktivasi' });
    res.json(results);
  });
});

// Endpoint GET /devices — daftar device valid
app.get('/devices', (req, res) => {
  const sql = 'SELECT id, name FROM devices ORDER BY id';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil device' });
    res.json(results);
  });
});

// Endpoint GET /status/:deviceId — cek status aktivasi
app.get('/status/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  const sql = `
    SELECT * FROM activations 
    WHERE device_id = ? 
      AND NOW() BETWEEN activation_date AND deactivation_date
    ORDER BY activation_date DESC
    LIMIT 1
  `;

  db.query(sql, [deviceId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Gagal cek status' });

    if (result.length > 0) {
      res.json({ deviceId, active: true });
    } else {
      res.json({ deviceId, active: false });
    }
  });
});

// Endpoint PUT /deactivate/:deviceId — IoT nonaktifkan diri
app.put('/deactivate/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  const sql = `
    UPDATE activations 
    SET deactivation_date = NOW()
    WHERE device_id = ? 
      AND NOW() BETWEEN activation_date AND deactivation_date
    ORDER BY activation_date DESC
    LIMIT 1
  `;

  db.query(sql, [deviceId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Gagal menonaktifkan' });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Device tidak aktif atau tidak ditemukan' });
    }

    res.json({ message: `Device ${deviceId} berhasil dinonaktifkan.` });
  });
});

// Jalankan server di jaringan lokal
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://192.168.1.30:${port}`);
});
