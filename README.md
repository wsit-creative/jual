# KDKMP Belanja Desa — Starter Kit

Isi paket:
- `index.html` — prototipe website customer + panel admin demo.
- `Code.gs` — fondasi Google Apps Script untuk membaca katalog dan membuat struktur spreadsheet.
- `produk-template.csv` — contoh format import produk.
- `PANDUAN-MULAI.md` — langkah setup awal.

## Status saat ini
Ini adalah starter kit untuk memulai proyek, bukan sistem produksi siap menerima pesanan sungguhan.
Panel admin HTML saat ini menyimpan perubahan pada browser lokal. Checkout menyiapkan pesan WhatsApp, tetapi tidak menyimpan order ke spreadsheet.
Jangan mengumumkan sistem sudah terhubung sebelum tes API selesai.

## Arsitektur tahap awal
GitHub Pages (website statis) → Google Apps Script → Google Spreadsheet.

PENTING: GitHub Pages tidak menjalankan PHP. Apps Script adalah layanan backend awal. Untuk keamanan admin, pencatatan order yang andal, rate limit, validasi wilayah dan pencegahan order palsu, perlu ditambahkan validasi server-side sebelum peluncuran publik.

## Yang perlu diganti sebelum pengujian
1. `CONFIG.ADMIN_WHATSAPP` di `index.html` dengan nomor WhatsApp resmi format internasional tanpa tanda `+`.
2. `CONFIG.APPS_SCRIPT_URL` setelah Apps Script di-deploy.
3. `SPREADSHEET_ID` di `Code.gs`.
4. Isi katalog resmi melalui CSV/Spreadsheet, bukan contoh demo.

## Format kolom Produk
SKU | Nama Barang | Kategori | Subkategori | Merek | Satuan | Harga | Image_URL | Status | Max_Order | Aktif

Status hanya `TERSEDIA` atau `HABIS`; Aktif hanya `AKTIF` atau `NONAKTIF`.
