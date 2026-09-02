(function (global) {
  var API_BASE = '/api/bookings';

  function UnauthorizedError() {
    this.message = 'Sessione scaduta';
  }
  UnauthorizedError.prototype = Object.create(Error.prototype);

  function getAll() {
    return fetch(API_BASE, { credentials: 'same-origin' }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nel caricamento delle prenotazioni');
      return res.json();
    });
  }

  function create(booking) {
    return fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || 'Errore nella prenotazione');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function updateStatus(id, status) {
    return fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status }),
    }).then(function (res) {
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error('Errore nell\'aggiornamento');
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

  function getAvailability(dateISO) {
    return fetch('/api/availability?date=' + encodeURIComponent(dateISO)).then(function (res) {
      if (!res.ok) throw new Error('Errore nel calcolo della disponibilità');
      return res.json();
    });
  }

  global.BookingsStore = {
    getAll: getAll,
    create: create,
    updateStatus: updateStatus,
    remove: remove,
    getAvailability: getAvailability,
    UnauthorizedError: UnauthorizedError,
  };
})(window);
