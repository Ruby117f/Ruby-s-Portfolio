/* Keep an image failure recoverable without continuously retrying requests. */
(() => {
  function recover(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const fallback = matchMedia('(max-width: 700px)').matches && img.dataset.mobileFallback || img.dataset.fallback;
    if (fallback && img.dataset.fallbackUsed !== fallback) {
      img.dataset.fallbackUsed = fallback;
      img.removeAttribute('srcset');
      img.closest('picture')?.querySelectorAll('source').forEach(source => source.removeAttribute('srcset'));
      img.src = fallback;
      return;
    }
    const figure = img.closest('.gallery figure');
    if (!figure || figure.querySelector('.media-retry')) return;
    const retry = document.createElement('button');
    retry.className = 'media-retry';
    retry.textContent = '图片暂未加载，点击重试';
    retry.type = 'button';
    retry.onclick = () => {
      retry.remove();
      const url = new URL(img.currentSrc || img.src, location.href);
      url.searchParams.set('retry', Date.now());
      img.removeAttribute('srcset');
      img.src = url.href;
    };
    figure.append(retry);
  }
  document.addEventListener('error', event => recover(event.target), true);
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) event.target.closest('.gallery figure')?.querySelector('.media-retry')?.remove();
  }, true);
  // Deferred scripts can run after a cached image has already failed.
  document.querySelectorAll('img[src]').forEach(img => {
    if (img.complete && !img.naturalWidth) recover(img);
  });
})();
