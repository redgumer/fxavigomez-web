export async function onRequestGet() {
  return new Response(JSON.stringify({
    turnstileSiteKey: '0x4AAAAAAAEWffOAxL2xtgbCS'
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
