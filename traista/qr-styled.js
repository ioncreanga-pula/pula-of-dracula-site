// qr-styled.js - QR stilizat + redesign modal Ia + animație trimitere
(function () {
  'use strict';

  // ─── CSS overrides (modal Ia) ────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.qr-moon-corner { display: none !important; }',
    '.qr-instruction-text { display: none !important; }',
    '.qr-white-container { background: #000 !important; border: 1px solid #333 !important; }',
    '.qr-container-row-minimal { flex-direction: column !important; align-items: center !important; gap: 8px !important; }',
    '.vertical-username-text { writing-mode: horizontal-tb !important; text-orientation: mixed !important; transform: none !important; color: #fff !important; font-size: 1rem !important; height: auto !important; padding: 0 !important; justify-content: center !important; width: 100% !important; text-align: center !important; }',
    '.receive-title { color: #fff !important; }',
    '.address-sol-label { color: #aaa !important; }',

    /* ── Simbolul ♂ și luna – fixed pe ecran ── */
    '#pula-symbol {',
    '  position: fixed;',
    '  bottom: 24px;',
    '  left: 24px;',
    '  width: 80px;',
    '  height: 80px;',
    '  object-fit: contain;',
    '  z-index: 9000;',
    '  pointer-events: none;',
    '  transform-origin: center center;',
    '  transition: none;',
    '}',
    '#pula-moon {',
    '  position: fixed;',
    '  top: 16px;',
    '  right: 16px;',
    '  width: 120px;',
    '  height: 120px;',
    '  object-fit: contain;',
    '  z-index: 8999;',
    '  pointer-events: none;',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ─── Opțiuni QR ─────────────────────────────────────────────────────────────
  var QR_OPTIONS = {
    width: 360,
    height: 360,
    margin: 2,
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

  // ─── Injectare QR stilizat ───────────────────────────────────────────────────
  function injectStyledQR(imgEl, address) {
    if (!imgEl || !address || !window.QRCodeStyling) return;
    if (imgEl.dataset.styledQrDone === '1') return;
    imgEl.dataset.styledQrDone = '1';

    var options = Object.assign({}, QR_OPTIONS, { data: address });
    var qrCode = new window.QRCodeStyling(options);

    var placeholder = document.createElement('div');
    placeholder.style.cssText = 'display:inline-block;width:360px;height:360px;border-radius:8px;overflow:hidden;';
    imgEl.parentNode.replaceChild(placeholder, imgEl);
    qrCode.append(placeholder);

    var canvas = placeholder.querySelector('canvas');
    if (canvas) canvas.style.cssText = 'display:block;width:360px;height:360px;border-radius:8px;';
  }

  function tryInjectQR() {
    var qrImg = document.querySelector('.qr-img[src*="qrserver.com"]');
    if (!qrImg) return false;
    var src = qrImg.getAttribute('src') || '';
    var match = src.match(/[?&]data=([A-Za-z0-9]+)/);
    if (!match || !match[1]) return false;
    if (typeof window.QRCodeStyling === 'undefined') return false;
    injectStyledQR(qrImg, match[1]);
    return true;
  }

  // ─── Animație trimitere ──────────────────────────────────────────────────────

  var sendAnimRunning = false;

  function createOverlayElements() {
    if (document.getElementById('pula-symbol')) return; // deja există

    var sym = document.createElement('img');
    sym.id = 'pula-symbol';
    sym.src = './symbol-mars.png';
    sym.alt = '♂';
    document.body.appendChild(sym);

    var moon = document.createElement('img');
    moon.id = 'pula-moon';
    moon.src = './luna.png';
    moon.alt = 'luna';
    document.body.appendChild(moon);
  }

  function removeOverlayElements() {
    var sym = document.getElementById('pula-symbol');
    var moon = document.getElementById('pula-moon');
    if (sym) sym.remove();
    if (moon) moon.remove();
    sendAnimRunning = false;
  }

  function launchSendAnimation() {
    if (sendAnimRunning) return;
    sendAnimRunning = true;

    var sym = document.getElementById('pula-symbol');
    var moon = document.getElementById('pula-moon');
    if (!sym || !moon) return;

    var symRect = sym.getBoundingClientRect();
    var moonRect = moon.getBoundingClientRect();

    // Centrul simbolului (punct de start)
    var startX = symRect.left + symRect.width / 2;
    var startY = symRect.top + symRect.height / 2;

    // Craterul mic din stânga-jos al lunii (~18% din stânga, ~78% din sus)
    var endX = moonRect.left + moonRect.width * 0.18;
    var endY = moonRect.top + moonRect.height * 0.78;

    var duration = 3000;
    var startTime = null;

    // Scoatem simbolul din flow-ul CSS fixed și îl poziționăm absolut pentru animație
    sym.style.position = 'fixed';
    sym.style.bottom = 'auto';
    sym.style.left = (startX - symRect.width / 2) + 'px';
    sym.style.top = (startY - symRect.height / 2) + 'px';

    function easeIn(t) { return t * t * t; } // accelerare cubică

    function step(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var t = Math.min(elapsed / duration, 1);
      var e = easeIn(t);

      var cx = startX + (endX - startX) * e;
      var cy = startY + (endY - startY) * e;
      var scale = Math.max(1 - t * 0.97, 0.03); // micșorare până la 3%
      var opacity = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1; // fade-out ultimul sfert

      sym.style.left = (cx - symRect.width / 2) + 'px';
      sym.style.top  = (cy - symRect.height / 2) + 'px';
      sym.style.transform = 'scale(' + scale + ')';
      sym.style.opacity = opacity;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Animație terminată – dispare simbolul, luna rămâne câteva secunde
        sym.style.display = 'none';
        setTimeout(function () { removeOverlayElements(); }, 2000);
      }
    }

    requestAnimationFrame(step);
  }

  // ─── MutationObserver central ────────────────────────────────────────────────

  var sendBtnListenerAttached = false;

  function checkDOM() {
    // 1) QR receive
    tryInjectQR();

    // 2) reader-frozen apare → adresă scanată OK → arată simbolul + luna
    var frozen = document.querySelector('.reader-frozen');
    if (frozen && !document.getElementById('pula-symbol')) {
      createOverlayElements();
    }

    // 3) Butonul "Dă" din transfer-box → ataşăm listener o singură dată
    if (!sendBtnListenerAttached) {
      var transferBox = document.querySelector('.transfer-box');
      if (transferBox) {
        var sendBtn = transferBox.querySelector('.transfer-btn');
        if (sendBtn) {
          sendBtnListenerAttached = true;
          sendBtn.addEventListener('click', function () {
            // Verificăm că nu e butonul dezactivat ("..." = tranzacție în curs)
            if (sendBtn.disabled || sendBtn.textContent.trim() === '...') return;
            launchSendAnimation();
          });
        }
      }
    }

    // 4) Transfer-box dispare → reset listener flag
    if (!document.querySelector('.transfer-box')) {
      sendBtnListenerAttached = false;
      if (!sendAnimRunning) removeOverlayElements();
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
