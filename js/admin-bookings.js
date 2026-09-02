document.addEventListener('DOMContentLoaded', function () {
  var listEl = document.querySelector('[data-bookings-list]');
  var emptyEl = document.querySelector('[data-bookings-empty]');
  if (!listEl || typeof BookingsStore === 'undefined') {
    return;
  }

  var WEEKDAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  var MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var STATUS_LABELS = { pending: 'In attesa', accepted: 'Confermata', rejected: 'Rifiutata' };
  var STATUS_PRIORITY = { pending: 0, accepted: 1, rejected: 2 };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatWhen(dateISO, time) {
    var d = new Date(dateISO + 'T00:00:00Z');
    var weekday = WEEKDAYS_IT[d.getUTCDay()];
    var month = MONTHS_IT[d.getUTCMonth()];
    return weekday + ' ' + d.getUTCDate() + ' ' + month.charAt(0).toUpperCase() + month.slice(1) + ' ' + d.getUTCFullYear() + ', ore ' + time;
  }

  function sortBookings(list) {
    return list.slice().sort(function (a, b) {
      var pa = STATUS_PRIORITY[a.status];
      var pb = STATUS_PRIORITY[b.status];
      if (pa !== pb) return pa - pb;
      var keyA = a.dateISO + a.time;
      var keyB = b.dateISO + b.time;
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
    });
  }

  function renderList() {
    return BookingsStore.getAll().then(function (bookings) {
      var sorted = sortBookings(bookings);
      listEl.innerHTML = '';
      emptyEl.hidden = sorted.length !== 0;

      var pendingCount = 0;

      sorted.forEach(function (booking) {
        if (booking.status === 'pending') pendingCount++;

        var row = document.createElement('div');
        row.className = 'booking-row';
        row.innerHTML =
          '<div class="booking-row__top">' +
          '<span class="booking-status booking-status--' + booking.status + '">' + STATUS_LABELS[booking.status] + '</span>' +
          '<span class="booking-row__when">' + formatWhen(booking.dateISO, booking.time) + '</span>' +
          '</div>' +
          '<h3>' + escapeHtml(booking.name) + '</h3>' +
          '<div class="booking-row__contact">' +
          '<span>' + escapeHtml(booking.email) + '</span>' +
          (booking.phone ? '<span>' + escapeHtml(booking.phone) + '</span>' : '') +
          (booking.modality ? '<span>' + escapeHtml(booking.modality) + '</span>' : '') +
          '</div>' +
          (booking.reason ? '<p class="booking-row__reason">' + escapeHtml(booking.reason) + '</p>' : '') +
          '<div class="admin-row__actions">' +
          (booking.status === 'pending'
            ? '<button type="button" class="btn-link" data-accept-booking="' + booking.id + '">Accetta</button>' +
              '<button type="button" class="btn-link btn-link--danger" data-reject-booking="' + booking.id + '">Rifiuta</button>'
            : '') +
          '<button type="button" class="btn-link btn-link--danger" data-delete-booking="' + booking.id + '">Elimina</button>' +
          '</div>';
        listEl.appendChild(row);
      });

      AdminTabs.setPendingBadge(pendingCount);
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile caricare le prenotazioni al momento.');
    });
  }

  listEl.addEventListener('click', function (event) {
    var acceptId = event.target.getAttribute('data-accept-booking');
    var rejectId = event.target.getAttribute('data-reject-booking');
    var deleteId = event.target.getAttribute('data-delete-booking');

    if (acceptId) {
      BookingsStore.updateStatus(acceptId, 'accepted').then(renderList).then(function () {
        AdminToast.show('Prenotazione confermata.');
      }).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile confermare la prenotazione.');
      });
    } else if (rejectId) {
      BookingsStore.updateStatus(rejectId, 'rejected').then(renderList).then(function () {
        AdminToast.show('Prenotazione rifiutata.');
      }).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile rifiutare la prenotazione.');
      });
    } else if (deleteId) {
      if (window.confirm('Eliminare definitivamente questa prenotazione?')) {
        BookingsStore.remove(deleteId).then(renderList).then(function () {
          AdminToast.show('Prenotazione eliminata.');
        }).catch(function (err) {
          AdminAuth.handleError(err, 'Impossibile eliminare la prenotazione.');
        });
      }
    }
  });

  renderList();
});
