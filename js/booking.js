document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('[data-booking-form]');
  if (!form || typeof BookingsStore === 'undefined') {
    return;
  }

  var dateField = form.querySelector('[data-booking-date]');
  var timeField = form.querySelector('[data-booking-time]');
  var note = form.querySelector('[data-booking-note]');
  var submitBtn = form.querySelector('[data-booking-submit]');

  var today = new Date();
  dateField.min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  function resetTimeField(placeholder) {
    timeField.innerHTML = '<option value="">' + placeholder + '</option>';
    timeField.disabled = true;
  }

  function showNote(message, isError) {
    note.textContent = message;
    note.classList.toggle('is-visible', true);
    note.classList.toggle('is-error', !!isError);
  }

  dateField.addEventListener('change', function () {
    if (!dateField.value) {
      resetTimeField('Scegli prima una data');
      return;
    }

    resetTimeField('Caricamento orari…');

    BookingsStore.getAvailability(dateField.value).then(function (data) {
      if (!data.slots.length) {
        resetTimeField('Nessun orario disponibile per questa data');
        return;
      }
      timeField.innerHTML = '<option value="">Scegli un orario</option>' +
        data.slots.map(function (slot) {
          return '<option value="' + slot + '">' + slot + '</option>';
        }).join('');
      timeField.disabled = false;
    }).catch(function () {
      resetTimeField('Errore nel caricamento degli orari');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var booking = {
      name: form.querySelector('[data-field="name"]').value.trim(),
      email: form.querySelector('[data-field="email"]').value.trim(),
      phone: form.querySelector('[data-field="phone"]').value.trim(),
      modality: form.querySelector('[data-field="modality"]').value,
      reason: form.querySelector('[data-field="reason"]').value.trim(),
      dateISO: dateField.value,
      time: timeField.value,
    };

    if (!booking.name || !booking.email || !booking.dateISO || !booking.time) {
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso…';

    BookingsStore.create(booking).then(function () {
      showNote('Richiesta inviata! Ti risponderemo entro un giorno lavorativo per confermare l\'appuntamento.', false);
      form.reset();
      resetTimeField('Scegli prima una data');
    }).catch(function (err) {
      if (err.status === 409) {
        showNote('Questo orario è stato appena prenotato da qualcun altro: scegli un altro orario.', true);
        dateField.dispatchEvent(new Event('change'));
      } else {
        showNote('Non è stato possibile inviare la richiesta. Riprova tra poco.', true);
      }
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Invia richiesta';
    });
  });
});
