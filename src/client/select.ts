(() => {
  const NS = 'cselect';
  function create(menu?: any, label?: string) {
    const wrap = document.createElement('div'); wrap.className = `${NS}`;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = `${NS}-btn`;
    btn.setAttribute('aria-haspopup','listbox'); btn.setAttribute('aria-expanded','false');
    btn.innerHTML = `<span class="${NS}-label"></span><span class="${NS}-chev">▾</span>`;
    const list = document.createElement('div'); list.className = `${NS}-menu`; list.setAttribute('role','listbox'); wrap.appendChild(btn); wrap.appendChild(list);
    return { wrap, btn, list };
  }
  function optionEl(text: string, value: string, selected?: boolean) {
    const el = document.createElement('div'); el.className = `${NS}-option`; el.setAttribute('role','option'); el.dataset.value = value; el.textContent = text;
    if (selected) { el.classList.add('is-selected'); el.setAttribute('aria-selected','true'); } else { el.setAttribute('aria-selected','false'); }
    return el;
  }
  function labelFor(select: HTMLSelectElement) { const opt = select.options[select.selectedIndex]; return opt ? opt.textContent : ''; }
  function closeAll(except?: Element) { document.querySelectorAll(`.${NS}.open`).forEach(w=>{ if (w!==except) w.classList.remove('open'); }); }
  function enhance(select: HTMLSelectElement) {
    if (!select || (select as any).dataset.cselect === '1') return;
    (select as any).dataset.cselect = '1'; select.classList.add('is-hidden-native');
    const { wrap, btn, list } = create(); select.parentNode?.insertBefore(wrap, select.nextSibling);
    let activeIndex = -1;
    function rebuild(){ const lab = wrap.querySelector(`.${NS}-label`); if (lab) lab.textContent = labelFor(select); list.innerHTML = ''; Array.from(select.options).forEach(opt => { const item = optionEl(opt.textContent||'', opt.value, opt.selected); list.appendChild(item); }); const opts = list.querySelectorAll(`.${NS}-option`); activeIndex = Array.from(opts).findIndex(o => o.classList.contains('is-selected')); }
    function setValue(val: string){ if (select.value === val) return; select.value = val; select.dispatchEvent(new Event('change', { bubbles: true })); rebuild(); }
    function setActiveByIndex(idx: number){ const items = list.querySelectorAll(`.${NS}-option`); if (!items.length) return; idx = Math.max(0, Math.min(items.length - 1, idx)); items.forEach(i => i.classList.remove('is-active')); items[idx].classList.add('is-active'); items[idx].scrollIntoView({ block: 'nearest' }); activeIndex = idx; }
    function openMenu(){ closeAll(wrap); wrap.classList.add('open'); btn.setAttribute('aria-expanded','true'); const items = list.querySelectorAll(`.${NS}-option`); const selIdx = Array.from(items).findIndex(i => i.classList.contains('is-selected')); setActiveByIndex(selIdx >= 0 ? selIdx : 0); }
    function closeMenu(){ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); list.querySelectorAll(`.${NS}-option.is-active`).forEach(i => i.classList.remove('is-active')); activeIndex = -1; }
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); if (wrap.classList.contains('open')) closeMenu(); else openMenu(); });
    list.addEventListener('click', (e)=>{ const opt = (e.target as HTMLElement).closest(`.${NS}-option`) as HTMLElement|null; if (!opt) return; setValue(opt.dataset.value || ''); closeMenu(); });
    list.addEventListener('pointerdown', (e)=>{ const opt = (e.target as HTMLElement).closest(`.${NS}-option`) as HTMLElement|null; if (!opt) return; list.querySelectorAll(`.${NS}-option.is-active`).forEach(i => i.classList.remove('is-active')); opt.classList.add('is-active'); });
    list.addEventListener('pointerup', ()=>{ list.querySelectorAll(`.${NS}-option.is-active`).forEach(i => i.classList.remove('is-active')); });
    btn.addEventListener('keydown', (e)=>{ const key = (e as KeyboardEvent).key; if (key === 'ArrowDown' || key === 'Enter' || key === ' ') { e.preventDefault(); openMenu(); } if (key === 'Escape') { e.preventDefault(); closeMenu(); } });
    list.addEventListener('keydown', (e)=>{ const key = (e as KeyboardEvent).key; const items = list.querySelectorAll(`.${NS}-option`); if (!items.length) return; if (key === 'ArrowDown') { e.preventDefault(); setActiveByIndex(activeIndex + 1); } else if (key === 'ArrowUp') { e.preventDefault(); setActiveByIndex(activeIndex - 1); } else if (key === 'Home') { e.preventDefault(); setActiveByIndex(0); } else if (key === 'End') { e.preventDefault(); setActiveByIndex(items.length - 1); } else if (key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) { setValue((items[activeIndex] as HTMLElement).dataset.value || ''); closeMenu(); } } else if (key === 'Escape') { e.preventDefault(); closeMenu(); } });
    document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target as Node)) closeMenu(); });
    const mo = new MutationObserver(()=> rebuild()); mo.observe(select, { childList: true, subtree: false, attributes: true, attributeFilter: ['disabled','label'] });
    select.addEventListener('change', rebuild);
    rebuild(); (select as any).__cselectWrapper = wrap as any; (wrap as any).__setValue = setValue; (wrap as any).__rebuild = rebuild;
  }
  function refresh(target: any) { const nodes = typeof target === 'string' ? Array.from(document.querySelectorAll(target)) : (target instanceof Node ? [target] : (Array.isArray(target) ? target : [])); nodes.forEach((el:any)=>{ if (el && el.tagName === 'SELECT') { if ((el as any).dataset.cselect === '1') { el.__cselectWrapper && el.__cselectWrapper.__rebuild && el.__cselectWrapper.__rebuild(); } else { enhance(el); } } }); }
  (window as any).SelectEnhancer = { enhance: (el: any) => enhance(el), refresh };
})();
