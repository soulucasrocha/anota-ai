const B = 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/';

export const PIZZA_FLAVORS = [
  { id: 'fl-mussarela',  name: 'Muçarela',               desc: 'Molho, Muçarela, Tomate, Orégano',                                      img: B + '202309300607_I5J0_i' },
  { id: 'fl-margherita', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco',                               img: B + '202309300607_I5J0_i' },
  { id: 'fl-calabresa',  name: 'Calabresa',               desc: 'Molho, Muçarela, Calabresa, Orégano',                                   img: B + '202309300548_01YC_i' },
  { id: 'fl-americana',  name: 'Americana',               desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300554_0Y52_i' },
  { id: 'fl-bacon',      name: 'Bacon',                   desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300602_J030_i' },
  { id: 'fl-mista',      name: 'Mista',                   desc: 'Molho, Muçarela, Calabresa e Bacon, Orégano',                           img: B + '202309300603_7K33_i' },
  { id: 'fl-frango',     name: 'Frango Com Requeijão',    desc: 'Molho, Muçarela, Frango, Requeijão, Orégano',                           img: B + '202309300553_4U2S_i' },
  { id: 'fl-viabrasil',  name: 'Via Brasil (Portuguesa)', desc: 'Molho, Muçarela, Calabresa, Bacon, Milho, Ervilha, Tomate, Pimentão',   img: B + '202309300604_N81Q_i' },
];

export const SWEET_PIZZAS = [
  { id: 'fl-doce', name: 'Pizza Doce 35cm', desc: 'Pizza doce 35cm', img: 'https://anotaai.s3.us-west-2.amazonaws.com/pizzas/1pizza' },
];

export const PIZZA_FLAVORS_PRICED = [
  { id: 'fl-mussarela',  name: 'Muçarela',               desc: 'Molho, Muçarela, Tomate, Orégano',                                      img: B + '202309300607_I5J0_i', price: 3000 },
  { id: 'fl-margherita', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco',                               img: B + '202309300607_I5J0_i', price: 3000 },
  { id: 'fl-calabresa',  name: 'Calabresa',               desc: 'Molho, Muçarela, Calabresa, Orégano',                                   img: B + '202309300548_01YC_i', price: 3299 },
  { id: 'fl-bacon',      name: 'Bacon',                   desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300602_J030_i', price: 3299 },
  { id: 'fl-americana',  name: 'Americana',               desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300554_0Y52_i', price: 3399 },
  { id: 'fl-frango',     name: 'Frango Com Requeijão',    desc: 'Molho, Muçarela, Frango, Requeijão, Orégano',                           img: B + '202309300553_4U2S_i', price: 3399 },
  { id: 'fl-mista',      name: 'Mista',                   desc: 'Molho, Muçarela, Calabresa e Bacon, Orégano',                           img: B + '202309300603_7K33_i', price: 3399 },
  { id: 'fl-viabrasil',  name: 'Via Brasil (Portuguesa)', desc: 'Molho, Muçarela, Calabresa, Bacon, Milho, Ervilha, Tomate, Pimentão',   img: B + '202309300604_N81Q_i', price: 3499 },
];

export const BEVERAGES_LIST = [
  { id: 'bev-guarana', name: 'Guaraná Antarctica 1,5l', desc: 'Garrafa 1,5l' },
  { id: 'bev-pepsi',   name: 'Pepsi 1,5l',              desc: 'Garrafa 1,5l' },
];

export const STEP_TPL = {
  salgadas2: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 2 sabores',           required: 2, options: PIZZA_FLAVORS },
  salgadas3: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 3 sabores',           required: 3, options: PIZZA_FLAVORS },
  salgadas4: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 4 sabores',           required: 4, options: PIZZA_FLAVORS },
  doce1:     { type: 'flavors',      title: 'Escolha a pizza doce:',        subtitle: 'Escolha 1 sabor',             required: 1, options: SWEET_PIZZAS },
  refri1:    { type: 'beverage',     title: 'Escolha o refrigerante:',      subtitle: 'Escolha 1 item',              required: 1, options: BEVERAGES_LIST },
  refri2:    { type: 'beverage',     title: 'Escolha os refrigerantes:',    subtitle: 'Escolha 2 itens',             required: 2, options: BEVERAGES_LIST },
  halves:    { type: 'pizza-halves', title: 'Sabor PIZZA 35CM (8 PEDAÇOS)', subtitle: 'Escolha entre 1 a 2 sabores', min: 1, max: 2, options: PIZZA_FLAVORS_PRICED },
  notes:     { type: 'notes' },
};

export const MENU = {
  destaques: [
    {
      id: 'dest-calabresa', name: 'Pizza Calabresa 35cm',
      desc: 'Molho, Muçarela, Calabresa, Orégano',
      price: 2499,
      img: B + '202309300548_01YC_i',
      steps: ['notes'],
    },
    {
      id: 'dest1', name: 'Combo Super 4 Pizza De 35cm + 2 Refrigerante',
      desc: '4 Pizzas qualquer sabor do cardápio + 2 Guaraná Antarctica ou Pepsi 1,5l',
      price: 12999, oldPrice: 13989, tag: '7% OFF',
      img: B + '202309300513_JH58_i',
      steps: ['salgadas4', 'refri2', 'notes'],
    },
    {
      id: 'dest2', name: '3 Pizza Salgadas 35cm + 1 Refrigerante',
      desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná Antarctica ou Pepsi 1,5l',
      price: 8927, oldPrice: 9599, tag: '7% OFF',
      img: B + '-1706189781018blob',
      steps: ['salgadas3', 'refri1', 'notes'],
    },
    {
      id: 'dest3', name: '2 Pizzas Salgadas + 1 Doce 35cm = 3 Pizzas',
      desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',
      price: 8995, oldPrice: 9569, tag: '6% OFF',
      img: B + '-1706190192755blob',
      steps: ['salgadas2', 'doce1', 'refri1', 'notes'],
    },
  ],
  combos: [
    {
      id: 'c1', name: 'Combo Duplo 2 Pizza De 35cm + 1 Refrigerante',
      desc: '2 Pizzas qualquer sabor do cardápio + Guaraná Antarctica ou Pepsi 1,5l',
      price: 6499, img: B + '202309300514_5A60_i',
      steps: ['salgadas2', 'refri1', 'notes'],
    },
    {
      id: 'c2', name: 'Combo Super 4 Pizza De 35cm + 2 Refrigerante',
      desc: '4 Pizzas qualquer sabor do cardápio + 2 Guaraná Antarctica ou Pepsi 1,5l',
      price: 12999, oldPrice: 13989, tag: '7%',
      img: B + '202309300513_JH58_i',
      steps: ['salgadas4', 'refri2', 'notes'],
    },
  ],
  minicombos: [
    {
      id: 'mc1', name: 'Combo Solo 1 Pizza Metade + 1 Guarana',
      desc: '1 Pizza meia a meia qualquer sabor + Guaraná Antarctica 350ml',
      price: 2290, soldOut: true,
      img: B + '-1706205997340blob',
    },
  ],
  trio: [
    {
      id: 't1', name: '3 Pizza Salgadas 35cm + 1 Refrigerante',
      desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná Antarctica ou Pepsi 1,5l',
      price: 8927, oldPrice: 9599, tag: '7%',
      img: B + '-1706189781018blob',
      steps: ['salgadas3', 'refri1', 'notes'],
    },
    {
      id: 't2', name: '2 Pizzas Salgadas + 1 Doce 35cm = 3 Pizzas',
      desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',
      price: 8995, oldPrice: 9569, tag: '6%',
      img: B + '-1706190192755blob',
      steps: ['salgadas2', 'doce1', 'refri1', 'notes'],
    },
  ],
  salgadas: [
    { id: 'sal1', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco em pitadas', price: 2999, img: B + '202309300607_I5J0_i', steps: ['notes'] },
    { id: 'sal2', name: 'Calabresa',               desc: 'Pizza Calabresa 35cm',                                price: 3299, img: B + '202309300548_01YC_i', steps: ['notes'] },
    { id: 'sal3', name: 'Bacon',                   desc: 'Pizza Bacon 35cm',                                    price: 3299, img: B + '202309300602_J030_i', steps: ['notes'] },
    { id: 'sal4', name: 'Mista',                   desc: 'Pizza Mista 35cm',                                    price: 3299, img: B + '202309300603_7K33_i', steps: ['notes'] },
    { id: 'sal5', name: 'Americana',               desc: 'Pizza Americana 35cm',                                price: 3399, img: B + '202309300554_0Y52_i', steps: ['notes'] },
    { id: 'sal6', name: 'Frango Com Requeijão',    desc: 'Pizza Frango Com Requeijão 35cm',                     price: 3399, img: B + '202309300553_4U2S_i', steps: ['notes'] },
    { id: 'sal7', name: 'Via Brasil (Portuguesa)', desc: 'Pizza Via Brasil (Portuguesa) 35cm',                  price: 3499, img: B + '202309300604_N81Q_i', steps: ['notes'] },
  ],
  metade: [
    { id: 'met1', name: 'Margherita (Metade)',           desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300607_I5J0_i' },
    { id: 'met2', name: 'Calabresa (Metade)',             desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300548_01YC_i' },
    { id: 'met3', name: 'Bacon (Metade)',                 desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300602_J030_i' },
    { id: 'met4', name: 'Mista (Metade)',                 desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300603_7K33_i' },
    { id: 'met5', name: 'Americana (Metade)',             desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300554_0Y52_i' },
    { id: 'met6', name: 'Frango Com Requeijão (Metade)', desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300553_4U2S_i' },
    { id: 'met7', name: 'Via Brasil/Portuguesa (Metade)', desc: 'Pizza Metade 35cm', price: 1990, soldOut: true, img: B + '202309300604_N81Q_i' },
  ],
  dividas: [
    {
      id: 'div1', name: 'PIZZA 35CM (8 PEDAÇOS)',
      desc: 'Pizza com até 2 sabores e 8 fatias',
      price: 3000, img: B + '-1700061018894blob',
      steps: ['halves', 'notes'],
    },
  ],
  doces: [
    {
      id: 'doc1', name: 'Pizzas Doces 35cm',
      desc: 'Pizza doce 35cm', price: 2499,
      img: 'https://anotaai.s3.us-west-2.amazonaws.com/pizzas/1pizza',
      steps: ['notes'],
    },
  ],
  bebidas: [
    { id: 'beb1', name: 'Guaraná Antarctica 1,5l', desc: 'Refrigerante gelado', price: 900 },
    { id: 'beb2', name: 'Pepsi 1,5l',              desc: 'Refrigerante gelado', price: 900 },
  ],
  adicionais: [
    { id: 'adi1', name: 'Mostarda', desc: 'Adicional Mostarda', price: 100, soldOut: true },
    { id: 'adi2', name: 'Ketchup',  desc: 'Adicional Ketchup',  price: 200 },
  ],
};
