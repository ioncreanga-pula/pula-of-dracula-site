(function () {
  var root = document.documentElement;
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  /* ---------- Comutator de temă ---------- */
  var themeBtn = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    var forced = root.getAttribute('data-theme');
    if (forced === 'dark' || forced === 'light') return forced;
    return systemDark.matches ? 'dark' : 'light';
  }

  function syncThemeBtn() {
    if (themeBtn) themeBtn.setAttribute('aria-pressed', currentTheme() === 'dark' ? 'true' : 'false');
  }

  if (themeBtn) {
    themeBtn.hidden = false;
    syncThemeBtn();
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fagus-theme', next); } catch (e) { /* fără stocare: ține doar pe pagina curentă */ }
      syncThemeBtn();
    });
    systemDark.addEventListener('change', syncThemeBtn);
  }

  /* ---------- Meniul de pe mobil ---------- */
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var menu = menuBtn && document.getElementById(menuBtn.getAttribute('aria-controls'));

  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('is-open', open);
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- Preselectarea din „Ce te interesează” ---------- */
  /* Butoanele cu data-interes (și linkurile cu ?interes=...) aleg opțiunea potrivită din formular.
     Fără JavaScript, linkul duce oricum la formular. */
  var interest = document.getElementById('f-interes');

  function selectInterest(key) {
    if (!interest || !key) return;
    for (var i = 0; i < interest.options.length; i++) {
      if (interest.options[i].getAttribute('data-interes') === key) {
        interest.selectedIndex = i;
        return;
      }
    }
  }

  if (interest) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-interes]');
      if (link) selectInterest(link.getAttribute('data-interes'));
    });
    try {
      selectInterest(new URLSearchParams(window.location.search).get('interes'));
    } catch (e) { /* browser foarte vechi: rămâne opțiunea implicită */ }
  }
})();
