(function (global) {
  var API_BASE = '/api/settings';

  function UnauthorizedError() {
    this.message = 'Sessione scaduta';
  }
  UnauthorizedError.prototype = Object.create(Error.prototype);

  function get() {
    return fetch(API_BASE, { credentials: 'same-origin' }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
      return res.json();
    });
  }

  function save(settings) {
    return fetch(API_BASE, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nel salvataggio');
      return res.json();
    });
  }

  global.SettingsStore = {
    get: get,
    save: save,
    UnauthorizedError: UnauthorizedError,
  };
})(window);
