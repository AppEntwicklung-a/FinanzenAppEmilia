const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni',
                   'Juli','August','September','Oktober','November','Dezember'];

const state = {
  view: 'months',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
};

/* ===== Design-Vorlagen ===== */
const THEMES = ['sage', 'slate', 'sand', 'mono'];
const THEME_LABELS = { sage: 'Salbei', slate: 'Schiefer', sand: 'Sand', mono: 'Graustufen' };
const THEME_PREVIEW = {
  sage:  { light: '#F5F2ED', accent: '#7C9E7E', dark: '#1E2420' },
  slate: { light: '#F4F5F7', accent: '#46688A', dark: '#14181D' },
  sand:  { light: '#F3EEE7', accent: '#8E6F4A', dark: '#211E18' },
  mono:  { light: '#F4F4F4', accent: '#4A4A4A', dark: '#161616' }
};

function getThemePref() {
  return {
    theme: localStorage.getItem('theme') || 'sage',
    mode: localStorage.getItem('mode') || 'auto'   // 'light' | 'dark' | 'auto'
  };
}

function isDarkActive(mode) {
  return mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme() {
  const { theme, mode } = getThemePref();
  const root = document.documentElement;
  root.setAttribute('data-theme', THEMES.includes(theme) ? theme : 'sage');
  root.classList.toggle('dark', isDarkActive(mode));

  // PWA-/Browserleisten-Farbe an die aktive Fläche angleichen
  const bg = getComputedStyle(root).getPropertyValue('--bg-primary').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && bg) meta.setAttribute('content', bg);
}

function applyThemeAndRefresh() {
  applyTheme();
  if (state.view) renderView(state.view);
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyThemeAndRefresh();
}

function setMode(mode) {
  localStorage.setItem('mode', mode);
  applyThemeAndRefresh();
}

// Systemwechsel beachten, solange Modus auf „System" steht
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('mode') || 'auto') === 'auto') applyThemeAndRefresh();
});

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  state.view = view;
  renderView(view);
}

function renderView(view) {
  if (view === 'months') renderMonths();
  if (view === 'summary') renderSummary();
  if (view === 'contracts') renderContracts();
  if (view === 'settings') renderSettings();
}

function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

function showToast(msg, duration = 2200) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function formatEur(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

function paymentBadge(p) {
  const map = { 'Bank': 'bank', 'Bar': 'bar', 'Paypal': 'paypal', 'SEPA': 'sepa', 'Gutschein': 'gutschein', 'Klarna': 'klarna' };
  const cls = map[p] || 'bank';
  return `<span class="badge badge-${cls}">${p}</span>`;
}

// Navigation events
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Boot
async function migrateVariableKosten() {
  if (localStorage.getItem('mig_variable_kosten')) return;
  try {
    const all = await dbGetAll('entries');
    let moved = 0;
    for (const e of all) {
      if (e.category === 'fixkosten') {
        const n = (e.name || '').toLowerCase();
        if (n.includes('urlaub') || n.includes('spargeld')) {
          e.category = 'variable_kosten';
          await dbPut('entries', e);
          moved++;
        }
      }
    }
    localStorage.setItem('mig_variable_kosten', '1');
    if (moved > 0) showToast(`${moved} Posten zu Variable Kosten verschoben`);
  } catch (err) {
    console.error('Migration variable_kosten fehlgeschlagen', err);
  }
}

initDB().then(async () => {
  applyTheme();
  await migrateVariableKosten();
  await seedFixDefaults();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  navigate('months');
});