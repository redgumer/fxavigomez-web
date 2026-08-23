export async function onRequestPost(context) {
  const { request, env } = context;

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

    const verifyBody = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: turnstileToken
    });
    const remoteIp = request.headers.get('CF-Connecting-IP');
    if (remoteIp) verifyBody.set('remoteip', remoteIp);

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody
    });

    if (!verifyResponse.ok) {
      return json({ ok: false, error: `turnstile_http_${verifyResponse.status}` }, 502);
    }

    const verification = await verifyResponse.json();
    if (!verification.success) {
      const codes = Array.isArray(verification['error-codes']) ? verification['error-codes'].join(',') : 'unknown';
      return json({ ok: false, error: `turnstile_failed:${codes}` }, 400);
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

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        subject: `fxavigomez.es — ${safeSubject}`,
        text: mailText
      })
    });

    const raw = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error('Resend contact error', resendResponse.status, raw.slice(0, 500));
      return json({ ok: false, error: `send_failed:${resendResponse.status}` }, 502);
    }

    let resendId = null;
    try {
      resendId = JSON.parse(raw)?.id || null;
    } catch {}

    return json({ ok: true, sent: true, id: resendId });
  } catch (error) {
    console.error('Contact function exception', String(error?.message || error));
    return json({ ok: false, error: `unexpected_error:${error?.name || 'Error'}` }, 500);
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
