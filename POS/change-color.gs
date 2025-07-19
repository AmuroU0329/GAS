function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== '販売履歴') return;

  highlightMaxPurchaseNumberRows_(sheet);
}

function highlightMaxPurchaseNumberRows_(sheet) {
  const data = sheet.getDataRange().getValues();

  let maxNumber = -Infinity;
  let maxRowIndexes = [];

  for (let i = 1; i < data.length; i++) {
    const rawPurchaseNumber = data[i][0];
    const purchaseNumberStr = String(rawPurchaseNumber).trim();

    if (purchaseNumberStr.startsWith('Re')) continue;

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
    sheet.getRange(rowIndex + 1, 1, 1, data[0].length).setBackground('#fff59d');
  }
}
