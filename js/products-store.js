(function (global) {
  var API_BASE = '/api/products';

  function UnauthorizedError() {
    this.message = 'Sessione scaduta';
  }
  UnauthorizedError.prototype = Object.create(Error.prototype);

  function getAll() {
    return fetch(API_BASE, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('Errore nel caricamento dei prodotti');
      return res.json();
    });
  }

  function getById(id) {
    return getAll().then(function (list) {
      return list.filter(function (item) {
        return item.id === id;
      })[0] || null;
    });
  }

  function save(product) {
    return fetch(API_BASE, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
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

  global.ProductsStore = {
    getAll: getAll,
    getById: getById,
    save: save,
    remove: remove,
    UnauthorizedError: UnauthorizedError,
  };
})(window);
