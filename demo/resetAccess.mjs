/** GET mutates state only for direct, same-origin loopback development requests. */
export function allowGetReset(req, environment = process.env.NODE_ENV) {
  if (environment === 'production') return false;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  const headers = req.headers;
  if (headers.forwarded || Object.keys(headers).some(key => key.startsWith('x-forwarded-'))) return false;
  try {
    const origin = new URL(`http://${headers.host}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) return false;
    if (headers.origin && headers.origin !== origin.origin) return false;
    if (headers.referer && new URL(headers.referer).origin !== origin.origin) return false;
    if (headers['sec-fetch-site'] && !['none', 'same-origin'].includes(headers['sec-fetch-site'])) return false;
    if (`${headers.purpose ?? ''} ${headers['sec-purpose'] ?? ''}`.includes('prefetch')) return false;
    return true;
  } catch {
    return false;
  }
}
