# Panduan mulai dari nol

## 1. Buat Google Spreadsheet
1. Buka Google Drive dan buat Google Spreadsheet baru bernama `Database KDKMP`.
2. Salin ID spreadsheet dari URL:
   `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit`
3. Buka menu **Ekstensi → Apps Script**.

## 2. Pasang Apps Script
1. Ganti isi file `Code.gs` bawaan dengan kode dalam file `Code.gs` pada paket ini.
2. Ganti `GANTI_DENGAN_ID_SPREADSHEET` dengan ID spreadsheet yang disalin.
3. Simpan.
4. Pilih fungsi `setupKDKMP`, lalu klik **Run/Jalankan** dan izinkan akses yang diminta.
5. Pastikan dua tab terbentuk: `Produk` dan `Pesanan`.

## 3. Isi data produk
Tab `Produk` memakai header:
`SKU, Nama Barang, Kategori, Subkategori, Merek, Satuan, Harga, Image_URL, Status, Max_Order, Aktif`

Gunakan `produk-template.csv` sebagai contoh. Harga berupa angka tanpa `Rp`, misalnya `75000`. URL gambar sebaiknya HTTPS langsung ke file gambar. Untuk status gunakan `TERSEDIA`/`HABIS`; untuk aktif gunakan `AKTIF`/`NONAKTIF`.

## 4. Deploy Apps Script untuk membaca produk
1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. Atur *Execute as* menjadi akun pemilik script.
4. Akses harus mengikuti kebutuhan publik katalog dan kebijakan organisasi. Jangan gunakan akses publik untuk endpoint tulis yang belum dilindungi.
5. Deploy dan salin URL Web App `/exec`.

Endpoint katalog mendukung `?action=products`. Untuk website statis, pengambilan lintas domain dapat terpengaruh pembatasan browser/CORS. Uji endpoint di browser dahulu; jika `fetch` dari GitHub Pages diblokir, integrasi frontend perlu menggunakan JSONP untuk pembacaan publik atau backend perantara yang sesuai. Jangan menganggap koneksi sukses sebelum dites.

## 5. Website
1. Buka `index.html` dalam editor teks.
2. Cari `APPS_SCRIPT_URL` dan tempel URL Web App.
3. Ganti `ADMIN_WHATSAPP` dengan nomor admin KDKMP, format `62xxxxxxxxxx`.
4. Simpan dan uji di browser.

## 6. GitHub Pages
1. Buat repository GitHub baru.
2. Unggah `index.html` (serta file pendukung jika nanti ditambahkan).
3. Buka **Settings → Pages**, pilih branch utama dan folder root.
4. Simpan, lalu tunggu URL publik tersedia.

## Batasan keamanan yang harus diketahui
- Parameter `?wa=62...` hanya mengisi field nomor; itu bukan bukti pengguna benar-benar masuk dari WhatsApp.
- Nomor admin dan semua JavaScript frontend dapat dilihat publik.
- Jangan menyimpan kata sandi admin rahasia di HTML/JS.
- Jangan izinkan perubahan produk publik ke Spreadsheet tanpa autentikasi dan validasi server.
- Data pesanan dan identitas customer perlu akses terbatas.
- Status produk tidak boleh berubah otomatis hanya karena ada order.
- Pesanan besar harus berstatus perlu konfirmasi admin.
- Sebelum dipakai sungguhan, endpoint untuk membuat order dan admin harus dibangun dengan validasi server-side, pembatasan spam, pemeriksaan wilayah, dan log aktivitas.

## Rekomendasi
Mulai dengan katalog baca-saja dan uji 10–20 produk. Setelah alur pembacaan stabil, lanjutkan membuat endpoint admin dan pesanan yang aman. Jangan langsung mengimpor 2.900 SKU sebelum format data dibersihkan.
