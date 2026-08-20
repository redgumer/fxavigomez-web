export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const turnstileToken = String(body.turnstileToken || '').trim();

    if (!name || !email || !subject || !message) {
      return json({ ok: false, error: 'missing_fields' }, 400);
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return json({ ok: false, error: 'invalid_email' }, 400);
    }

    if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
      return json({ ok: false, error: 'not_configured' }, 503);
    }

    const verifyData = new FormData();
    verifyData.append('secret', env.TURNSTILE_SECRET_KEY);
    verifyData.append('response', turnstileToken);
    const remoteIp = request.headers.get('CF-Connecting-IP');
    if (remoteIp) verifyData.append('remoteip', remoteIp);

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: verifyData
    });
    const verification = await verifyResponse.json();

    if (!verification.success) {
      return json({ ok: false, error: 'turnstile_failed' }, 400);
    }

    const safeSubject = subject.slice(0, 140);
    const mailText = [
      'Nuevo mensaje desde fxavigomez.es',
      '',
      `Nombre: ${name}`,
      `Correo: ${email}`,
      `Asunto: ${safeSubject}`,
      '',
      message
    ].join('\n');

    const sendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: email,
        subject: `fxavigomez.es — ${safeSubject}`,
        text: mailText
      })
    });

    if (!sendResponse.ok) {
      return json({ ok: false, error: 'send_failed' }, 502);
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'unexpected_error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
