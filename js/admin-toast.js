var AdminToast = (function () {
  var timer = null;

  function show(message) {
    var toast = document.querySelector('[data-admin-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () {
      toast.hidden = true;
    }, 3200);
  }

  return { show: show };
})();
