/* ============================================================
   Nudge — Teen Budget Tool  •  Core Logic
   ============================================================ */
(function () {
  'use strict';

  // ---- constants ----
  const STORAGE_KEY = 'nudge_data';
  const CATEGORIES = [
    { key: 'groceries', emoji: '🛒', label: 'Groceries' },
    { key: 'eatingout', emoji: '🍕', label: 'Eating Out' },
    { key: 'fun',       emoji: '🎮', label: 'Fun' },
    { key: 'clothes',   emoji: '👕', label: 'Clothes' },
    { key: 'tech',      emoji: '📱', label: 'Tech' },
    { key: 'transport', emoji: '🚌', label: 'Transport' },
    { key: 'school',    emoji: '📚', label: 'School' },
    { key: 'savings',   emoji: '💰', label: 'Savings' },
    { key: 'other',     emoji: '🎁', label: 'Other' }
  ];

  // ---- helpers ----
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function fmt(n) { return '$' + Number(n || 0).toFixed(2); }
  function monthKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function monthLabel(key) {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  // ---- data layer ----
  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { budgets: [] }; }
    catch { return { budgets: [] }; }
  }
  function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function getMonth(data, key) {
    return data.budgets.find(b => b.month === key) || null;
  }
  function getOrCreate(data, key) {
    let m = getMonth(data, key);
    if (!m) { m = { id: uid(), month: key, income: [], expenses: [] }; data.budgets.push(m); }
    return m;
  }

  // ---- current month pointer ----
  let currentDate = new Date();

  function shiftMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    render();
  }

  // ---- category helper ----
  function catInfo(key) {
    return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
  }

  // ============================================================
  //  INDEX PAGE — budget entry
  // ============================================================
  function initIndex() {
    // month nav
    const btnPrev = $('#month-prev');
    const btnNext = $('#month-next');
    if (btnPrev) btnPrev.addEventListener('click', () => shiftMonth(-1));
    if (btnNext) btnNext.addEventListener('click', () => shiftMonth(1));

    // add income
    const btnAddIncome = $('#btn-add-income');
    if (btnAddIncome) btnAddIncome.addEventListener('click', addIncome);

    // add expense
    const btnAddExpense = $('#btn-add-expense');
    if (btnAddExpense) btnAddExpense.addEventListener('click', addExpense);

    // export / import
    const btnExport = $('#btn-export');
    if (btnExport) btnExport.addEventListener('click', exportData);
    const btnImport = $('#btn-import');
    if (btnImport) btnImport.addEventListener('click', () => $('#file-import').click());
    const fileImport = $('#file-import');
    if (fileImport) fileImport.addEventListener('change', importData);

    // clear month
    const btnClear = $('#btn-clear');
    if (btnClear) btnClear.addEventListener('click', clearMonth);

    render();
  }

  // ---- income CRUD ----
  function addIncome() {
    const source = $('#new-income-source');
    const amount = $('#new-income-amount');
    if (!source || !amount) return;
    const s = source.value.trim();
    const a = parseFloat(amount.value);
    if (!s || isNaN(a) || a <= 0) return;

    const data = loadData();
    const m = getOrCreate(data, monthKey(currentDate));
    m.income.push({ id: uid(), source: s, amount: a });
    saveData(data);
    source.value = '';
    amount.value = '';
    render();
  }

  function removeIncome(id) {
    const data = loadData();
    const m = getMonth(data, monthKey(currentDate));
    if (!m) return;
    m.income = m.income.filter(i => i.id !== id);
    saveData(data);
    render();
  }

  // ---- expense CRUD ----
  function addExpense() {
    const cat   = $('#new-expense-cat');
    const label = $('#new-expense-label');
    const amt   = $('#new-expense-amount');
    const date  = $('#new-expense-date');
    if (!cat || !label || !amt) return;
    const l = label.value.trim();
    const a = parseFloat(amt.value);
    if (!l || isNaN(a) || a <= 0) return;

    const data = loadData();
    const m = getOrCreate(data, monthKey(currentDate));
    m.expenses.push({
      id: uid(),
      category: cat.value,
      label: l,
      amount: a,
      date: date ? date.value : ''
    });
    saveData(data);
    label.value = '';
    amt.value = '';
    render();
  }

  function removeExpense(id) {
    const data = loadData();
    const m = getMonth(data, monthKey(currentDate));
    if (!m) return;
    m.expenses = m.expenses.filter(e => e.id !== id);
    saveData(data);
    render();
  }

  // ---- clear month ----
  function clearMonth() {
    if (!confirm('Clear all entries for this month? This cannot be undone.')) return;
    const data = loadData();
    const key = monthKey(currentDate);
    data.budgets = data.budgets.filter(b => b.month !== key);
    saveData(data);
    render();
  }

  // ---- export / import ----
  function exportData() {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nudge-budget-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported && Array.isArray(imported.budgets)) {
          saveData(imported);
          render();
          alert('Budget data imported successfully! 🎉');
        } else {
          alert('Invalid file format.');
        }
      } catch { alert('Could not read file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ============================================================
  //  RENDER — index page
  // ============================================================
  function render() {
    // determine which page we're on
    if ($('#nudge-index')) renderIndex();
    if ($('#nudge-view'))  renderView();
  }

  function renderIndex() {
    const key = monthKey(currentDate);
    const data = loadData();
    const m = getOrCreate(data, key);
    saveData(data); // persist newly created month

    // month label
    const lbl = $('#month-label');
    if (lbl) lbl.textContent = monthLabel(key);

    // ---- summary tiles ----
    const totalIncome  = m.income.reduce((s, i) => s + i.amount, 0);
    const totalExpense = m.expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpense;

    const elIncome  = $('#summary-income');
    const elExpense = $('#summary-expense');
    const elBalance = $('#summary-balance');
    if (elIncome)  elIncome.textContent  = fmt(totalIncome);
    if (elExpense) elExpense.textContent = fmt(totalExpense);
    if (elBalance) {
      elBalance.textContent = fmt(balance);
      const tile = elBalance.closest('.summary-tile');
      if (tile) tile.classList.toggle('negative', balance < 0);
    }

    // ---- income table ----
    const incBody = $('#income-body');
    if (incBody) {
      incBody.innerHTML = m.income.map(i => `
        <tr class="fade-in">
          <td>${esc(i.source)}</td>
          <td>${fmt(i.amount)}</td>
          <td><button class="btn-del" data-id="${i.id}" data-action="del-income">✕</button></td>
        </tr>`).join('');
      incBody.querySelectorAll('[data-action="del-income"]').forEach(btn => {
        btn.addEventListener('click', () => removeIncome(btn.dataset.id));
      });
    }

    // ---- expense table ----
    const expBody = $('#expense-body');
    if (expBody) {
      expBody.innerHTML = m.expenses.map(e => {
        const c = catInfo(e.category);
        return `
        <tr class="fade-in">
          <td><span class="cat-badge">${c.emoji} ${c.label}</span></td>
          <td>${esc(e.label)}</td>
          <td>${fmt(e.amount)}</td>
          <td>${e.date || '—'}</td>
          <td><button class="btn-del" data-id="${e.id}" data-action="del-expense">✕</button></td>
        </tr>`;
      }).join('');
      expBody.querySelectorAll('[data-action="del-expense"]').forEach(btn => {
        btn.addEventListener('click', () => removeExpense(btn.dataset.id));
      });
    }

    // ---- category breakdown bars ----
    renderCategoryBars(m, totalExpense);
  }

  function renderCategoryBars(m, totalExpense) {
    const container = $('#category-bars');
    if (!container) return;
    const byCategory = {};
    m.expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const max = Math.max(...Object.values(byCategory), 1);

    container.innerHTML = CATEGORIES
      .filter(c => byCategory[c.key])
      .map(c => {
        const amt = byCategory[c.key];
        const pct = (amt / max * 100).toFixed(1);
        return `
        <div class="cat-bar-row fade-in">
          <span class="cat-bar-label">${c.emoji} ${c.label}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill cat-${c.key}" style="width:${pct}%"></div>
          </div>
          <span class="cat-bar-amount">${fmt(amt)}</span>
        </div>`;
      }).join('') || '<p style="opacity:.5;text-align:center">No expenses yet — add some above!</p>';
  }

  // ============================================================
  //  VIEW PAGE — read-only budget report
  // ============================================================
  function initView() {
    const btnPrev = $('#month-prev');
    const btnNext = $('#month-next');
    if (btnPrev) btnPrev.addEventListener('click', () => shiftMonth(-1));
    if (btnNext) btnNext.addEventListener('click', () => shiftMonth(1));
    render();
  }

  function renderView() {
    const key = monthKey(currentDate);
    const data = loadData();
    const m = getMonth(data, key);

    const lbl = $('#month-label');
    if (lbl) lbl.textContent = monthLabel(key);

    if (!m || (m.income.length === 0 && m.expenses.length === 0)) {
      $('#view-content').innerHTML = '<p style="text-align:center;opacity:.6;margin:3rem 0">No budget data for this month. Head to <strong>Home</strong> to start adding entries!</p>';
      return;
    }

    const totalIncome  = m.income.reduce((s, i) => s + i.amount, 0);
    const totalExpense = m.expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpense;
    const pctUsed = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;

    // status
    let statusClass, statusText;
    if (totalIncome === 0 && totalExpense === 0) {
      statusClass = 'good'; statusText = '🟢 No activity yet';
    } else if (balance > totalIncome * 0.25) {
      statusClass = 'good'; statusText = '🟢 Looking great!';
    } else if (balance >= 0) {
      statusClass = 'warning'; statusText = '🟡 Getting close — watch your spending!';
    } else {
      statusClass = 'danger'; statusText = '🔴 Over budget — time to cut back!';
    }

    // category breakdown
    const byCategory = {};
    m.expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const maxCat = Math.max(...Object.values(byCategory), 1);

    const catRows = CATEGORIES
      .filter(c => byCategory[c.key])
      .sort((a, b) => (byCategory[b.key] || 0) - (byCategory[a.key] || 0))
      .map(c => {
        const amt = byCategory[c.key];
        const pct = (amt / maxCat * 100).toFixed(1);
        return `
        <div class="cat-bar-row fade-in">
          <span class="cat-bar-label">${c.emoji} ${c.label}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill cat-${c.key}" style="width:${pct}%"></div>
          </div>
          <span class="cat-bar-amount">${fmt(amt)}</span>
        </div>`;
      }).join('');

    // top 5 expenses
    const topExpenses = [...m.expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const topList = topExpenses.map(e => {
      const c = catInfo(e.category);
      return `<li><span>${c.emoji} ${esc(e.label)}</span><span>${fmt(e.amount)}</span></li>`;
    }).join('');

    // income breakdown
    const incomeRows = m.income.map(i =>
      `<tr><td>${esc(i.source)}</td><td style="text-align:right">${fmt(i.amount)}</td></tr>`
    ).join('');

    // assemble
    $('#view-content').innerHTML = `
      <div class="summary-grid">
        <div class="summary-tile income"><div class="label">Income</div><div class="value">${fmt(totalIncome)}</div></div>
        <div class="summary-tile expense"><div class="label">Spent</div><div class="value">${fmt(totalExpense)}</div></div>
        <div class="summary-tile balance${balance < 0 ? ' negative' : ''}"><div class="label">Balance</div><div class="value">${fmt(balance)}</div></div>
      </div>

      <div style="text-align:center"><span class="status-badge ${statusClass}">${statusText}</span></div>

      <div class="card">
        <h3>💸 Budget Used</h3>
        <div class="cat-bar-track" style="height:24px;border-radius:12px;margin-bottom:.5rem">
          <div class="cat-bar-fill" style="width:${pctUsed.toFixed(1)}%;background:${balance < 0 ? 'var(--nudge-coral)' : 'var(--nudge-teal)'};border-radius:12px;height:100%"></div>
        </div>
        <p style="text-align:center;font-weight:700;font-size:.9rem;opacity:.7">${pctUsed.toFixed(0)}% of income spent</p>
      </div>

      <div class="card">
        <h3>📊 Spending by Category</h3>
        <div class="cat-bars">${catRows || '<p style="opacity:.5">No expenses recorded.</p>'}</div>
      </div>

      <div class="card">
        <h3>💵 Income Sources</h3>
        <table class="budget-table">
          <thead><tr><th>Source</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${incomeRows || '<tr><td colspan="2" style="text-align:center;opacity:.5">No income recorded.</td></tr>'}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>🏆 Top Expenses</h3>
        <ol class="top-list">${topList || '<li style="opacity:.5">No expenses yet.</li>'}</ol>
      </div>
    `;
  }

  // ---- util ----
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ---- boot ----
  document.addEventListener('DOMContentLoaded', function () {
    if ($('#nudge-index')) initIndex();
    if ($('#nudge-view'))  initView();
  });
})();
