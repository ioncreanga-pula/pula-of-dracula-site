// qr-styled.js - QR stilizat + redesign modal Ia (receive)
(function () {
  'use strict';

  // --- Injectare CSS overrides ---
  var style = document.createElement('style');
  style.textContent = [
    /* Ascunde: luna, textul "IA P.U.L.A." + V-ul de jos */
    '.qr-moon-corner { display: none !important; }',
    '.qr-instruction-text { display: none !important; }',

    /* Fundal negru, text alb pentru containerul QR */
    '.qr-white-container {',
    '  background: #000 !important;',
    '  border: 1px solid #333 !important;',
    '}',

    /* Layout vertical: QR centrat, username jos */
    '.qr-container-row-minimal {',
    '  flex-direction: column !important;',
    '  align-items: center !important;',
    '  gap: 8px !important;',
    '}',

    /* Username: orizontal, jos, text alb */
    '.vertical-username-text {',
    '  writing-mode: horizontal-tb !important;',
    '  text-orientation: mixed !important;',
    '  transform: none !important;',
    '  color: #fff !important;',
    '  font-size: 1rem !important;',
    '  height: auto !important;',
    '  padding: 0 !important;',
    '  justify-content: center !important;',
    '  width: 100% !important;',
    '  text-align: center !important;',
    '}',

    /* Titlul modalului - text alb */
    '.receive-title { color: #fff !important; }',

    /* Adresa Solana de jos - text mai vizibil */
    '.address-sol-label { color: #aaa !important; }',
  ].join('\n');
  document.head.appendChild(style);

  // --- Opțiuni QR ---
  var QR_OPTIONS = {
    width: 180,
    height: 180,
    margin: 2,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: 'H'
    },
    imageOptions: {
      saveAsBlob: true,
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 4,
      crossOrigin: 'anonymous'
    },
    dotsOptions: {
      type: 'dots',
      color: '#ffffff',
      roundSize: true,
      gradient: {
        type: 'radial',
        rotation: 0.06981317007977318,
        colorStops: [
          { offset: 0, color: '#f6f5f4' },
          { offset: 1, color: '#99c1f1' }
        ]
      }
    },
    backgroundOptions: {
      round: 0,
      color: '#000000',
      gradient: null
    },
    cornersSquareOptions: {
      type: 'dot',
      color: '#ffff00',
      gradient: {
        type: 'radial',
        rotation: 0,
        colorStops: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#ffff00' }
        ]
      }
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#ffff00',
      gradient: {
        type: 'radial',
        rotation: 0,
        colorStops: [
          { offset: 0, color: '#f5c211' },
          { offset: 1, color: '#ffff00' }
        ]
      }
    },
    image: './qr-logo.png'
  };

  function injectStyledQR(imgEl, address) {
    if (!imgEl || !address || !window.QRCodeStyling) return;
    if (imgEl.dataset.styledQrDone === '1') return;
    imgEl.dataset.styledQrDone = '1';

    var options = Object.assign({}, QR_OPTIONS, { data: address });
    var qrCode = new window.QRCodeStyling(options);

    var placeholder = document.createElement('div');
    placeholder.style.cssText = [
      'display:inline-block',
      'width:180px',
      'height:180px',
      'border-radius:8px',
      'overflow:hidden'
    ].join(';');

    imgEl.parentNode.replaceChild(placeholder, imgEl);
    qrCode.append(placeholder);

    var canvas = placeholder.querySelector('canvas');
    if (canvas) {
      canvas.style.cssText = 'display:block;width:180px;height:180px;border-radius:8px;';
    }
  }

  function tryInjectQR() {
    var qrImg = document.querySelector('.qr-img[src*="qrserver.com"]');
    if (!qrImg) return false;

    var src = qrImg.getAttribute('src') || '';
    var match = src.match(/[?&]data=([A-Za-z0-9]+)/);
    if (!match || !match[1]) return false;
    var address = match[1];

    if (typeof window.QRCodeStyling === 'undefined') return false;

    injectStyledQR(qrImg, address);
    return true;
  }

  var observer = new MutationObserver(function () {
    tryInjectQR();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInjectQR);
  } else {
    tryInjectQR();
  }
})();
