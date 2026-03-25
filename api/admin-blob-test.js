import { verifyAdminToken } from './admin-verify.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const result = { tokenExists: !!token, tokenPrefix: token ? token.slice(0,20) + '...' : 'MISSING' };

  // Test @vercel/blob import
  try {
    const blobMod = await import('@vercel/blob');
    result.importOk = true;

    // Test list
    try {
      const listed = await blobMod.list();
      result.listOk = true;
      result.blobCount = listed.blobs.length;
      result.blobs = listed.blobs.map(b => ({ pathname: b.pathname, size: b.size }));
    } catch (e) {
      result.listError = e.message;
    }

    // Test write
    try {
      await blobMod.put('test/ping.json', JSON.stringify({ ts: Date.now() }), {
        access: 'public', addRandomSuffix: false, contentType: 'application/json'
      });
      result.writeOk = true;
    } catch (e) {
      result.writeError = e.message;
    }

  } catch (e) {
    result.importError = e.message;
  }

  return res.status(200).json(result);
}
