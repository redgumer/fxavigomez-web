export async function onRequestGet({ env }) {
  const missing = [
    !env.RESEND_API_KEY && 'RESEND_API_KEY',
    !env.CONTACT_TO && 'CONTACT_TO',
    !env.CONTACT_FROM && 'CONTACT_FROM'
  ].filter(Boolean);

  if (missing.length) {
    return json({ ok: false, stage: 'config', missing }, 503);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        subject: 'Prueba técnica de fxavigomez.es',
        text: 'Este es un correo de prueba enviado desde Cloudflare Pages para comprobar la integración con Resend.'
      })
    });

    const raw = await response.text();
    let body;
    try { body = JSON.parse(raw); } catch { body = raw.slice(0, 500); }

    return json({
      ok: response.ok,
      stage: 'resend',
      status: response.status,
      response: body
    }, response.ok ? 200 : 502);
  } catch (error) {
    return json({
      ok: false,
      stage: 'exception',
      error: String(error?.message || error)
    }, 500);
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
