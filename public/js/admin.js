(function () {
  'use strict';
  document.querySelectorAll('.js-autosubmit').forEach((el) => el.addEventListener('change', () => el.form.submit()));
  document.querySelectorAll('.reveal').forEach((el) =>
    el.addEventListener('click', () => { el.textContent = el.dataset.value; el.classList.remove('reveal'); })
  );
})();
