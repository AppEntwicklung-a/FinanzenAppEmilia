function renderContracts() {
  const view = document.getElementById('view-contracts');
  view.innerHTML = `
    <div class="page-header">
      <h1>Verträge</h1>
      <button class="btn btn-primary" onclick="openAddContract()">+ Vertrag</button>
    </div>

    <div id="contracts-summary" class="summary-row"></div>

    <div class="card">
      <div class="card-title">Laufende Verträge</div>
      <div style="overflow-x:auto">
        <table class="entry-table" id="contracts-table"></table>
      </div>
    </div>
  `;

  loadContracts();
}

async function loadContracts() {
  const contracts = await dbGetAll('contracts');
  contracts.sort((a, b) => a.name.localeCompare(b.name));

  renderContractsSummary(contracts);
  renderContractsTable(contracts);
}

function renderContractsSummary(contracts) {
  const active = contracts.filter(c => getContractStatus(c) !== 'expired');
  const totalMonthly = active.reduce((s, c) => s + (c.amount || 0), 0);
  const expiringSoon = active.filter(c => getContractStatus(c) === 'expiring').length;

  document.getElementById('contracts-summary').innerHTML = `
    <div class="summary-chip negative">
      <div class="label">Monatliche Kosten</div>
      <div class="value">${formatEur(totalMonthly)}</div>
    </div>
    <div class="summary-chip">
      <div class="label">Verträge aktiv</div>
      <div class="value">${active.length}</div>
    </div>
    <div class="summary-chip ${expiringSoon > 0 ? 'negative' : ''}">
      <div class="label">Läuft bald aus</div>
      <div class="value">${expiringSoon}</div>
    </div>
    <div class="summary-chip neutral">
      <div class="label">Jährliche Kosten</div>
      <div class="value">${formatEur(totalMonthly * 12)}</div>
    </div>
  `;
}

function renderContractsTable(contracts) {
  if (contracts.length === 0) {
    document.getElementById('contracts-table').innerHTML = `
      <tbody><tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">
        Noch keine Verträge eingetragen
      </td></tr></tbody>
    `;
    return;
  }

  const rows = contracts.map(c => {
    const status = getContractStatus(c);
    const statusBadge = {
      active:   `<span class="badge" style="background:var(--success-light);color:var(--success)">Aktiv</span>`,
      expiring: `<span class="badge" style="background:var(--warning-light);color:var(--warning)">Läuft aus</span>`,
      expired:  `<span class="badge" style="background:var(--danger-light);color:var(--danger)">Abgelaufen</span>`
    }[status];

    const endDisplay = c.end
      ? (c.end === 'monatlich' ? 'monatlich' : formatDate(c.end))
      : '—';

    const startDisplay = c.start ? formatDate(c.start) : '—';

    return `
      <tr style="${status === 'expired' ? 'opacity:0.5' : ''}">
        <td>
          <div style="font-weight:500">${escHtml(c.name)}</div>
          ${c.duration ? `<div style="font-size:0.75rem;color:var(--text-muted)">${escHtml(c.duration)}</div>` : ''}
        </td>
        <td class="amount" style="font-weight:600">${formatEur(c.amount)}</td>
        <td>${startDisplay}</td>
        <td>${endDisplay}</td>
        <td>${c.payment ? paymentBadge(c.payment) : '—'}</td>
        <td>
          ${c.cancellation
            ? `<span style="font-size:0.82rem;color:var(--text-secondary)">${escHtml(c.cancellation)}</span>`
            : '—'}
        </td>
        <td style="white-space:nowrap">
          ${statusBadge}
        </td>
        <td class="actions">
          <button class="btn-icon" onclick="openEditContract('${c.id}')" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon" onclick="deleteContract('${c.id}')" title="Löschen"
            style="color:var(--danger)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
              <path d="M10,11v6"/><path d="M14,11v6"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('contracts-table').innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th style="text-align:right">Betrag/Mo.</th>
        <th>Beginn</th>
        <th>Ende</th>
        <th>Zahlung</th>
        <th>Kündigung</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td style="font-size:0.82rem;color:var(--text-muted)">Gesamt (aktiv)</td>
        <td class="amount" style="color:var(--danger)">
          ${formatEur(contracts.filter(c => getContractStatus(c) !== 'expired').reduce((s,c) => s + (c.amount||0), 0))}
        </td>
        <td colspan="6"></td>
      </tr>
    </tfoot>
  `;
}

function getContractStatus(c) {
  if (!c.end || c.end === 'monatlich') return 'active';
  const end = new Date(c.end);
  if (isNaN(end)) return 'active';
  const now = new Date();
  const diff = (end - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'expiring';
  return 'active';
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Add / Edit Modal
function openAddContract() {
  openModal('Vertrag hinzufügen', contractForm(null));
  document.getElementById('contract-form-save').addEventListener('click', () => saveContractFromForm(null));
}

async function openEditContract(id) {
  const contract = await dbGet('contracts', id);
  if (!contract) return;
  openModal('Vertrag bearbeiten', contractForm(contract));
  document.getElementById('contract-form-save').addEventListener('click', () => saveContractFromForm(id));
}

function contractForm(c) {
  const pays = ['Bank', 'Bar', 'Paypal', 'SEPA', 'Gutschein', 'Klarna'].map(p =>
    `<option value="${p}" ${c && c.payment === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  const endVal = c && c.end && c.end !== 'monatlich' ? toInputDate(c.end) : '';
  const endMonthly = c && c.end === 'monatlich';

  return `
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="cf-name" value="${c ? escHtml(c.name) : ''}" placeholder="z.B. Gym, Handy...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Betrag / Monat (€)</label>
        <input type="number" id="cf-amount" value="${c ? c.amount : ''}" min="0" step="0.01" placeholder="0,00">
      </div>
      <div class="form-group">
        <label>Laufzeit</label>
        <input type="text" id="cf-duration" value="${c ? escHtml(c.duration || '') : ''}" placeholder="z.B. 2 Jahre">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Beginn</label>
        <input type="date" id="cf-start" value="${c && c.start ? toInputDate(c.start) : ''}">
      </div>
      <div class="form-group">
        <label>Ende</label>
        <input type="date" id="cf-end" value="${endVal}" ${endMonthly ? 'disabled' : ''}>
      </div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="cf-monthly" ${endMonthly ? 'checked' : ''}
          style="width:auto;accent-color:var(--accent)"
          onchange="document.getElementById('cf-end').disabled = this.checked">
        Läuft monatlich / kein festes Ende
      </label>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Zahlungsart</label>
        <select id="cf-payment">${pays}</select>
      </div>
      <div class="form-group">
        <label>Kündigung</label>
        <input type="text" id="cf-cancellation" value="${c ? escHtml(c.cancellation || '') : ''}"
          placeholder="z.B. quartal am 14.">
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" id="contract-form-save">Speichern</button>
    </div>
  `;
}

async function saveContractFromForm(existingId) {
  const name = document.getElementById('cf-name').value.trim();
  const amount = parseFloat(document.getElementById('cf-amount').value);
  const duration = document.getElementById('cf-duration').value.trim();
  const start = document.getElementById('cf-start').value;
  const monthly = document.getElementById('cf-monthly').checked;
  const end = monthly ? 'monatlich' : document.getElementById('cf-end').value;
  const payment = document.getElementById('cf-payment').value;
  const cancellation = document.getElementById('cf-cancellation').value.trim();

  if (!name) { showToast('Bitte Name eingeben'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Bitte gültigen Betrag eingeben'); return; }

  await dbPut('contracts', {
    id: existingId || undefined,
    name, amount, duration, start, end, payment, cancellation
  });

  closeModal();
  showToast(existingId ? 'Vertrag aktualisiert' : 'Vertrag hinzugefügt');
  loadContracts();
}

async function deleteContract(id) {
  if (!confirm('Vertrag löschen?')) return;
  await dbDelete('contracts', id);
  showToast('Vertrag gelöscht');
  loadContracts();
}

function toInputDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  return d.toISOString().split('T')[0];
}