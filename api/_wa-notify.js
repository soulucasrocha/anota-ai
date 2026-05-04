// Helper: envia mensagem WhatsApp via wa-backend
// Falha silenciosamente — nunca quebra o fluxo de pedidos

import { sb } from './_supabase.js';

const WA_URL = process.env.WA_BACKEND_URL || '';
const WA_KEY = process.env.WA_BACKEND_KEY || '';

/**
 * @param {string} storeId
 * @param {string} phone  — qualquer formato (com ou sem DDI)
 * @param {string} message
 */
export async function sendWaNotification(storeId, phone, message) {
  if (!WA_URL || !phone || !message) return;

  try {
    // Busca primeira conta WA conectada desta loja
    const { data: accounts } = await sb()
      .from('whatsapp_accounts')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'connected')
      .limit(1);

    if (!accounts?.length) return;

    const digits = String(phone).replace(/\D/g, '');

    await fetch(`${WA_URL.replace(/\/$/, '')}/whatsapp/${accounts[0].id}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WA_KEY ? { 'x-api-key': WA_KEY } : {}),
      },
      body: JSON.stringify({ phone: digits, message }),
    });
  } catch (_) {
    // Falha silenciosa
  }
}
