function renderSummary() {
  const view = document.getElementById('view-summary');
  view.innerHTML = `
    <div class="page-header">
      <h1>Auswertung</h1>
      <select id="summary-year-select" style="width:auto;font-size:0.9rem;padding:6px 28px 6px 10px"></select>
    </div>

    <div id="summary-chips" class="summary-row"></div>

    <div class="card">
      <div class="card-title">Monatsübersicht</div>
      <div style="overflow-x:auto">
        <table class="entry-table" id="summary-table"></table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Einnahmen vs. Ausgaben</div>
      <div style="position:relative;height:260px">
        <canvas id="chart-bar"></canvas>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="card" style="margin-bottom:0">
        <div class="card-title">Verfügbares Kapital</div>
        <div style="position:relative;height:200px">
          <canvas id="chart-line"></canvas>
        </div>
      </div>
      <div class="card" style="margin-bottom:0">
        <div class="card-title">Ausgaben-Kategorien</div>
        <div style="position:relative;height:200px">
          <canvas id="chart-pie"></canvas>
        </div>
      </div>
    </div>
  `;

  // Jahr-Select
  const yearSel = document.getElementById('summary-year-select');
  for (let y = 2020; y <= 2030; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === state.year) opt.selected = true;
    yearSel.appendChild(opt);
  }
  yearSel.addEventListener('change', () => {
    loadSummaryData(parseInt(yearSel.value));
  });

  loadChartJS().then(() => loadSummaryData(state.year));
}

function loadChartJS() {
  return new Promise(resolve => {
    if (window.Chart) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

async function loadSummaryData(year) {
  const allEntries = await dbGetAll('entries');
  const allSavings = await dbGetAll('savings');

  const entries = allEntries.filter(e => e.year === year);
  const savings = allSavings.filter(s => s.year === year);

  const monthData = MONTHS_DE.map((name, i) => {
    const m = i + 1;
    const me = entries.filter(e => e.month === m);
    const fixEin = me.filter(e => e.category === 'fixeinnahmen').reduce((s,e) => s + e.amount, 0);
    const sonstEin = me.filter(e => e.category === 'sonstige_einnahmen').reduce((s,e) => s + e.amount, 0);
    const fixKost = me.filter(e => e.category === 'fixkosten').reduce((s,e) => s + e.amount, 0);
    const varKost = me.filter(e => e.category === 'variable_kosten').reduce((s,e) => s + e.amount, 0);
    const sonstAus = me.filter(e => e.category === 'sonstige_ausgaben').reduce((s,e) => s + e.amount, 0);
    const totalEin = fixEin + sonstEin;
    const totalAus = fixKost + varKost + sonstAus;
    const ms = savings.filter(s => s.month === m);
    const gespart = ms.reduce((s,x) => s + (x.amount || 0), 0);
    return { name, fixEin, sonstEin, fixKost, varKost, sonstAus, totalEin, totalAus, verfuegbar: totalEin - totalAus - gespart, gespart };
  });

  renderSummaryChips(monthData);
  renderSummaryTable(monthData);
  renderCharts(monthData);
}

function renderSummaryChips(data) {
  const totalEin = data.reduce((s,m) => s + m.totalEin, 0);
  const totalAus = data.reduce((s,m) => s + m.totalAus, 0);
  const totalGespart = data.reduce((s,m) => s + m.gespart, 0);
  const balance = totalEin - totalAus;

  document.getElementById('summary-chips').innerHTML = [
    { label: 'Einnahmen gesamt', value: formatEur(totalEin), cls: '' },
    { label: 'Ausgaben gesamt', value: formatEur(totalAus), cls: 'negative' },
    { label: 'Bilanz', value: formatEur(balance), cls: balance >= 0 ? 'positive' : 'negative' },
    { label: 'Erspartes gesamt', value: formatEur(totalGespart), cls: 'neutral' }
  ].map(c => `
    <div class="summary-chip ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function renderSummaryTable(data) {
  const totEin = data.reduce((s,m) => s + m.totalEin, 0);
  const totFix = data.reduce((s,m) => s + m.fixKost, 0);
  const totVar = data.reduce((s,m) => s + m.varKost, 0);
  const totSonst = data.reduce((s,m) => s + m.sonstAus, 0);
  const totAus = data.reduce((s,m) => s + m.totalAus, 0);
  const totGespart = data.reduce((s,m) => s + m.gespart, 0);

  const rows = data.map(m => `
    <tr>
      <td style="font-weight:500">${m.name}</td>
      <td class="amount" style="color:var(--success)">${m.totalEin > 0 ? formatEur(m.totalEin) : '—'}</td>
      <td class="amount">${m.fixKost > 0 ? formatEur(m.fixKost) : '—'}</td>
      <td class="amount">${m.varKost > 0 ? formatEur(m.varKost) : '—'}</td>
      <td class="amount">${m.sonstAus > 0 ? formatEur(m.sonstAus) : '—'}</td>
      <td class="amount" style="color:var(--danger)">${m.totalAus > 0 ? formatEur(m.totalAus) : '—'}</td>
      <td class="amount" style="color:${m.verfuegbar >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${m.totalEin > 0 || m.totalAus > 0 ? formatEur(m.verfuegbar) : '—'}
      </td>
      <td class="amount" style="color:var(--accent)">${m.gespart > 0 ? formatEur(m.gespart) : '—'}</td>
    </tr>
  `).join('');

  document.getElementById('summary-table').innerHTML = `
    <thead>
      <tr>
        <th>Monat</th>
        <th style="text-align:right">Einnahmen</th>
        <th style="text-align:right">Fix-Kosten</th>
        <th style="text-align:right">Var. Kosten</th>
        <th style="text-align:right">Sonst. Ausg.</th>
        <th style="text-align:right">Ausg. Ges.</th>
        <th style="text-align:right">Verfügbar</th>
        <th style="text-align:right">Erspart</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td style="font-weight:600;font-size:0.82rem;color:var(--text-muted)">Gesamt</td>
        <td class="amount" style="color:var(--success)">${formatEur(totEin)}</td>
        <td class="amount">${formatEur(totFix)}</td>
        <td class="amount">${formatEur(totVar)}</td>
        <td class="amount">${formatEur(totSonst)}</td>
        <td class="amount" style="color:var(--danger)">${formatEur(totAus)}</td>
        <td class="amount" style="color:${(totEin-totAus) >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatEur(totEin - totAus)}
        </td>
        <td class="amount" style="color:var(--accent)">${formatEur(totGespart)}</td>
      </tr>
    </tfoot>
  `;
}

let chartBar, chartLine, chartPie;

function getChartColors() {
  // Liest die aktiven Theme-Variablen direkt aus dem DOM,
  // damit Diagramme zu jeder Palette und jedem Modus passen.
  const cs = getComputedStyle(document.documentElement);
  const v = name => cs.getPropertyValue(name).trim();
  return {
    grid: v('--border'),
    tick: v('--text-muted'),
    einnahmen: v('--success'),
    ausgaben: v('--danger'),
    verfuegbar: v('--accent'),
    fixkosten: v('--warning'),
    variable: v('--accent'),
    sonstige: v('--danger')
  };
}

function renderCharts(data) {
  const labels = MONTHS_DE.map(m => m.substring(0, 3));
  const c = getChartColors();

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: c.tick, font: { size: 12 }, boxWidth: 12, padding: 12 } } }
  };

  // Balkendiagramm
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Einnahmen',
          data: data.map(m => m.totalEin),
          backgroundColor: c.einnahmen + 'CC',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Ausgaben',
          data: data.map(m => m.totalAus),
          backgroundColor: c.ausgaben + 'CC',
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: c.tick }, grid: { color: c.grid } },
        y: {
          ticks: { color: c.tick, callback: v => v + ' €' },
          grid: { color: c.grid }
        }
      }
    }
  });

  // Liniendiagramm
  if (chartLine) chartLine.destroy();
  chartLine = new Chart(document.getElementById('chart-line'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Verfügbar',
        data: data.map(m => m.totalEin > 0 || m.totalAus > 0 ? m.verfuegbar : null),
        borderColor: c.verfuegbar,
        backgroundColor: c.verfuegbar + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: c.verfuegbar,
        spanGaps: false
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: c.tick, font: { size: 11 } }, grid: { color: c.grid } },
        y: {
          ticks: { color: c.tick, callback: v => v + ' €', font: { size: 11 } },
          grid: { color: c.grid }
        }
      }
    }
  });

  // Kreisdiagramm
  const totalFix = data.reduce((s,m) => s + m.fixKost, 0);
  const totalVar = data.reduce((s,m) => s + m.varKost, 0);
  const totalSonst = data.reduce((s,m) => s + m.sonstAus, 0);

  if (chartPie) chartPie.destroy();
  chartPie = new Chart(document.getElementById('chart-pie'), {
    type: 'doughnut',
    data: {
      labels: ['Fixkosten', 'Variable', 'Sonstige'],
      datasets: [{
        data: [totalFix, totalVar, totalSonst],
        backgroundColor: [c.fixkosten + 'CC', c.variable + 'CC', c.sonstige + 'CC'],
        borderColor: [c.fixkosten, c.variable, c.sonstige],
        borderWidth: 1.5,
        hoverOffset: 6
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.tick, font: { size: 12 }, boxWidth: 12, padding: 10 }
        }
      }
    }
  });
}
