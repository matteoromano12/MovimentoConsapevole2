document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('[data-settings-form]');
  if (!form || typeof SettingsStore === 'undefined') {
    return;
  }

  var MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  var DAY_LABELS = { 0: 'Domenica', 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì', 4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato' };

  var weeklyContainer = form.querySelector('[data-weekly-hours]');
  var slotSelect = form.querySelector('[data-field="slotMinutes"]');
  var blockedListEl = form.querySelector('[data-blocked-dates-list]');
  var blockedInput = form.querySelector('[data-blocked-date-input]');
  var addBlockedBtn = form.querySelector('[data-add-blocked-date]');

  var blockedDates = [];

  function formatDateIt(iso) {
    var parts = iso.split('-');
    var month = MONTHS_IT[parseInt(parts[1], 10) - 1];
    return parseInt(parts[2], 10) + ' ' + month.charAt(0).toUpperCase() + month.slice(1) + ' ' + parts[0];
  }

  function renderWeekly(weekly) {
    weeklyContainer.innerHTML = DAY_ORDER.map(function (day) {
      var rule = weekly[day] || { open: false, start: '09:00', end: '19:00' };
      return (
        '<div class="weekly-hours__row" data-day="' + day + '">' +
        '<label class="weekly-hours__toggle">' +
        '<input type="checkbox" data-day-open' + (rule.open ? ' checked' : '') + '> ' + DAY_LABELS[day] +
        '</label>' +
        '<input type="time" data-day-start value="' + rule.start + '"' + (rule.open ? '' : ' disabled') + '>' +
        '<span class="weekly-hours__sep">–</span>' +
        '<input type="time" data-day-end value="' + rule.end + '"' + (rule.open ? '' : ' disabled') + '>' +
        '</div>'
      );
    }).join('');
  }

  function renderBlockedDates() {
    var sorted = blockedDates.slice().sort();
    blockedListEl.innerHTML = sorted.map(function (date) {
      return '<span class="chip">' + formatDateIt(date) +
        '<button type="button" data-remove-blocked="' + date + '" aria-label="Rimuovi data bloccata">×</button></span>';
    }).join('');
  }

  weeklyContainer.addEventListener('change', function (event) {
    if (event.target.matches('[data-day-open]')) {
      var row = event.target.closest('.weekly-hours__row');
      var open = event.target.checked;
      row.querySelector('[data-day-start]').disabled = !open;
      row.querySelector('[data-day-end]').disabled = !open;
    }
  });

  addBlockedBtn.addEventListener('click', function () {
    var date = blockedInput.value;
    if (!date) return;
    if (blockedDates.indexOf(date) === -1) {
      blockedDates.push(date);
      renderBlockedDates();
    }
    blockedInput.value = '';
  });

  blockedListEl.addEventListener('click', function (event) {
    var date = event.target.getAttribute('data-remove-blocked');
    if (!date) return;
    blockedDates = blockedDates.filter(function (d) { return d !== date; });
    renderBlockedDates();
  });

  function collectWeekly() {
    var weekly = {};
    weeklyContainer.querySelectorAll('.weekly-hours__row').forEach(function (row) {
      var day = row.getAttribute('data-day');
      weekly[day] = {
        open: row.querySelector('[data-day-open]').checked,
        start: row.querySelector('[data-day-start]').value || '09:00',
        end: row.querySelector('[data-day-end]').value || '19:00',
      };
    });
    return weekly;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var settings = {
      slotMinutes: Number(slotSelect.value),
      weekly: collectWeekly(),
      blockedDates: blockedDates,
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    SettingsStore.save(settings).then(function () {
      AdminToast.show('Disponibilità salvata.');
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile salvare la disponibilità. Riprova.');
    }).finally(function () {
      submitBtn.disabled = false;
    });
  });

  SettingsStore.get().then(function (settings) {
    slotSelect.value = settings.slotMinutes;
    renderWeekly(settings.weekly);
    blockedDates = settings.blockedDates.slice();
    renderBlockedDates();
  }).catch(function (err) {
    AdminAuth.handleError(err, 'Impossibile caricare la disponibilità.');
  });
});
