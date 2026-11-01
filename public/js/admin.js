(function () {
  'use strict';
  document.querySelectorAll('.js-autosubmit').forEach((el) => el.addEventListener('change', () => el.form.submit()));
  document.querySelectorAll('.reveal').forEach((el) =>
    el.addEventListener('click', () => { el.textContent = el.dataset.value; el.classList.remove('reveal'); })
  );
  // Photo check: flag images that fail to load.
  const counter = document.getElementById('broken-count');
  let broken = 0;
  document.querySelectorAll('.photo-grid img').forEach((img) => {
    const mark = () => { img.classList.add('broken'); img.closest('figure').querySelector('.state').textContent = '✖ Failed to load'; broken++; if (counter) counter.textContent = broken; };
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener('error', mark, { once: true });
  });
})();
