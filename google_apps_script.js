// Google Apps Script Code
// Instructions:
// 1. Buka Google Sheet Anda: https://docs.google.com/spreadsheets/d/16P57UUuvqlXNJpqpT6NSTQfQPfThRTi2q-xAZqvuj6A/edit?usp=sharing
// 2. Klik Extensions > Apps Script.
// 3. Hapus kode yang ada dan tempelkan kode di bawah ini.
// 4. Klik "Deploy" > "New Deployment".
// 5. Pilih tipe: "Web App".
// 6. Set "Execute as": "Me" (Saya).
// 7. Set "Who has access": "Anyone" (Siapa saja).
// 8. Klik "Deploy".
// 9. Salin "Web App URL" yang diberikan.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait for up to 10 seconds for other processes to finish.

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse data JSON yang dikirim dari game
    var data = JSON.parse(e.postData.contents);
    var username = data.username;
    var level = data.level;
    var score = data.score;
    var timestamp = new Date();

    // Cek apakah header sudah ada, jika belum tambahkan
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Username", "Level", "Total Score", "Last Updated"]);
    }

    // Cari apakah user sudah ada di sheet (untuk update baris, bukan tambah baris baru terus menerus)
    // Kita baca kolom A (Username)
    var range = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1);
    var values = range.getValues();
    var rowIndex = -1;

    for (var i = 0; i < values.length; i++) {
      if (values[i][0] == username) {
        rowIndex = i + 2; // +2 karena index array mulai dari 0 dan ada header di baris 1
        break;
      }
    }

    if (rowIndex > 0) {
      // Update user yang sudah ada
      sheet.getRange(rowIndex, 2).setValue(level);
      sheet.getRange(rowIndex, 3).setValue(score);
      sheet.getRange(rowIndex, 4).setValue(timestamp);
    } else {
      // Tambah user baru
      sheet.appendRow([username, level, score, timestamp]);
    }

    return ContentService.createTextOutput(JSON.stringify({result: "success", row: rowIndex}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
