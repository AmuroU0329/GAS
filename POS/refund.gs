// 販売履歴を取得する関数（HTML側で使用）
function getSalesHistory() {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('販売履歴');
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const header = values.shift();

  const idx = {
    purchaseNumber: header.indexOf('購入番号'),
    date: header.indexOf('日時'),
    id: header.indexOf('ID'),
    name: header.indexOf('商品名'),
    quantity: header.indexOf('個数'),
    note: header.indexOf('備考')
  };

  return values.map(row => ({
    purchaseNumber: row[idx.purchaseNumber],
    date: Utilities.formatDate(row[idx.date], Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'),
    id: row[idx.id],
    name: row[idx.name],
    quantity: row[idx.quantity],
    note: row[idx.note] || ''
  }));
}

function getUnitPriceById(id) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('Products');
  if (!sheet) return 0;

  const values = sheet.getDataRange().getValues();
  const header = values.shift();

  const idxId = header.indexOf('id');       // 小文字に修正
  const idxPrice = header.indexOf('price'); // 小文字に修正

  for (const row of values) {
    if (String(row[idxId]) === String(id)) {
      return Number(row[idxPrice]) || 0;
    }
  }
  return 0;
}

// 販売履歴に変更（返金など）を追記する
function applyProductChange(change) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("販売履歴");
  const now = new Date();

  const note = change.changeType === "refund" ? "返金対応" :
               change.changeType === "adjust" ? "数量変更" : "その他";

  const newRow = [
    change.purchaseNumber || '',
    Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss"),
    change.id,
    change.name,
    change.newQuantity-change.oldQuantity,
    note
  ];

  sheet.appendRow(newRow);
  
}


function getGroupedSalesHistory() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("販売履歴");
  const data = sheet.getDataRange().getValues().slice(1); // ヘッダー除去

  const grouped = {};
  for (const row of data) {
    const [purchaseNumber, datetime, id, name, quantity, note] = row;
    if (!grouped[purchaseNumber]) {
      grouped[purchaseNumber] = {
        datetime,
        items: []
      };
    }
    grouped[purchaseNumber].items.push({ id, name, quantity, note });
  }

  return Object.entries(grouped).map(([number, info]) => ({
    purchaseNumber: number,
    datetime: info.datetime,
    items: info.items
  }));
}





