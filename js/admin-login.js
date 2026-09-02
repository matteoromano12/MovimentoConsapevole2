document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('[data-login-form]');
  var passwordField = document.querySelector('[data-password]');
  var errorEl = document.querySelector('[data-login-error]');
  var submitBtn = document.querySelector('[data-login-submit]');

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Accesso in corso…';

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: passwordField.value }),
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Password errata');
        }
        window.location.href = '/admin.html';
      })
      .catch(function () {
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Accedi';
        passwordField.value = '';
        passwordField.focus();
      });
  });
});
