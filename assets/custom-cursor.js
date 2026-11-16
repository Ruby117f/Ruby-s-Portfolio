/* System pointer with a following ring. No framework or external dependencies. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `
    .ruby-cursor{position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:visible}
    .ruby-cursor-ring{position:absolute;left:0;top:0;box-sizing:border-box;pointer-events:none;will-change:transform;opacity:0}
    .ruby-cursor-ring{border:1px solid rgba(255,255,255,.85);border-radius:50%;width:27.2px;height:27.2px;transition:width .22s ease,height .22s ease,border-radius .22s ease,opacity .15s ease;background:rgba(255,255,255,.025)}
    .ruby-cursor::backdrop{background:transparent;pointer-events:none}
    html:has(dialog[open]),html:has(dialog[open]) *{cursor:auto!important}
    html:has(dialog[open]) button,html:has(dialog[open]) button *,html:has(dialog[open]) a{cursor:pointer!important}
    html:has(dialog[open]) .ruby-cursor{display:none!important}
    @media(hover:none),(pointer:coarse){.ruby-cursor{display:none!important}}
  `;
  document.head.append(style);
  const layer = document.createElement('div');
  layer.className = 'ruby-cursor'; layer.setAttribute('aria-hidden', 'true');
  const ring = document.createElement('div');
  ring.className = 'ruby-cursor-ring';
  layer.append(ring);
  // A manual popover keeps the cursor above native modal dialogs, without taking focus.
  if ('showPopover' in layer) layer.setAttribute('popover', 'manual');
  document.body.append(layer);
  layer.style.cssText = 'margin:0;padding:0;border:0;background:transparent;width:100vw;height:100vh;max-width:none;max-height:none;';
  let x = 0, y = 0, rx = 0, ry = 0, visible = false, frame = 0, last = 0, target = null;
  const selector = 'button:not(:disabled),nav a,.sidebar a,.pill,.cover-enter,[data-cursor-target]';
  function syncLayer() {
    // Modal dialogs make outside nodes inert and sit above existing popovers.
    // Host the same cursor inside the active dialog, then raise its popover.
    const dialogs = document.querySelectorAll('dialog:modal');
    const host = dialogs[dialogs.length - 1] || document.body;
    if (layer.parentElement !== host) {
      if (layer.hidePopover && layer.matches(':popover-open')) layer.hidePopover();
      host.append(layer);
      target = null;
    }
    if (visible && layer.showPopover && !layer.matches(':popover-open')) layer.showPopover();
  }
  new MutationObserver(syncLayer).observe(document.body, {
    subtree: true, attributes: true, attributeFilter: ['open']
  });
  function hide() {
    visible = false; target = null;
    document.documentElement.classList.remove('ruby-cursor-active');
    ring.style.opacity = '0';
    cancelAnimationFrame(frame); frame = 0; last = 0;
  }
  function tick(now) {
    if (!visible) return;
    const dt = Math.min(40, now - (last || now)); last = now;
    let w = 27.2, h = 27.2, radius = '50%', tx = x, ty = y;
    if (target && target.isConnected) {
      const b = target.getBoundingClientRect();
      const cs = getComputedStyle(target);
      w = b.width + 8; h = b.height + 8;
      tx = b.left + b.width / 2; ty = b.top + b.height / 2;
      radius = Math.max(8, parseFloat(cs.borderRadius) || 0) + 'px';
      if (cs.borderRadius.includes('%')) radius = cs.borderRadius;
    }
    const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 68.75);
    rx += (tx - rx) * ease; ry += (ty - ry) * ease;
    ring.style.width = w + 'px'; ring.style.height = h + 'px'; ring.style.borderRadius = radius;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    frame = requestAnimationFrame(tick);
  }
  document.addEventListener('pointermove', e => {
    if (document.querySelector('dialog[open]') || !fine.matches || e.pointerType !== 'mouse') { hide(); return; }
    x = e.clientX; y = e.clientY;
    target = e.target.closest(selector);
    if (!visible) {
      visible = true; rx = x; ry = y;
      syncLayer();
      document.documentElement.classList.add('ruby-cursor-active');
      ring.style.opacity = '1';
      frame = requestAnimationFrame(tick);
    }
  }, {passive:true});
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') hide(); }, {passive:true});
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  new MutationObserver(() => { if (document.querySelector('dialog[open]')) hide(); }).observe(document.body, {subtree:true, attributes:true, attributeFilter:['open']});
  fine.addEventListener('change', hide);
})();
