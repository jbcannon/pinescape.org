// Pinescape API worker, deployed at api.pinescape.org.
//
// Routes:
//   POST /download-request  - captures lead info, emails a one-time download link
//   GET  /download?token=…  - redeems the token once, streams the file from R2
//   POST /contact           - relays the contact form to NOTIFY_EMAIL
//
// Bindings (see wrangler.toml / README.md for setup):
//   PINESCAPE_DOWNLOADS  - KV namespace, one-time download tokens
//   PINESCAPE_ASSETS     - R2 bucket, holds the release installer
//   RESEND_API_KEY       - secret, Resend API key
//   NOTIFY_EMAIL         - address that gets lead/contact notifications
//   FROM_EMAIL           - verified Resend sending address
//   DOWNLOAD_ASSET_KEY   - R2 object key of the current release installer
//   DOWNLOAD_TTL_SECONDS - one-time link lifetime, in seconds

var ALLOWED_ORIGINS = ['https://pinescape.org', 'https://www.pinescape.org'];

function corsHeaders(origin) {
  var allowOrigin = ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

async function sendEmail(env, opts) {
  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text
    })
  });
  if (!res.ok) {
    throw new Error('Resend send failed: ' + res.status + ' ' + (await res.text()));
  }
}

// 32 random bytes, base64url-encoded (URL-safe, no padding), used as the
// one-time download token and as the KV key for its record.
function randomToken() {
  var bytes = crypto.getRandomValues(new Uint8Array(32));
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function handleDownloadRequest(request, env, origin) {
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid JSON' }, 400, origin);
  }

  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var affiliation = (body.affiliation || '').trim();
  var use = (body.use || '').trim();

  if (!name || !email || !use) {
    return jsonResponse({ error: 'name, email, and use are required' }, 400, origin);
  }

  var token = randomToken();
  var record = {
    name: name,
    email: email,
    affiliation: affiliation,
    use: use,
    country: (request.cf && request.cf.country) || null,
    region: (request.cf && request.cf.region) || null,
    createdAt: new Date().toISOString(),
  };

  var ttl = parseInt(env.DOWNLOAD_TTL_SECONDS, 10) || 259200; // 3 days
  await env.PINESCAPE_DOWNLOADS.put(token, JSON.stringify(record), { expirationTtl: ttl });

  var downloadUrl = new URL(request.url);
  downloadUrl.pathname = '/download';
  downloadUrl.search = '?token=' + token;

  await sendEmail(env, {
    to: email,
    subject: 'Your Pinescape download link',
    text: [
      'Thanks for your interest in Pinescape!',
      '',
      'Your one-time download link (works once, expires in 3 days):',
      downloadUrl.toString(),
      '',
      'The Pinescape team'
    ].join('\n')
  });

  var location = [record.region, record.country].filter(Boolean).join(', ') || '(unknown)';
  await sendEmail(env, {
    to: env.NOTIFY_EMAIL,
    subject: 'New Pinescape download request',
    text: [
      'Name: ' + name,
      'Email: ' + email,
      'Affiliation: ' + (affiliation || '(not provided)'),
      'Use: ' + use,
      'Location: ' + location
    ].join('\n')
  });

  return jsonResponse({ ok: true }, 200, origin);
}

function errorPage(message) {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pinescape Download</title></head>' +
    '<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">' +
    '<h1>' + message + '</h1>' +
    '<p><a href="https://pinescape.org/download.html">Request a new download link</a></p>' +
    '</body></html>',
    { status: 410, headers: { 'Content-Type': 'text/html' } }
  );
}

async function handleDownload(request, env) {
  var url = new URL(request.url);
  var token = url.searchParams.get('token');
  if (!token) return errorPage('Missing download token.');

  var raw = await env.PINESCAPE_DOWNLOADS.get(token);
  if (!raw) return errorPage('This download link has expired or already been used.');

  var object = await env.PINESCAPE_ASSETS.get(env.DOWNLOAD_ASSET_KEY);
  if (!object) return errorPage('Download is temporarily unavailable. Please try again shortly.');

  // Only burn the token once the file is actually in hand. If R2 were
  // briefly unavailable, deleting first would strand the visitor with a
  // dead link and nothing to retry. A near-simultaneous double-click could
  // still race past this check; that's an accepted tradeoff for a
  // free-download lead-capture gate, not worth compare-and-swap complexity.
  await env.PINESCAPE_DOWNLOADS.delete(token);

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="' + env.DOWNLOAD_ASSET_KEY + '"'
    }
  });
}

async function handleContact(request, env, origin) {
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'invalid JSON' }, 400, origin);
  }

  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var affiliation = (body.affiliation || '').trim();
  var reason = (body.reason || '').trim();
  var message = (body.message || '').trim();

  if (!email || !reason || !message) {
    return jsonResponse({ error: 'email, reason, and message are required' }, 400, origin);
  }

  await sendEmail(env, {
    to: env.NOTIFY_EMAIL,
    subject: 'Pinescape Contact: ' + reason,
    text: [
      'Name: ' + (name || '(not provided)'),
      'Email: ' + email,
      'Affiliation: ' + (affiliation || '(not provided)'),
      '',
      message
    ].join('\n')
  });

  return jsonResponse({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';
    var url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/download-request') {
        return await handleDownloadRequest(request, env, origin);
      }
      if (request.method === 'GET' && url.pathname === '/download') {
        return await handleDownload(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/contact') {
        return await handleContact(request, env, origin);
      }
      return jsonResponse({ error: 'not found' }, 404, origin);
    } catch (err) {
      return jsonResponse({ error: 'server error' }, 500, origin);
    }
  }
};
