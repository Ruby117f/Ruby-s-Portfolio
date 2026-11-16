/* One copy action for profile, closing screen and contact dialog. */
(() => {
  const feedback = document.createElement('div');
  feedback.className = 'copy-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  document.body.append(feedback);
  let timer;
  async function copy(value, button) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Local file pages and denied Clipboard API access can use the native copy command.
      const area = document.createElement('textarea');
      area.value = value;
      area.readOnly = true;
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
      (button.closest('dialog[open]') || document.body).append(area);
      try {
        area.select();
        if (!document.execCommand('copy')) throw new Error('Copy failed');
      } finally {
        area.remove();
        button.focus({preventScroll:true});
      }
    }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-copy]');
    if (!button) return;
    const status = button.closest('dialog[open]')?.querySelector('#copyStatus') || feedback;
    clearTimeout(timer);
    document.querySelectorAll('#copyStatus,.copy-feedback').forEach(el => el.textContent = '');
    try {
      await copy(button.dataset.copy, button);
      status.textContent = button.dataset.copy.includes('@') ? '邮箱已复制' : '电话/微信已复制';
    } catch {
      status.textContent = '复制未成功，请选中文字手动复制';
    }
    timer = setTimeout(() => {status.textContent = '';}, 2200);
  });
})();
