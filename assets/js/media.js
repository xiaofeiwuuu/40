(function attachMedia(root, factory) {
  var api = factory(root);
  root.H5Media = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createMedia(root) {
  'use strict';

  var dialog = null;
  var content = null;
  var status = null;
  var title = null;
  var lastTrigger = null;
  var initialized = false;
  var onCloseCallback = null;

  function pauseAll() {
    if (!root.document) {
      return;
    }

    root.document.querySelectorAll('audio, video').forEach(function pause(media) {
      if (typeof media.pause === 'function') {
        media.pause();
      }
    });
  }

  function clear() {
    if (!content) {
      return;
    }

    content.querySelectorAll('audio, video').forEach(function stop(media) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    });
    content.innerHTML = '';
    if (status) {
      status.textContent = '';
    }
  }

  function show(trigger, heading) {
    if (!dialog) {
      return false;
    }

    lastTrigger = trigger || root.document.activeElement;
    if (title) {
      title.textContent = heading || '影像档案';
    }
    dialog.hidden = false;
    root.document.body.classList.add('modal-open');
    var closeButton = dialog.querySelector('[data-close-modal]');
    if (closeButton) {
      closeButton.focus({ preventScroll: true });
    }
    return true;
  }

  function openImage(path, alt, trigger, onClose) {
    pauseAll();
    clear();
    onCloseCallback = typeof onClose === 'function' ? onClose : null;
    if (!show(trigger, '台历原稿')) {
      return;
    }

    var image = root.document.createElement('img');
    image.alt = alt || '台历原稿';
    image.decoding = 'async';
    image.src = path;
    image.addEventListener('error', function handleImageError() {
      content.innerHTML = '';
      var fallback = root.document.createElement('div');
      fallback.className = 'media-fallback';
      fallback.innerHTML = '<strong>' + (alt || '档案图片') + '</strong><p>图片暂时无法加载，请关闭后继续阅读。</p>';
      content.appendChild(fallback);
      if (status) {
        status.textContent = '图片加载失败';
      }
    }, { once: true });
    content.appendChild(image);
  }

  function openVideo(path, poster, trigger) {
    pauseAll();
    clear();
    onCloseCallback = null;
    if (!show(trigger, '采访影像')) {
      return;
    }

    var video = root.document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'metadata';
    if (poster) {
      video.poster = poster;
    }
    video.src = path;
    video.addEventListener('error', function handleVideoError() {
      if (status) {
        status.textContent = '视频暂时无法播放，可关闭后继续阅读。';
      }
    });
    content.appendChild(video);
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function autoplayRejected() {
        if (status) {
          status.textContent = '点击画面中的播放按钮开始观看。';
        }
      });
    }
  }

  function close() {
    if (!dialog || dialog.hidden) {
      return;
    }

    clear();
    dialog.hidden = true;
    root.document.body.classList.remove('modal-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function' && root.document.contains(lastTrigger)) {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
    if (onCloseCallback) {
      var callback = onCloseCallback;
      onCloseCallback = null;
      callback();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && dialog && !dialog.hidden) {
      close();
    }
  }

  function init(options) {
    if (initialized || !root.document) {
      return;
    }

    var settings = options || {};
    dialog = settings.dialog || root.document.getElementById('mediaDialog');
    content = settings.content || root.document.getElementById('mediaContent');
    status = settings.status || root.document.getElementById('mediaStatus');
    title = root.document.getElementById('mediaTitle');
    if (!dialog || !content) {
      return;
    }

    dialog.addEventListener('click', function closeFromBackdrop(event) {
      if (event.target === dialog || event.target.closest('[data-close-modal]')) {
        close();
      }
    });
    root.document.addEventListener('keydown', handleKeydown);
    initialized = true;
  }

  return {
    init: init,
    openImage: openImage,
    openVideo: openVideo,
    pauseAll: pauseAll,
    close: close
  };
}));
