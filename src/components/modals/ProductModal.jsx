import { useState, useEffect, useRef } from 'react'
import { STEP_TPL } from '../../data/menu'
import { fmtPrice } from '../../utils/helpers'

function resolveSteps(keys) {
  return (keys || ['notes']).map(k => STEP_TPL[k] || { type: 'notes' });
}

function QtyStep({ step, stepIdx, qtys, onQtyChange, bodyRef, isLast }) {
  const required = step.required || 0;
  const total = Object.values(qtys).reduce((s, q) => s + q, 0);
  const wrapRef = useRef(null);

  const scrollToNext = () => {
    if (isLast || !wrapRef.current || !bodyRef.current) return;
    const next = wrapRef.current.nextElementSibling;
    if (!next) return;
    setTimeout(() => {
      const body = bodyRef.current;
      const bodyRect = body.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const target = body.scrollTop + (nextRect.top - bodyRect.top) - 8;
      body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 200);
  };

  const handleInc = (optId) => {
    if (required > 0 && total >= required) return;
    const newVal = (qtys[optId] || 0) + 1;
    onQtyChange(stepIdx, optId, newVal);
    if (required > 0 && total + 1 === required) scrollToNext();
  };

  const handleDec = (optId) => {
    if ((qtys[optId] || 0) <= 0) return;
    onQtyChange(stepIdx, optId, (qtys[optId] || 0) - 1);
  };

  return (
    <div className="pm-step" ref={wrapRef}>
      <div className="pm-step-header">
        <div>
          <div className="pm-step-title">{step.title}</div>
          <div className="pm-step-subtitle">{step.subtitle || ''}</div>
        </div>
        <span className={required ? 'pm-required-badge' : 'pm-optional-badge'}>
          {required ? 'Obrigatório' : 'Opcional'}
        </span>
      </div>
      {step.options.map(opt => (
        <div key={opt.id} className="pm-option">
          <div className="pm-option-img">
            {opt.img ? <img src={opt.img} alt="" loading="lazy" /> : '🍕'}
          </div>
          <div className="pm-option-info">
            <div className="pm-option-name">{opt.name}</div>
            {opt.desc && <div className="pm-option-desc">{opt.desc}</div>}
          </div>
          <div className="pm-option-controls">
            <button
              className="pm-qty-btn"
              disabled={(qtys[opt.id] || 0) === 0}
              onClick={() => handleDec(opt.id)}
            >−</button>
            <span className="pm-qty-num">{qtys[opt.id] || 0}</span>
            <button
              className="pm-qty-btn"
              disabled={required > 0 && total >= required}
              onClick={() => handleInc(opt.id)}
            >+</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HalvesStep({ step, selected, onToggle, bodyRef, isLast }) {
  const wrapRef = useRef(null);

  const scrollToNext = () => {
    if (isLast || !wrapRef.current || !bodyRef.current) return;
    const next = wrapRef.current.nextElementSibling;
    if (!next) return;
    setTimeout(() => {
      const body = bodyRef.current;
      const bodyRect = body.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const target = body.scrollTop + (nextRect.top - bodyRect.top) - 8;
      body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 200);
  };

  const handleToggle = (optId) => {
    const wasSize = selected.size;
    onToggle(optId);
    if (!selected.has(optId) && wasSize + 1 === step.max) scrollToNext();
  };

  return (
    <div className="pm-step" ref={wrapRef}>
      <div className="pm-step-header">
        <div>
          <div className="pm-step-title">{step.title}</div>
          <div className="pm-step-subtitle">{step.subtitle || ''}</div>
        </div>
        <span className="pm-required-badge">Obrigatório</span>
      </div>
      {step.options.map(opt => (
        <div key={opt.id} className="pm-option" onClick={() => handleToggle(opt.id)}>
          <div className="pm-option-img">
            {opt.img ? <img src={opt.img} alt="" loading="lazy" /> : '🍕'}
          </div>
          <div className="pm-option-info">
            <div className="pm-option-name">{opt.name}</div>
            {opt.desc && <div className="pm-option-desc">{opt.desc}</div>}
            {opt.price && <div className="pm-option-price">{fmtPrice(opt.price)}</div>}
          </div>
          <div className={'pm-checkbox' + (selected.has(opt.id) ? ' checked' : '')} />
        </div>
      ))}
    </div>
  );
}

function GroupStep({ group, qtys, onInc, onDec, bodyRef, isLast }) {
  const required = group.required || 0;
  const total = Object.values(qtys).reduce((s, q) => s + q, 0);
  const atLimit = required > 0 && total >= required;
  const wrapRef = useRef(null);

  const scrollToNext = () => {
    if (isLast || !wrapRef.current || !bodyRef.current) return;
    const next = wrapRef.current.nextElementSibling;
    if (!next) return;
    setTimeout(() => {
      const body = bodyRef.current;
      const bodyRect = body.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const target = body.scrollTop + (nextRect.top - bodyRect.top) - 8;
      body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 200);
  };

  const handleInc = (optId) => {
    if (atLimit) return;
    onInc(optId);
    if (required > 0 && total + 1 === required) scrollToNext();
  };

  return (
    <div className="pm-step" ref={wrapRef}>
      <div className="pm-step-header">
        <div>
          <div className="pm-step-title">{group.title || 'Opções'}</div>
          <div className="pm-step-subtitle">{group.subtitle || (required > 0 ? `Escolha ${required}` : 'Escolha quantas quiser')}</div>
        </div>
        <span className={required ? 'pm-required-badge' : 'pm-optional-badge'}>
          {required ? 'Obrigatório' : 'Opcional'}
        </span>
      </div>
      {(group.options || []).map(opt => (
        <div key={opt.id} className="pm-option">
          <div className="pm-option-img">
            {opt.img ? <img src={opt.img} alt="" loading="lazy" /> : <span style={{fontSize:20}}>📦</span>}
          </div>
          <div className="pm-option-info">
            <div className="pm-option-name">{opt.name}</div>
            {(opt.description || opt.desc) && <div className="pm-option-desc">{opt.description || opt.desc}</div>}
          </div>
          <div className="pm-option-controls">
            <button className="pm-qty-btn" disabled={(qtys[opt.id] || 0) === 0} onClick={() => onDec(opt.id)}>−</button>
            <span className="pm-qty-num">{qtys[opt.id] || 0}</span>
            <button className="pm-qty-btn" disabled={atLimit} onClick={() => handleInc(opt.id)}>+</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesStep({ value, onChange }) {
  return (
    <div className="pm-step">
      <div className="pm-step-header">
        <div>
          <div className="pm-step-title">Observações</div>
          <div className="pm-step-subtitle">Alguma instrução especial?</div>
        </div>
        <span className="pm-optional-badge">Opcional</span>
      </div>
      <div className="pm-notes-wrap">
        <textarea
          className="pm-notes-textarea"
          placeholder="Ex.: Tirar cebola, sem orégano, etc."
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function ProductModal({ item, onClose, onAddToCart, onInc, onDec, getCartEntry, onAdvanceToCart, lastAddedKeyRef }) {
  const [qtys, setQtys]             = useState({});
  const [halves, setHalves]         = useState(new Set());
  const [notes, setNotes]           = useState('');
  const [footerState, setFooterState] = useState('selecting');
  const [addedQty, setAddedQty]     = useState(1);
  // groupQtys: { [groupId]: { [optionId]: qty } }
  const [groupQtys, setGroupQtys] = useState({});
  const bodyRef = useRef(null);

  const open = !!item;

  useEffect(() => {
    if (item) {
      const steps = resolveSteps(item.steps);
      const initQtys = {};
      steps.forEach((step, idx) => {
        if (step.type === 'flavors' || step.type === 'beverage') initQtys[idx] = {};
      });
      setQtys(initQtys);
      setHalves(new Set());
      setNotes('');
      setFooterState('selecting');
      setAddedQty(1);
      setGroupQtys({});
    }
  }, [item]);

  if (!item) {
    return (
      <div className="modal-overlay">
        <div className="modal-card product-modal-card" />
      </div>
    );
  }

  const steps = resolveSteps(item.steps);
  const halvesStep = steps.find(s => s.type === 'pizza-halves') || null;

  const handleQtyChange = (stepIdx, optId, newQty) => {
    setQtys(prev => ({ ...prev, [stepIdx]: { ...prev[stepIdx], [optId]: newQty } }));
  };

  const handleHalvesToggle = (optId) => {
    setHalves(prev => {
      const next = new Set(prev);
      if (next.has(optId)) {
        next.delete(optId);
      } else if (next.size < halvesStep.max) {
        next.add(optId);
      }
      return next;
    });
  };

  // Normalize subproducts: support both grouped format ({ __type: 'group' }) and legacy flat format
  const groups = (() => {
    const raw = item?.subproducts || [];
    if (!raw.length) return [];
    if (raw[0]?.__type === 'group') return raw;
    // Legacy flat format: wrap into a single group
    return [{ id: '__flat__', __type: 'group', title: 'Opções', subtitle: item.subproduct_limit > 0 ? `Escolha até ${item.subproduct_limit}` : 'Escolha quantas quiser', required: item.subproduct_limit || 0, options: raw }];
  })();

  const checkValid = () => {
    // Validate static steps
    const stepsValid = steps.every((step, idx) => {
      if (step.type === 'flavors' || step.type === 'beverage') {
        if (!step.required) return true;
        return Object.values(qtys[idx] || {}).reduce((s, q) => s + q, 0) >= step.required;
      }
      if (step.type === 'pizza-halves') return halves.size >= (step.min || 1);
      return true;
    });
    // Validate required groups
    const groupsValid = groups.every(g => {
      if (!g.required) return true;
      const total = Object.values(groupQtys[g.id] || {}).reduce((s, q) => s + q, 0);
      return total >= g.required;
    });
    return stepsValid && groupsValid;
  };

  const getPrice = () => {
    if (halvesStep && halves.size > 0) {
      return Math.max(...halvesStep.options.filter(o => halves.has(o.id)).map(o => o.price || item.price));
    }
    return item.price;
  };

  const buildCartNote = () => {
    const parts = [];
    steps.forEach((step, idx) => {
      if (step.type === 'flavors' || step.type === 'beverage') {
        const chosen = [];
        Object.entries(qtys[idx] || {}).forEach(([oid, qty]) => {
          if (qty > 0) {
            const opt = step.options.find(o => o.id === oid);
            if (opt) chosen.push(qty > 1 ? `${qty}x ${opt.name}` : opt.name);
          }
        });
        if (chosen.length) parts.push(chosen.join(', '));
      } else if (step.type === 'pizza-halves') {
        const chosen = step.options.filter(o => halves.has(o.id)).map(o => o.name);
        if (chosen.length) parts.push(chosen.join(' + '));
      }
    });
    // Groups (dynamic steps)
    groups.forEach(g => {
      const gQtys = groupQtys[g.id] || {};
      const chosen = (g.options || [])
        .filter(opt => (gQtys[opt.id] || 0) > 0)
        .map(opt => gQtys[opt.id] > 1 ? `${gQtys[opt.id]}x ${opt.name}` : opt.name);
      if (chosen.length) parts.push(chosen.join(', '));
    });
    if (notes.trim()) parts.push(`Obs: ${notes.trim()}`);
    return parts.join(' | ');
  };

  const handleAdd = () => {
    if (!checkValid()) return;
    onAddToCart(item, buildCartNote(), getPrice());
    setFooterState('added');
    setAddedQty(1);
  };

  const handleQtyDec = () => {
    const key = lastAddedKeyRef.current;
    if (!key) return;
    const entry = getCartEntry(key);
    if (!entry) { setAddedQty(0); return; }
    onDec(key);
    setAddedQty(q => Math.max(0, q - 1));
  };

  const handleQtyInc = () => {
    const key = lastAddedKeyRef.current;
    if (!key || !getCartEntry(key)) return;
    onInc(key);
    setAddedQty(q => q + 1);
  };

  const valid = checkValid();
  const price = getPrice();

  return (
    <div className={'modal-overlay' + (open ? ' open' : '')}>
      <div className="modal-card product-modal-card">
        <button className="pm-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Voltar
        </button>

        <div className="pm-header">
          <div className="pm-header-img">
            {item.img ? <img src={item.img} alt="" loading="lazy" /> : <span>🍕</span>}
          </div>
          <div className="pm-header-info">
            <div className="pm-header-name">{item.name}</div>
            {item.desc && <div className="pm-header-desc">{item.desc}</div>}
            <div className="pm-header-price">{fmtPrice(price)}</div>
          </div>
        </div>

        <div className="pm-body" ref={bodyRef}>
          {/* Dynamic groups (configured per product) */}
          {groups.map((g, gi) => (
            <GroupStep
              key={g.id}
              group={g}
              qtys={groupQtys[g.id] || {}}
              onInc={optId => setGroupQtys(prev => ({ ...prev, [g.id]: { ...(prev[g.id] || {}), [optId]: ((prev[g.id] || {})[optId] || 0) + 1 } }))}
              onDec={optId => setGroupQtys(prev => ({ ...prev, [g.id]: { ...(prev[g.id] || {}), [optId]: Math.max(0, ((prev[g.id] || {})[optId] || 0) - 1) } }))}
              bodyRef={bodyRef}
              isLast={gi === groups.length - 1 && steps.every(s => s.type === 'notes')}
            />
          ))}
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            if (step.type === 'flavors' || step.type === 'beverage') {
              return (
                <QtyStep
                  key={idx}
                  step={step}
                  stepIdx={idx}
                  qtys={qtys[idx] || {}}
                  onQtyChange={handleQtyChange}
                  bodyRef={bodyRef}
                  isLast={isLast}
                />
              );
            }
            if (step.type === 'pizza-halves') {
              return (
                <HalvesStep
                  key={idx}
                  step={step}
                  selected={halves}
                  onToggle={handleHalvesToggle}
                  bodyRef={bodyRef}
                  isLast={isLast}
                />
              );
            }
            if (step.type === 'notes') {
              return <NotesStep key={idx} value={notes} onChange={setNotes} />;
            }
            return null;
          })}
        </div>

        {footerState === 'selecting' ? (
          <div className="pm-footer">
            <button className="pm-add-btn" disabled={!valid} onClick={handleAdd}>
              {valid ? `Adicionar • ${fmtPrice(price)}` : 'Adicionar'}
            </button>
          </div>
        ) : (
          <div className="pm-footer pm-footer-added">
            <div className="pm-added-qty-row">
              <button className="pm-added-qty-btn" onClick={handleQtyDec}>−</button>
              <span className="pm-added-qty-num">{addedQty}</span>
              <button className="pm-added-qty-btn" onClick={handleQtyInc}>+</button>
            </div>
            <div className="pm-added-action-btns">
              <button className="pm-continue-btn" onClick={onClose}>Continuar Comprando</button>
              <button className="pm-advance-btn" onClick={onAdvanceToCart}>Avançar para o Carrinho</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
