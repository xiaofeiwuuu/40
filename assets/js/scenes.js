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

  var OPENING_STEP_MS = 42;
  var OPENING_PAUSE_CHARS = '，。';
  var OPENING_PAUSE_MS = 130;
  var OPENING_SETTLE_MS = 580;
  var OPENING_BUTTON_DELAY_MS = 5000;
  var OPENING_BUTTON_DELAY_REDUCED_MS = 260;

  function prepareInkSpans(container) {
    if (container.dataset.inkReady) {
      return [];
    }
    container.dataset.inkReady = 'true';

    var delays = [];
    var elapsed = 0;

    Array.from(container.querySelectorAll('span')).forEach(function splitSentence(sentence) {
      var text = sentence.textContent;
      sentence.textContent = '';
      Array.from(text).forEach(function addChar(character) {
        var charSpan = root.document.createElement('span');
        charSpan.className = 'ink-char';
        charSpan.textContent = character;
        charSpan.style.transitionDelay = elapsed + 'ms';
        sentence.appendChild(charSpan);
        delays.push(elapsed);
        elapsed += OPENING_PAUSE_CHARS.indexOf(character) >= 0
          ? OPENING_STEP_MS + OPENING_PAUSE_MS
          : OPENING_STEP_MS;
      });
    });

    return delays;
  }

  function scheduleOpeningReveal(screen) {
    var lead = screen.querySelector('.opening-lead');
    var button = screen.querySelector('.opening-button');
    if (!lead || !button || lead.dataset.inkScheduled) {
      return;
    }
    lead.dataset.inkScheduled = 'true';

    var delays = prepareInkSpans(lead);
    // Force a style flush so the freshly inserted spans commit their hidden
    // state before .is-active flips them visible; otherwise the browser may
    // collapse both class changes into one frame and skip the transition.
    void lead.offsetHeight;

    var lastDelay = delays.length ? delays[delays.length - 1] : 0;
    var revealSpan = lastDelay + OPENING_SETTLE_MS;
    var buttonDelay = reducedMotion
      ? OPENING_BUTTON_DELAY_REDUCED_MS
      : Math.max(OPENING_BUTTON_DELAY_MS, revealSpan + 900);

    root.setTimeout(function showButton() {
      button.classList.add('is-ready');
    }, buttonDelay);

    if (!reducedMotion && typeof root.CustomEvent === 'function') {
      root.document.dispatchEvent(new root.CustomEvent('s1:ink-schedule', {
        detail: { delays: delays, stepMs: OPENING_STEP_MS, totalMs: revealSpan, screenId: screen.id }
      }));
    }
  }

  function scheduleQuoteInk(screen) {
    // Any screen that wants the handwriting treatment just wraps its
    // .record-quote text in a <span> - no per-screen wiring needed here.
    var quote = screen.querySelector('.record-quote');
    if (!quote || quote.dataset.inkScheduled || !quote.querySelector('span')) {
      return;
    }
    quote.dataset.inkScheduled = 'true';

    var delays = prepareInkSpans(quote);
    // Same reflow-flush trick as the opening screen - the spans must commit
    // their hidden state before .is-active reveals them.
    void quote.offsetHeight;

    if (!reducedMotion && typeof root.CustomEvent === 'function') {
      root.document.dispatchEvent(new root.CustomEvent('quote:ink-schedule', {
        detail: { delays: delays, stepMs: OPENING_STEP_MS, screenId: screen.id }
      }));
    }
  }

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
    var id = screen.id;

    if (!gsap || reducedMotion) {
      return;
    }

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
      gsap.fromTo(screen.querySelector('.opening-title-visual img'), {
        autoAlpha: 0,
        y: -18,
        scale: .9,
        filter: 'brightness(1.3) blur(4px)'
      }, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: 'brightness(1) blur(0px)',
        duration: 1.15,
        delay: .18,
        ease: 'back.out(1.08)',
        clearProps: 'opacity,visibility,transform,filter'
      });
    }

    if (id === 's2') {
      gsap.fromTo(screen.querySelector('.calendar-flipbook'), {
        rotationY: -10,
        scale: .93
      }, {
        rotationY: 0,
        scale: 1,
        duration: .72,
        delay: .72,
        ease: 'back.out(1.15)',
        clearProps: 'rotationY,scale'
      });
    }

    if (id === 's5') {
      gsap.fromTo(screen.querySelector('.night-scene'), {
        filter: 'brightness(.35)'
      }, {
        filter: 'brightness(1)',
        duration: 1.15,
        ease: 'power1.inOut',
        clearProps: 'filter'
      });
    }

    if (id === 's10') {
      gsap.fromTo(screen.querySelector('.legacy-scene img'), {
        clipPath: 'inset(0 100% 0 0)'
      }, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.4,
        delay: .2,
        ease: 'power2.inOut',
        clearProps: 'clipPath'
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

  function openQuiz1WhenSettled() {
    var settleTimer = null;

    function fireWhenQuiet() {
      settleTimer = null;
      if (scroller) {
        scroller.removeEventListener('scroll', onScroll);
      }
      // Bail if the user has already swiped past s7 by the time the
      // scroll-snap finally settles - the quiz would pop on the wrong screen.
      if (currentId !== 's7') {
        return;
      }
      root.document.dispatchEvent(new root.CustomEvent('quiz:auto-open', { detail: { key: 'quiz1' } }));
    }

    function onScroll() {
      root.clearTimeout(settleTimer);
      settleTimer = root.setTimeout(fireWhenQuiet, 160);
    }

    if (!scroller) {
      root.setTimeout(fireWhenQuiet, 450);
      return;
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

    var firstVisit = !visited.has(screenId);
    if (firstVisit) {
      // Build the ink-char spans and let them commit their hidden state
      // before .is-active lands below, otherwise the reveal transition has
      // no prior frame to animate from and the text just snaps into view.
      if (screenId === 's1') {
        scheduleOpeningReveal(screen);
      } else {
        scheduleQuoteInk(screen);
      }
    }

    screen.classList.add('is-active');

    var index = screens.indexOf(screen);
    loadImages(screen);
    loadImages(screens[index + 1]);

    if (firstVisit) {
      visited.add(screenId);
      animateScreen(screen);
      if (screenId === 's7' && typeof root.CustomEvent === 'function') {
        openQuiz1WhenSettled();
      }
      if (screenId === 's8') {
        root.setTimeout(autoFillSpendingChart, 450);
      }
      if (screenId === 's11') {
        var posterButton = screen.querySelector('#openPoster');
        if (posterButton) {
          // Match the donation-photo + seal entrance timeline in
          // animateScreen() (stagger .16s x3 + .85s, then seal at .95s
          // delay + .55s = ~1.5s total) so the button lands right after it
          // settles - fall back to a quick reveal when there's no motion.
          var posterButtonDelay = (reducedMotion || !root.gsap) ? 280 : 1550;
          root.setTimeout(function showPosterButton() {
            posterButton.classList.add('is-ready');
          }, posterButtonDelay);
        }
      }
    }

    if (typeof onActive === 'function') {
      onActive(screenId, index);
    }
  }

  var electricOn = false;
  var lastComparePercentage = null;
  var LIGHT_ON_THRESHOLD = 97;
  var LIGHT_OFF_THRESHOLD = 92;

  function updateCompare(value) {
    var percentage = Math.max(0, Math.min(100, value));
    var frames = root.document.querySelectorAll('#compareStage .compare-frame');
    if (!frames.length) {
      return;
    }
    var position = (percentage / 100) * (frames.length - 1);
    frames.forEach(function fade(frame, index) {
      frame.style.opacity = String(Math.max(0, 1 - Math.abs(position - index)));
    });

    if (typeof root.CustomEvent === 'function') {
      // Sliding to the right (toward the bulb) crackles with electricity,
      // but only while the bulb isn't already fully lit - once "on", further
      // rightward nudges (e.g. still easing toward 100) must not restart it.
      if (!electricOn && lastComparePercentage !== null && percentage > lastComparePercentage) {
        root.document.dispatchEvent(new root.CustomEvent('light:charging'));
      }

      // Only count the bulb as "on" once the handle is essentially all the
      // way to the right, not just close to the last frame's crossfade
      // midpoint - that left a visible gap before the ding actually fired.
      if (!electricOn && percentage >= LIGHT_ON_THRESHOLD) {
        electricOn = true;
        root.document.dispatchEvent(new root.CustomEvent('light:charging:stop'));
        root.document.dispatchEvent(new root.CustomEvent('light:on'));
      } else if (electricOn && percentage < LIGHT_OFF_THRESHOLD) {
        // A deliberate move back toward the kerosene side turns the bulb
        // back off (re-arming the ding); a little hysteresis below the on
        // threshold keeps a held, jittery finger from flickering the state.
        electricOn = false;
      }
    }
    lastComparePercentage = percentage;
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
      function stopDragging() {
        dragging = false;
        if (typeof root.CustomEvent === 'function') {
          root.document.dispatchEvent(new root.CustomEvent('light:charging:stop'));
        }
      }
      compare.addEventListener('pointerdown', function start(event) {
        dragging = true;
        compare.setPointerCapture(event.pointerId);
        move(event);
      });
      compare.addEventListener('pointermove', move);
      compare.addEventListener('pointerup', stopDragging);
      compare.addEventListener('pointercancel', stopDragging);
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
      },
      onRelease: function stopCharging() {
        if (typeof root.CustomEvent === 'function') {
          root.document.dispatchEvent(new root.CustomEvent('light:charging:stop'));
        }
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

  function updateSpendingScrub(percentage, items, inset) {
    var clamped = Math.max(0, Math.min(100, percentage));
    var fill = root.document.getElementById('spendingTrackFill');
    if (fill) {
      var span = 100 - inset * 2;
      var fillPercent = span > 0 ? Math.max(0, Math.min(100, ((clamped - inset) / span) * 100)) : 0;
      fill.style.width = fillPercent + '%';
    }
    items.forEach(function grow(item) {
      var position = Number(item.dataset.position);
      var target = Number(item.dataset.targetHeight);
      var bar = item.querySelector('.spending-bar');
      if (!bar) {
        return;
      }
      var local = Math.max(0, Math.min(1, (clamped - position + 14) / 22));
      bar.style.height = (local * target) + '%';
      item.classList.toggle('is-grown', local > .92);
    });
    var nodes = root.document.querySelectorAll('#spendingTrack .spending-node');
    nodes.forEach(function toggleNode(node) {
      node.classList.toggle('is-passed', clamped >= Number(node.dataset.position) - 4);
    });
  }

  function autoFillSpendingChart() {
    var chart = root.document.getElementById('spendingChart');
    if (!chart) {
      return;
    }
    var items = Array.from(chart.querySelectorAll('.spending-item'));
    if (!items.length) {
      return;
    }
    var inset = 50 / items.length;

    if (reducedMotion || !root.gsap) {
      updateSpendingScrub(100, items, inset);
      return;
    }

    var state = { value: 0 };
    root.gsap.to(state, {
      value: 100,
      duration: 3.6,
      ease: 'power1.inOut',
      onUpdate: function tick() {
        updateSpendingScrub(state.value, items, inset);
      }
    });
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
