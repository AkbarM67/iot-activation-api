export const activationPage = (results) => {
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

    <div class="flex justify-between items-center mb-4">
      <h2 class="text-3xl font-bold text-blue-800">Daftar Aktivasi Perangkat</h2>
      <button onclick="document.getElementById('modal').classList.remove('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white text-xl px-6 py-3 rounded shadow">
        + Tambah Aktivasi
      </button>
    </div>

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
              <th class="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-blue-100">
`;

  results.forEach((row) => {
    html += `
    <tr class="hover:bg-blue-50 transition">
      <td class="px-4 py-3">${row.device_id}</td>
      <td class="px-4 py-3">${row.device_name || "-"}</td>
      <td class="px-4 py-3">${row.owner}</td>
      <td class="px-4 py-3">${new Date(row.activation_date).toLocaleString()}</td>
      <td class="px-4 py-3">${new Date(row.deactivation_date).toLocaleString()}</td>
      <td class="px-4 py-3 ${
        row.status === "Aktif"
          ? "text-green-600 font-bold"
          : "text-red-600 font-bold"
      }">${row.status}</td>
      <td class="px-4 py-3">
        <a href="/device-config/${row.device_id}" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow text-sm">
          Tampilkan Konfigurasi
        </a>
      </td>
    </tr>
  `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>

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
              placeholder="Masukkan Device ID"
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
  return html;
};
