export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    route: 'health',
    configured: {
      turnstileSecret: Boolean(env.TURNSTILE_SECRET_KEY),
      resendApiKey: Boolean(env.RESEND_API_KEY),
      contactTo: Boolean(env.CONTACT_TO),
      contactFrom: Boolean(env.CONTACT_FROM)
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
