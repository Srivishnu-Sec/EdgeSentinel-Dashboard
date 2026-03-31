/* ============================================================
   EdgeSentinel — Login JS
   Mock auth with localStorage token
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Already logged in?
  if (localStorage.getItem('kpr_auth')) {
    window.location.href = 'admin.html';
    return;
  }

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');

  // Credentials
  const VALID_USER = 'admin';
  const VALID_PASS = 'kpr2026';

  form?.addEventListener('submit', e => {
    e.preventDefault();
    btn.textContent = 'AUTHENTICATING...';
    btn.disabled = true;
    errorEl.textContent = '';

    setTimeout(() => {
      const u = userInput.value.trim();
      const p = passInput.value;

      if (u === VALID_USER && p === VALID_PASS) {
        // Success
        localStorage.setItem('kpr_auth', btoa(`${u}:${Date.now()}`));
        btn.textContent = 'ACCESS GRANTED ✓';
        btn.style.background = 'var(--green)';
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 600);
      } else {
        // Failure
        btn.textContent = 'AUTHENTICATE';
        btn.disabled = false;
        errorEl.textContent = '⚠ Invalid credentials. Access denied.';
        passInput.value = '';
        passInput.focus();

        // Shake animation
        form.style.animation = 'shake 0.4s ease';
        setTimeout(() => form.style.animation = '', 400);
      }
    }, 800); // Simulated auth delay
  });

  // Terminal typing effect for the hint
  const hint = document.getElementById('hint-text');
  if (hint) {
    const text = 'hint: admin / kpr2026';
    let i = 0;
    setTimeout(() => {
      const interval = setInterval(() => {
        hint.textContent = text.slice(0, i);
        i++;
        if (i > text.length) clearInterval(interval);
      }, 60);
    }, 3000);
  }
});
