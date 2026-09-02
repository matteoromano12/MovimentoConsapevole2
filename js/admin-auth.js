var AdminAuth = (function () {
  function isUnauthorized(err) {
    return !!err && err.message === 'Sessione scaduta';
  }

  function handleError(err, fallbackMessage) {
    if (isUnauthorized(err)) {
      window.alert('La sessione è scaduta. Effettua di nuovo l\'accesso.');
      window.location.href = '/admin.html';
      return;
    }
    window.alert(fallbackMessage);
  }

  return { isUnauthorized: isUnauthorized, handleError: handleError };
})();
