const search = document.getElementById('course-search');
if (search) {
  const cards = [...document.querySelectorAll('.assignment-card')];
  const normalize = value => value.normalize('NFKC').replaceAll('ي','ی').replaceAll('ك','ک').replaceAll('\u200c',' ').toLowerCase();
  search.addEventListener('input', () => {
    const query = normalize(search.value.trim());let visible = 0;
    for (const card of cards) {card.hidden = !normalize(card.textContent).includes(query);if (!card.hidden) visible++;}
    document.getElementById('search-count').textContent = new Intl.NumberFormat('fa-IR').format(visible) + ' مطلب';
    document.getElementById('no-results').hidden = visible > 0;
  });
}
for (const button of document.querySelectorAll('.copy-code')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.closest('.source-file').querySelector('code').textContent);
      button.textContent = 'کپی شد';setTimeout(() => button.textContent = 'کپی متن', 1800);
    } catch {button.textContent = 'متن را انتخاب و کپی کنید';}
  });
}
document.addEventListener('click', event => {
  for (const menu of document.querySelectorAll('.course-menu[open]')) if (!menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') for (const menu of document.querySelectorAll('.course-menu[open]')) {menu.open = false;menu.querySelector('summary').focus();}
});
