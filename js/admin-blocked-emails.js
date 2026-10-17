document.addEventListener('DOMContentLoaded', function () {
    var listEl = document.querySelector('[data-blocked-emails-list]');
    var formEl = document.querySelector('[data-block-email-form]');
    var inputEl = document.querySelector('[data-block-email-input]');
    if (!listEl || !formEl) return;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function api(method, url, body) {
        return fetch(url, {
            method: method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        }).then(function (res) {
            if (res.status === 401) {
                window.location.reload();
                throw new Error('Sessione scaduta');
            }
            return res.json().then(function (data) {
                if (!res.ok) throw new Error(data.error || 'Errore');
                return data;
            });
        });
    }

    function render(list) {
        if (!list.length) {
            listEl.innerHTML = '<p style="color: rgba(40,40,30,.6); margin-top: 1rem;">Nessuna email bloccata.</p>';
            return;
        }
        listEl.innerHTML = list.map(function (email) {
            return '<div class="booking-row" style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">' +
                '<span>' + escapeHtml(email) + '</span>' +
                '<button type="button" class="btn-link" data-unblock-email="' + escapeHtml(email) + '">Sblocca</button>' +
                '</div>';
        }).join('');
    }

    function load() {
        return api('GET', '/api/blocked-emails').then(render).catch(function (err) {
            AdminToast.show(err.message);
        });
    }

    function block(email) {
        return api('POST', '/api/blocked-emails', { email: email }).then(function (list) {
            render(list);
            AdminToast.show('Email bloccata.');
        }).catch(function (err) {
            AdminToast.show(err.message);
        });
    }

    formEl.addEventListener('submit', function (event) {
        event.preventDefault();
        var email = inputEl.value.trim();
        if (!email) return;
        block(email).then(function () { inputEl.value = ''; });
    });

    listEl.addEventListener('click', function (event) {
        var email = event.target.getAttribute('data-unblock-email');
        if (!email) return;
        api('DELETE', '/api/blocked-emails?email=' + encodeURIComponent(email)).then(function (list) {
            render(list);
            AdminToast.show('Email sbloccata.');
        }).catch(function (err) {
            AdminToast.show(err.message);
        });
    });

    // usato dal pulsante "Blocca email" nelle prenotazioni
    window.BlockedEmails = { block: block, reload: load };

    load();
});