const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'iot_activation'
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB gagal terkoneksi:', err);
    process.exit(1);
  }
  console.log('✅ Koneksi DB berhasil');
});

/* ========== ENDPOINT IoT AKTIVASI ========== */
app.post('/activate', (req, res) => {
  const { deviceId, owner, activationDate, deactivationDate } = req.body;

  if (!deviceId || !activationDate || !deactivationDate) {
    return res.status(400).json({ message: 'deviceId, activationDate, dan deactivationDate wajib diisi' });
  }

  const finalOwner = owner || 'Unknown';

  // 1. Cek apakah device sudah terdaftar di tabel devices
  db.query('SELECT * FROM devices WHERE id = ?', [deviceId], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.length === 0) {
      // ❌ Device tidak ditemukan, tolak permintaan
      return res.status(404).json({ message: `Device ID '${deviceId}' belum terdaftar di sistem.` });
    }

    // 2. Jika ada, simpan aktivasi
        db.query(
        'UPDATE activations SET owner = ?, activation_date = ?, deactivation_date = ? WHERE device_id = ?',
        [finalOwner, activationDate, deactivationDate, deviceId],
        (err2, result2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.status(200).json({
            message: 'Aktivasi diperbarui',
            deviceId,
            owner: finalOwner
            });
        }
        );
  });


  // 2. Simpan aktivasi
  function simpanAktivasi() {
    db.query(
      'INSERT INTO activations (device_id, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?)',
      [deviceId, finalOwner, activationDate, deactivationDate],
      (err3, result) => {
        if (err3) return res.status(500).json({ error: err3 });
        res.status(201).json({
          message: 'Aktivasi sukses',
          activationId: result.insertId,
          deviceId,
          owner: finalOwner
        });
      }
    );
  }
});

/* ========== FORM TAMBAH AKTIVASI ========== */
app.get('/activations/new', (req, res) => {
  res.send(`
    <html><body>
      <h2>Form Tambah Aktivasi (Manual DeviceID Saja)</h2>
      <form method="POST" action="/activations/new">
        <label>Device ID:</label><br/>
        <input type="text" name="deviceId" required/><br/><br/>
        <button type="submit">Tambah Aktivasi</button>
      </form>
      <p><a href="/activations">⬅ Kembali ke Aktivasi</a></p>
    </body></html>
  `);
});

app.post('/activations/new', (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) return res.send('Device ID wajib diisi. <a href="/activations/new">Kembali</a>');

  const owner = 'Unknown';
  const activationDate = new Date();
  const deactivationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

  // 1. Pastikan deviceId sudah ada di tabel devices
  db.query('SELECT * FROM devices WHERE id = ?', [deviceId], (err, result) => {
    if (err) {
      console.error(err);
      return res.send('Gagal cek device. <a href="/activations/new">Coba lagi</a>');
    }

    if (result.length === 0) {
      // Tambahkan device jika belum ada
      db.query('INSERT INTO devices (id, name) VALUES (?, ?)', [deviceId, 'Unknown'], (err2) => {
        if (err2) {
          console.error(err2);
          return res.send('Gagal menambahkan device. <a href="/activations/new">Coba lagi</a>');
        }
        simpanAktivasi();
      });
    } else {
      simpanAktivasi();
    }
  });

  // 2. Fungsi untuk menyimpan aktivasi
  function simpanAktivasi() {
    db.query(
      'INSERT INTO activations (device_id, owner, activation_date, deactivation_date) VALUES (?, ?, ?, ?)',
      [deviceId, owner, activationDate, deactivationDate],
      (err) => {
        if (err) {
          console.error(err);
          return res.send('Gagal simpan aktivasi. <a href="/activations/new">Coba lagi</a>');
        }
        res.redirect('/activations');
      }
    );
  }
});

/* ========== TABEL AKTIVASI ========== */
app.get('/activations', (req, res) => {
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
    if (err) return res.send('❌ Gagal ambil data.');

    let html = `
      <html>
        <head>
          <title>Daftar Aktivasi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #eee; }
            .aktif { color: green; font-weight: bold; }
            .nonaktif { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Daftar Aktivasi Perangkat</h2>
          <a href="/activations/new">➕ Tambah Aktivasi</a><br/><br/>
          <table>
            <tr>
              <th>Device ID</th><th>Nama Device</th><th>Owner</th>
              <th>Tanggal Aktif</th><th>Tanggal Akhir</th><th>Status</th>
            </tr>
    `;

    results.forEach(row => {
      html += `
        <tr>
          <td>${row.device_id}</td>
          <td>${row.device_name || '-'}</td>
          <td>${row.owner}</td>
          <td>${new Date(row.activation_date).toLocaleString()}</td>
          <td>${new Date(row.deactivation_date).toLocaleString()}</td>
          <td class="${row.status === 'Aktif' ? 'aktif' : 'nonaktif'}">${row.status}</td>
        </tr>
      `;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});

/* ========== JALANKAN SERVER ========== */
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://192.168.1.30:${port}`);
});
