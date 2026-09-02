(function (global) {
  var API_BASE = '/api/articles';
  var MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatISOToIt(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    var year = parts[0];
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    if (!month || !day) return '';
    return day + ' ' + capitalize(MONTHS_IT[month - 1]) + ' ' + year;
  }

  function UnauthorizedError() {
    this.message = 'Sessione scaduta';
  }
  UnauthorizedError.prototype = Object.create(Error.prototype);

  function getAll() {
    return fetch(API_BASE, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('Errore nel caricamento degli articoli');
        return res.json();
      })
      .then(function (articles) {
        return articles.slice().sort(function (a, b) {
          return (b.dateISO || '').localeCompare(a.dateISO || '');
        });
      });
  }

  function getById(id) {
    id = Number(id);
    return getAll().then(function (list) {
      return list.filter(function (item) {
        return item.id === id;
      })[0] || null;
    });
  }

  function save(article) {
    return fetch(API_BASE, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nel salvataggio');
      return res.json();
    });
  }

  function remove(id) {
    return fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE',
      credentials: 'same-origin',
    }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nell\'eliminazione');
    });
  }

  function exportJSON() {
    return getAll().then(function (list) {
      return JSON.stringify(list, null, 2);
    });
  }

  function importJSON(json) {
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return Promise.reject(new Error('Formato non valido'));
    }
    if (!Array.isArray(parsed)) {
      return Promise.reject(new Error('Formato non valido'));
    }
    return fetch(API_BASE + '/import', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: parsed }),
    }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nell\'importazione');
      return res.json();
    });
  }

  global.ArticlesStore = {
    getAll: getAll,
    getById: getById,
    save: save,
    remove: remove,
    exportJSON: exportJSON,
    importJSON: importJSON,
    formatDate: formatISOToIt,
    UnauthorizedError: UnauthorizedError,
  };
})(window);
