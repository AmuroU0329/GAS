const sheetId = '1kSlWdePXE9eOab3guNa3Xk_B3fvs0I51-A9AgNcS4ts';

function getInventoryData() {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('在庫管理');
  const values = sheet.getDataRange().getValues();

  // 3行目をヘッダーにする（配列の2番目の要素）
  const headers = values[2];
  const rows = values.slice(3);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function updateProductPrice(productId, newPrice) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(productId)) {
      sheet.getRange(i + 1, 5).setValue(true);      // E列: discount or flag列

      // 新しい行に同じ商品名・画像・新価格を追加
      const lastRow = sheet.getLastRow();  // 最終行（データあり）
      const newId = lastRow;               // 新IDとして行数を使うのもOK


      sheet.getRange(lastRow + 1, 1).setValue(newId);// id
      sheet.getRange(lastRow + 1, 2).setValue(data[i][1]+'【割引】');// name
      sheet.getRange(lastRow + 1, 3).setValue(newPrice);      
      sheet.getRange(lastRow + 1, 4).setValue(data[i][3]);
      sheet.getRange(lastRow + 1, 5).setValue("");

      return true;  // 成功
    }
  }
  throw new Error("該当商品が見つかりません");
}


function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products"); // シート名を適宜変更
  const data = sheet.getDataRange().getValues();

  const productId = Number(e.parameter.product_id);
  const newPrice = Number(e.parameter.new_price);

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === productId) {
      // C列（index 2）を価格に更新
      sheet.getRange(i + 1, 3).setValue(newPrice);
      // E列（index 4）に TRUE を記入
      sheet.getRange(i + 1, 5).setValue(true);
      return ContentService.createTextOutput("OK");
    }
  }

  return ContentService.createTextOutput("Not Found");
}



function getProductById(id) {
  const products = loadProducts(); // 既存関数を使う
  const product = products.find(p => p.id === Number(id));
  return product || null;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
function doGet(e) {
  const validPages = ['index', 'change', 'stock']; // 今後ページを増やすときもここに追加するだけ
  const page = validPages.includes(e?.parameter?.page) ? e.parameter.page : 'index';
  const template = HtmlService.createTemplateFromFile(page);
  return template.evaluate().setTitle('SATSUKI POS');
}
function saveToSheet(data) {
  const products = loadProducts(); // id, name, price, img の配列

  data.forEach(item => {
    const p = products.find(prod => prod.name === item.name);
    item.id = p ? p.id : null;
  });

  const sheetName = '販売履歴';
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['購入番号', '日時', 'ID', '商品名', '個数']);
  }

  const now = new Date();
  const purchaseNumbers = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const lastNumber = purchaseNumbers
  .filter(n => /^[0-9]+$/.test(n)) // 数字だけにマッチ（"Re2"などは除外）
  .map(Number)
  .pop() || 0;
  const purchaseNumber = lastNumber + 1;

  //let isFirst = true;

  // 追加開始行を記録
  const startRow = sheet.getLastRow() + 1;

  data.forEach(item => {
    if (item.quantity > 0) {
      const row = [
        //isFirst ? purchaseNumber : '',
        purchaseNumber,
        now,
        item.id,
        item.name,
        item.quantity
      ];
      sheet.appendRow(row);
      isFirst = false;
    }
  });
  highlightMaxPurchaseNumberRows();
}

function loadProducts() {
  const sheetName = 'Products';
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log("Productsシートがありません");
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log("Productsシートにデータがありません");
    return [];
  }
  const headers = data.shift();

  return data
   .filter(row => String(row[4]).toLowerCase() !== 'true')
   .map(row => ({
    id: Number(row[0]),
    name: row[1],
    price: Number(row[2]),
    img: row[3]
  }));
}

function appendProductToSheet(product) {
  const sheetName = 'Products';
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  sheet.appendRow([product.id, product.name, product.price, product.img]);
}


function highlightMaxPurchaseNumberRows() {
const sheetName = '販売履歴';
const ss = SpreadsheetApp.openById(sheetId);
let sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  let maxNumber = -Infinity;
  let maxRowIndexes = [];

  for (let i = 1; i < data.length; i++) { // ヘッダーを除く
    const rawPurchaseNumber = data[i][0];
    const purchaseNumberStr = String(rawPurchaseNumber).trim();

    // Reから始まる行はスキップ
    if (purchaseNumberStr.startsWith('Re')) continue;

    // 数値化を試みる
    const purchaseNumber = parseInt(purchaseNumberStr, 10);
    if (isNaN(purchaseNumber)) continue;

    if (purchaseNumber > maxNumber) {
      maxNumber = purchaseNumber;
      maxRowIndexes = [i];
    } else if (purchaseNumber === maxNumber) {
      maxRowIndexes.push(i);
    }
  }

  // 背景色をリセット
  sheet.getRange(2, 1, data.length - 1, data[0].length).setBackground(null);

  // 最大購入番号の行をハイライト
  for (const rowIndex of maxRowIndexes) {
    sheet.getRange(rowIndex + 1, 1, 1, data[0].length).setBackground('#fff59d'); // 明るい黄色
  }
}
