(function attachScenes(root, factory) {
  root.H5Scenes = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createScenes(root) {
  'use strict';

  var scroller = null;
  var screens = [];
  var visited = new Set();
  var scrollTriggers = [];
  var compareDraggables = [];
  var observer = null;
  var onActive = null;
  var reducedMotion = false;
  var currentId = null;

  function loadImages(screen) {
    if (!screen) {
      return;
    }

    screen.querySelectorAll('img[data-src]').forEach(function load(image) {
      image.addEventListener('error', function markBroken() {
        image.classList.add('is-broken');
        image.removeAttribute('src');
        image.setAttribute('role', 'img');
        image.setAttribute('aria-label', (image.alt || '档案图片') + '，图片暂时无法加载');
      }, { once: true });
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    });
  }

  function getRevealElements(screen) {
    return Array.from(screen.querySelectorAll('.archive-reveal'));
  }

  function animateScreen(screen) {
    var gsap = root.gsap;
    if (!gsap || reducedMotion) {
      return;
    }

    var id = screen.id;
    var elements = getRevealElements(screen);
    if (elements.length) {
      gsap.fromTo(elements, {
        autoAlpha: 0,
        y: id === 's1' ? 12 : 22
      }, {
        autoAlpha: 1,
        y: 0,
        duration: id === 's1' ? .9 : .72,
        stagger: id === 's1' ? .14 : .08,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility'
      });
    }

    if (id === 's1') {
      gsap.fromTo('.opening-lead span', {
        autoAlpha: 0,
        filter: 'blur(7px)',
        y: 5
      }, {
        autoAlpha: 1,
        filter: 'blur(0px)',
        y: 0,
        duration: .82,
        stagger: .28,
        delay: .22,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility,filter'
      });
    }

    if (id === 's2') {
      var cards = Array.from(screen.querySelectorAll('.calendar-card'));
      gsap.from(cards, {
        autoAlpha: 0,
        y: -140,
        rotation: function randomRotation(index) { return index % 2 ? -18 : 19; },
        scale: .88,
        duration: .72,
        stagger: .028,
        ease: 'back.out(1.35)',
        clearProps: 'opacity,visibility'
      });
    }

    if (id === 's5') {
      gsap.fromTo(screen.querySelector('.tv-shell'), {
        filter: 'brightness(.35)'
      }, {
        filter: 'brightness(1)',
        duration: 1.15,
        ease: 'power1.inOut',
        clearProps: 'filter'
      });
    }

    if (id === 's6') {
      gsap.fromTo(screen.querySelectorAll('.red-stroke'), {
        scaleX: 0,
        transformOrigin: 'left center'
      }, {
        scaleX: 1,
        duration: .85,
        stagger: .28,
        delay: .42,
        ease: 'power2.out'
      });
    }

    if (id === 's8') {
      gsap.to(screen.querySelectorAll('.spending-bar'), {
        scaleY: 1,
        duration: 1.15,
        stagger: .13,
        ease: 'power3.out'
      });
    }

    if (id === 's10') {
      gsap.to(screen.querySelector('.inheritance-line path'), {
        strokeDashoffset: 0,
        duration: 1.65,
        delay: .32,
        ease: 'power1.inOut'
      });
    }

    if (id === 's11') {
      gsap.from(screen.querySelectorAll('.donation-photo'), {
        autoAlpha: 0,
        y: 38,
        rotation: function finalRotation(index) { return [-9, 10, -6][index] || 0; },
        scale: .92,
        duration: .85,
        stagger: .16,
        ease: 'back.out(1.2)',
        clearProps: 'opacity,visibility'
      });
      gsap.from('.final-seal', { autoAlpha: 0, scale: 1.7, rotation: -24, duration: .55, delay: .95, ease: 'back.out(1.8)' });
    }
  }

  function activate(screenId) {
    var screen = root.document.getElementById(screenId);
    if (!screen || currentId === screenId) {
      return;
    }

    currentId = screenId;
    screens.forEach(function updateCurrent(item) {
      item.classList.toggle('is-current', item === screen);
    });
    screen.classList.add('is-active');

    var index = screens.indexOf(screen);
    loadImages(screen);
    loadImages(screens[index + 1]);

    if (!visited.has(screenId)) {
      visited.add(screenId);
      animateScreen(screen);
    }

    if (typeof onActive === 'function') {
      onActive(screenId, index);
    }
  }

  function updateCompare(value) {
    var percentage = Math.max(0, Math.min(100, value));
    var layer = root.document.getElementById('lightLayer');
    if (layer) {
      layer.style.clipPath = 'inset(0 ' + (100 - percentage) + '% 0 0)';
    }
  }

  function initCompare() {
    var compare = root.document.getElementById('lightCompare');
    var handle = root.document.getElementById('lightHandle');
    var Draggable = root.Draggable;
    if (!compare || !handle) {
      return;
    }

    updateCompare(50);
    if (!Draggable || typeof Draggable.create !== 'function') {
      var dragging = false;
      function move(event) {
        if (!dragging && event.type !== 'pointerdown') {
          return;
        }
        var rect = compare.getBoundingClientRect();
        var percentage = ((event.clientX - rect.left) / rect.width) * 100;
        updateCompare(percentage);
        handle.style.left = Math.max(0, Math.min(100, percentage)) + '%';
      }
      compare.addEventListener('pointerdown', function start(event) {
        dragging = true;
        compare.setPointerCapture(event.pointerId);
        move(event);
      });
      compare.addEventListener('pointermove', move);
      compare.addEventListener('pointerup', function stop() { dragging = false; });
      compare.addEventListener('pointercancel', function stop() { dragging = false; });
      return;
    }

    var width = compare.getBoundingClientRect().width;
    compareDraggables = Draggable.create(handle, {
      type: 'x',
      bounds: { minX: -width / 2, maxX: width / 2 },
      edgeResistance: .88,
      onPress: function refreshBounds() {
        width = compare.getBoundingClientRect().width;
        this.applyBounds({ minX: -width / 2, maxX: width / 2 });
      },
      onDrag: function reveal() {
        updateCompare(50 + (this.x / width) * 100);
      }
    });
  }

  function initScrollTracking() {
    var gsap = root.gsap;
    var ScrollTrigger = root.ScrollTrigger;
    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      screens.forEach(function track(screen) {
        var trigger = ScrollTrigger.create({
          trigger: screen,
          scroller: scroller,
          start: 'top 56%',
          end: 'bottom 44%',
          onEnter: function enter() { activate(screen.id); },
          onEnterBack: function enterBack() { activate(screen.id); }
        });
        scrollTriggers.push(trigger);
      });
      requestAnimationFrame(function refresh() { ScrollTrigger.refresh(); });
      return;
    }

    if ('IntersectionObserver' in root) {
      observer = new root.IntersectionObserver(function onEntries(entries) {
        entries.forEach(function check(entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= .45) {
            activate(entry.target.id);
          }
        });
      }, { root: scroller, threshold: [.45, .6] });
      screens.forEach(function observe(screen) { observer.observe(screen); });
    }
  }

  function init(options) {
    var settings = options || {};
    scroller = settings.scroller || root.document.getElementById('appScroller');
    screens = Array.from(root.document.querySelectorAll('.screen'));
    onActive = settings.onActive;
    reducedMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.document.body.classList.add('motion-ready');

    if (root.gsap) {
      if (root.ScrollTrigger) { root.gsap.registerPlugin(root.ScrollTrigger); }
      if (root.Draggable) { root.gsap.registerPlugin(root.Draggable); }
      root.document.body.classList.add('has-gsap');
    }

    initCompare();
    initScrollTracking();
    activate('s1');
  }

  function destroy() {
    scrollTriggers.forEach(function kill(trigger) { trigger.kill(); });
    compareDraggables.forEach(function kill(instance) { instance.kill(); });
    scrollTriggers = [];
    compareDraggables = [];
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    currentId = null;
  }

  return {
    init: init,
    activate: activate,
    destroy: destroy,
    loadImages: loadImages
  };
}));
