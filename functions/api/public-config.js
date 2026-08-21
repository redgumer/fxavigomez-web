export async function onRequestGet() {
  return new Response(JSON.stringify({
    turnstileSiteKey: '0x4AAAAAAEWffOAxL2xtgbCS'
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
