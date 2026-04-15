/**
 * CFG Tool — Page 1 (Input) JavaScript
 * Handles symbol insertion, example loading, validation, form submission.
 */

// ── Symbol insertion at cursor position ──
function insertSymbol(sym) {
  const ta = document.getElementById('grammar-input');
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + sym + ta.value.slice(e);
  ta.selectionStart = ta.selectionEnd = s + sym.length;
  ta.focus();
}

// ── Example grammars ──
const EXAMPLES = {
  nullable: `S → A B\nA → ε | a\nB → b | B C\nC → A B`,
  unit:     `S → A | a b\nA → B | c\nB → d | e`,
  useless:  `S → a B | b\nA → a A\nB → b`,
  all:      `S → A B | a\nA → ε | a\nB → b | B C\nC → A B\nD → d D | e`
};

function loadExample(key) {
  document.getElementById('grammar-input').value = EXAMPLES[key];
  document.getElementById('error-box').style.display = 'none';
  // Trigger line number update
  document.getElementById('grammar-input').dispatchEvent(new Event('input'));
}

function clearInput() {
  document.getElementById('grammar-input').value = '';
  const errBox = document.getElementById('error-box');
  errBox.style.display = 'none';
  errBox.style.background = '';
  errBox.style.color = '';
  errBox.style.borderColor = '';
  document.getElementById('grammar-input').dispatchEvent(new Event('input'));
  document.getElementById('grammar-input').focus();
}

// ── Submit & store result in sessionStorage, navigate to result page ──
async function submitGrammar() {
  const raw = document.getElementById('grammar-input').value.trim();
  const errBox = document.getElementById('error-box');
  const spinner = document.getElementById('spinner');
  const btnText = document.querySelector('.btn-text');
  const btnArrow = document.querySelector('.btn-arrow');

  if (!raw) {
    errBox.textContent = 'Please enter at least one production rule before simplifying.';
    errBox.style.display = 'block';
    errBox.style.background = 'var(--red-bg)';
    errBox.style.color = 'var(--red-text)';
    errBox.style.borderColor = 'var(--red-border)';
    return;
  }

  errBox.style.display = 'none';
  errBox.style.background = '';
  errBox.style.color = '';
  errBox.style.borderColor = '';
  spinner.style.display = 'inline-block';
  btnText.textContent = 'Simplifying…';
  btnArrow.style.display = 'none';

  try {
    const res = await fetch('/simplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grammar: raw })
    });
    const data = await res.json();

    if (!data.success) {
      errBox.innerHTML = '<strong>Grammar error:</strong><br>' +
        data.errors.map(e => `• ${e}`).join('<br>');
      errBox.style.display = 'block';
      errBox.style.background = 'var(--red-bg)';
      errBox.style.color = 'var(--red-text)';
      errBox.style.borderColor = 'var(--red-border)';
      return;
    }

    sessionStorage.setItem('cfg_result', JSON.stringify(data));
    window.location.href = '/result';
  } catch (err) {
    errBox.textContent = 'Network error — make sure the Flask server is running.';
    errBox.style.display = 'block';
    errBox.style.background = 'var(--red-bg)';
    errBox.style.color = 'var(--red-text)';
    errBox.style.borderColor = 'var(--red-border)';
  } finally {
    spinner.style.display = 'none';
    btnText.textContent = 'Simplify Grammar';
    btnArrow.style.display = 'inline';
  }
}

// ── Keyboard shortcut: Ctrl+Enter to submit ──
document.getElementById('grammar-input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitGrammar();
});

// ── Validate Grammar ──
async function validateGrammar() {
  const raw = document.getElementById('grammar-input').value.trim();
  const errBox = document.getElementById('error-box');

  if (!raw) {
    errBox.textContent = 'Please enter at least one production rule to validate.';
    errBox.style.display = 'block';
    errBox.style.background = 'var(--red-bg)';
    errBox.style.color = 'var(--red-text)';
    errBox.style.borderColor = 'var(--red-border)';
    return;
  }

  try {
    const res = await fetch('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grammar: raw })
    });
    const data = await res.json();

    if (!data.valid) {
      errBox.innerHTML = '<strong>Grammar Invalid:</strong><br>' +
        data.errors.map(e => `• ${e}`).join('<br>');
      errBox.style.display = 'block';
      errBox.style.background = 'var(--red-bg)';
      errBox.style.color = 'var(--red-text)';
      errBox.style.borderColor = 'var(--red-border)';
    } else {
      errBox.innerHTML = '<strong>Grammar is Valid!</strong>';
      errBox.style.display = 'block';
      errBox.style.background = 'var(--green-bg)';
      errBox.style.color = 'var(--green-text)';
      errBox.style.borderColor = 'var(--green-mid)';
    }
  } catch (err) {
    errBox.textContent = 'Network error during validation.';
    errBox.style.display = 'block';
    errBox.style.background = 'var(--red-bg)';
    errBox.style.color = 'var(--red-text)';
    errBox.style.borderColor = 'var(--red-border)';
  }
}
