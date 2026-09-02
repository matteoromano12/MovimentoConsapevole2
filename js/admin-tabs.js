var AdminTabs = (function () {
  function setPendingBadge(count) {
    var badge = document.querySelector('[data-pending-badge]');
    if (!badge) return;
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  return { setPendingBadge: setPendingBadge };
})();

document.addEventListener('DOMContentLoaded', function () {
  var buttons = document.querySelectorAll('[data-tab-button]');
  var panels = document.querySelectorAll('[data-tab-panel]');

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      var target = button.getAttribute('data-tab-button');

      buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn === button);
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-tab-panel') !== target;
      });
    });
  });

  var logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
        window.location.href = '/admin.html';
      });
    });
  }
});
