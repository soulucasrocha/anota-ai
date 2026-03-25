// Vercel Blob storage helpers — graceful fallback if token not set
async function getBlob() {
  try {
    const mod = await import('@vercel/blob');
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
    return mod;
  } catch { return null; }
}

// ── Read JSON from blob ───────────────────────────────────────────────────────
export async function blobRead(pathname) {
  try {
    const blob = await getBlob();
    if (!blob) return null;
    const { blobs } = await blob.list({ prefix: pathname });
    if (!blobs.length) return null;
    // get the most recent
    const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    const res = await fetch(latest.url);
    return await res.json();
  } catch { return null; }
}

// ── Write JSON to blob (overwrites) ──────────────────────────────────────────
export async function blobWrite(pathname, data) {
  try {
    const blob = await getBlob();
    if (!blob) return false;
    // delete old versions
    const { blobs } = await blob.list({ prefix: pathname });
    for (const b of blobs) { await blob.del(b.url).catch(() => {}); }
    // write new
    await blob.put(pathname, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return true;
  } catch { return false; }
}

// ── Append one item to a JSON array stored in blob ───────────────────────────
export async function blobAppend(pathname, item) {
  try {
    const blob = await getBlob();
    if (!blob) return false;
    const existing = await blobRead(pathname) || [];
    existing.unshift(item); // newest first
    if (existing.length > 1000) existing.splice(1000); // cap at 1000
    await blobWrite(pathname, existing);
    return true;
  } catch { return false; }
}
