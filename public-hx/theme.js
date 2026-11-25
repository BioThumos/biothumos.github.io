/* Apply the saved theme before style/layout. CSS defaults to dark without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'patient-zero.theme.v1';
  const localFile = location.protocol === 'file:';
  const choiceFromURL = localFile && new URL(location.href).searchParams.get('theme');
  const valid = value => value === 'light' || value === 'dark';
  let saved = null;
  try { saved = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
  root.dataset.theme = valid(choiceFromURL) ? choiceFromURL : (valid(saved) ? saved : 'dark');

  // File URLs can have storage isolated to each individual page. Carry the preference
  // between local HTML pages and leave fragments, downloads, and external links alone.
  function pageURL(href) {
    if (!localFile) return href;
    const url = new URL(href, location.href);
    if (url.protocol !== 'file:' || !url.pathname.endsWith('.html')) return href;
    url.searchParams.set('theme', root.dataset.theme);
    return url.href;
  }
  window.pzTheme = {pageURL};

  function apply(theme) {
    root.dataset.theme = theme;
    const control = document.getElementById('theme-toggle');
    if (control) {
      const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      control.setAttribute('aria-label', label);
      control.title = label;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.getElementById('theme-toggle');
    if (!control) return;
    apply(root.dataset.theme);
    control.hidden = false;
    control.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(theme);
      try { localStorage.setItem(key, theme); } catch { /* The switch still works. */ }
      if (localFile) {
        try { history.replaceState(history.state, '', pageURL(location.href)); } catch { /* Optional for reload. */ }
      }
    });
  });
  if (localFile) {
    function decorateLink(event) {
      const link = event.target.closest && event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') || link.getAttribute('href').startsWith('#')) return;
      const themed = pageURL(link.href);
      if (link.href !== themed) link.href = themed;
    }
    for (const type of ['click', 'auxclick', 'contextmenu']) {
      document.addEventListener(type, decorateLink, true);
    }
  } else {
    window.addEventListener('storage', event => {
      if (event.key === key) apply(valid(event.newValue) ? event.newValue : 'dark');
    });
  }
})();
