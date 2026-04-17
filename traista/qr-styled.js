// qr-styled.js - Înlocuiește QR-ul din modalul "Ia" cu qr-code-styling
(function () {
  'use strict';

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

    // Nu injectăm de două ori
    if (imgEl.dataset.styledQrDone === '1') return;
    imgEl.dataset.styledQrDone = '1';

    var options = Object.assign({}, QR_OPTIONS, { data: address });
    var qrCode = new window.QRCodeStyling(options);

    // Creem un div care ia locul img-ului
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

    // Canvas-ul generat - ajustăm stilul
    var canvas = placeholder.querySelector('canvas');
    if (canvas) {
      canvas.style.cssText = 'display:block;width:180px;height:180px;border-radius:8px;';
    }
  }

  function tryInjectQR() {
    // Găsim imaginea QR originală (de la api.qrserver.com)
    var qrImg = document.querySelector('.qr-img[src*="qrserver.com"]');
    if (!qrImg) return false;

    // Extragem adresa Solana din URL-ul imaginii
    var src = qrImg.getAttribute('src') || '';
    var match = src.match(/[?&]data=([A-Za-z0-9]+)/);
    if (!match || !match[1]) return false;
    var address = match[1];

    if (typeof window.QRCodeStyling === 'undefined') {
      // Librăria nu e încă încărcată, reîncercăm
      return false;
    }

    injectStyledQR(qrImg, address);
    return true;
  }

  // MutationObserver pentru detectarea apariției modalului receive
  var observer = new MutationObserver(function () {
    tryInjectQR();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Fallback la DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInjectQR);
  } else {
    tryInjectQR();
  }
})();
