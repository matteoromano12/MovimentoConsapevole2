const SESSION_COOKIE = 'mc_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const ARTICLES_KEY = 'articles';
const PRODUCTS_KEY = 'products';
const BOOKINGS_KEY = 'bookings';
const SETTINGS_KEY = 'settings';
const BLOCKED_EMAILS_KEY = 'blockedEmails';
const NO_SHOW_LIMIT = 2; // mancate presenze dopo cui l'email viene bloccata in automatico

// ---- Email (Resend) ----
// Destinatario: chi riceve le notifiche di nuova prenotazione
const NOTIFY_EMAIL = 'seekromano@gmail.com';
// Mittente: dominio verificato su Resend
const MAIL_FROM = 'Movimento Consapevole <info@maryceraulo.it>';

const DEFAULT_SETTINGS = {
    slotMinutes: 60,
    // Keyed by JS Date#getUTCDay(): 0=Sunday ... 6=Saturday
    weekly: {
        0: { open: false, start: '09:00', end: '19:00' },
        1: { open: true, start: '09:00', end: '19:00' },
        2: { open: true, start: '09:00', end: '19:00' },
        3: { open: true, start: '09:00', end: '19:00' },
        4: { open: true, start: '09:00', end: '19:00' },
        5: { open: true, start: '09:00', end: '19:00' },
        6: { open: true, start: '09:00', end: '19:00' },
    },
    blockedDates: [],
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname === '/') {
            return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
        }

        if (url.pathname === '/admin.html') {
            return handleAdminPage(request, env);
        }

        if (url.pathname.startsWith('/api/')) {
            return handleApi(request, env, url, ctx);
        }

        return env.ASSETS.fetch(request);
    },
};

async function handleAdminPage(request, env) {
    if (await isAuthenticated(request, env)) {
        return env.ASSETS.fetch(request);
    }
    const loginUrl = new URL('/admin-login.html', request.url);
    const res = await env.ASSETS.fetch(new Request(loginUrl, request));
    return new Response(res.body, { status: res.status, headers: res.headers });
}

async function handleApi(request, env, url, ctx) {
    const { pathname } = url;
    const method = request.method;

    if (pathname === '/api/login' && method === 'POST') return handleLogin(request, env);
    if (pathname === '/api/logout' && method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie(isHttps(request)) },
        });
    }

    // ---- Articles ----
    if (pathname === '/api/articles' && method === 'GET') return jsonResponse(await readList(env, ARTICLES_KEY));
    if (pathname === '/api/articles' && method === 'POST') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleSaveArticle(request, env);
    }
    if (pathname === '/api/articles/import' && method === 'POST') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleImportArticles(request, env);
    }
    const articleDelete = pathname.match(/^\/api\/articles\/(\d+)$/);
    if (articleDelete && method === 'DELETE') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleDeleteItem(env, ARTICLES_KEY, Number(articleDelete[1]));
    }

    // ---- Products (shop) ----
    if (pathname === '/api/products' && method === 'GET') return jsonResponse(await readList(env, PRODUCTS_KEY));
    if (pathname === '/api/products' && method === 'POST') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleSaveProduct(request, env);
    }
    const productDelete = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productDelete && method === 'DELETE') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleDeleteItem(env, PRODUCTS_KEY, decodeURIComponent(productDelete[1]));
    }

    // ---- Settings / availability ----
    if (pathname === '/api/settings' && method === 'GET') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return jsonResponse(await readSettings(env));
    }
    if (pathname === '/api/settings' && method === 'PUT') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleSaveSettings(request, env);
    }
    if (pathname === '/api/availability' && method === 'GET') {
        return handleAvailability(request, env, url);
    }

    // ---- Bookings ----
    if (pathname === '/api/bookings' && method === 'GET') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return jsonResponse(await readList(env, BOOKINGS_KEY));
    }
    if (pathname === '/api/bookings' && method === 'POST') {
        return handleCreateBooking(request, env, ctx);
    }
    const bookingUpdate = pathname.match(/^\/api\/bookings\/(\d+)$/);
    if (bookingUpdate && method === 'PATCH') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleUpdateBookingStatus(request, env, Number(bookingUpdate[1]), ctx);
    }
    if (bookingUpdate && method === 'DELETE') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleDeleteItem(env, BOOKINGS_KEY, Number(bookingUpdate[1]));
    }

    // ---- Blocked emails ----
    if (pathname === '/api/blocked-emails' && method === 'GET') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return jsonResponse(await readList(env, BLOCKED_EMAILS_KEY));
    }
    if (pathname === '/api/blocked-emails' && method === 'POST') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleBlockEmail(request, env, ctx);
    }
    if (pathname === '/api/blocked-emails' && method === 'DELETE') {
        if (!(await requireAuth(request, env))) return unauthorized();
        return handleUnblockEmail(env, url);
    }

    return jsonResponse({ error: 'Non trovato' }, 404);
}

function requireAuth(request, env) {
    return isAuthenticated(request, env);
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

async function handleSaveArticle(request, env) {
    let article;
    try {
        article = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    if (!article || typeof article.title !== 'string' || !article.title.trim()) {
        return jsonResponse({ error: 'Titolo mancante' }, 400);
    }
    if (typeof article.dateISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(article.dateISO)) {
        return jsonResponse({ error: 'Data non valida' }, 400);
    }

    article.title = article.title.trim();
    article.tag = (article.tag || '').trim();
    article.image = (article.image || '').trim();
    article.excerpt = (article.excerpt || '').trim();
    article.body = Array.isArray(article.body) ? article.body : [];
    article.slug = slugify(article.title);

    const saved = await upsertItem(env, ARTICLES_KEY, article);
    return jsonResponse(saved);
}

async function handleImportArticles(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }
    if (!Array.isArray(body.articles)) return jsonResponse({ error: 'Formato non valido' }, 400);
    await writeList(env, ARTICLES_KEY, body.articles);
    return jsonResponse({ ok: true, count: body.articles.length });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

async function handleSaveProduct(request, env) {
    let product;
    try {
        product = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    if (!product || typeof product.name !== 'string' || !product.name.trim()) {
        return jsonResponse({ error: 'Nome mancante' }, 400);
    }

    product.name = product.name.trim();
    product.icon = (product.icon || '').trim();
    product.description = (product.description || '').trim();
    product.type = product.type === 'link' ? 'link' : 'product';

    if (product.type === 'link') {
        const url = typeof product.url === 'string' ? product.url.trim() : '';
        if (!url) {
            return jsonResponse({ error: 'URL mancante' }, 400);
        }
        product.url = url;
        product.price = 0;
    } else {
        const price = Number(product.price);
        if (!Number.isFinite(price) || price < 0) {
            return jsonResponse({ error: 'Prezzo non valido' }, 400);
        }
        product.price = Math.round(price * 100) / 100;
        delete product.url;
    }

    const list = await readList(env, PRODUCTS_KEY);

    if (product.id) {
        const idx = list.findIndex((existing) => existing.id === product.id);
        if (idx !== -1) list[idx] = product; else list.push(product);
    } else {
        product.id = uniqueSlug(slugify(product.name) || 'prodotto', list);
        list.push(product);
    }

    await writeList(env, PRODUCTS_KEY, list);
    return jsonResponse(product);
}

function uniqueSlug(base, list) {
    if (!list.some((item) => item.id === base)) return base;
    let i = 2;
    while (list.some((item) => item.id === base + '-' + i)) i++;
    return base + '-' + i;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

async function readSettings(env) {
    const raw = await env.DATA_KV.get(SETTINGS_KEY, 'json');
    if (!raw) return DEFAULT_SETTINGS;
    return Object.assign({}, DEFAULT_SETTINGS, raw, {
        weekly: Object.assign({}, DEFAULT_SETTINGS.weekly, raw.weekly || {}),
        blockedDates: Array.isArray(raw.blockedDates) ? raw.blockedDates : [],
    });
}

async function handleSaveSettings(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    const slotMinutes = Number(body.slotMinutes);
    if (![15, 20, 30, 45, 60, 90, 120].includes(slotMinutes)) {
        return jsonResponse({ error: 'Durata slot non valida' }, 400);
    }

    const weekly = {};
    for (let day = 0; day <= 6; day++) {
        const rule = (body.weekly && body.weekly[day]) || {};
        weekly[day] = {
            open: !!rule.open,
            start: /^\d{2}:\d{2}$/.test(rule.start) ? rule.start : '09:00',
            end: /^\d{2}:\d{2}$/.test(rule.end) ? rule.end : '19:00',
        };
    }

    const blockedDates = Array.isArray(body.blockedDates)
        ? body.blockedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [];

    const settings = { slotMinutes, weekly, blockedDates };
    await env.DATA_KV.put(SETTINGS_KEY, JSON.stringify(settings));
    return jsonResponse(settings);
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}

function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins) {
    return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60);
}

function nowInRome() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return {
        dateISO: `${get('year')}-${get('month')}-${get('day')}`,
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
    };
}

async function computeSlotsForDate(env, dateISO) {
    const settings = await readSettings(env);
    if (settings.blockedDates.indexOf(dateISO) !== -1) return [];

    const weekday = new Date(dateISO + 'T00:00:00Z').getUTCDay();
    const rule = settings.weekly[weekday];
    if (!rule || !rule.open) return [];

    const slotMinutes = settings.slotMinutes;
    const startMinutes = timeToMinutes(rule.start);
    const endMinutes = timeToMinutes(rule.end);

    const slots = [];
    for (let cursor = startMinutes; cursor + slotMinutes <= endMinutes; cursor += slotMinutes) {
        slots.push(minutesToTime(cursor));
    }

    const today = nowInRome();
    const filteredByTime = dateISO === today.dateISO
        ? slots.filter((t) => timeToMinutes(t) > today.minutes)
        : dateISO < today.dateISO
            ? []
            : slots;

    const bookings = await readList(env, BOOKINGS_KEY);
    const taken = bookings
        .filter((b) => b.dateISO === dateISO && (b.status === 'pending' || b.status === 'accepted'))
        .map((b) => b.time);

    return filteredByTime.filter((t) => taken.indexOf(t) === -1);
}

async function handleAvailability(request, env, url) {
    const dateISO = url.searchParams.get('date');
    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return jsonResponse({ error: 'Data non valida' }, 400);
    }
    const slots = await computeSlotsForDate(env, dateISO);
    return jsonResponse({ date: dateISO, slots });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

async function handleCreateBooking(request, env, ctx) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const modality = typeof body.modality === 'string' ? body.modality.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const dateISO = body.dateISO;
    const time = body.time;

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
        return jsonResponse({ error: 'Nome o email non validi' }, 400);
    }

    // Email bloccate dalla cliente dal pannello admin
    const blocked = await readList(env, BLOCKED_EMAILS_KEY);
    if (blocked.indexOf(email.toLowerCase()) !== -1) {
        return jsonResponse({ error: 'Non è possibile completare la prenotazione con questo indirizzo email.' }, 403);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !/^\d{2}:\d{2}$/.test(time)) {
        return jsonResponse({ error: 'Data o orario non validi' }, 400);
    }

    const availableSlots = await computeSlotsForDate(env, dateISO);
    if (availableSlots.indexOf(time) === -1) {
        return jsonResponse({ error: 'Questo orario non è più disponibile. Scegline un altro.' }, 409);
    }

    const booking = {
        name,
        email,
        phone,
        modality,
        reason,
        dateISO,
        time,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };

    const saved = await upsertItem(env, BOOKINGS_KEY, booking);

    // Invia la notifica email senza far aspettare il cliente
    ctx.waitUntil(sendBookingEmail(env, saved));

    return jsonResponse(saved);
}

async function sendBookingEmail(env, b) {
    if (!env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY mancante: email non inviata');
        return;
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: MAIL_FROM,
                to: [NOTIFY_EMAIL],
                reply_to: b.email,
                subject: `Nuova richiesta di prenotazione da ${b.name}`,
                text:
                    `Nome: ${b.name}
Email: ${b.email}
Telefono: ${b.phone || '-'}
Modalità: ${b.modality || '-'}
Data: ${b.dateISO} alle ${b.time}

Motivo:
${b.reason || '-'}`,
            }),
        });
        if (!res.ok) console.error('Resend error', res.status, await res.text());
    } catch (e) {
        console.error('Resend fetch failed', e);
    }
}

async function handleUpdateBookingStatus(request, env, id, ctx) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    if (['accepted', 'rejected', 'pending', 'no_show'].indexOf(body.status) === -1) {
        return jsonResponse({ error: 'Stato non valido' }, 400);
    }

    const bookings = await readList(env, BOOKINGS_KEY);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) return jsonResponse({ error: 'Prenotazione non trovata' }, 404);

    const previousStatus = bookings[idx].status;
    bookings[idx].status = body.status;
    await writeList(env, BOOKINGS_KEY, bookings);

    const result = Object.assign({}, bookings[idx]);

    // Mail al cliente solo se lo stato cambia davvero verso accettata/rifiutata
    if (body.status !== previousStatus && (body.status === 'accepted' || body.status === 'rejected')) {
        ctx.waitUntil(sendStatusEmail(env, bookings[idx]));
    }

    // Non presentato: se sono consecutive (senza presenze in mezzo), blocco automatico + mail al cliente
    if (body.status === 'no_show' && previousStatus !== 'no_show') {
        const email = (bookings[idx].email || '').toLowerCase();
        if (hasConsecutiveNoShows(bookings, email) && (await addBlockedEmail(env, email))) {
            ctx.waitUntil(sendBlockedEmail(env, email, bookings[idx].name));
            result.autoBlocked = true;
        }
    }

    return jsonResponse(result);
}

// ---------------------------------------------------------------------------
// Blocked emails
// ---------------------------------------------------------------------------

async function handleBlockEmail(request, env, ctx) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return jsonResponse({ error: 'Email non valida' }, 400);
    }

    const list = await readList(env, BLOCKED_EMAILS_KEY);
    if (list.indexOf(email) === -1) {
        list.push(email);
        await writeList(env, BLOCKED_EMAILS_KEY, list);

        // Avvisa il cliente del blocco (usa il nome se ha già prenotato)
        const bookings = await readList(env, BOOKINGS_KEY);
        const known = bookings.find((b) => (b.email || '').toLowerCase() === email);
        ctx.waitUntil(sendBlockedEmail(env, email, known ? known.name : ''));
    }
    return jsonResponse(list);
}

async function handleUnblockEmail(env, url) {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const list = await readList(env, BLOCKED_EMAILS_KEY);
    const next = list.filter((e) => e !== email);
    await writeList(env, BLOCKED_EMAILS_KEY, next);
    return jsonResponse(next);
}

// ---------------------------------------------------------------------------
// Generic list storage helpers (shared by articles / products / bookings)
// ---------------------------------------------------------------------------

async function readList(env, key) {
    const raw = await env.DATA_KV.get(key, 'json');
    return Array.isArray(raw) ? raw : [];
}

async function writeList(env, key, list) {
    await env.DATA_KV.put(key, JSON.stringify(list));
}

async function upsertItem(env, key, item) {
    const list = await readList(env, key);

    if (item.id) {
        item.id = Number(item.id);
        const idx = list.findIndex((existing) => existing.id === item.id);
        if (idx !== -1) {
            list[idx] = item;
        } else {
            list.push(item);
        }
    } else {
        item.id = list.reduce((max, existing) => Math.max(max, existing.id), 0) + 1;
        list.push(item);
    }

    await writeList(env, key, list);
    return item;
}

async function handleDeleteItem(env, key, id) {
    const list = await readList(env, key);
    const next = list.filter((item) => item.id !== id);
    await writeList(env, key, next);
    return jsonResponse({ ok: true });
}

function slugify(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

function unauthorized() {
    return jsonResponse({ error: 'Non autorizzato' }, 401);
}

// ---------------------------------------------------------------------------
// Auth: session cookie "<expiry>.<hmac-sha256(expiry)>", verified statelessly
// ---------------------------------------------------------------------------

async function handleLogin(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ error: 'Richiesta non valida' }, 400);
    }

    const password = typeof body.password === 'string' ? body.password : '';
    const valid = await constantTimeEqual(password, env.ADMIN_PASSWORD || '');

    if (!valid) {
        return jsonResponse({ error: 'Password errata' }, 401);
    }

    const cookie = await createSessionCookie(env, isHttps(request));
    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
    });
}

function isHttps(request) {
    return new URL(request.url).protocol === 'https:';
}

async function getHmacKey(env) {
    const secret = env.SESSION_SECRET || '';
    const keyData = new TextEncoder().encode(secret);
    return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function createSessionCookie(env, secure) {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const key = await getHmacKey(env);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiresAt)));
    const token = expiresAt + '.' + toBase64Url(signature);
    return `${SESSION_COOKIE}=${token}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie(secure) {
    return `${SESSION_COOKIE}=; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=0`;
}

function getCookie(request, name) {
    const header = request.headers.get('Cookie') || '';
    const parts = header.split(';');
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
    }
    return null;
}

async function isAuthenticated(request, env) {
    const token = getCookie(request, SESSION_COOKIE);
    if (!token) return false;

    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return false;

    const expiresAt = Number(token.slice(0, dotIndex));
    const signature = token.slice(dotIndex + 1);
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

    try {
        const key = await getHmacKey(env);
        return crypto.subtle.verify('HMAC', key, fromBase64Url(signature), new TextEncoder().encode(String(expiresAt)));
    } catch (e) {
        return false;
    }
}

async function constantTimeEqual(a, b) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('constant-time-compare'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const [macA, macB] = await Promise.all([
        crypto.subtle.sign('HMAC', key, new TextEncoder().encode(a)),
        crypto.subtle.sign('HMAC', key, new TextEncoder().encode(b)),
    ]);
    const bytesA = new Uint8Array(macA);
    const bytesB = new Uint8Array(macB);
    if (bytesA.length !== bytesB.length) return false;
    let diff = 0;
    for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
    return diff === 0 && a.length === b.length;
}

// ---------------------------------------------------------------------------
// Email di stato (accettata / rifiutata) al cliente
// ---------------------------------------------------------------------------

const MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function formatDateIT(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return `${d} ${MONTHS_IT[m - 1]} ${y}`;
}

async function sendStatusEmail(env, b) {
    if (!env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY mancante: email non inviata');
        return;
    }

    const when = `${formatDateIT(b.dateISO)} alle ${b.time}`;
    const modalityLine = b.modality ? `\nModalità: ${b.modality}` : '';
    let subject, text;

    if (b.status === 'accepted') {
        subject = 'Prenotazione confermata';
        text =
            `Ciao ${b.name},

ti confermo di aver ricevuto la tua richiesta di prenotazione per [data] alle [ora], presso il mio studio / online.

Ti ringrazio per aver scelto Movimento Consapevole di Mary Ceraulo.

Ti chiedo cortesemente, qualora non potessi presentarti all’appuntamento, di avvisarmi con il dovuto anticipo, così da permettermi di organizzare al meglio gli appuntamenti e offrire lo spazio ad altre persone.

Attenzione: in caso di due mancate presentazioni consecutive senza preavviso, l’indirizzo email e il numero di cellulare associati alle prenotazioni potranno essere inseriti in un elenco interno di esclusione, con conseguente blocco delle successive prenotazioni online.

Per eventuali imprevisti o necessità di modifica dell’appuntamento, puoi contattarmi rispondendo a questa email.

Grazie per la collaborazione e a presto!

Mary Ceraulo
Chinesiologa e istruttrice di Pilates
Movimento Consapevole
www.maryceraulo.it`;
    } else {
        subject = 'Prenotazione non disponibile';
        text =
            `Ciao ${b.name},

ti ringrazio per aver scelto Movimento Consapevole di Mary Ceraulo e per aver inviato la tua richiesta di prenotazione.

Mi dispiace, ma non posso confermare l'appuntamento nella data e nell'orario richiesti. Potrebbe esserci stata una differenza tra le disponibilità mostrate sul sito e la mia agenda aggiornata.

Mi scuso per l'inconveniente e per l'eventuale disagio.

Se lo desideri, puoi contattarmi per concordare una data o un orario alternativo.

Grazie per la comprensione!

Un saluto,

Mary Ceraulo
Chinesiologa e istruttrice di Pilates
Movimento Consapevole
www.maryceraulo.it`;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: MAIL_FROM,
                to: [b.email],
                reply_to: NOTIFY_EMAIL,
                subject,
                text,
            }),
        });
        if (!res.ok) console.error('Resend error', res.status, await res.text());
    } catch (e) {
        console.error('Resend fetch failed', e);
    }
}

// ---------------------------------------------------------------------------
// Mancate presenze e blocco automatico
// ---------------------------------------------------------------------------

// true se le ultime NO_SHOW_LIMIT prenotazioni "concluse" dell'email sono tutte "non presentato".
// Contano come concluse: quelle segnate non presentato e quelle accettate con data/ora già passata
// (le accettate passate non segnate come non presentato sono considerate presenze, quindi azzerano la serie).
function hasConsecutiveNoShows(bookings, email) {
    const now = nowInRome();
    const nowKey = now.dateISO + ' ' + minutesToTime(now.minutes);
    const keyOf = (b) => b.dateISO + ' ' + b.time;

    const history = bookings
        .filter((b) => (b.email || '').toLowerCase() === email)
        .filter((b) => b.status === 'no_show' || (b.status === 'accepted' && keyOf(b) <= nowKey))
        .sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0));

    if (history.length < NO_SHOW_LIMIT) return false;
    return history.slice(-NO_SHOW_LIMIT).every((b) => b.status === 'no_show');
}

// Aggiunge l'email alla lista dei bloccati. Ritorna true solo se non c'era già.
async function addBlockedEmail(env, email) {
    const list = await readList(env, BLOCKED_EMAILS_KEY);
    if (list.indexOf(email) !== -1) return false;
    list.push(email);
    await writeList(env, BLOCKED_EMAILS_KEY, list);
    return true;
}

async function sendBlockedEmail(env, email, name) {
    if (!env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY mancante: email non inviata');
        return;
    }

    const greeting = name ? `Ciao ${name},` : 'Ciao,';

    const text =
        `${greeting}

ti scrivo in merito alla tua seconda mancata presentazione consecutiva agli appuntamenti prenotati con Movimento Consapevole di Mary Ceraulo, senza un adeguato preavviso.

Come indicato nella comunicazione precedente, questa situazione comporta l'inserimento del tuo indirizzo email e del tuo numero di cellulare nell'elenco interno di esclusione dalle prenotazioni online. Di conseguenza, al momento non potrai effettuare nuove prenotazioni direttamente dal sito.

Se ritieni che ci sia stato un errore o desideri chiarire la situazione e richiedere la riattivazione delle prenotazioni, puoi contattarmi tramite messaggio su WhatsApp.

Valuterò la tua richiesta e ti comunicherò l'eventuale riattivazione.

Grazie per l'attenzione.

Mary Ceraulo
Chinesiologa e istruttrice di Pilates
Movimento Consapevole
www.maryceraulo.it`;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: MAIL_FROM,
                to: [email],
                reply_to: NOTIFY_EMAIL,
                subject: 'Avviso di esclusione dalle prenotazioni online – Movimento Consapevole',
                text,
            }),
        });
        if (!res.ok) console.error('Resend error', res.status, await res.text());
    } catch (e) {
        console.error('Resend fetch failed', e);
    }
}