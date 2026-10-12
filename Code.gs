/** KDKMP Belanja Desa — Google Apps Script API
 * Spreadsheet tabs: Produk and Pesanan.
 * Set Script Property KDKMP_ADMIN_TOKEN before deploying.
 */
const CONFIG = {
  SPREADSHEET_ID: '1KLLgn0tMEvRfyniIO3CzTe9BFBxW9AeTgfBIkRryAcI',
  PRODUCT_SHEET: 'Produk',
  ORDER_SHEET: 'Pesanan'
};
const PRODUCT_HEADERS = ['SKU','Nama Barang','Kategori','Harga','Image_URL','Stok','Aktif'];
const LEGACY_PRODUCT_HEADERS = ['SKU','Nama Barang','Kategori','Subkategori','Merek','Satuan','Harga','Image_URL','Status','Max_Order','Aktif'];
const ORDER_HEADERS = ['ID Pesanan','Timestamp','Nama','WhatsApp','Alamat','Catatan','Item JSON','Total','Status','Tanggal Pengiriman','Jam Pengiriman'];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'products');
    if (action === 'products') return json_({ ok:true, products:readProducts_() });
    if (action === 'orderStatus') {
      const id = clean_((e.parameter && e.parameter.id) || '');
      if (!id) return json_({ ok:false, error:'ID pesanan wajib diisi.' });
      const sheet = getSheet_(CONFIG.ORDER_SHEET, ORDER_HEADERS);
      const values = sheet.getDataRange().getValues();
      const exists = values.slice(1).some(r => String(r[0]) === id);
      return json_({ ok:true, id, exists });
    }
    if (action === 'ping') return json_({ ok:true, message:'KDKMP API aktif' });
    return json_({ ok:false, error:'Aksi GET tidak dikenal.' });
  } catch (err) { return json_({ ok:false, error:String(err.message || err) }); }
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    const action = clean_(payload.action);
    if (['saveProduct','setActive','importProducts'].includes(action)) requireAdmin_(payload.token);
    let result;
    if (action === 'saveProduct') result = { ok:true, product:saveProduct_(payload.product || {}) };
    else if (action === 'setActive') result = { ok:true, product:setActive_(payload.sku, payload.active) };
    else if (action === 'importProducts') result = { ok:true, imported:importProducts_(payload.products) };
    else if (action === 'createOrder') result = { ok:true, order:createOrder_(payload.order || {}) };
    else result = { ok:false, error:'Aksi POST tidak dikenal.' };
    return json_(result);
  } catch (err) { return json_({ ok:false, error:String(err.message || err) }); }
}

function setupKDKMP() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  ss.setSpreadsheetTimeZone('Asia/Jakarta');
  migrateProductSheet_(ss);
  ensureSheet_(ss, CONFIG.PRODUCT_SHEET, PRODUCT_HEADERS);
  const orderSheet = ensureSheet_(ss, CONFIG.ORDER_SHEET, ORDER_HEADERS);
  orderSheet.getRange('B:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  Logger.log('KDKMP siap. Spreadsheet: ' + ss.getUrl());
}

function migrateProductSheet_(ss) {
  let sh = ss.getSheetByName(CONFIG.PRODUCT_SHEET);
  if (!sh || sh.getLastRow() === 0) return;
  const lastCol = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(v => String(v || '').trim());
  if (PRODUCT_HEADERS.every((h, i) => header[i] === h) && header.length === PRODUCT_HEADERS.length) return;
  if (!LEGACY_PRODUCT_HEADERS.every((h, i) => header[i] === h)) {
    throw new Error('Header sheet Produk tidak cocok dengan format lama maupun baru. Periksa header sebelum menjalankan migrasi.');
  }
  const oldRows = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, LEGACY_PRODUCT_HEADERS.length).getValues()
    : [];
  const newRows = oldRows.filter(r => clean_(r[0]) && clean_(r[1])).map(r => [
    r[0], r[1], r[2] || 'Lainnya', Number(r[6]) || 0, r[7] || '', Math.max(0, Math.floor(Number(r[9]) || 0)), normalActive_(r[10])
  ]);
  sh.clearContents();
  sh.getRange(1, 1, 1, PRODUCT_HEADERS.length).setValues([PRODUCT_HEADERS]);
  if (newRows.length) sh.getRange(2, 1, newRows.length, PRODUCT_HEADERS.length).setValues(newRows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, PRODUCT_HEADERS.length).setFontWeight('bold');
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
    return sh;
  }
  const existing = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), headers.length)).getDisplayValues()[0].slice(0, headers.length);
  if (headers.some((h,i) => String(existing[i] || '').trim() !== h)) {
    throw new Error('Header sheet "' + name + '" tidak cocok. Header yang dibutuhkan: ' + headers.join(' | '));
  }
  return sh;
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemukan. Jalankan setupKDKMP().');
  const actual = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), headers.length)).getDisplayValues()[0].slice(0, headers.length);
  if (headers.some((h,i) => String(actual[i] || '').trim() !== h)) throw new Error('Header sheet "' + name + '" tidak sesuai. Jalankan pemeriksaan header.');
  return sh;
}

function readProducts_() {
  const sh = getSheet_(CONFIG.PRODUCT_SHEET, PRODUCT_HEADERS);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues()
    .filter(r => clean_(r[0]) && clean_(r[1]))
    .map(r => {
      const stock = Math.max(0, Math.floor(Number(r[5]) || 0));
      return {
        sku: String(r[0]), name: String(r[1]), category: String(r[2] || 'Lainnya'),
        price: Number(r[3]) || 0, image: String(r[4] || ''), stock,
        subcategory: '', brand: '', unit: 'pcs',
        status: stock > 0 ? 'TERSEDIA' : 'HABIS', maxOrder: stock, active: normalActive_(r[6])
      };
    });
}

function saveProduct_(p) {
  const product = validateProduct_(p);
  const sh = getSheet_(CONFIG.PRODUCT_SHEET, PRODUCT_HEADERS);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const last = sh.getLastRow();
    let row = 0;
    if (last >= 2) {
      const found = sh.getRange(2,1,last-1,1).getDisplayValues().findIndex(r => String(r[0]).trim() === product.sku);
      if (found >= 0) row = found + 2;
    }
    if (!row) row = Math.max(2, last + 1);
    sh.getRange(row,1,1,PRODUCT_HEADERS.length).setValues([productRow_(product)]);
    return product;
  } finally { lock.releaseLock(); }
}

function setActive_(sku, active) {
  sku = clean_(sku);
  active = normalActive_(active);
  if (!sku) throw new Error('SKU wajib diisi.');
  const sh = getSheet_(CONFIG.PRODUCT_SHEET, PRODUCT_HEADERS);
  if (sh.getLastRow() < 2) throw new Error('Produk belum ada.');
  const vals = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
  const idx = vals.findIndex(r => String(r[0]).trim() === sku);
  if (idx < 0) throw new Error('SKU tidak ditemukan: ' + sku);
  sh.getRange(idx+2,7).setValue(active);
  return readProducts_().find(p => p.sku === sku);
}

function importProducts_(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('Daftar produk kosong.');
  if (list.length > 300) throw new Error('Maksimal 300 produk per impor.');
  let count = 0;
  list.forEach(p => { saveProduct_(p); count++; });
  return count;
}

function createOrder_(o) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  ss.setSpreadsheetTimeZone('Asia/Jakarta');
  const id = clean_(o.id), name = clean_(o.name), phone = clean_(o.whatsapp), address = clean_(o.address), note = clean_(o.note);
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const deliveryDate = clean_(o.deliveryDate) || today;
  const deliveryTime = clean_(o.deliveryTime);
  const validDeliveryTimes = ['09.00 - 10.00 WIB','10.00 - 11.00 WIB','11.00 - 12.00 WIB','12.00 - 13.00 WIB','13.00 - 14.00 WIB','14.00 - 15.00 WIB','15.00 - 16.00 WIB','16.00 - 17.00 WIB','17.00 - 18.00 WIB'];
  if (!/^KDKMP-[A-Z0-9-]{5,60}$/.test(id)) throw new Error('ID pesanan tidak valid.');
  if (!name || name.length > 80) throw new Error('Nama penerima wajib diisi (maksimal 80 karakter).');
  if (!/^62\d{8,13}$/.test(phone)) throw new Error('Nomor WhatsApp tidak valid.');
  if (!address || address.length > 500) throw new Error('Alamat wajib diisi (maksimal 500 karakter).');
  if (note.length > 300) throw new Error('Catatan terlalu panjang.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || deliveryDate < today) throw new Error('Tanggal pengiriman tidak valid atau sudah lewat.');
  if (!validDeliveryTimes.includes(deliveryTime)) throw new Error('Jam pengiriman tidak valid.');
  if (deliveryDate === today) {
    const nowParts = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm').split(':').map(Number);
    const nowMinutes = nowParts[0] * 60 + nowParts[1];
    const slotStart = Number(deliveryTime.slice(0, 2)) * 60 + Number(deliveryTime.slice(3, 5));
    if (slotStart <= nowMinutes) throw new Error('Jam pengiriman tersebut sudah dimulai atau lewat. Silakan pilih jam berikutnya atau tanggal besok.');
  }
  if (!Array.isArray(o.items) || !o.items.length || o.items.length > 100) throw new Error('Item pesanan tidak valid.');

  // Kunci proses agar dua checkout bersamaan tidak memakai stok yang sama.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const orderSheet = getSheet_(CONFIG.ORDER_SHEET, ORDER_HEADERS);
    if (orderSheet.getLastRow() >= 2 && orderSheet.getRange(2,1,orderSheet.getLastRow()-1,1).getDisplayValues().some(r => String(r[0]) === id)) {
      return { id, duplicate:true, message:'Pesanan ini sudah pernah dicatat; stok tidak dikurangi lagi.' };
    }

    const productSheet = getSheet_(CONFIG.PRODUCT_SHEET, PRODUCT_HEADERS);
    const lastProductRow = productSheet.getLastRow();
    if (lastProductRow < 2) throw new Error('Produk belum tersedia.');
    const productRows = productSheet.getRange(2,1,lastProductRow-1,PRODUCT_HEADERS.length).getValues();
    const rowBySku = {};
    productRows.forEach((r, i) => {
      const sku = clean_(r[0]);
      if (sku) rowBySku[sku] = { row:i+2, sku, name:String(r[1] || ''), category:String(r[2] || 'Lainnya'), price:Number(r[3]) || 0, image:String(r[4] || ''), stock:Math.max(0, Math.floor(Number(r[5]) || 0)), active:normalActive_(r[6]) };
    });

    // Gabungkan jumlah SKU yang sama untuk mencegah stok terhitung ganda.
    const requested = {};
    o.items.forEach(it => {
      const sku = clean_(it.sku), qty = Number(it.qty);
      if (!sku || !Number.isInteger(qty) || qty < 1) throw new Error('Jumlah/SKU barang tidak valid.');
      requested[sku] = (requested[sku] || 0) + qty;
    });

    const items = Object.keys(requested).map(sku => {
      const p = rowBySku[sku], qty = requested[sku];
      if (!p || p.active !== 'AKTIF' || p.stock <= 0) throw new Error('Produk tidak tersedia: ' + sku);
      if (qty > p.stock) throw new Error('Stok tidak mencukupi untuk ' + p.name + '. Stok tersedia: ' + p.stock + '.');
      return { sku:p.sku, name:p.name, qty, unit:'pcs', price:p.price, subtotal:p.price*qty };
    });
    const total = items.reduce((sum, it) => sum + it.subtotal, 0);

    // Simpan pesanan, lalu kurangi kolom Stok (F) sesuai jumlah yang dibeli.
    // Bila ID pesanan dikirim ulang, pemeriksaan duplikat di atas mencegah pengurangan ulang.
    orderSheet.appendRow([id, new Date(), name, phone, address, note, JSON.stringify(items), total, 'MENUNGGU KONFIRMASI ADMIN', deliveryDate, deliveryTime]);
    items.forEach(it => {
      const p = rowBySku[it.sku];
      productSheet.getRange(p.row, 6).setValue(p.stock - it.qty);
    });
    orderSheet.getRange('B:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();
    return { id, total, itemCount:items.length, status:'MENUNGGU KONFIRMASI ADMIN', stockUpdated:true };
  } finally {
    lock.releaseLock();
  }
}

function validateProduct_(p) {
  const sku = clean_(p.sku), name = clean_(p.name);
  const price = Number(p.price), stock = Number(p.stock);
  const image = clean_(p.image || p.image_url || '');
  if (!sku || sku.length > 60) throw new Error('SKU wajib diisi (maksimal 60 karakter).');
  if (!name || name.length > 160) throw new Error('Nama produk wajib diisi (maksimal 160 karakter).');
  if (!Number.isFinite(price) || price < 0) throw new Error('Harga tidak valid.');
  if (!Number.isInteger(stock) || stock < 0) throw new Error('Stok harus bilangan bulat minimal 0.');
  if (image && !/^https:\/\//i.test(image)) throw new Error('URL gambar harus HTTPS.');
  return { sku, name, category:clean_(p.category) || 'Lainnya', price, image, stock, status:stock > 0 ? 'TERSEDIA' : 'HABIS', maxOrder:stock, active:normalActive_(p.active) };
}
function productRow_(p) { return [p.sku,p.name,p.category,p.price,p.image,p.stock,p.active]; }

function normalStatus_(v) { return /habis|out|sold/i.test(clean_(v)) ? 'HABIS' : 'TERSEDIA'; }
function normalActive_(v) { return /nonaktif|non-active|inactive|false|0/i.test(clean_(v)) ? 'NONAKTIF' : 'AKTIF'; }
function requireAdmin_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('KDKMP_ADMIN_TOKEN');
  if (!expected || expected.length < 12) throw new Error('Token admin belum disetel. Tambahkan Script Property KDKMP_ADMIN_TOKEN (minimal 12 karakter).');
  if (String(token || '') !== expected) throw new Error('Token admin salah.');
}
function clean_(v) { return String(v == null ? '' : v).trim(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
