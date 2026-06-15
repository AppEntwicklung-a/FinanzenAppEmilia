const CATEGORIES = {
  fixeinnahmen: 'Fixeinnahmen',
  sonstige_einnahmen: 'Sonstige Einnahmen',
  fixkosten: 'Fixkosten',
  variable_kosten: 'Variable Kosten',
  sonstige_ausgaben: 'Sonstige Ausgaben'
};

const PAYMENTS = ['Bank', 'Bar', 'Paypal', 'SEPA', 'Gutschein', 'Klarna'];

function renderMonths() {
  const view = document.getElementById('view-months');
  view.innerHTML = `
    <div class="page-header">
      <div class="month-nav">
        <button class="month-nav-btn" id="prev-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <span class="month-label" id="month-label"></span>
        <button class="month-nav-btn" id="next-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>
      <select id="year-select" style="width:auto;font-size:0.9rem;padding:6px 28px 6px 10px"></select>
    </div>

    <div id="month-summary" class="summary-row"></div>

    <div id="month-columns"></div>
  `;

  const yearSel = document.getElementById('year-select');
  for (let y = 2020; y <= 2030; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === state.year) opt.selected = true;
    yearSel.appendChild(opt);
  }
  yearSel.addEventListener('change', () => {
    state.year = parseInt(yearSel.value);
    loadMonthData();
  });

  document.getElementById('prev-month').addEventListener('click', () => {
    if (state.month === 1) { state.month = 12; state.year--; }
    else state.month--;
    yearSel.value = state.year;
    loadMonthData();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    if (state.month === 12) { state.month = 1; state.year++; }
    else state.month++;
    yearSel.value = state.year;
    loadMonthData();
  });

  loadMonthData();
}

async function loadMonthData() {
  document.getElementById('month-label').textContent =
    MONTHS_DE[state.month - 1] + ' ' + state.year;

  await applyFixTemplatesIfNeeded(state.year, state.month);
  const entries = await getEntriesByMonth(state.year, state.month);

  renderMonthSummary(entries);
  renderMonthColumns(entries);
}

function renderMonthSummary(entries) {
  const fixEin = sumCat(entries, 'fixeinnahmen');
  const sonstEin = sumCat(entries, 'sonstige_einnahmen');
  const fixKost = sumCat(entries, 'fixkosten');
  const varKost = sumCat(entries, 'variable_kosten');
  const sonstAus = sumCat(entries, 'sonstige_ausgaben');
  const totalEin = fixEin + sonstEin;
  const totalAus = fixKost + varKost + sonstAus;
  const verfuegbar = totalEin - totalAus;

  const chips = [
    { label: 'Einnahmen', value: formatEur(totalEin), cls: '' },
    { label: 'Ausgaben', value: formatEur(totalAus), cls: 'negative' },
    { label: 'Verfügbar', value: formatEur(verfuegbar), cls: verfuegbar >= 0 ? 'positive' : 'negative' }
  ];

  document.getElementById('month-summary').innerHTML = chips.map(c => `
    <div class="summary-chip ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function renderMonthColumns(entries) {
  const cols = [
    { key: 'einnahmen', label: 'Einnahmen', cats: ['fixeinnahmen', 'sonstige_einnahmen'], color: 'var(--success)' },
    { key: 'fixkosten', label: 'Fixkosten', cats: ['fixkosten'], color: 'var(--warning)' },
    { key: 'variable', label: 'Variable Kosten', cats: ['variable_kosten'], color: 'var(--danger)' },
    { key: 'sonstige', label: 'Sonstige Ausgaben', cats: ['sonstige_ausgaben'], color: 'var(--danger)' }
  ];

  const container = document.getElementById('month-columns');
  container.style.cssText = 'display:grid;gap:12px;';
  container.innerHTML = '';

  cols.forEach(col => {
    const colEntries = entries.filter(e => col.cats.includes(e.category));
    const total = colEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const hasPaid = col.key !== 'einnahmen';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '0';

    let rows = '';

    if (col.cats.length > 1) {
      ['fixeinnahmen', 'sonstige_einnahmen'].forEach(cat => {
        const catEntries = entries.filter(e => e.category === cat);
        rows += `
          <tr>
            <td colspan="${hasPaid ? 4 : 3}" style="padding:10px 8px 4px;font-size:0.75rem;font-weight:600;
              text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);
              border-bottom:none">
              ${CATEGORIES[cat]}
            </td>
          </tr>
        `;
        // Einnahmen: älteste oben, neueste unten
        sortByCreated(catEntries, 'asc').forEach(e => { rows += entryRow(e); });
      });
    } else {
      // Sonstige Ausgaben & Variable Kosten: neueste oben; Fixkosten: älteste oben
      const dir = (col.key === 'sonstige' || col.key === 'variable') ? 'desc' : 'asc';
      sortByCreated(colEntries, dir).forEach(e => { rows += entryRow(e); });
    }

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin-bottom:0;color:${col.color}">${col.label}</div>
        <button class="btn btn-primary" style="padding:5px 12px;font-size:0.82rem"
          onclick="openAddEntry('${col.cats[col.cats.length - 1]}')">+ Eintrag</button>
      </div>
      <div class="table-wrap">
      <table class="entry-table month-table">
        <colgroup>
          <col class="c-name"><col class="c-pay"><col class="c-amt">${hasPaid ? '<col class="c-paid">' : ''}
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Zahl.</th>
            <th style="text-align:right">Betrag</th>
            ${hasPaid ? '<th style="text-align:center">Bez.</th>' : ''}
          </tr>
        </thead>
        <tbody id="tbody-${col.key}">${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="font-size:0.82rem;color:var(--text-muted)">Summe</td>
            <td class="amount" style="color:${col.color}">${formatEur(total)}</td>
            ${hasPaid ? '<td></td>' : ''}
          </tr>
        </tfoot>
      </table>
      </div>
    `;

    container.appendChild(card);
  });
}

function entryRow(e) {
  const paid = e.paid === true;
  const showPaid = e.category === 'fixkosten' || e.category === 'variable_kosten' || e.category === 'sonstige_ausgaben';
  return `
    <tr id="row-${e.id}" class="entry-row" onclick="openEditEntry('${e.id}')"
      style="cursor:pointer;${paid ? 'opacity:0.5' : ''}">
      <td>
        <span style="${paid ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">
          ${escHtml(e.name)}
        </span>
      </td>
      <td>${paymentBadge(e.payment)}</td>
      <td class="amount">${formatEur(e.amount)}</td>
      ${showPaid ? `
      <td style="text-align:center">
        <label onclick="event.stopPropagation()"
          style="display:inline-flex;align-items:center;cursor:pointer"
          title="${paid ? 'Als offen markieren' : 'Als bezahlt markieren'}">
          <input type="checkbox" ${paid ? 'checked' : ''}
            onclick="event.stopPropagation()"
            onchange="togglePaid('${e.id}', this.checked)"
            style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
        </label>
      </td>` : ''}
    </tr>
  `;
}

async function togglePaid(id, paid) {
  const entry = await dbGet('entries', id);
  if (!entry) return;
  entry.paid = paid;
  await dbPut('entries', entry);
  showToast(paid ? '✓ Als bezahlt markiert' : 'Als offen markiert');
  loadMonthData();
}

function openAddEntry(defaultCat) {
  openModal('Eintrag hinzufügen', entryForm(null, defaultCat));
  document.getElementById('entry-form-save').addEventListener('click', () => saveEntryFromForm(null));
}

async function openEditEntry(id) {
  const entry = await dbGet('entries', id);
  if (!entry) return;
  openModal('Eintrag bearbeiten', entryForm(entry, entry.category));
  document.getElementById('entry-form-save').addEventListener('click', () => saveEntryFromForm(id));
}

function entryForm(entry, defaultCat) {
  const cats = Object.entries(CATEGORIES).map(([v, l]) =>
    `<option value="${v}" ${defaultCat === v ? 'selected' : ''}>${l}</option>`
  ).join('');

  const pays = PAYMENTS.map(p =>
    `<option value="${p}" ${entry && entry.payment === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  return `
    ${entry && entry.createdAt ? `
      <div style="font-size:0.8rem;color:var(--text-muted);
        display:flex;align-items:center;gap:6px;margin:-4px 0 2px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" style="width:14px;height:14px">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
        </svg>
        Erfasst am ${formatDateTime(entry.createdAt)}
      </div>` : ''}
    <div class="form-group">
      <label>Kategorie</label>
      <select id="ef-category">${cats}</select>
    </div>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="ef-name" value="${entry ? escHtml(entry.name) : ''}" placeholder="z.B. Gym, Gehalt...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Zahlungsart</label>
        <select id="ef-payment">${pays}</select>
      </div>
      <div class="form-group">
        <label>Betrag (€)</label>
        <input type="number" id="ef-amount" value="${entry ? entry.amount : ''}" min="0" step="0.01" placeholder="0,00">
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
      ${entry ? `
        <button class="btn btn-danger" onclick="deleteEntryFromModal('${entry.id}')"
          title="Löschen" style="margin-right:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" style="width:16px;height:16px">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
            <path d="M10,11v6"/><path d="M14,11v6"/>
          </svg>
          Löschen
        </button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" id="entry-form-save">Speichern</button>
    </div>
  `;
}

async function saveEntryFromForm(existingId) {
  const name = document.getElementById('ef-name').value.trim();
  const category = document.getElementById('ef-category').value;
  const payment = document.getElementById('ef-payment').value;
  const amount = parseFloat(document.getElementById('ef-amount').value);

  if (!name) { showToast('Bitte Name eingeben'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Bitte gültigen Betrag eingeben'); return; }

  const prev = existingId ? await dbGet('entries', existingId) : null;
  // Bar wird direkt bezahlt -> automatisch als bezahlt markieren
  const paid = payment === 'Bar' ? true : (prev?.paid || false);

  const entry = {
    ...(prev || {}),
    id: existingId || undefined,
    year: state.year,
    month: state.month,
    category, name, payment, amount,
    paid
  };
  if (!existingId) entry.createdAt = Date.now();

  await dbPut('entries', entry);
  closeModal();
  showToast(existingId ? 'Eintrag aktualisiert' : 'Eintrag hinzugefügt');
  loadMonthData();
}

async function deleteEntry(id) {
  if (!confirm('Eintrag löschen?')) return;
  await dbDelete('entries', id);
  showToast('Eintrag gelöscht');
  loadMonthData();
}

async function deleteEntryFromModal(id) {
  if (!confirm('Eintrag löschen?')) return;
  await dbDelete('entries', id);
  closeModal();
  showToast('Eintrag gelöscht');
  loadMonthData();
}

function sumCat(entries, cat) {
  return entries.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
}

function sortByCreated(arr, dir = 'asc') {
  const k = e => (typeof e.createdAt === 'number' ? e.createdAt : 0);
  return arr.slice().sort((a, b) => dir === 'desc' ? k(b) - k(a) : k(a) - k(b));
}

function formatDateTime(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
