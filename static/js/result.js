/**
 * CFG Tool — Page 2 (Result) JavaScript
 * Reads result data from sessionStorage and builds the animated teaching UI.
 */

let currentStep = 1;
let data = null;

// ── Entry point ──
window.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('cfg_result');
  if (!raw) {
    showError('No grammar data found. Please go back and enter a grammar first.');
    return;
  }

  data = JSON.parse(raw);
  if (!data.success) {
    showError(data.errors ? data.errors.join(', ') : 'Unknown error.');
    return;
  }

  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  // renderLiveGrammar(data.original, 'Original');
  buildStep1();
  buildStep2();
  buildStep3();
  showStep(1);
});

function showError(msg) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
  document.getElementById('error-msg').textContent = msg;
}

// ── Escape HTML ──
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Step visibility ──
function showStep(n) {
  currentStep = n;
  [1, 2, 3].forEach(i => {
    const sec = document.getElementById(`sec${i}`);
    sec.style.display = i === n ? 'block' : 'none';
  });

  // Progress dots
  [1, 2, 3].forEach(i => {
    const dot = document.getElementById(`pd${i}`);
    dot.classList.remove('active', 'done');
    if (i < n) dot.classList.add('done');
    else if (i === n) dot.classList.add('active');
  });

  // Progress lines
  [1, 2].forEach(i => {
    const line = document.getElementById(`pl${i}`);
    line.classList.toggle('done', i < n);
  });

  // Nav dots
  document.querySelectorAll('.nav-dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === n);
  });

  // Prev/Next buttons
  document.getElementById('prev-btn').style.display = n === 1 ? 'none' : 'inline-flex';
  const nextBtn = document.getElementById('next-btn');
  if (n === 3) {
    nextBtn.textContent = '✓ Done — go back';
    nextBtn.onclick = () => window.location.href = '/';
  } else {
    nextBtn.textContent = 'Next step →';
    nextBtn.onclick = nextStep;
  }

  // Update live grammar removed
}

function nextStep() { if (currentStep < 3) showStep(currentStep + 1); }
function prevStep() { if (currentStep > 1) showStep(currentStep - 1); }
function goToStep(n) { showStep(n); }

// ─────────────────────────────────────────────────────────
//  BUILD STEP 1 — Null Productions
// ─────────────────────────────────────────────────────────
function buildStep1() {
  const { nullable, steps, grammar } = data.step1;
  document.getElementById('step1-before-grammar').innerHTML = data.original.map(l => escHtml(l)).join('<br>');

  // Nullable badge section
  const nullCard = document.getElementById('step1-nullable');
  if (nullable.length === 0) {
    nullCard.innerHTML = `<div class="sub-card-title">Nullable variables</div>
      <p style="font-size:14px;color:var(--text-mid);">No nullable variables found — this step makes no changes to your grammar.</p>`;
  } else {
    nullCard.innerHTML = `<div class="sub-card-title">Nullable variables (can derive ε)</div>
      <div class="badge-wrap">${
        nullable.map(v => `<span class="var-badge nullable">${escHtml(v)} → ε</span>`).join('')
      }</div>
      <p style="font-size:13px;color:var(--text-mid);margin-top:10px;">For each production that contains one of these variables, we'll generate new versions with those variables removed.</p>`;
  }

  // Derivation rows
  const derivDiv = document.getElementById('step1-derivations');
  if (steps.length === 0) {
    derivDiv.innerHTML = '';
  } else {
    let html = `<div class="derivation-section"><div class="sub-card-title">Derived productions</div>`;
    for (const { variable, derivations } of steps) {
      html += `<div class="deriv-group"><div class="deriv-var">Variable: ${escHtml(variable)}</div>`;
      for (const { original, derived } of derivations) {
        const origHtml = original.map(s =>
          (nullable.includes(s) && !derived.includes(s))
            ? `<span class="sym-removed">${escHtml(s)}</span>`
            : `<span class="sym-kept">${escHtml(s)}</span>`
        ).join(' ');

        const derivHtml = derived.length === 0
          ? '<span class="sym-added">ε</span>'
          : derived.map(s => `<span class="sym-added">${escHtml(s)}</span>`).join(' ');

        const origStr = original.length === 0 ? 'ε' : '';
        html += `<div class="deriv-row">
          <span class="prod-lhs">${escHtml(variable)}</span>
          <span class="deriv-arrow">→</span>
          <span class="deriv-original">${origStr || origHtml}</span>
          <span class="becomes-arrow">⟹</span>
          <span class="deriv-derived">${derivHtml}</span>
        </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    derivDiv.innerHTML = html;
  }

  // Grammar after step 1
  document.getElementById('step1-grammar').innerHTML = grammar.map(l => escHtml(l)).join('<br>');
}

// ─────────────────────────────────────────────────────────
//  BUILD STEP 2 — Unit Productions
// ─────────────────────────────────────────────────────────
function buildStep2() {
  const { steps, grammar } = data.step2;
  document.getElementById('step2-before-grammar').innerHTML = data.step1.grammar.map(l => escHtml(l)).join('<br>');
  const body = document.getElementById('step2-body');

  if (steps.length === 0) {
    body.innerHTML = `<div class="unit-group">
      <p style="font-size:14px;color:var(--text-mid);">No unit productions found — this step makes no changes.</p>
    </div>`;
  } else {
    let html = '';
    for (const { variable, unit_chain, reachable, added_rules } of steps) {
      const chainStr = unit_chain.map(p =>
        `<span class="unit-pair">${escHtml(p.from)} → ${escHtml(p.to)}</span>`
      ).join(' <span style="color:var(--text-muted)">→</span> ');

      const rulesHtml = added_rules.map(r =>
        `<span class="unit-result-rule">${r.length ? r.join(' ') : 'ε'}</span>`
      ).join('');

      html += `<div class="unit-group">
        <div class="unit-header">
          <span style="font-size:13px;font-weight:600;">${escHtml(variable)}</span>
          <span class="unit-chain-label">unit chain:</span>
          ${chainStr || '<span style="color:var(--text-muted);font-size:13px;">none</span>'}
        </div>
        <div class="unit-results">
          Reachable variables: <strong>${reachable.join(', ')}</strong><br>
          New rules for ${escHtml(variable)}: ${rulesHtml || '<em>none</em>'}
        </div>
      </div>`;
    }
    body.innerHTML = html;
  }

  document.getElementById('step2-grammar').innerHTML = grammar.map(l => escHtml(l)).join('<br>');
}

// ─────────────────────────────────────────────────────────
//  BUILD STEP 3 — Useless Symbols
// ─────────────────────────────────────────────────────────
function buildStep3() {
  const { non_generating, non_reachable, grammar } = data.step3;
  document.getElementById('step3-before-grammar').innerHTML = data.step2.grammar.map(l => escHtml(l)).join('<br>');

  // 3a — non-generating
  const body3a = document.getElementById('step3a-body');
  if (non_generating.length === 0) {
    body3a.innerHTML = `<div class="sub-card" style="border-radius:0;">
      <p style="font-size:14px;color:var(--text-mid);">All variables can generate a terminal string. No non-generating symbols to remove.</p>
    </div>`;
  } else {
    body3a.innerHTML = `<div class="sub-card" style="border-radius:0;">
      <div class="sub-card-title">Removed (non-generating)</div>
      <div class="badge-wrap">${
        non_generating.map(v => `<span class="var-badge removed">${escHtml(v)}</span>`).join('')
      }</div>
      <p style="font-size:13px;color:var(--text-mid);margin-top:10px;">These variables cannot produce any string of terminals, so every rule containing them is also removed.</p>
    </div>`;
  }

  // 3b — unreachable
  const body3b = document.getElementById('step3b-body');
  if (non_reachable.length === 0) {
    body3b.innerHTML = `<div class="sub-card" style="border-radius:0;">
      <p style="font-size:14px;color:var(--text-mid);">All remaining variables are reachable from the start symbol. No unreachable symbols to remove.</p>
    </div>`;
  } else {
    body3b.innerHTML = `<div class="sub-card" style="border-radius:0;">
      <div class="sub-card-title">Removed (unreachable from start)</div>
      <div class="badge-wrap">${
        non_reachable.map(v => `<span class="var-badge removed">${escHtml(v)}</span>`).join('')
      }</div>
      <p style="font-size:13px;color:var(--text-mid);margin-top:10px;">These variables can never be generated starting from the start symbol, so they'll never be used in any derivation.</p>
    </div>`;
  }

  document.getElementById('step3-grammar').innerHTML = grammar.map(l => escHtml(l)).join('<br>');
}

// ── Download PDF ──
function downloadPDF() {
  const btn = document.getElementById('pdf-btn');
  btn.textContent = 'Generating...';
  
  // Show all steps for PDF
  const mainContent = document.getElementById('main-content');
  const sections = document.querySelectorAll('.step-section');
  const nav = document.getElementById('step-nav');
  
  const originalDisplays = [];
  sections.forEach(sec => {
    originalDisplays.push(sec.style.display);
    sec.style.display = 'block';
  });
  nav.style.display = 'none'; // hide nav buttons

  const opt = {
    margin:       10,
    filename:     'CFG_Simplification.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(mainContent).save().then(() => {
    // Restore
    sections.forEach((sec, i) => {
      sec.style.display = originalDisplays[i];
    });
    nav.style.display = 'flex';
    btn.textContent = 'Save PDF';
  });
}
