// Helper to verify admin token
export function verifyAdminToken(req) {
  const ADMIN_USER = (process.env.ADMIN_USER || 'lucasrochartt').trim();
  const ADMIN_PASS = (process.env.ADMIN_PASS || '123456').trim();
  const expected = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}:dashboard`).toString('base64');
  const auth = req.headers['x-admin-token'] || '';
  return auth === expected;
}
