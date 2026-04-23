/**
 * Lena AI · Suivi des Soumissions — DRÉlectrique 2026
 * Data adapted from "Tableau suivi des soumissions"
 */

'use strict';

/* ── Dataset (Seeds from SharePoint Screenshot) ────────────────── */
let SOUMISSIONS = [];

/* ── Helpers ───────────────────────────────────── */
const fmt = n => n == null
  ? '<span class="val-nd">NC / DD</span>'
  : `<span class="${n >= 1000000 ? 'valeur-high' : n >= 250000 ? 'valeur-med' : 'valeur-low'}">$${n.toLocaleString('fr-CA')}</span>`;

const statusLabel = {
  'soumis':   'En attente',
  'nc':       'NC / DD',
  'gagne':    'Gagné',
  'perdu':    'Perdu',
};

const RESP_COLORS = {
  'F. Vegiard': '#6366f1',
  'M. Tremblay': '#a855f7',
  'A. Bouchard': '#06b6d4',
  'K. Simard':  '#f97316',
};

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function buildRow(p) {
  const color = RESP_COLORS[p.responsable] || '#94a3b8';
  return `
    <tr data-statut="${p.statut}">
      <td><span class="cell-numero">${p.numero}</span></td>
      <td class="cell-projet">
        <div style="font-weight:700">${p.projet}</div>
        <div style="font-size:0.75rem; color:var(--text-muted)">${p.client}</div>
      </td>
      <td>
        <div class="cell-resp">
          <div class="resp-avatar" style="background:${color}22;color:${color};border:1px solid ${color}44">${initials(p.responsable)}</div>
          <span>${p.responsable}</span>
        </div>
      </td>
      <td>${p.addenda === 'N/A' ? '<span style="color:var(--text-muted)">—</span>' : 'Ad. ' + p.addenda}</td>
      <td style="font-size:0.75rem; max-width:180px">${p.mo}</td>
      <td>${fmt(p.valeur)}</td>
      <td><span class="status-chip status-${p.statut}">${statusLabel[p.statut] || p.statut}</span></td>
    </tr>`;
}

/* ── State ─────────────────────────────────────── */
let state = {
  filter: 'all',
  search: '',
  sortCol: null,
  sortDir: 1,
};

/* ── Render ────────────────────────────────────── */
function getFiltered() {
  return SOUMISSIONS.filter(p => {
    const matchFilter = state.filter === 'all' || p.statut === state.filter;
    const matchSearch = !state.search || p.projet.toLowerCase().includes(state.search)
      || p.client.toLowerCase().includes(state.search)
      || p.responsable.toLowerCase().includes(state.search)
      || p.numero.toLowerCase().includes(state.search);
    return matchFilter && matchSearch;
  }).sort((a, b) => {
    if (!state.sortCol) return 0;
    let av = a[state.sortCol] ?? -1;
    let bv = b[state.sortCol] ?? -1;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return av < bv ? -state.sortDir : av > bv ? state.sortDir : 0;
  });
}

function render() {
  const rows = getFiltered();
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = rows.length
    ? rows.map(buildRow).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:100px;color:var(--text-muted)">Aucune soumission trouvée.</td></tr>`;

  const n = rows.length;
  document.getElementById('recordsCount').textContent = `${n} soumission${n !== 1 ? 's' : ''}`;
  document.getElementById('footerCount').textContent  = `Affichage de ${n} soumission${n !== 1 ? 's' : ''}`;
  updateKPIs(rows);
}

function updateKPIs(rows) {
  const total  = rows.length;
  const valeur = rows.reduce((s, p) => s + (p.valeur || 0), 0);
  const gagne  = rows.filter(p => p.statut === 'gagne').length;
  const soum   = rows.filter(p => p.statut === 'soumis').length;
  const rates  = total > 0 ? Math.round((gagne / total) * 100) : 0;
  const addenda = rows.reduce((s, p) => {
    const val = parseInt(p.addenda);
    return s + (isNaN(val) ? 0 : val);
  }, 0);

  animateValue('kv-soumissions', soum);
  animateValue('kv-taux', rates, '%');
  animateValue('kv-addenda', addenda);
  
  document.getElementById('kv-valeur').textContent =
    valeur > 1_000_000 ? `$${(valeur/1_000_000).toFixed(1)}M`
    : valeur > 0 ? `$${(valeur/1000).toFixed(0)}k` : '—';
}

function animateValue(id, target, suffix = '') {
  const el    = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const dur   = 800;
  const t0    = performance.now();
  function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(start + diff * p) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Events ────────────────────────────────────── */
async function init() {
  await fetchAndRender();
  updateSync();
  setInterval(async () => {
    await fetchAndRender();
    updateSync();
  }, 60_000); // UI refetch every min. API updates every hour via Netlify

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase().trim();
    render();
  });

  // Filter
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      render();
    });
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', () => {
      showToast('✅ Export CSV réussi (Simulation)');
  });
}

async function fetchAndRender() {
  try {
    const res = await fetch('/api/soumissions');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
        SOUMISSIONS = data;
    }
    render();
  } catch (err) {
    console.error("Failed to fetch API", err);
    showToast('❌ Erreur de connexion');
  }
}

function updateSync() {
  const now = new Date();
  const t   = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  const el  = document.getElementById('lastSync');
  if (el) el.textContent = `Sync: ${t}`;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', init);
