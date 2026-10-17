document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('[data-settings-form]');

    if (!form || typeof SettingsStore === 'undefined') {
        return;
    }

    var MONTHS_IT = [
        'gennaio',
        'febbraio',
        'marzo',
        'aprile',
        'maggio',
        'giugno',
        'luglio',
        'agosto',
        'settembre',
        'ottobre',
        'novembre',
        'dicembre'
    ];

    var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

    var DAY_LABELS = {
        0: 'Domenica',
        1: 'Lunedì',
        2: 'Martedì',
        3: 'Mercoledì',
        4: 'Giovedì',
        5: 'Venerdì',
        6: 'Sabato'
    };

    var weeklyContainer = form.querySelector('[data-weekly-hours]');
    var slotSelect = form.querySelector('[data-field="slotMinutes"]');
    var blockedListEl = form.querySelector('[data-blocked-dates-list]');
    var blockedInput = form.querySelector('[data-blocked-date-input]');
    var addBlockedBtn = form.querySelector('[data-add-blocked-date]');

    var blockedDates = [];

    if (
        !weeklyContainer ||
        !slotSelect ||
        !blockedListEl ||
        !blockedInput ||
        !addBlockedBtn
    ) {
        console.error('Elementi del pannello disponibilità mancanti.');
        return;
    }

    function formatDateIt(iso) {
        var parts = iso.split('-');
        var month = MONTHS_IT[parseInt(parts[1], 10) - 1];

        return (
            parseInt(parts[2], 10) +
            ' ' +
            month.charAt(0).toUpperCase() +
            month.slice(1) +
            ' ' +
            parts[0]
        );
    }

    function getDefaultRule(day) {
        return {
            open: day !== 0,
            start: '09:00',
            end: '19:00',
            absence: {
                enabled: false,
                start: '12:00',
                end: '14:00'
            }
        };
    }

    function renderWeekly(weekly) {
        weekly = weekly || {};

        weeklyContainer.innerHTML = DAY_ORDER.map(function (day) {
            var defaults = getDefaultRule(day);
            var rule = weekly[day] || defaults;

            var absence = Object.assign(
                {},
                defaults.absence,
                rule.absence || {}
            );

            var isOpen = Boolean(rule.open);
            var absenceEnabled = Boolean(absence.enabled);

            return (
                '<div class="weekly-hours__row" data-day="' + day + '">' +

                '<label class="weekly-hours__toggle">' +
                '<input type="checkbox" data-day-open' +
                (isOpen ? ' checked' : '') +
                '> ' +
                DAY_LABELS[day] +
                '</label>' +

                '<input type="time" data-day-start' +
                ' value="' + escapeAttribute(rule.start || '09:00') + '"' +
                (isOpen ? '' : ' disabled') +
                ' aria-label="Apertura ' + DAY_LABELS[day] + '">' +

                '<span class="weekly-hours__sep">–</span>' +

                '<input type="time" data-day-end' +
                ' value="' + escapeAttribute(rule.end || '19:00') + '"' +
                (isOpen ? '' : ' disabled') +
                ' aria-label="Chiusura ' + DAY_LABELS[day] + '">' +

                '<label class="weekly-hours__toggle">' +
                '<input type="checkbox" data-absence-enabled' +
                (absenceEnabled ? ' checked' : '') +
                (isOpen ? '' : ' disabled') +
                '> Assenza' +
                '</label>' +

                '<input type="time" data-absence-start' +
                ' value="' + escapeAttribute(absence.start) + '"' +
                (!isOpen || !absenceEnabled ? ' disabled' : '') +
                ' aria-label="Inizio assenza ' + DAY_LABELS[day] + '">' +

                '<span class="weekly-hours__sep">–</span>' +

                '<input type="time" data-absence-end' +
                ' value="' + escapeAttribute(absence.end) + '"' +
                (!isOpen || !absenceEnabled ? ' disabled' : '') +
                ' aria-label="Fine assenza ' + DAY_LABELS[day] + '">' +

                '</div>'
            );
        }).join('');
    }

    function escapeAttribute(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderBlockedDates() {
        var sorted = blockedDates.slice().sort();

        blockedListEl.innerHTML = sorted.map(function (date) {
            return (
                '<span class="chip">' +
                escapeAttribute(formatDateIt(date)) +
                '<button type="button"' +
                ' data-remove-blocked="' + escapeAttribute(date) + '"' +
                ' aria-label="Rimuovi data bloccata">×</button>' +
                '</span>'
            );
        }).join('');
    }

    function timeToMinutes(value) {
        if (!/^\d{2}:\d{2}$/.test(value || '')) {
            return NaN;
        }

        var parts = value.split(':');
        var hours = Number(parts[0]);
        var minutes = Number(parts[1]);

        if (
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {
            return NaN;
        }

        return hours * 60 + minutes;
    }

    function validateWeekly(weekly) {
        for (var i = 0; i < DAY_ORDER.length; i++) {
            var day = DAY_ORDER[i];
            var rule = weekly[day];

            if (!rule.open) {
                continue;
            }

            var start = timeToMinutes(rule.start);
            var end = timeToMinutes(rule.end);

            if (
                !Number.isFinite(start) ||
                !Number.isFinite(end) ||
                start >= end
            ) {
                return 'Controlla gli orari di apertura di ' +
                    DAY_LABELS[day] + '.';
            }

            if (rule.absence.enabled) {
                var absenceStart = timeToMinutes(rule.absence.start);
                var absenceEnd = timeToMinutes(rule.absence.end);

                if (
                    !Number.isFinite(absenceStart) ||
                    !Number.isFinite(absenceEnd) ||
                    absenceStart >= absenceEnd
                ) {
                    return 'Controlla gli orari di assenza di ' +
                        DAY_LABELS[day] + '.';
                }

                if (
                    absenceStart < start ||
                    absenceEnd > end
                ) {
                    return 'L’assenza di ' + DAY_LABELS[day] +
                        ' deve essere compresa negli orari di apertura.';
                }
            }
        }

        return null;
    }

    weeklyContainer.addEventListener('change', function (event) {
        var row = event.target.closest('.weekly-hours__row');

        if (!row) {
            return;
        }

        var openCheckbox = row.querySelector('[data-day-open]');
        var absenceCheckbox = row.querySelector('[data-absence-enabled]');

        var startInput = row.querySelector('[data-day-start]');
        var endInput = row.querySelector('[data-day-end]');

        var absenceStartInput = row.querySelector('[data-absence-start]');
        var absenceEndInput = row.querySelector('[data-absence-end]');

        if (event.target.matches('[data-day-open]')) {
            var isOpen = openCheckbox.checked;

            startInput.disabled = !isOpen;
            endInput.disabled = !isOpen;
            absenceCheckbox.disabled = !isOpen;

            if (!isOpen) {
                absenceCheckbox.checked = false;
            }
        }

        if (
            event.target.matches('[data-day-open]') ||
            event.target.matches('[data-absence-enabled]')
        ) {
            var absenceEnabled =
                openCheckbox.checked && absenceCheckbox.checked;

            absenceStartInput.disabled = !absenceEnabled;
            absenceEndInput.disabled = !absenceEnabled;
        }
    });

    addBlockedBtn.addEventListener('click', function () {
        var date = blockedInput.value;

        if (!date) {
            return;
        }

        if (blockedDates.indexOf(date) === -1) {
            blockedDates.push(date);
            renderBlockedDates();
        }

        blockedInput.value = '';
    });

    blockedListEl.addEventListener('click', function (event) {
        var button = event.target.closest('[data-remove-blocked]');

        if (!button) {
            return;
        }

        var date = button.getAttribute('data-remove-blocked');

        blockedDates = blockedDates.filter(function (item) {
            return item !== date;
        });

        renderBlockedDates();
    });

    function collectWeekly() {
        var weekly = {};

        weeklyContainer.querySelectorAll('.weekly-hours__row').forEach(
            function (row) {
                var day = row.getAttribute('data-day');

                var open = row.querySelector('[data-day-open]').checked;

                var absenceEnabled =
                    open &&
                    row.querySelector('[data-absence-enabled]').checked;

                weekly[day] = {
                    open: open,

                    start:
                        row.querySelector('[data-day-start]').value ||
                        '09:00',

                    end:
                        row.querySelector('[data-day-end]').value ||
                        '19:00',

                    absence: {
                        enabled: absenceEnabled,

                        start:
                            row.querySelector('[data-absence-start]').value ||
                            '12:00',

                        end:
                            row.querySelector('[data-absence-end]').value ||
                            '14:00'
                    }
                };
            }
        );

        return weekly;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var settings = {
            slotMinutes: Number(slotSelect.value),
            weekly: collectWeekly(),
            blockedDates: blockedDates.slice()
        };

        var validationError = validateWeekly(settings.weekly);

        if (validationError) {
            AdminToast.show(validationError);
            return;
        }

        var submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = true;
        }

        SettingsStore.save(settings)
            .then(function () {
                AdminToast.show('Disponibilità salvata.');
            })
            .catch(function (err) {
                AdminAuth.handleError(
                    err,
                    'Impossibile salvare la disponibilità. Riprova.'
                );
            })
            .finally(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                }
            });
    });

    SettingsStore.get()
        .then(function (settings) {
            slotSelect.value = settings.slotMinutes;

            renderWeekly(settings.weekly);

            blockedDates = Array.isArray(settings.blockedDates)
                ? settings.blockedDates.slice()
                : [];

            renderBlockedDates();
        })
        .catch(function (err) {
            AdminAuth.handleError(
                err,
                'Impossibile caricare la disponibilità.'
            );
        });
});