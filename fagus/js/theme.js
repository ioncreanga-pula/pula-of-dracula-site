/* Rulează în <head>, înainte de afișare: aplică tema salvată ca să nu clipească pagina. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var saved = localStorage.getItem('fagus-theme');
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  } catch (e) { /* localStorage indisponibil: rămâne tema sistemului */ }
})();
