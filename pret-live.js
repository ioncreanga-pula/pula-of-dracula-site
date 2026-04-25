(function() {
  var _c = { t: 0, p: 2.368e-6, ron: 4.35, eur: 0.87, bwp: 13.41, sol: 0 };
  var DEX = 'https://api.dexscreener.com/latest/dex/tokens/B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump';
  var ER  = 'https://open.er-api.com/v6/latest/USD';
  function apply() {
    window.pulaPriceUsd = _c.p;
    window.pulaPriceSol = _c.sol;
    window.ratesRon     = _c.ron;
    window.ratesEur     = _c.eur;
    window.ratesBwp     = _c.bwp;
    document.dispatchEvent(new CustomEvent('pulaReady'));
  }
  function go() {
    var now = Date.now();
    if (now - _c.t < 30000) { apply(); return; }
    Promise.all([
      fetch(DEX).then(function(r){return r.json();}),
      fetch(ER).then(function(r){return r.json();})
    ]).then(function(res) {
      var pair = res[0] && res[0].pairs && res[0].pairs[0];
      if (pair && pair.priceUsd) _c.p = parseFloat(pair.priceUsd) || 2.368e-6;
      if (pair && pair.priceNative) _c.sol = parseFloat(pair.priceNative) * 1e6;
      var er = res[1];
      if (er && er.rates) {
        _c.ron = er.rates.RON || 4.35;
        _c.eur = er.rates.EUR || 0.87;
        _c.bwp = er.rates.BWP || 13.41;
      }
      _c.t = Date.now();
      apply();
    }).catch(apply);
  }
  go();
  setInterval(go, 30000);
})();
