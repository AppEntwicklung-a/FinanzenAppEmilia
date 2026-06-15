// ===== Feste monatliche Posten (Vorlagen für Fixeinnahmen & Fixkosten) =====
// App2: Diese Vorlagen werden automatisch in jeden neuen Monat übernommen.

const FIX_TEMPLATE_CATEGORIES = {
  fixeinnahmen: 'Fixeinnahme',
  fixkosten: 'Fixkosten'
};

// Standard-Vorlagen beim allerersten Start
async function seedFixDefaults() {
  if (localStorage.getItem('fix_initialized')) return;
  try {
    await dbPut('fixtemplates', { category: 'fixeinnahmen', name: 'Gehalt', payment: 'Bank', amount: 752 });
    localStorage.setItem('fix_initialized', '1');
  } catch (e) {
    console.error('seedFixDefaults', e);
  }
}

function fixSeededKeys() {
  try { return JSON.parse(localStorage.getItem('fix_seeded') || '[]'); }
  catch { return []; }
}
function markMonthSeeded(year, month) {
  const seeded = fixSeededKeys();
  const key = `${year}-${month}`;
  if (!seeded.includes(key)) {
    seeded.push(key);
    localStorage.setItem('fix_seeded', JSON.stringify(seeded));
  }
}

function templateToEntry(t, year, month) {
  return {
    category: t.category,
    year, month,
    name: t.name,
    payment: t.payment,
    amount: t.amount,
    paid: t.payment === 'Bar',
    fromTemplate: t.id,
    createdAt: Date.now()
  };
}

// Beim ersten Öffnen eines Monats die Vorlagen einmalig übernehmen
async function applyFixTemplatesIfNeeded(year, month) {
  if (fixSeededKeys().includes(`${year}-${month}`)) return;
  const templates = await dbGetAll('fixtemplates');
  for (const t of templates) {
    await dbPut('entries', templateToEntry(t, year, month));
  }
  markMonthSeeded(year, month);
}

// Manuell: fehlende Vorlagen in den aktuell angezeigten Monat übernehmen
async function applyTemplatesToCurrentMonth() {
  const templates = await dbGetAll('fixtemplates');
  const monthEntries = await getEntriesByMonth(state.year, state.month);
  let added = 0;
  for (const t of templates) {
    if (!monthEntries.some(e => e.fromTemplate === t.id)) {
      await dbPut('entries', templateToEntry(t, state.year, state.month));
      added++;
    }
  }
  markMonthSeeded(state.year, state.month);
  showToast(added > 0 ? `${added} Posten übernommen` : 'Monat bereits aktuell');
  if (state.view === 'months') loadMonthData();
}

// ===== Einstellungen: Karte =====
function fixTemplatesCard() {
  return `
    <div class="card">
      <div class="card-title">Feste monatliche Posten</div>
      <p style="margin-bottom:14px;font-size:0.9rem">
        Diese Posten (Fixeinnahmen &amp; Fixkosten) werden automatisch in jeden
        neuen Monat übernommen. Tippe einen Posten an, um ihn zu ändern.
      </p>
      <div id="fixtpl-list"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-primary" onclick="openAddFixTemplate()">+ Posten</button>
        <button class="btn btn-secondary" onclick="applyTemplatesToCurrentMonth()">
          Auf aktuellen Monat anwenden
        </button>
      </div>
    </div>
  `;
}

async function renderFixTemplateList() {
  const el = document.getElementById('fixtpl-list');
  if (!el) return;
  const templates = await dbGetAll('fixtemplates');
  if (templates.length === 0) {
    el.innerHTML = `<div style="font-size:0.88rem;color:var(--text-muted);padding:6px 0">
      Noch keine festen Posten angelegt.</div>`;
    return;
  }
  // Fixeinnahmen zuerst, dann nach Name
  const order = { fixeinnahmen: 0, fixkosten: 1 };
  templates.sort((a, b) =>
    (order[a.category] - order[b.category]) || a.name.localeCompare(b.name));

  el.innerHTML = `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table class="entry-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Art</th>
          <th>Zahlung</th>
          <th style="text-align:right">Betrag</th>
        </tr>
      </thead>
      <tbody>
        ${templates.map(t => `
          <tr class="entry-row" onclick="openEditFixTemplate('${t.id}')" style="cursor:pointer">
            <td>${escHtml(t.name)}</td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">
              ${FIX_TEMPLATE_CATEGORIES[t.category] || t.category}</td>
            <td>${paymentBadge(t.payment)}</td>
            <td class="amount">${formatEur(t.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
  `;
}

function openAddFixTemplate() {
  openModal('Fester Posten', fixTemplateForm(null));
  document.getElementById('fixtpl-save').addEventListener('click', () => saveFixTemplate(null));
}

async function openEditFixTemplate(id) {
  const t = await dbGet('fixtemplates', id);
  if (!t) return;
  openModal('Fester Posten', fixTemplateForm(t));
  document.getElementById('fixtpl-save').addEventListener('click', () => saveFixTemplate(id));
}

function fixTemplateForm(t) {
  const cats = Object.entries(FIX_TEMPLATE_CATEGORIES).map(([v, l]) =>
    `<option value="${v}" ${t && t.category === v ? 'selected' : ''}>${l}</option>`).join('');
  const pays = PAYMENTS.map(p =>
    `<option value="${p}" ${t && t.payment === p ? 'selected' : ''}>${p}</option>`).join('');

  return `
    <div class="form-group">
      <label>Art</label>
      <select id="ftf-category">${cats}</select>
    </div>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="ftf-name" value="${t ? escHtml(t.name) : ''}" placeholder="z.B. Miete, Gehalt...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Zahlungsart</label>
        <select id="ftf-payment">${pays}</select>
      </div>
      <div class="form-group">
        <label>Betrag (€)</label>
        <input type="number" id="ftf-amount" value="${t ? t.amount : ''}" min="0" step="0.01" placeholder="0,00">
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
      ${t ? `<button class="btn btn-danger" onclick="deleteFixTemplate('${t.id}')"
        style="margin-right:auto">Löschen</button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" id="fixtpl-save">Speichern</button>
    </div>
  `;
}

async function saveFixTemplate(existingId) {
  const category = document.getElementById('ftf-category').value;
  const name = document.getElementById('ftf-name').value.trim();
  const payment = document.getElementById('ftf-payment').value;
  const amount = parseFloat(document.getElementById('ftf-amount').value);

  if (!name) { showToast('Bitte Name eingeben'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Bitte gültigen Betrag eingeben'); return; }

  await dbPut('fixtemplates', { id: existingId || undefined, category, name, payment, amount });
  closeModal();
  showToast(existingId ? 'Posten aktualisiert' : 'Posten hinzugefügt');
  renderFixTemplateList();
}

async function deleteFixTemplate(id) {
  if (!confirm('Festen Posten löschen? Bereits übernommene Monatswerte bleiben erhalten.')) return;
  await dbDelete('fixtemplates', id);
  closeModal();
  showToast('Posten gelöscht');
  renderFixTemplateList();
}
