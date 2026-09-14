(function attachCore(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.H5Core = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCore() {
  'use strict';

  function getPresentationMode(capabilities) {
    var caps = capabilities || {};
    var width = Number(caps.width) || 0;
    var height = Number(caps.height) || 0;
    var hasTouch = Number(caps.maxTouchPoints) > 0 || Boolean(caps.coarsePointer);
    var looksLikeDesktop = !hasTouch && Boolean(caps.finePointer) && Boolean(caps.hover);

    if (looksLikeDesktop) {
      return 'desktop-gate';
    }

    if (hasTouch && width > height && height < 500) {
      return 'rotate-phone';
    }

    return 'experience';
  }

  function readCapabilities(win) {
    var target = win || {};
    var navigatorObject = target.navigator || {};
    var matchMedia = typeof target.matchMedia === 'function'
      ? target.matchMedia.bind(target)
      : function fallbackMatchMedia() { return { matches: false }; };

    return {
      maxTouchPoints: Number(navigatorObject.maxTouchPoints) || 0,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      finePointer: matchMedia('(pointer: fine)').matches,
      hover: matchMedia('(hover: hover)').matches,
      width: Number(target.innerWidth) || 0,
      height: Number(target.innerHeight) || 0
    };
  }

  function chartHeight(value, maximum) {
    var number = Number(value);
    var max = Number(maximum);

    if (!Number.isFinite(number) || !Number.isFinite(max) || max <= 0) {
      return 0;
    }

    var percentage = Math.min(100, Math.max(0, number / (max / 100)));
    var nearestInteger = Math.round(percentage);

    return Math.abs(percentage - nearestInteger) < Number.EPSILON * 100
      ? nearestInteger
      : percentage;
  }

  function canCreateQr(protocol) {
    return protocol === 'http:' || protocol === 'https:';
  }

  function nextScreenId(currentId, screenIds) {
    if (!Array.isArray(screenIds)) {
      return null;
    }

    var currentIndex = screenIds.indexOf(currentId);
    if (currentIndex < 0 || currentIndex >= screenIds.length - 1) {
      return null;
    }

    return screenIds[currentIndex + 1];
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  return {
    getPresentationMode: getPresentationMode,
    readCapabilities: readCapabilities,
    chartHeight: chartHeight,
    canCreateQr: canCreateQr,
    nextScreenId: nextScreenId,
    clamp: clamp
  };
}));
