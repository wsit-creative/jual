/**
 * KDKMP - Google Apps Script API (starter)
 * Spreadsheet tabs:
 *   Produk: SKU, Nama Barang, Kategori, Subkategori, Merek, Satuan,
 *           Harga, Image_URL, Status, Max_Order, Aktif
 *   Pesanan: ID Pesanan, Timestamp, Nama, WhatsApp, Alamat, Catatan,
 *            Item JSON, Total, Status
 *
 * Catatan:
 * - Ini fondasi untuk pengujian, bukan backend produksi yang sudah aman.
 * - Endpoint produk bersifat publik. Jangan taruh data customer di tab Produk.
 * - Sebelum membuka endpoint tulis untuk publik, tambahkan autentikasi admin
 *   dan validasi server-side yang tepercaya.
 */
const CONFIG = {
  SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET',
  PRODUCT_SHEET: 'Produk',
  ORDER_SHEET: 'Pesanan'
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'products';
  if (action === 'products') {
    const products = readProducts_();
    const callback = e.parameter.callback;
    const payload = { ok: true, products: products };
    if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    ok: false, message: 'Action tidak dikenal'
  })).setMimeType(ContentService.MimeType.JSON);
}

function readProducts_() {
  const sheet = getSheet_(CONFIG.PRODUCT_SHEET);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(h => String(h).trim().toLowerCase());
  const idx = name => headers.indexOf(name.toLowerCase());
  const col = {
    sku: idx('SKU'), name: idx('Nama Barang'), category: idx('Kategori'),
    subcategory: idx('Subkategori'), brand: idx('Merek'), unit: idx('Satuan'),
    price: idx('Harga'), image: idx('Image_URL'), status: idx('Status'),
    maxOrder: idx('Max_Order'), active: idx('Aktif')
  };
  return values.filter(r => String(r[col.sku] || '').trim() && String(r[col.name] || '').trim())
    .map(r => ({
      sku: String(r[col.sku] || '').trim(),
      name: String(r[col.name] || '').trim(),
      category: String(r[col.category] || 'Lainnya').trim(),
      subcategory: String(r[col.subcategory] || '').trim(),
      brand: String(r[col.brand] || '').trim(),
      unit: String(r[col.unit] || 'pcs').trim(),
      price: Number(r[col.price]) || 0,
      image: String(r[col.image] || '').trim(),
      status: String(r[col.status] || 'TERSEDIA').trim().toUpperCase(),
      maxOrder: Math.max(1, Number(r[col.maxOrder]) || 999999),
      active: String(r[col.active] || 'AKTIF').trim().toUpperCase()
    }));
}

function setupKDKMP() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  setupSheet_(ss, CONFIG.PRODUCT_SHEET, [
    'SKU','Nama Barang','Kategori','Subkategori','Merek','Satuan',
    'Harga','Image_URL','Status','Max_Order','Aktif'
  ]);
  setupSheet_(ss, CONFIG.ORDER_SHEET, [
    'ID Pesanan','Timestamp','Nama','WhatsApp','Alamat','Catatan',
    'Item JSON','Total','Status'
  ]);
}

function setupSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function getSheet_(name) {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.indexOf('GANTI_') === 0) {
    throw new Error('Isi CONFIG.SPREADSHEET_ID terlebih dahulu.');
  }
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" belum ada. Jalankan setupKDKMP().');
  return sh;
}
