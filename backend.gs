// Backend Piano Performance Molise v6
// UNA RIGA PER SCHEDA — elimina il limite 50K caratteri per cella
// DOPO MODIFICA: Gestisci distribuzioni > matita > Nuova versione

function doGet(e) {
  var p = e ? e.parameter : {};
  var action = p.action || "load";
  
  // ── LOAD: legge tutte le righe dal foglio data ──
  if (action === "load") {
    return jsonOut(loadAllEntries());
  }
  
  if (action === "loadUsers") {
    var s = getOrCreateSheet("users");
    var v = s.getRange("A1").getValue();
    try { return jsonOut(JSON.parse(v || "[]")); } catch(e) { return jsonOut([]); }
  }
  
  // ── UPSERT: aggiunge o aggiorna UNA entry ──
  if (action === "upsert" && p.data) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var entry = JSON.parse(b64decode(p.data));
      if (!entry || !entry.id) { lock.releaseLock(); return jsonOut({ok:false,error:"no id"}); }
      
      var sheet = getOrCreateSheet("data");
      var lastRow = sheet.getLastRow();
      var found = false;
      
      // Cerca la riga con questo ID
      if (lastRow >= 2) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (ids[i][0] === entry.id) {
            // Aggiorna riga esistente
            sheet.getRange(i + 2, 2).setValue(JSON.stringify(entry));
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        // Nuova riga
        sheet.appendRow([entry.id, JSON.stringify(entry)]);
      }
      
      var total = sheet.getLastRow() - 1; // minus header
      lock.releaseLock();
      logAction("upsert", entry.id, (entry.serviceCode||"") + " total:" + total);
      return jsonOut({ok:true, count:total, id:entry.id});
    } catch(err) {
      try{lock.releaseLock()}catch(e2){}
      logAction("upsert ERROR", err.message, "");
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  // ── LOAD DELETED IDs (lista di ID eliminati dall'admin) ──
  if (action === "loadDeleted") {
    var ds = getOrCreateSheet("deleted");
    var lr = ds.getLastRow();
    if (lr < 2) return jsonOut([]);
    var ids = ds.getRange(2, 1, lr - 1, 1).getValues().map(function(r){return r[0]}).filter(function(x){return !!x});
    return jsonOut(ids);
  }
  
  // ── ADD DELETED ID (segna un ID come eliminato) ──
  if (action === "addDeleted" && p.id) {
    var ds = getOrCreateSheet("deleted");
    ds.appendRow([p.id, new Date().toISOString()]);
    logAction("addDeleted", p.id, "");
    return jsonOut({ok:true});
  }
  
  // ── DELETE (rimuove riga + segna come eliminato) ──
  if (action === "deleteEntry" && p.id) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var sheet = getOrCreateSheet("data");
      var lastRow = sheet.getLastRow();
      var deleted = false;
      if (lastRow >= 2) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = ids.length - 1; i >= 0; i--) {
          if (ids[i][0] === p.id) {
            sheet.deleteRow(i + 2);
            deleted = true;
            break;
          }
        }
      }
      // Segna come eliminato nella lista
      var ds = getOrCreateSheet("deleted");
      ds.appendRow([p.id, new Date().toISOString()]);
      var total = sheet.getLastRow() - 1;
      lock.releaseLock();
      logAction("delete", p.id, "deleted:" + deleted + " total:" + total);
      return jsonOut({ok:true, count:total});
    } catch(err) {
      try{lock.releaseLock()}catch(e2){}
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  // ── BULK SAVE (merge con lock) ──
  if (action === "bulkSave" && p.data) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var incoming = JSON.parse(b64decode(p.data));
      var sheet = getOrCreateSheet("data");
      var existingIds = {};
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) existingIds[ids[i][0]] = i + 2; // row number
      }
      var added = 0;
      for (var j = 0; j < incoming.length; j++) {
        var e = incoming[j];
        if (!e || !e.id) continue;
        if (existingIds[e.id]) {
          sheet.getRange(existingIds[e.id], 2).setValue(JSON.stringify(e));
        } else {
          sheet.appendRow([e.id, JSON.stringify(e)]);
          added++;
        }
      }
      var total = sheet.getLastRow() - 1;
      lock.releaseLock();
      logAction("bulkSave", "in:" + incoming.length + " added:" + added + " total:" + total, "");
      return jsonOut({ok:true, count:total});
    } catch(err) {
      try{lock.releaseLock()}catch(e2){}
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  // ── SAVE USERS ──
  if (action === "saveUsers" && p.data) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var users = JSON.parse(b64decode(p.data));
      var s = getOrCreateSheet("users");
      s.getRange("A1").setValue(JSON.stringify(users));
      lock.releaseLock();
      updateUsersSheet(users);
      logAction("saveUsers", users.length + " users", "");
      return jsonOut({ok:true});
    } catch(err) {
      try{lock.releaseLock()}catch(e2){}
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  // ── SEND PASSWORD ──
  if (action === "sendPassword" && p.email && p.pwd) {
    try {
      MailApp.sendEmail({
        to: p.email,
        subject: "Piano Performance Molise 2026-2028 - Recupero Password",
        htmlBody: "<div style='font-family:Arial,sans-serif;max-width:500px;margin:0 auto'>" +
          "<div style='background:#003366;color:#fff;padding:16px;border-radius:8px 8px 0 0;text-align:center'>" +
          "<h2 style='margin:0'>REGIONE MOLISE</h2></div>" +
          "<div style='background:#fff;border:1px solid #d9dadb;padding:20px;border-radius:0 0 8px 8px'>" +
          "<p>Gentile <b>" + (p.name||"") + "</b>,</p>" +
          "<p>la tua password e':</p>" +
          "<div style='background:#f0f4fa;border:2px solid #003366;border-radius:6px;padding:16px;text-align:center;margin:16px 0'>" +
          "<span style='font-size:24px;font-weight:bold;color:#003366'>" + p.pwd + "</span></div>" +
          "<p style='font-size:11px;color:#999;text-align:center'>Regione Molise</p></div></div>"
      });
      logAction("email OK", p.name, p.email);
      return jsonOut({ok:true});
    } catch(err) {
      logAction("email ERROR", (p.name||""), err.message);
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  // ── MIGRATE: converte il vecchio formato (JSON in A1) al nuovo (una riga per entry) ──
  if (action === "migrate") {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var sheet = getOrCreateSheet("data");
      var v = sheet.getRange("A1").getValue();
      if (v && typeof v === "string" && v.charAt(0) === "[") {
        var old = JSON.parse(v);
        if (old && old.length > 0 && old[0].id) {
          // Clear sheet and rewrite as rows
          sheet.clear();
          sheet.getRange("A1:B1").setValues([["id","json"]]);
          for (var i = 0; i < old.length; i++) {
            sheet.appendRow([old[i].id, JSON.stringify(old[i])]);
          }
          lock.releaseLock();
          logAction("migrate", old.length + " entries converted to rows", "");
          return jsonOut({ok:true, migrated:old.length});
        }
      }
      lock.releaseLock();
      return jsonOut({ok:true, migrated:0, msg:"already migrated or empty"});
    } catch(err) {
      try{lock.releaseLock()}catch(e2){}
      return jsonOut({ok:false, error:err.message});
    }
  }
  
  return jsonOut([]);
}

// doPost fallback
function doPost(e) {
  try {
    var raw = (e&&e.parameter&&e.parameter.payload)?e.parameter.payload:((e&&e.postData)?e.postData.contents:"");
    if(!raw)return jsonOut({ok:false});
    var body=JSON.parse(raw);
    if(body.action==="save"&&body.data){
      // Legacy bulk save — convert to row format
      var lock=LockService.getScriptLock();lock.waitLock(30000);
      var sheet=getOrCreateSheet("data");
      sheet.clear();
      sheet.getRange("A1:B1").setValues([["id","json"]]);
      for(var i=0;i<body.data.length;i++){
        sheet.appendRow([body.data[i].id, JSON.stringify(body.data[i])]);
      }
      lock.releaseLock();
      return jsonOut({ok:true,count:body.data.length});
    }
    return jsonOut({ok:false});
  }catch(err){return jsonOut({ok:false,error:err.message})}
}

// ═══ HELPERS ═══

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function b64decode(b64) {
  return Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString();
}

// Legge tutte le entry dal foglio (una riga per entry)
function loadAllEntries() {
  var sheet = getOrCreateSheet("data");
  var lastRow = sheet.getLastRow();
  
  // Check if still old format (JSON array in A1)
  if (lastRow <= 1) {
    var v = sheet.getRange("A1").getValue();
    if (v && typeof v === "string" && v.charAt(0) === "[") {
      try { return JSON.parse(v); } catch(e) { return []; }
    }
    return [];
  }
  
  // Check if A1 still has old format (JSON array)
  var a1 = sheet.getRange("A1").getValue();
  if (a1 && typeof a1 === "string" && a1.charAt(0) === "[") {
    // Old format — auto-migrate
    try {
      var old = JSON.parse(a1);
      if (old && old.length > 0 && old[0].id) {
        sheet.clear();
        sheet.getRange("A1:B1").setValues([["id","json"]]);
        for (var i = 0; i < old.length; i++) {
          sheet.appendRow([old[i].id, JSON.stringify(old[i])]);
        }
        logAction("auto-migrate", old.length + " entries", "");
        return old;
      }
    } catch(e) {}
  }
  
  // New format: read rows
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      try { result.push(JSON.parse(data[i][0])); } catch(e) {}
    }
  }
  return result;
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    if (name === "data") s.getRange("A1:B1").setValues([["id","json"]]);
    if (name === "users") s.getRange("A1").setValue("[]");
    if (name === "deleted") s.getRange("A1:B1").setValues([["id","deleted_at"]]);
  }
  return s;
}

function logAction(a,d1,d2) {
  try {
    var s = getOrCreateSheet("log");
    if (s.getLastRow() === 0) s.getRange("A1:D1").setValues([["Timestamp","Azione","Det1","Det2"]]);
    s.appendRow([new Date().toISOString(), a, d1||"", d2||""]);
  } catch(e) {}
}

function updateUsersSheet(data) {
  try {
    var s = getOrCreateSheet("Utenti_Registrati"); s.clear();
    s.getRange("A1:F1").setValues([["Nome","Email","Password","Hash","Registrato","Ultimo Accesso"]]);
    s.getRange("A1:F1").setFontWeight("bold").setBackground("#003366").setFontColor("#fff");
    if (data && data.length) {
      var r = data.map(function(u){return[u.name||"",u.email||"",u.pwd||"",u.hash||"",u.registered||"",u.lastLogin||""]});
      s.getRange(2,1,r.length,6).setValues(r);
    }
  } catch(e) {}
}

function testEmail() {
  MailApp.sendEmail({to:Session.getActiveUser().getEmail(),subject:"Test PPO",body:"OK!"});
  Logger.log("OK");
}
