import { verifyAdminToken } from './admin-verify.js';
import { blobRead, blobWrite } from './admin-blob.js';

const B = 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/';

// Static base — includes steps so they're preserved when admin edits
const STATIC_PRODUCTS = [
  { id: 'dest-calabresa', category: 'destaques', name: 'Pizza Calabresa 35cm',                    desc: 'Molho, Muçarela, Calabresa, Orégano',                                              price: 2499,  oldPrice: 3699,  tag: '32% OFF', img: B+'202309300548_01YC_i', active: true, steps: ['notes'] },
  { id: 'dest1',          category: 'destaques', name: 'Combo Super 4 Pizza 35cm + 2 Refrigerante', desc: '4 Pizzas qualquer sabor + 2 Guaraná ou Pepsi 1,5l',                            price: 12999, oldPrice: 13989, tag: '7% OFF',  img: B+'202309300513_JH58_i', active: true, steps: ['salgadas4','refri2','notes'] },
  { id: 'dest2',          category: 'destaques', name: '3 Pizza Salgadas 35cm + 1 Refrigerante',  desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná ou Pepsi 1,5l',                      price: 8927,  oldPrice: 9599,  tag: '7% OFF',  img: B+'-1706189781018blob',  active: true, steps: ['salgadas3','refri1','notes'] },
  { id: 'dest3',          category: 'destaques', name: '2 Pizzas Salgadas + 1 Doce 35cm',         desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',                                     price: 8995,  oldPrice: 9569,  tag: '6% OFF',  img: B+'-1706190192755blob',  active: true, steps: ['salgadas2','doce1','refri1','notes'] },
  { id: 'c1',             category: 'combos',    name: 'Combo Duplo 2 Pizza 35cm + 1 Refrigerante', desc: '2 Pizzas qualquer sabor + Guaraná ou Pepsi 1,5l',                              price: 6499,                                  img: B+'202309300514_5A60_i', active: true, steps: ['salgadas2','refri1','notes'] },
  { id: 'c2',             category: 'combos',    name: 'Combo Super 4 Pizza 35cm + 2 Refrigerante', desc: '4 Pizzas qualquer sabor + 2 Guaraná ou Pepsi 1,5l',                            price: 12999, oldPrice: 13989, tag: '7% OFF',  img: B+'202309300513_JH58_i', active: true, steps: ['salgadas4','refri2','notes'] },
  { id: 'mc1',            category: 'minicombos',name: 'Combo Solo 1 Pizza Metade + 1 Guarana',   desc: '1 Pizza meia a meia qualquer sabor + Guaraná Antarctica 350ml',                   price: 2290,                                  img: B+'-1706205997340blob',  active: true, soldOut: true },
  { id: 't1',             category: 'trio',      name: '3 Pizza Salgadas 35cm + 1 Refrigerante',  desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná ou Pepsi 1,5l',                      price: 8927,  oldPrice: 9599,  tag: '7% OFF',  img: B+'-1706189781018blob',  active: true, steps: ['salgadas3','refri1','notes'] },
  { id: 't2',             category: 'trio',      name: '2 Pizzas Salgadas + 1 Doce 35cm',         desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',                                     price: 8995,  oldPrice: 9569,  tag: '6% OFF',  img: B+'-1706190192755blob',  active: true, steps: ['salgadas2','doce1','refri1','notes'] },
  { id: 'sal1',           category: 'salgadas',  name: 'Margherita',                              desc: 'Molho, Muçarela, Tomate, Manjericão seco em pitadas',                             price: 2999,                                  img: B+'202309300607_I5J0_i', active: true, steps: ['notes'] },
  { id: 'sal2',           category: 'salgadas',  name: 'Calabresa',                               desc: 'Pizza Calabresa 35cm',                                                            price: 3299,                                  img: B+'202309300548_01YC_i', active: true, steps: ['notes'] },
  { id: 'sal3',           category: 'salgadas',  name: 'Bacon',                                   desc: 'Pizza Bacon 35cm',                                                                price: 3299,                                  img: B+'202309300602_J030_i', active: true, steps: ['notes'] },
  { id: 'sal4',           category: 'salgadas',  name: 'Mista',                                   desc: 'Pizza Mista 35cm',                                                                price: 3299,                                  img: B+'202309300603_7K33_i', active: true, steps: ['notes'] },
  { id: 'sal5',           category: 'salgadas',  name: 'Americana',                               desc: 'Pizza Americana 35cm',                                                            price: 3399,                                  img: B+'202309300554_0Y52_i', active: true, steps: ['notes'] },
  { id: 'sal6',           category: 'salgadas',  name: 'Frango Com Requeijão',                    desc: 'Pizza Frango Com Requeijão 35cm',                                                 price: 3399,                                  img: B+'202309300553_4U2S_i', active: true, steps: ['notes'] },
  { id: 'sal7',           category: 'salgadas',  name: 'Via Brasil (Portuguesa)',                 desc: 'Pizza Via Brasil (Portuguesa) 35cm',                                              price: 3499,                                  img: B+'202309300604_N81Q_i', active: true, steps: ['notes'] },
  { id: 'met1',           category: 'metade',    name: 'Margherita (Metade)',                      desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300607_I5J0_i', active: true, soldOut: true },
  { id: 'met2',           category: 'metade',    name: 'Calabresa (Metade)',                       desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300548_01YC_i', active: true, soldOut: true },
  { id: 'met3',           category: 'metade',    name: 'Bacon (Metade)',                           desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300602_J030_i', active: true, soldOut: true },
  { id: 'met4',           category: 'metade',    name: 'Mista (Metade)',                           desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300603_7K33_i', active: true, soldOut: true },
  { id: 'met5',           category: 'metade',    name: 'Americana (Metade)',                       desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300554_0Y52_i', active: true, soldOut: true },
  { id: 'met6',           category: 'metade',    name: 'Frango Com Requeijão (Metade)',            desc: 'Pizza Metade 35cm',                                                               price: 1750,                                  img: B+'202309300553_4U2S_i', active: true, soldOut: true },
  { id: 'met7',           category: 'metade',    name: 'Via Brasil/Portuguesa (Metade)',           desc: 'Pizza Metade 35cm',                                                               price: 1990,                                  img: B+'202309300604_N81Q_i', active: true, soldOut: true },
  { id: 'div1',           category: 'dividas',   name: 'PIZZA 35CM (8 PEDAÇOS)',                  desc: 'Pizza com até 2 sabores e 8 fatias',                                              price: 3000,                                  img: B+'-1700061018894blob',  active: true, steps: ['halves','notes'] },
  { id: 'doc1',           category: 'doces',     name: 'Pizzas Doces 35cm',                       desc: 'Pizza doce 35cm',                                                                 price: 2499,                                  img: 'https://anotaai.s3.us-west-2.amazonaws.com/pizzas/1pizza', active: true, steps: ['notes'] },
  { id: 'beb1',           category: 'bebidas',   name: 'Guaraná Antarctica 1,5l',                 desc: 'Refrigerante gelado',                                                             price: 900,                                   img: '',                      active: true },
  { id: 'beb2',           category: 'bebidas',   name: 'Pepsi 1,5l',                              desc: 'Refrigerante gelado',                                                             price: 900,                                   img: '',                      active: true },
  { id: 'adi1',           category: 'adicionais',name: 'Mostarda',                                desc: 'Adicional Mostarda',                                                              price: 100,                                   img: '',                      active: true, soldOut: true },
  { id: 'adi2',           category: 'adicionais',name: 'Ketchup',                                 desc: 'Adicional Ketchup',                                                               price: 200,                                   img: '',                      active: true },
];

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const stored = await blobRead('data/products.json');
    return res.status(200).json({ products: stored || STATIC_PRODUCTS });
  }

  // ── POST: add / update ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let products = await blobRead('data/products.json') || STATIC_PRODUCTS;
    const incoming = req.body;
    const idx = products.findIndex(p => p.id === incoming.id);
    let newProduct;
    if (idx >= 0) {
      // Preserve steps and soldOut from existing product if not sent
      newProduct = {
        ...products[idx],     // base: keep steps, soldOut, etc.
        ...incoming,          // override with admin changes
        price: Math.round(parseFloat(incoming.price) * 100),
        oldPrice: incoming.oldPrice ? Math.round(parseFloat(incoming.oldPrice) * 100) : undefined,
        active: incoming.active !== false,
      };
      products[idx] = newProduct;
    } else {
      newProduct = {
        ...incoming,
        id: incoming.id || `prod-${Date.now()}`,
        price: Math.round(parseFloat(incoming.price) * 100),
        oldPrice: incoming.oldPrice ? Math.round(parseFloat(incoming.oldPrice) * 100) : undefined,
        active: incoming.active !== false,
        steps: incoming.steps || ['notes'],
      };
      products.unshift(newProduct);
    }
    await blobWrite('data/products.json', products);
    return res.status(200).json({ ok: true, product: newProduct, products });
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    let products = await blobRead('data/products.json') || STATIC_PRODUCTS;
    products = products.filter(p => p.id !== id);
    await blobWrite('data/products.json', products);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
