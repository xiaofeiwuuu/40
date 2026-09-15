(function attachPoster(root, factory) {
  root.H5Poster = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPoster(root) {
  'use strict';

  var dialog = null;
  var canvas = null;
  var saveLink = null;
  var qrNote = null;
  var quotes = [];
  var selectedIndex = 0;
  var lastTrigger = null;
  var objectUrl = null;
  var initialized = false;
  var calendarStackImagesPromise = null;

  var CALENDAR_STACK_YEARS = [1987, 2006, 2026];

  function getCalendarStackImages() {
    if (!calendarStackImagesPromise) {
      calendarStackImagesPromise = Promise.all(CALENDAR_STACK_YEARS.map(function loadYear(year) {
        return loadImage('assets/images/calendars/' + year + '.jpg');
      }));
    }
    return calendarStackImagesPromise;
  }

  function roundedRect(context, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maximumLines) {
    var lines = [];
    var line = '';
    Array.from(text).forEach(function addCharacter(character) {
      var candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    });
    if (line) {
      lines.push(line);
    }

    lines.slice(0, maximumLines || lines.length).forEach(function drawLine(value, index) {
      context.fillText(value, x, y + index * lineHeight);
    });
    return Math.min(lines.length, maximumLines || lines.length) * lineHeight;
  }

  function makeQrCanvas(pageUrl) {
    return new Promise(function generate(resolve) {
      if (!root.document || typeof root.QRCode !== 'function') {
        resolve(null);
        return;
      }

      var holder = root.document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:160px;height:160px;';
      root.document.body.appendChild(holder);

      try {
        new root.QRCode(holder, {
          text: pageUrl,
          width: 160,
          height: 160,
          colorDark: '#211a14',
          colorLight: '#f5ead1',
          correctLevel: root.QRCode.CorrectLevel ? root.QRCode.CorrectLevel.M : undefined
        });
      } catch (error) {
        holder.remove();
        resolve(null);
        return;
      }

      setTimeout(function collectQr() {
        var qrCanvas = holder.querySelector('canvas');
        var qrImage = holder.querySelector('img');
        if (qrCanvas) {
          var copy = root.document.createElement('canvas');
          copy.width = qrCanvas.width;
          copy.height = qrCanvas.height;
          copy.getContext('2d').drawImage(qrCanvas, 0, 0);
          holder.remove();
          resolve(copy);
          return;
        }

        if (qrImage && qrImage.complete) {
          var imageCopy = root.document.createElement('canvas');
          imageCopy.width = 160;
          imageCopy.height = 160;
          imageCopy.getContext('2d').drawImage(qrImage, 0, 0, 160, 160);
          holder.remove();
          resolve(imageCopy);
          return;
        }

        holder.remove();
        resolve(null);
      }, 80);
    });
  }

  function paintPaper(context) {
    var gradient = context.createLinearGradient(0, 0, 640, 960);
    gradient.addColorStop(0, '#7b1d1c');
    gradient.addColorStop(.58, '#5c1614');
    gradient.addColorStop(1, '#2c0908');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 640, 960);

    context.globalAlpha = .1;
    context.fillStyle = '#1a0403';
    for (var index = 0; index < 380; index += 1) {
      var x = (index * 83) % 640;
      var y = (index * 137) % 960;
      context.fillRect(x, y, index % 3 === 0 ? 2 : 1, 1);
    }
    context.globalAlpha = 1;

    context.strokeStyle = 'rgba(214,173,89,.32)';
    context.lineWidth = 2;
    context.strokeRect(28, 28, 584, 904);
    context.setLineDash([6, 8]);
    context.strokeRect(38, 38, 564, 884);
    context.setLineDash([]);
  }

  function loadImage(src) {
    return new Promise(function attempt(resolve) {
      var image = new root.Image();
      image.onload = function loaded() { resolve(image); };
      image.onerror = function failed() { resolve(null); };
      image.src = src;
    });
  }

  function drawImageCover(context, image, x, y, width, height) {
    var imageRatio = image.width / image.height;
    var boxRatio = width / height;
    var sx;
    var sy;
    var sw;
    var sh;
    if (imageRatio > boxRatio) {
      sh = image.height;
      sw = sh * boxRatio;
      sx = (image.width - sw) / 2;
      sy = 0;
    } else {
      sw = image.width;
      sh = sw / boxRatio;
      sx = 0;
      sy = (image.height - sh) / 2;
    }
    context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawCalendarStack(context, images) {
    var cards = [
      { x: 78, y: 598, r: -.05, year: 1987 },
      { x: 98, y: 576, r: .035, year: 2006 },
      { x: 119, y: 552, r: -.018, year: 2026 }
    ];

    cards.forEach(function drawCard(card, index) {
      var image = images && images[index];
      context.save();
      context.translate(card.x + 155, card.y + 90);
      context.rotate(card.r);
      context.fillStyle = 'rgba(15,5,4,.35)';
      context.fillRect(-145, -76, 310, 180);

      if (image) {
        drawImageCover(context, image, -155, -90, 310, 180);
      } else {
        context.fillStyle = '#3a1210';
        context.fillRect(-155, -90, 310, 180);
        context.fillStyle = '#f0d88c';
        context.font = '700 26px "Songti SC", serif';
        context.textAlign = 'center';
        context.fillText(String(card.year), 0, 10);
      }
      context.strokeStyle = 'rgba(214,173,89,.4)';
      context.strokeRect(-155, -90, 310, 180);

      context.fillStyle = 'rgba(20,8,6,.78)';
      roundedRect(context, 51, 47, 94, 32, 4);
      context.fill();
      context.fillStyle = '#f0d88c';
      context.font = '700 17px -apple-system, sans-serif';
      context.textAlign = 'center';
      context.fillText(String(card.year), 98, 69);

      context.restore();
    });
  }

  async function draw(targetCanvas, selection, pageUrl) {
    if (!targetCanvas || !targetCanvas.getContext) {
      return { hasQr: false };
    }

    var context = targetCanvas.getContext('2d');
    targetCanvas.width = 640;
    targetCanvas.height = 960;
    var stackImagesPromise = getCalendarStackImages();
    paintPaper(context);

    context.fillStyle = '#e9c27a';
    context.font = '700 24px -apple-system, "PingFang SC", sans-serif';
    context.textAlign = 'left';
    context.fillText('MOBILE ARCHIVE · 01', 68, 92);

    context.fillStyle = '#fbeed7';
    context.font = '700 72px "Songti SC", "STSong", serif';
    context.fillText('翻开40年', 66, 188);

    context.fillStyle = 'rgba(255,240,207,.72)';
    context.font = '500 21px -apple-system, "PingFang SC", sans-serif';
    context.fillText('一位老党员40本台历里的家国变迁', 70, 230);

    context.strokeStyle = '#d6ad59';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(68, 271);
    context.lineTo(572, 271);
    context.stroke();

    context.fillStyle = 'rgba(240,216,140,.22)';
    context.font = '700 112px "Songti SC", serif';
    context.fillText('“', 54, 400);

    context.fillStyle = '#fbeed7';
    context.font = '600 32px "Songti SC", "STSong", serif';
    context.textAlign = 'center';
    drawWrappedText(context, selection || '', 320, 354, 470, 52, 4);

    drawCalendarStack(context, await stackImagesPromise);

    var protocol = root.location ? root.location.protocol : '';
    var canCreate = Boolean(root.H5Core && root.H5Core.canCreateQr(protocol) && pageUrl);
    var qrCanvas = canCreate ? await makeQrCanvas(pageUrl) : null;
    var hasQr = Boolean(qrCanvas);

    if (hasQr) {
      context.fillStyle = '#f5ead1';
      context.fillRect(430, 706, 150, 150);
      context.drawImage(qrCanvas, 437, 713, 136, 136);
      context.fillStyle = 'rgba(255,240,207,.75)';
      context.font = '500 14px -apple-system, sans-serif';
      context.textAlign = 'center';
      context.fillText('扫码翻开完整故事', 505, 880);
    } else {
      context.strokeStyle = 'rgba(214,173,89,.5)';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(430, 716, 150, 132);
      context.setLineDash([]);
      context.fillStyle = 'rgba(255,240,207,.75)';
      context.font = '500 16px -apple-system, "PingFang SC", sans-serif';
      context.textAlign = 'center';
      drawWrappedText(context, '部署后将生成作品二维码', 505, 768, 118, 27, 3);
    }

    context.save();
    context.translate(90, 835);
    context.rotate(-.1);
    context.strokeStyle = '#f0d88c';
    context.lineWidth = 5;
    context.strokeRect(-34, -34, 68, 68);
    context.strokeRect(-27, -27, 54, 54);
    context.fillStyle = '#f0d88c';
    context.font = '700 19px "Songti SC", serif';
    context.textAlign = 'center';
    context.fillText('时', 0, -4);
    context.fillText('间', 0, 20);
    context.restore();

    context.fillStyle = 'rgba(255,240,207,.72)';
    context.font = '500 15px -apple-system, sans-serif';
    context.textAlign = 'left';
    context.fillText('把普通日子写下来，时间就有了回声。', 142, 828);
    context.fillText('1987—2026 · 四十年，四十本台历', 142, 858);
    context.fillStyle = '#d6ad59';
    context.fillRect(68, 899, 504, 3);

    return { hasQr: hasQr };
  }

  function updateSaveLink() {
    if (!canvas || !saveLink) {
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(function receiveBlob(blob) {
        if (!blob) {
          saveLink.href = canvas.toDataURL('image/png');
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        saveLink.href = objectUrl;
      }, 'image/png');
    } else {
      saveLink.href = canvas.toDataURL('image/png');
    }
  }

  async function renderPoster() {
    if (!canvas || !quotes.length) {
      return;
    }

    var pageUrl = root.location ? root.location.href.split('#')[0] : '';
    var result = await draw(canvas, quotes[selectedIndex], pageUrl);
    if (qrNote) {
      qrNote.textContent = result.hasQr
        ? '海报已写入当前作品二维码。'
        : '本地预览不生成 file:// 二维码，部署到网页后会自动写入。';
    }
    updateSaveLink();
  }

  function close() {
    if (!dialog || dialog.hidden) {
      return;
    }
    dialog.hidden = true;
    root.document.body.classList.remove('modal-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  }

  function open(trigger) {
    if (!dialog) {
      return;
    }
    lastTrigger = trigger || root.document.activeElement;
    dialog.hidden = false;
    root.document.body.classList.add('modal-open');
    renderPoster();
    var closeButton = dialog.querySelector('[data-close-modal]');
    if (closeButton) {
      closeButton.focus({ preventScroll: true });
    }
  }

  function init(options) {
    if (initialized || !root.document) {
      return;
    }

    var settings = options || {};
    dialog = settings.dialog || root.document.getElementById('posterDialog');
    canvas = settings.canvas || root.document.getElementById('posterCanvas');
    saveLink = settings.saveLink || root.document.getElementById('savePoster');
    qrNote = root.document.getElementById('posterQrNote');
    quotes = Array.isArray(settings.quotes) ? settings.quotes.slice() : [];
    if (!dialog || !canvas || !saveLink) {
      return;
    }

    dialog.addEventListener('click', function handleDialogClick(event) {
      if (event.target === dialog || event.target.closest('[data-close-modal]')) {
        close();
      }
    });
    root.document.addEventListener('keydown', function handleEscape(event) {
      if (event.key === 'Escape' && !dialog.hidden) {
        close();
      }
    });

    var redrawButton = root.document.getElementById('redrawPoster');
    if (redrawButton) {
      redrawButton.addEventListener('click', function chooseNext() {
        selectedIndex = (selectedIndex + 1) % quotes.length;
        renderPoster();
      });
    }
    initialized = true;
  }

  return {
    init: init,
    draw: draw,
    open: open,
    close: close
  };
}));
