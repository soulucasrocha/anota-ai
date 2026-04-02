import { useEffect, useRef, useState } from 'react'

const DEFAULT_CATS = [
  { id: 'destaques',  label: 'Destaques' },
  { id: 'combos',     label: 'Combos' },
  { id: 'minicombos', label: 'Mini Combos' },
  { id: 'trio',       label: 'Trio Pizza' },
  { id: 'salgadas',   label: 'Pizzas Variadas' },
  { id: 'metade',     label: 'Pizza Metade' },
  { id: 'dividas',    label: 'Dividas' },
  { id: 'doces',      label: 'Pizzas Doces' },
  { id: 'bebidas',    label: 'Refrigerantes' },
  { id: 'adicionais', label: 'Adicionais' },
];

export default function CategoryNav({ categories }) {
  // Use dynamic categories from API when available, else fall back to defaults
  const CATS = (categories && categories.length > 0)
    ? categories.map(c => ({ id: c.id, label: c.label || c.name || c.id }))
    : DEFAULT_CATS;

  const [active, setActive] = useState(CATS[0]?.id || 'destaques');
  const navRef = useRef(null);

  const scrollBtnIntoView = (id) => {
    const btn = navRef.current?.querySelector(`[data-cat="${id}"]`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const handleClick = (id) => {
    setActive(id);
    const sec = document.getElementById('sec-' + id);
    if (sec) {
      const offset = 56 + 40 + 46 + 8;
      const top = sec.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    scrollBtnIntoView(id);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id.replace('sec-', '');
          setActive(id);
          scrollBtnIntoView(id);
        }
      });
    }, { rootMargin: '-150px 0px -60% 0px', threshold: 0 });

    CATS.forEach(({ id }) => {
      const el = document.getElementById('sec-' + id);
      if (el) obs.observe(el);
    });

    return () => obs.disconnect();
  }, [CATS.map(c => c.id).join(',')]);

  return (
    <nav className="cat-nav" ref={navRef}>
      {CATS.map(({ id, label }) => (
        <button
          key={id}
          className={'cat-btn' + (active === id ? ' active' : '')}
          data-cat={id}
          onClick={() => handleClick(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
