// qr-styled.js - QR stilizat + redesign modal Ia + animație trimitere + UI unități
(function () {
  'use strict';

  // ─── CSS ────────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    /* Modal Ia: ascunde luna, IA PULA, V */
    '.qr-moon-corner { display: none !important; }',
    '.qr-instruction-text { display: none !important; }',
    /* Modal Ia: fundal negru, username orizontal jos */
    '.qr-white-container { background: #000 !important; border: 1px solid #333 !important; }',
    '.qr-container-row-minimal { flex-direction: column !important; align-items: center !important; gap: 8px !important; }',
    '.vertical-username-text { writing-mode: horizontal-tb !important; text-orientation: mixed !important; transform: none !important; color: #fff !important; font-size: 1rem !important; height: auto !important; padding: 0 !important; justify-content: center !important; width: 100% !important; text-align: center !important; }',
    '.receive-title { color: #fff !important; }',
    '.address-sol-label { color: #aaa !important; }',

    /* Simbolul ♂ și luna fixed */
    '#pula-symbol { position:fixed; bottom:24px; left:24px; width:80px; height:80px; object-fit:contain; z-index:9000; pointer-events:none; transform-origin:center center; }',
    '#pula-moon { position:fixed; top:16px; right:16px; width:120px; height:120px; object-fit:contain; z-index:8999; pointer-events:none; }',

    /* Rândul de unități */
    '#pula-unit-row { display:flex; gap:6px; align-items:center; margin-top:6px; }',
    '#pula-display-input { flex:1; min-width:0; background:#0d0d1a; color:#fff; border:1px solid #555; border-radius:8px; padding:9px 12px; font-size:1rem; outline:none; -moz-appearance:textfield; }',
    '#pula-display-input::-webkit-outer-spin-button, #pula-display-input::-webkit-inner-spin-button { -webkit-appearance:none; }',
    '.pula-unit-select { background:#0d0d1a; color:#fff; border:1px solid #555; border-radius:8px; padding:9px 8px; font-size:0.85rem; cursor:pointer; flex-shrink:0; outline:none; }',
    '.pula-unit-select option { background:#0d0d1a; }',

    /* Panoul info live */
    '#transfer-info-panel { background:#0a0a16; border:1px solid #2a2a3e; border-radius:8px; padding:9px 12px; margin-top:6px; font-size:0.78rem; color:#aaa; line-height:2; }',
    '#transfer-info-panel strong { color:#fff; }',
    '#transfer-info-panel .info-warn { color:#e53935; }',
    '#transfer-info-panel .info-ok { color:#27ae60; }',
  ].join('\n');
  document.head.appendChild(style);

  // ─── Unități ────────────────────────────────────────────────────────────────
  var UNITS = [
    { name: 'Căruță',  symbol: '⊕', mult: 1e6   },
    { name: 'Legătură', symbol: '⋈', mult: 1e3   },
    { name: 'P.U.L.A.',symbol: '♂', mult: 1     },
    { name: 'Stropi',   symbol: '○', mult: 1e-3  },
    { name: 'Nimic',   symbol: '∅', mult: 1e-6  },
  ];
  var FX = { RON: 4.65, USD: 1, EUR: 0.92, BWP: 13.75 };
  var BASE_GAS_SOL = 0.000005;

  // Stare persistentă între re-render-uri React
  var tState = { displayVal: '', unitIdx: 0 };
  var solPriceUSD = 150; // fallback

  // Preia prețul SOL o singură dată
  fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT')
    .then(function (r) { return r.json(); })
    .then(function (d) { solPriceUSD = parseFloat(d.price) || 150; })
    .catch(function () {});

  // ─── Utilități DOM / prețuri ────────────────────────────────────────────────
  function parseRoNum(s) {
    // "1.234,56" → 1234.56 ; "10,79" → 10.79
    return parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0;
  }

  function getPricePerPula() {
    // price-hambary = "1 Căruță = X,XX CUR"  → preț per 1 PULA în CUR
    var el = document.querySelector('.price-hambary');
    if (!el) return { p: 0, cur: 'RON' };
    var m = (el.textContent || '').match(/([\d.,]+)\s*(RON|USD|EUR|BWP)/);
    if (!m) return { p: 0, cur: 'RON' };
    return { p: parseRoNum(m[1]) / 1e6, cur: m[2] };
  }

  function getSolBalance() {
    // ".sol-info" = "+0,0034 SOL (gaz)"
    var el = document.querySelector('.sol-info');
    if (!el) return 0;
    var m = (el.textContent || '').match(/([\d,.]+)/);
    return m ? parseRoNum(m[1]) : 0;
  }

  function getDisplayCur() {
    var el = document.querySelector('.val-box.active .val-symbol');
    return el ? el.textContent.trim() : 'RON';
  }

  function fmtNum(n, dec, cur) {
    var loc = cur === 'RON' ? 'ro-RO' : 'en-US';
    return n.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  // Forțează update pe input React (controlled component)
  function setReactInputVal(input, val) {
    var desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (desc && desc.set) {
      desc.set.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ─── Panoul info live ────────────────────────────────────────────────────────
  function renderInfoPanel() {
    var panel = document.getElementById('transfer-info-panel');
    if (!panel) return;

    var n = parseFloat(tState.displayVal);
    if (!n || n <= 0) { panel.innerHTML = ''; return; }

    var pula = n * UNITS[tState.unitIdx].mult;
    var pp = getPricePerPula();
    var cur = getDisplayCur();
    var solBal = getSolBalance();

    // Conversia prețului în moneda afișată
    var priceInCur = pp.p;
    if (pp.cur !== cur) {
      priceInCur = (pp.p / FX[pp.cur]) * FX[cur];
    }
    var valTotal = pula * priceInCur;

    // Gaz
    var gasFiat = BASE_GAS_SOL * solPriceUSD * FX[cur];
    var gasRON  = BASE_GAS_SOL * solPriceUSD * FX['RON'];
    var gasOK = solBal >= BASE_GAS_SOL;

    // Subdiviziuni: fracția din PULA exprimată în Stropi și Nimic
    var stropiPart = Math.floor(Math.abs(pula * 1000)) % 1000;
    var nimicPart  = Math.floor(Math.abs(pula * 1e6))  % 1000;
    var subdivRows =
      (stropiPart > 0 ? '<div>○ <strong>' + stropiPart + '</strong> Stropi</div>' : '') +
      (nimicPart  > 0 ? '<div>∅ <strong>' + nimicPart  + '</strong> Nimic</div>'  : '');

    var solClass = gasOK ? 'info-ok' : 'info-warn';
    var solWarn  = gasOK ? '' : ' ⚠ INSUFICIENT';

    panel.innerHTML =
      '<div>⊕ Valoare: <strong>' + fmtNum(pula, 0, cur) + ' PULA</strong>' +
        ' ≈ <strong>' + fmtNum(valTotal, 4, cur) + ' ' + cur + '</strong></div>' +
      subdivRows +
      '<div>⛽ Gaz: <strong>' + BASE_GAS_SOL.toFixed(6) + ' SOL</strong>' +
        ' ≈ <strong>' + fmtNum(gasFiat, 4, cur) + ' ' + cur + '</strong>' +
        ' <span style="color:#555;font-size:.72rem">(+0.002 SOL dacă cont nou)</span></div>' +
      '<div style="padding-left:1.3em;color:#888">≈ <strong style="color:#aaa">' + fmtNum(gasRON, 4, 'RON') + ' RON</strong></div>' +
      '<div class="' + solClass + '">◈ SOL disponibil: <strong>' +
        solBal.toFixed(4) + ' SOL</strong>' + solWarn + '</div>';
  }

  // ─── Injectare UI unități în modal Dă ───────────────────────────────────────
  var injectingTransfer = false;

  function injectTransferUI(transferBox) {
    if (injectingTransfer) return;
    var wrapper = transferBox.querySelector('.transfer-input-wrapper');
    if (!wrapper) return;

    var amtRow = wrapper.querySelector('.transfer-amt-row');
    if (!amtRow) return;

    var realInput = amtRow.querySelector('input[type="number"]');
    if (!realInput) return;

    // Deja injectat
    if (document.getElementById('pula-unit-row')) return;

    injectingTransfer = true;

    // Ascunde inputul original (React îl mai gestionează)
    realInput.style.display = 'none';

    // ── Rândul meu de unități ──
    var unitRow = document.createElement('div');
    unitRow.id = 'pula-unit-row';

    var myInput = document.createElement('input');
    myInput.id = 'pula-display-input';
    myInput.type = 'number';
    myInput.min = '0';
    myInput.step = 'any';
    myInput.placeholder = 'Câte?';
    myInput.value = tState.displayVal;

    var mySelect = document.createElement('select');
    mySelect.className = 'pula-unit-select';
    UNITS.forEach(function (u, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = u.symbol + ' ' + u.name;
      if (i === tState.unitIdx) opt.selected = true;
      mySelect.appendChild(opt);
    });

    unitRow.appendChild(myInput);
    unitRow.appendChild(mySelect);

    // ── Panoul info ──
    var infoPanel = document.createElement('div');
    infoPanel.id = 'transfer-info-panel';

    // Inserăm DUPĂ transfer-amt-row (sibling în wrapper, nu child în amtRow)
    amtRow.insertAdjacentElement('afterend', infoPanel);
    amtRow.insertAdjacentElement('afterend', unitRow);
    // Ord. final: amtRow → unitRow → infoPanel

    function sync() {
      tState.displayVal = myInput.value;
      tState.unitIdx = parseInt(mySelect.value);
      var n = parseFloat(myInput.value);
      var pula = (isNaN(n) || n < 0) ? 0 : n * UNITS[tState.unitIdx].mult;
      setReactInputVal(realInput, pula > 0 ? String(pula) : '');
      setTimeout(renderInfoPanel, 0);
    }

    myInput.addEventListener('input', sync);
    mySelect.addEventListener('change', sync);

    // Reafișează panoul dacă există deja o valoare
    if (tState.displayVal) {
      sync();
    } else {
      renderInfoPanel();
    }

    injectingTransfer = false;
  }

  // ─── QR Stilizat (opțiuni din options(1).json) ───────────────────────────────
  var QR_OPTIONS = {
    width: 288, height: 288, margin: 2,
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
    imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: 0.4, margin: 4, crossOrigin: 'anonymous' },
    dotsOptions: {
      type: 'dots', color: '#ffffff', roundSize: true,
      gradient: { type: 'radial', rotation: 0.06981317007977318,
        colorStops: [{ offset: 0, color: '#f6f5f4' }, { offset: 1, color: '#99c1f1' }] }
    },
    backgroundOptions: { round: 0, color: '#000000', gradient: null },
    cornersSquareOptions: {
      type: 'dot', color: '#ffff00',
      gradient: { type: 'radial', rotation: 0,
        colorStops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffff00' }] }
    },
    cornersDotOptions: {
      type: 'dot', color: '#ffff00',
      gradient: { type: 'radial', rotation: 0,
        colorStops: [{ offset: 0, color: '#f5c211' }, { offset: 1, color: '#ffff00' }] }
    },
    image: './qr-logo.png'
  };

  function injectStyledQR(imgEl, address) {
    if (!imgEl || !address || !window.QRCodeStyling) return;
    if (imgEl.dataset.styledQrDone === '1') return;
    imgEl.dataset.styledQrDone = '1';

    var qrCode = new window.QRCodeStyling(Object.assign({}, QR_OPTIONS, { data: address }));
    var ph = document.createElement('div');
    ph.style.cssText = 'display:block;width:288px;height:288px;border-radius:8px;overflow:hidden;margin:0 auto;';
    imgEl.parentNode.replaceChild(ph, imgEl);
    qrCode.append(ph);
    var canvas = ph.querySelector('canvas');
    if (canvas) canvas.style.cssText = 'display:block;width:288px;height:288px;border-radius:8px;';
  }

  function tryInjectQR() {
    var img = document.querySelector('.qr-img[src*="qrserver.com"]');
    if (!img || typeof window.QRCodeStyling === 'undefined') return false;
    var m = (img.getAttribute('src') || '').match(/[?&]data=([A-Za-z0-9]+)/);
    if (m && m[1]) { injectStyledQR(img, m[1]); return true; }
    return false;
  }

  // ─── Animație trimitere ──────────────────────────────────────────────────────
  var sendAnimRunning = false;

  function createOverlayElements() {
    if (document.getElementById('pula-symbol')) return;
    var sym = document.createElement('img');
    sym.id = 'pula-symbol'; sym.src = './symbol-mars.png'; sym.alt = '♂';
    document.body.appendChild(sym);
    var moon = document.createElement('img');
    moon.id = 'pula-moon'; moon.src = './luna.png'; moon.alt = 'luna';
    document.body.appendChild(moon);
  }

  function removeOverlayElements() {
    var s = document.getElementById('pula-symbol');
    var m = document.getElementById('pula-moon');
    if (s) s.remove(); if (m) m.remove();
    sendAnimRunning = false;
  }

  function launchSendAnimation() {
    if (sendAnimRunning) return;
    sendAnimRunning = true;
    var sym = document.getElementById('pula-symbol');
    var moon = document.getElementById('pula-moon');
    if (!sym || !moon) return;

    var sr = sym.getBoundingClientRect();
    var mr = moon.getBoundingClientRect();
    var sx = sr.left + sr.width / 2, sy = sr.top + sr.height / 2;
    var ex = mr.left + mr.width * 0.18, ey = mr.top + mr.height * 0.78;

    sym.style.position = 'fixed'; sym.style.bottom = 'auto';
    sym.style.left = (sx - sr.width / 2) + 'px';
    sym.style.top  = (sy - sr.height / 2) + 'px';

    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / 3000, 1);
      var e = t * t * t; // ease-in cubic
      sym.style.left = (sx + (ex - sx) * e - sr.width / 2) + 'px';
      sym.style.top  = (sy + (ey - sy) * e - sr.height / 2) + 'px';
      sym.style.transform = 'scale(' + Math.max(1 - t * 0.97, 0.03) + ')';
      sym.style.opacity = t > 0.75 ? String(1 - (t - 0.75) / 0.25) : '1';
      if (t < 1) { requestAnimationFrame(step); }
      else { sym.style.display = 'none'; setTimeout(removeOverlayElements, 2000); }
    }
    requestAnimationFrame(step);
  }

  // ─── MutationObserver central ────────────────────────────────────────────────
  var sendBtnWired = false;

  function checkDOM() {
    // 1) QR primire stilizat
    tryInjectQR();

    // 2) Animație: reader-frozen → arată simbol + lună
    if (document.querySelector('.reader-frozen') && !document.getElementById('pula-symbol')) {
      createOverlayElements();
    }

    // 3) UI unități în modalul Dă
    var transferBox = document.querySelector('.transfer-box');
    if (transferBox) {
      injectTransferUI(transferBox);

      // Butonul Dă – legăm o singură dată
      if (!sendBtnWired) {
        var btn = transferBox.querySelector('.transfer-btn');
        if (btn) {
          sendBtnWired = true;
          btn.addEventListener('click', function () {
            if (!btn.disabled && btn.textContent.trim() !== '...') launchSendAnimation();
          });
        }
      }

      // Re-injectăm elementele noastre dacă React le-a șters
      if (!document.getElementById('pula-unit-row')) {
        injectingTransfer = false; // reset flag pentru re-injectare
        injectTransferUI(transferBox);
      }
    } else {
      sendBtnWired = false;
      if (!sendAnimRunning) removeOverlayElements();
      // Reset stare la închiderea modalului
      tState.displayVal = '';
    }
  }

  var observer = new MutationObserver(checkDOM);
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDOM);
  } else {
    checkDOM();
  }
})();
