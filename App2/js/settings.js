function appearanceCard() {
  const { theme, mode } = getThemePref();

  const options = THEMES.map(t => {
    const p = THEME_PREVIEW[t];
    return `
      <button class="theme-option ${t === theme ? 'active' : ''}" onclick="setTheme('${t}')">
        <span class="theme-swatch">
          <span style="background:${p.light}"></span>
          <span style="background:${p.accent}"></span>
          <span style="background:${p.dark}"></span>
        </span>
        <span class="theme-name">${THEME_LABELS[t]}</span>
      </button>
    `;
  }).join('');

  const modes = [
    { key: 'light', label: 'Hell' },
    { key: 'dark', label: 'Dunkel' },
    { key: 'auto', label: 'System' }
  ].map(m => `
    <button class="${m.key === mode ? 'active' : ''}" onclick="setMode('${m.key}')">${m.label}</button>
  `).join('');

  return `
    <div class="card">
      <div class="card-title">Darstellung</div>
      <p style="margin-bottom:12px;font-size:0.9rem">Farbvorlage</p>
      <div class="theme-grid">${options}</div>
      <p style="margin:16px 0 8px;font-size:0.9rem">Modus</p>
      <div class="mode-toggle">${modes}</div>
    </div>
  `;
}

function renderSettings() {
  const view = document.getElementById('view-settings');
  view.innerHTML = `
    <div class="page-header">
      <h1>Einstellungen</h1>
    </div>

    ${fixTemplatesCard()}

    ${appearanceCard()}

    <div class="card">
      <div class="card-title">Daten exportieren</div>
      <p style="margin-bottom:14px;font-size:0.9rem">
        Exportiert alle Einträge, Ersparnisse und Verträge als JSON-Datei.
        Speichere sie in iCloud oder Google Drive für die manuelle Synchronisation.
      </p>
      <button class="btn btn-primary" onclick="exportJSON()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" style="width:16px;height:16px">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        JSON exportieren
      </button>
    </div>

    <div class="card">
      <div class="card-title">Daten importieren</div>
      <p style="margin-bottom:14px;font-size:0.9rem">
        Importiert eine zuvor exportierte JSON-Datei. Bestehende Einträge mit
        gleicher ID werden überschrieben, neue werden hinzugefügt.
      </p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label class="btn btn-secondary" style="cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" style="width:16px;height:16px">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,5 17,10"/>
            <line x1="12" y1="5" x2="12" y2="17"/>
          </svg>
          JSON importieren
          <input type="file" id="import-file" accept=".json" style="display:none"
            onchange="importJSON(this)">
        </label>
        <span id="import-status" style="font-size:0.85rem;color:var(--text-muted)"></span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">XLSX Migration</div>
      <p style="margin-bottom:14px;font-size:0.9rem">
        Importiere deine bestehende Google Sheets / Excel-Datei einmalig in die App.
      </p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label class="btn btn-secondary" style="cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" style="width:16px;height:16px">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          XLSX importieren
          <input type="file" id="xlsx-file" accept=".xlsx,.xls" style="display:none"
            onchange="importXLSX(this)">
        </label>
        <span id="xlsx-status" style="font-size:0.85rem;color:var(--text-muted)"></span>
      </div>
      <div id="xlsx-preview" style="margin-top:14px"></div>
    </div>

    <div class="card">
      <div class="card-title" style="color:var(--danger)">Daten löschen</div>
      <p style="margin-bottom:14px;font-size:0.9rem">
        Löscht alle gespeicherten Daten unwiderruflich aus diesem Browser.
      </p>
      <button class="btn btn-danger" onclick="clearAllData()">
        Alle Daten löschen
      </button>
    </div>

    <div class="card">
      <div class="card-title">App installieren</div>
      <p style="font-size:0.9rem;margin-bottom:14px">
        Installiere die App auf deinem Gerät für schnellen Zugriff ohne Browser-Leiste.
      </p>
      <div id="install-section">
        <p style="font-size:0.85rem;color:var(--text-muted)">
          <strong>iPhone/iPad:</strong> Safari → Teilen-Symbol → „Zum Home-Bildschirm"<br>
          <strong>Android:</strong> Chrome → Menü → „App installieren"<br>
          <strong>Desktop:</strong> Chrome/Edge → Adressleiste → Install-Symbol
        </p>
      </div>
      <button id="install-btn" class="btn btn-primary hidden" onclick="installPWA()">
        App installieren
      </button>
    </div>

    <div style="text-align:center;padding:20px 0 8px;color:var(--text-muted);font-size:0.78rem">
      Finanzen App · Lokale PWA · Alle Daten bleiben auf deinem Gerät · App2 · Build v2
    </div>
  `;

  initInstallPrompt();
  renderFixTemplateList();
}

// JSON Export
async function exportJSON() {
  try {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `finanzen-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export erfolgreich');
  } catch (e) {
    showToast('Export fehlgeschlagen');
    console.error(e);
  }
}

// JSON Import
async function importJSON(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('import-status');
  status.textContent = 'Wird importiert...';
  status.style.color = 'var(--text-muted)';

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version || !data.entries) {
      throw new Error('Ungültiges Format');
    }

    await importData(data);

    const total = (data.entries?.length || 0) +
                  (data.savings?.length || 0) +
                  (data.contracts?.length || 0);

    status.textContent = `✓ ${total} Datensätze importiert`;
    status.style.color = 'var(--success)';
    showToast('Import erfolgreich');
    input.value = '';

    // Aktuelle Ansicht neu laden
    renderView(state.view);
  } catch (e) {
    status.textContent = '✗ Import fehlgeschlagen: ' + e.message;
    status.style.color = 'var(--danger)';
    console.error(e);
  }
}

// XLSX Import
async function importXLSX(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('xlsx-status');
  const preview = document.getElementById('xlsx-preview');
  status.textContent = 'Wird gelesen...';
  status.style.color = 'var(--text-muted)';

  try {
    await loadSheetJS();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

    const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni',
                         'Juli','August','September','Oktober','November','Dezember'];

    const entries = [];
    const savings = [];
    let importYear = new Date().getFullYear();

    for (const sheetName of wb.SheetNames) {
      const monthIdx = MONTH_NAMES.indexOf(sheetName);
      if (monthIdx === -1) continue;

      const month = monthIdx + 1;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // Spalten: A-C = Einnahmen, D-F = Fixkosten, G-I = Sonstige Ausgaben
      const colMap = [
        { cols: [0,1,2], cats: ['fixeinnahmen','sonstige_einnahmen'] },
        { cols: [3,4,5], cat: 'fixkosten' },
        { cols: [6,7,8], cat: 'sonstige_ausgaben' }
      ];

      let currentCat = null;

      for (let r = 2; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        // Einnahmen (Spalten 0-2)
        const nameA = row[0], payA = row[1], amtA = row[2];
        if (nameA && typeof nameA === 'string') {
          if (nameA === 'Fixeinnahmen') { currentCat = 'fixeinnahmen'; }
          else if (nameA === 'Sonstige Einnahmen') { currentCat = 'sonstige_einnahmen'; }
          else if (nameA === 'letzter Monat') {
            // Übertrag vom letzten Monat
            if (typeof amtA === 'number' && amtA !== 0) {
              entries.push({ year: importYear, month, category: 'sonstige_einnahmen',
                name: 'Übertrag letzter Monat', payment: payA || 'Bank', amount: amtA });
            }
          } else if (nameA !== 'Summe' && nameA !== 'Name' && nameA !== 'Einnahmen') {
            if (typeof amtA === 'number') {
              entries.push({ year: importYear, month,
                category: currentCat || 'fixeinnahmen',
                name: nameA.trim(),
                payment: payA || 'Bank',
                amount: amtA });
            }
          }
        }

        // Fixkosten (Spalten 3-5)
        const nameB = row[3], payB = row[4], amtB = row[5];
        if (nameB && typeof nameB === 'string' &&
            nameB !== 'Summe' && nameB !== 'Name' && nameB !== 'Fixkosten') {
          if (typeof amtB === 'number') {
            entries.push({ year: importYear, month,
              category: 'fixkosten',
              name: nameB.trim(),
              payment: payB || 'Bank',
              amount: amtB });
          }
        }

        // Sonstige Ausgaben (Spalten 6-8)
        const nameC = row[6], payC = row[7], amtC = row[8];
        if (nameC && typeof nameC === 'string' &&
            nameC !== 'Summe' && nameC !== 'Name' && nameC !== 'Sonstige Ausgaben') {
          if (typeof amtC === 'number') {
            entries.push({ year: importYear, month,
              category: 'sonstige_ausgaben',
              name: nameC.trim(),
              payment: payC || 'Bar',
              amount: amtC });
          }
        }
      }
    }

    // Auswertungsblatt: Ersparnisse lesen
    if (wb.SheetNames.includes('Auswertung')) {
      const ws = wb.Sheets['Auswertung'];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      let inSavings = false;
      for (const row of rows) {
        if (!row) continue;
        if (row[0] === 'Ersparnisse') { inSavings = true; continue; }
        if (!inSavings) continue;
        const monthIdx = MONTH_NAMES.indexOf(row[0]);
        if (monthIdx !== -1 && typeof row[1] === 'number') {
          savings.push({
            year: importYear,
            month: monthIdx + 1,
            amount: row[1],
            note: row[2] ? String(row[2]) : ''
          });
        }
      }
    }

    // Vorschau anzeigen
    preview.innerHTML = `
      <div style="background:var(--accent-light);border-radius:var(--radius-sm);
        padding:14px;font-size:0.88rem">
        <div style="font-weight:600;margin-bottom:8px;color:var(--accent)">
          Vorschau — gefundene Daten
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;color:var(--text-secondary)">
          <span>Einträge:</span><span style="font-weight:500;color:var(--text-primary)">${entries.length}</span>
          <span>Ersparnisse:</span><span style="font-weight:500;color:var(--text-primary)">${savings.length} Monate</span>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary" onclick="confirmXLSXImport(${JSON.stringify(entries).replace(/"/g,'&quot;')}, ${JSON.stringify(savings).replace(/"/g,'&quot;')})">
            Jetzt importieren
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('xlsx-preview').innerHTML=''">
            Abbrechen
          </button>
        </div>
      </div>
    `;

    status.textContent = `✓ Datei gelesen`;
    status.style.color = 'var(--success)';
    input.value = '';

  } catch (e) {
    status.textContent = '✗ Fehler: ' + e.message;
    status.style.color = 'var(--danger)';
    console.error(e);
  }
}

async function confirmXLSXImport(entries, savings) {
  try {
    for (const e of entries) await dbPut('entries', e);
    for (const s of savings) await dbPut('savings', s);
    document.getElementById('xlsx-preview').innerHTML = '';
    document.getElementById('xlsx-status').textContent = `✓ ${entries.length} Einträge importiert`;
    document.getElementById('xlsx-status').style.color = 'var(--success)';
    showToast('XLSX erfolgreich importiert');
    renderView(state.view);
  } catch (e) {
    showToast('Import fehlgeschlagen');
    console.error(e);
  }
}

function loadSheetJS() {
  return new Promise(resolve => {
    if (window.XLSX) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// Alle Daten löschen
async function clearAllData() {
  if (!confirm('Wirklich alle Daten löschen? Das kann nicht rückgängig gemacht werden.')) return;
  if (!confirm('Bist du sicher? Alle Einträge, Ersparnisse und Verträge werden gelöscht.')) return;

  const stores = ['entries', 'savings', 'contracts'];
  for (const store of stores) {
    const items = await dbGetAll(store);
    for (const item of items) await dbDelete(store, item.id);
  }

  showToast('Alle Daten gelöscht');
  renderView(state.view);
}

// PWA Install
let deferredInstallPrompt = null;

function initInstallPrompt() {
  if (deferredInstallPrompt) {
    document.getElementById('install-btn').classList.remove('hidden');
  }
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.classList.remove('hidden');
});

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') {
    deferredInstallPrompt = null;
    showToast('App installiert');
  }
}