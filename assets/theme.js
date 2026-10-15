(() => {
  const key = 'mb-site-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try {preference = localStorage.getItem(key);} catch {}
  if (!['light','dark'].includes(preference)) preference = null;
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151c18' : '#f7f6f2');
    for (const button of document.querySelectorAll('.theme-toggle')) {
      const dark = theme === 'dark';
      button.setAttribute('aria-pressed',String(dark));
      button.setAttribute('aria-label',dark ? 'فعال‌کردن تم روشن' : 'فعال‌کردن تم تیره');
      button.title = dark ? 'تم روشن' : 'تم تیره';
      button.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
      button.querySelector('.theme-label').textContent = dark ? 'روشن' : 'تیره';
    }
  }
  apply(preference || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', () => {
    apply(document.documentElement.dataset.theme);
    for (const button of document.querySelectorAll('.theme-toggle')) button.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try {localStorage.setItem(key,preference);} catch {}
      apply(preference);
    });
  });
  system.addEventListener('change', () => {if (!preference) apply(system.matches ? 'dark' : 'light');});
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    preference = ['light','dark'].includes(event.newValue) ? event.newValue : null;
    apply(preference || (system.matches ? 'dark' : 'light'));
  });
})();
