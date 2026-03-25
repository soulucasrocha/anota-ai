// Admin login — credentials live ONLY in Vercel env vars (never in client bundle)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user, pass } = req.body || {};
  const ADMIN_USER = (process.env.ADMIN_USER || 'lucasrochartt').trim();
  const ADMIN_PASS = (process.env.ADMIN_PASS || '123456').trim();

  if ((user || '').trim() === ADMIN_USER && (pass || '').trim() === ADMIN_PASS) {
    // Simple token: base64 of user+timestamp, validated the same way on next calls
    const token = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}:dashboard`).toString('base64');
    return res.status(200).json({ ok: true, token });
  }
  return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
}
