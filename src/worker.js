const SESSION_COOKIE = 'mc_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const ARTICLES_KEY = 'articles';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/admin.html') {
      return handleAdminPage(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
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

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === '/api/login' && request.method === 'POST') {
    return handleLogin(request, env);
  }

  if (pathname === '/api/logout' && request.method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(isHttps(request)),
      },
    });
  }

  if (pathname === '/api/articles' && request.method === 'GET') {
    const articles = await getArticles(env);
    return jsonResponse(articles);
  }

  if (pathname === '/api/articles' && request.method === 'POST') {
    if (!(await isAuthenticated(request, env))) return unauthorized();
    return handleSaveArticle(request, env);
  }

  if (pathname === '/api/articles/import' && request.method === 'POST') {
    if (!(await isAuthenticated(request, env))) return unauthorized();
    return handleImport(request, env);
  }

  const deleteMatch = pathname.match(/^\/api\/articles\/(\d+)$/);
  if (deleteMatch && request.method === 'DELETE') {
    if (!(await isAuthenticated(request, env))) return unauthorized();
    return handleDeleteArticle(env, Number(deleteMatch[1]));
  }

  return jsonResponse({ error: 'Non trovato' }, 404);
}

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
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}

function isHttps(request) {
  return new URL(request.url).protocol === 'https:';
}

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

  const articles = await getArticles(env);
  article.title = article.title.trim();
  article.tag = (article.tag || '').trim();
  article.image = (article.image || '').trim();
  article.excerpt = (article.excerpt || '').trim();
  article.body = Array.isArray(article.body) ? article.body : [];
  article.slug = slugify(article.title);

  if (article.id) {
    article.id = Number(article.id);
    const idx = articles.findIndex((item) => item.id === article.id);
    if (idx !== -1) {
      articles[idx] = article;
    } else {
      articles.push(article);
    }
  } else {
    article.id = articles.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    articles.push(article);
  }

  await putArticles(env, articles);
  return jsonResponse(article);
}

async function handleDeleteArticle(env, id) {
  const articles = await getArticles(env);
  const next = articles.filter((item) => item.id !== id);
  await putArticles(env, next);
  return jsonResponse({ ok: true });
}

async function handleImport(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Richiesta non valida' }, 400);
  }

  if (!Array.isArray(body.articles)) {
    return jsonResponse({ error: 'Formato non valido' }, 400);
  }

  await putArticles(env, body.articles);
  return jsonResponse({ ok: true, count: body.articles.length });
}

async function getArticles(env) {
  const raw = await env.ARTICLES_KV.get(ARTICLES_KEY, 'json');
  return Array.isArray(raw) ? raw : [];
}

async function putArticles(env, articles) {
  await env.ARTICLES_KV.put(ARTICLES_KEY, JSON.stringify(articles));
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

// ---- Session cookie: "<expiry>.<hmac-sha256(expiry)>", verified statelessly ----

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
