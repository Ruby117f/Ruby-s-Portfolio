/* Card-to-detail reveal, with the homepage kept in place beneath the sheet. */
(() => {
  const messageType = 'ruby-project-sheet';
  const embedded = window.parent !== window && new URLSearchParams(location.search).has('sheet');
  if (embedded) {
    const send = (action, hash) => parent.postMessage({type:messageType, action, hash}, '*');
    document.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (link.matches('.back')) {
        event.preventDefault(); event.stopImmediatePropagation(); send('close');
      } else if (url.pathname.endsWith('/index.html')) {
        event.preventDefault(); event.stopImmediatePropagation(); send('home', url.hash);
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) send('close');
    });
    const ready = async () => {
      const cover = document.querySelector('main img');
      if (cover?.decode) await Promise.race([cover.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1500))]);
      requestAnimationFrame(() => send('ready'));
    };
    ready();
    return;
  }
  if (!document.querySelector('#work .project-link')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `
    .project-sheet{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#000;color:#fff;overflow:hidden;clip-path:inset(0 round 0);}
    .project-sheet::backdrop{background:transparent}
    .project-sheet iframe{display:block;width:100%;height:100%;border:0;background:#000}
    .project-sheet .sheet-status{position:absolute;inset:0;display:grid;place-content:center;background:#000;color:#aaa;font:14px MiSans,sans-serif}
    .project-sheet .sheet-status[hidden]{display:none}
    html.project-sheet-open{overflow:hidden}
  `;
  document.head.append(style);
  let current = null;
  const clip = link => {
    const box = (link.querySelector('.project-cover') || link).getBoundingClientRect();
    return `inset(${Math.max(0,box.top)}px ${Math.max(0,innerWidth-box.right)}px ${Math.max(0,innerHeight-box.bottom)}px ${Math.max(0,box.left)}px round 8px)`;
  };
  const full = 'inset(0px 0px 0px 0px round 0px)';
  function open(link, push = true) {
    if (current) return;
    const url = new URL(link.href);
    if (!/\/project-[1-5]\.html$/.test(url.pathname)) return;
    const dialog = document.createElement('dialog');
    if (!dialog.showModal || !dialog.animate) return;
    dialog.className = 'project-sheet';
    dialog.setAttribute('aria-label', link.getAttribute('aria-label') || '项目详情');
    const frame = document.createElement('iframe');
    frame.title = dialog.getAttribute('aria-label');
    const status = document.createElement('div');
    status.className = 'sheet-status'; status.setAttribute('role','status'); status.textContent = '正在加载项目…';
    dialog.append(frame,status); document.body.append(dialog);
    const record = current = {dialog,frame,link,status,closing:false,animation:null};
    const start = clip(link);
    document.documentElement.classList.add('project-sheet-open');
    dialog.showModal();
    if (push) {
      history.pushState({rubyProject:url.pathname.split('/').pop()}, '', '#project-' + url.pathname.match(/project-(\d)/)[1]);
    }
    dialog.addEventListener('cancel', event => {event.preventDefault();requestClose();});
    record.animation = dialog.animate([{clipPath:start},{clipPath:full}], {duration:reduced.matches?0:700,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    url.searchParams.set('sheet','1'); frame.src = url.href;
    // Loading failure always leaves a working way to the standalone detail page.
    record.timer = setTimeout(() => {
      if (current !== record || status.hidden) return;
      status.textContent = '';
      const fallback = document.createElement('a'); fallback.href = link.href; fallback.textContent = '直接打开项目详情';
      status.append(fallback);
    }, 10000);
  }
  async function close(hash) {
    const record = current;
    if (!record || record.closing) return;
    record.closing = true; clearTimeout(record.timer);
    const start = getComputedStyle(record.dialog).clipPath;
    record.animation.cancel();
    const animation = record.dialog.animate([
      {clipPath:start,opacity:1}, {clipPath:clip(record.link),opacity:0}
    ], {duration:reduced.matches?0:100,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    await animation.finished.catch(() => {});
    record.dialog.close(); record.dialog.remove(); current = null;
    document.documentElement.classList.remove('project-sheet-open');
    record.link.focus({preventScroll:true});
    if (hash && /^#[\w-]+$/.test(hash)) {
      history.replaceState(history.state,'',hash);
      document.querySelector(hash)?.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
    }
  }
  let pendingHash = '';
  function requestClose(hash = '') {
    if (!current || current.closing) return;
    pendingHash = hash;
    if (history.state?.rubyProject) history.back();
    else close(hash);
  }
  window.addEventListener('message', event => {
    if (!current || event.source !== current.frame.contentWindow || event.data?.type !== messageType) return;
    if (event.data.action === 'ready') {
      current.status.hidden = true; clearTimeout(current.timer);
      current.frame.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}], {duration:reduced.matches?0:600,easing:'ease-out'});
      current.frame.focus();
    } else if (event.data.action === 'close') requestClose();
    else if (event.data.action === 'home') requestClose(event.data.hash);
  });
  window.addEventListener('popstate', () => {
    if (current && !history.state?.rubyProject) {close(pendingHash);pendingHash='';}
    else if (!current && history.state?.rubyProject) {
      const link = [...document.querySelectorAll('#work .project-link')].find(a => new URL(a.href).pathname.endsWith('/'+history.state.rubyProject));
      if (link) open(link,false);
    }
  });
  // Restore a detail sheet when its URL is refreshed.
  const restored = location.hash.match(/^#project-([1-5])$/);
  if (restored) requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelector('#work').scrollIntoView({behavior:'instant'});
    const links = [...document.querySelectorAll('#work .project-link')];
    const link = links.find(a => a.closest('.selected') && new URL(a.href).pathname.endsWith('/project-'+restored[1]+'.html')) || links.find(a => new URL(a.href).pathname.endsWith('/project-'+restored[1]+'.html'));
    if (link) open(link,false);
  }));
  document.addEventListener('click', event => {
    const link = event.target.closest('#work .project-link');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    open(link);
    if (current) event.preventDefault();
  });
})();
