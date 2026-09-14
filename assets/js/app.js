(function startApplication(root) {
  'use strict';

  var core = root.H5Core;
  var content = root.H5Content;
  var media = root.H5Media;
  var poster = root.H5Poster;
  var puzzle = root.H5Puzzle;
  var scenes = root.H5Scenes;
  var desktopGate;
  var rotateGate;
  var experience;
  var scroller;
  var experienceBuilt = false;
  var scenesRunning = false;
  var puzzleController = null;
  var activeMode = null;
  var resizeTimer = null;
  var toastTimer = null;
  var audioContext = null;
  var cueMuted = false;
  var lifeIndex = 0;
  var lifeStartX = null;
  var quizTrigger = null;
  var puzzleTimerStarted = false;

  function byId(id) {
    return root.document.getElementById(id);
  }

  function showToast(message) {
    var toast = byId('toast');
    if (!toast) {
      return;
    }
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(function hideToast() { toast.hidden = true; }, 2400);
  }

  function readStoredMute() {
    try {
      return root.localStorage.getItem('h5-cue-muted') === '1';
    } catch (error) {
      return false;
    }
  }

  function storeMute(value) {
    try {
      root.localStorage.setItem('h5-cue-muted', value ? '1' : '0');
    } catch (error) {
      // Private browsing can disable storage; sound still works for this visit.
    }
  }

  function updateSoundButton() {
    var button = byId('soundToggle');
    if (!button) {
      return;
    }
    button.setAttribute('aria-pressed', cueMuted ? 'true' : 'false');
    button.setAttribute('aria-label', cueMuted ? '开启提示音' : '关闭提示音');
  }

  function unlockAudioContext() {
    if (!audioContext) {
      var AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) {
        return null;
      }
      try {
        audioContext = new AudioContext();
      } catch (error) {
        audioContext = null;
        return null;
      }
    }

    // iOS Safari routinely hands back a context that is still 'suspended'
    // even when the constructor ran inside a genuine gesture handler - it
    // has to be resumed explicitly, in that same gesture, every time we see
    // it suspended (construction included), or it never unlocks at all.
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(function ignoreResumeError() {});
    }
    return audioContext;
  }

  function playCue(kind) {
    if (cueMuted) {
      return;
    }
    var context = unlockAudioContext();
    if (!context) {
      return;
    }

    var frequencies = { page: 320, light: 520, snap: 410 };
    var oscillator = context.createOscillator();
    var gain = context.createGain();
    var now = context.currentTime;
    oscillator.type = kind === 'light' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequencies[kind] || frequencies.page, now);
    oscillator.frequency.exponentialRampToValueAtTime((frequencies[kind] || 320) * 1.18, now + .08);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.045, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .13);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + .15);
  }

  var openingSoundReadyAt = 0;
  var openingSoundWindowMs = 0;
  var openingSoundStarted = false;
  var openingSoundPrimed = false;

  function primeOpeningSound() {
    var audio = byId('openingPenSound');
    if (!audio || openingSoundPrimed) {
      return;
    }
    // Media elements remember, per element, that a real user gesture once
    // allowed them to play - a play()+immediate pause() inside the first
    // gesture "banks" that permission so a later un-gestured play() (once
    // the ink-schedule fires or the reveal is still running) is allowed.
    var primer = audio.play();
    if (primer && typeof primer.then === 'function') {
      primer.then(function pauseAfterPrime() {
        audio.pause();
        audio.currentTime = 0;
        openingSoundPrimed = true;
        attemptOpeningSound();
      }).catch(function ignorePrimeFailure() {});
    }
  }

  function attemptOpeningSound() {
    var audio = byId('openingPenSound');
    if (!audio || cueMuted || openingSoundStarted) {
      return;
    }
    if (openingSoundReadyAt && Date.now() - openingSoundReadyAt > openingSoundWindowMs + 600) {
      // The handwriting has already finished settling - starting the clip
      // now would just be a stray noise with nothing on screen to match.
      return;
    }
    audio.currentTime = 0;
    var playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.then(function markStarted() { openingSoundStarted = true; }).catch(function ignoreBlocked() {});
    } else {
      openingSoundStarted = true;
    }
  }

  function formatTime(seconds) {
    var safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    var minutes = Math.floor(safe / 60);
    var remainder = Math.floor(safe % 60);
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function getMode() {
    var preview = new URLSearchParams(root.location.search).get('preview');
    if (preview === 'touch') {
      return 'experience';
    }
    return core.getPresentationMode(core.readCapabilities(root));
  }

  function makeQr(container, note) {
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (!core.canCreateQr(root.location.protocol)) {
      container.textContent = '部署到网页后显示二维码';
      if (note) {
        note.textContent = '本地文件暂无可供手机访问的网址';
      }
      return;
    }
    if (typeof root.QRCode !== 'function') {
      container.textContent = '二维码组件未能加载';
      return;
    }

    new root.QRCode(container, {
      text: root.location.href.split('#')[0],
      width: 160,
      height: 160,
      colorDark: '#211a14',
      colorLight: '#f9f3e6',
      correctLevel: root.QRCode.CorrectLevel ? root.QRCode.CorrectLevel.M : undefined
    });
  }

  var STACK_DEPTH = 3;
  var STACK_POSITIONS = [
    { x: 0, y: 0, r: 0 },
    { x: 14, y: -10, r: 7 },
    { x: -16, y: -16, r: -9 }
  ];
  var EXPAND_COPIES = 3;
  var stackIndex = 0;
  var stackCards = [];
  var stackDraggableInstance = null;
  var stackReducedMotion = false;
  var expandOpen = false;
  var expandBuilt = false;
  var expandWrapTimer = null;

  function setStackCardYear(card, year) {
    var image = card.querySelector('img');
    var label = card.querySelector('.flip-year');
    var alt = year + '年台历封面';
    image.src = 'assets/images/calendars/' + year + '.jpg';
    image.alt = alt;
    if (label) {
      label.textContent = String(year);
    }
    card.dataset.year = String(year);
    card.setAttribute('aria-label', '当前展示' + alt + '，左右滑动查看上一本/下一本，双击展开选择');
  }

  function layoutStackCard(card, depth, animate) {
    var gsap = root.gsap;
    var pos = STACK_POSITIONS[depth] || STACK_POSITIONS[STACK_POSITIONS.length - 1];
    var visible = depth < STACK_DEPTH && Boolean(content.calendarYears[stackIndex + depth]);
    card.style.zIndex = String(STACK_DEPTH - depth);
    card.style.pointerEvents = depth === 0 ? 'auto' : 'none';
    card.style.cursor = depth === 0 ? 'grab' : 'default';
    var state = { x: pos.x, y: pos.y, rotation: pos.r, scale: 1 - depth * .03, opacity: visible ? 1 : 0 };
    if (gsap && !stackReducedMotion && animate) {
      gsap.to(card, Object.assign({ duration: .32, ease: 'power2.out' }, state));
    } else if (gsap) {
      gsap.set(card, state);
    } else {
      card.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) rotate(' + state.rotation + 'deg) scale(' + state.scale + ')';
      card.style.opacity = String(state.opacity);
    }
  }

  function snapFrontBack() {
    var gsap = root.gsap;
    if (gsap) {
      gsap.to(stackCards[0], { x: 0, y: 0, rotation: 0, duration: .32, ease: 'back.out(1.6)' });
    }
  }

  function enableFrontDrag() {
    var Draggable = root.Draggable;
    var gsap = root.gsap;
    var front = stackCards[0];
    if (stackDraggableInstance) {
      stackDraggableInstance.kill();
      stackDraggableInstance = null;
    }
    if (!Draggable || !front || expandOpen) {
      return;
    }
    var instances = Draggable.create(front, {
      type: 'x,y',
      minimumMovement: 6,
      onDragStart: function markDragged() {
        front.dataset.wasDragged = 'true';
      },
      onDrag: function tilt() {
        if (gsap) {
          gsap.set(front, { rotation: this.x / 16 });
        }
      },
      onDragEnd: function release() {
        var threshold = 68;
        if (Math.abs(this.x) > threshold || Math.abs(this.y) > threshold) {
          stepStack(this.x < 0 ? -1 : 1);
        } else {
          snapFrontBack();
        }
        setTimeout(function allowClickAgain() { delete front.dataset.wasDragged; }, 60);
      }
    });
    stackDraggableInstance = instances && instances[0];
  }

  function updateStackExpandButton() {
    var button = byId('stackExpandBtn');
    if (!button) {
      return;
    }
    button.textContent = expandOpen ? '收起' : '展开选择';
    button.setAttribute('aria-pressed', expandOpen ? 'true' : 'false');
  }

  function buildCalendarExpand() {
    var list = byId('calendarExpand');
    if (!list || expandBuilt) {
      return;
    }
    var years = content.calendarYears;
    for (var copy = 0; copy < EXPAND_COPIES; copy += 1) {
      years.forEach(function addItem(year) {
        var item = root.document.createElement('button');
        var image = root.document.createElement('img');
        var label = root.document.createElement('span');
        item.type = 'button';
        item.className = 'expand-item';
        image.width = 200;
        image.height = 267;
        image.decoding = 'async';
        label.className = 'flip-year';
        item.appendChild(image);
        item.appendChild(label);
        setStackCardYear(item, year);
        item.setAttribute('aria-label', year + '年台历封面，点击选择这一本');
        list.appendChild(item);
      });
    }
    expandBuilt = true;
  }

  function handleExpandScroll() {
    var list = byId('calendarExpand');
    if (!list || expandWrapTimer) {
      return;
    }
    expandWrapTimer = root.requestAnimationFrame(function checkWrap() {
      expandWrapTimer = null;
      var copyWidth = list.scrollWidth / EXPAND_COPIES;
      if (list.scrollLeft < copyWidth * .5) {
        list.scrollLeft += copyWidth;
      } else if (list.scrollLeft > copyWidth * 1.5) {
        list.scrollLeft -= copyWidth;
      }
    });
  }

  function openCalendarExpand() {
    var flipbook = byId('calendarFlipbook');
    var list = byId('calendarExpand');
    if (!list || !flipbook || expandOpen) {
      return;
    }
    expandOpen = true;
    updateStackExpandButton();
    if (stackDraggableInstance) {
      stackDraggableInstance.kill();
      stackDraggableInstance = null;
    }
    flipbook.hidden = true;
    list.hidden = false;
    buildCalendarExpand();

    var years = content.calendarYears;
    var firstItem = list.querySelector('.expand-item');
    if (firstItem) {
      var itemSpan = firstItem.getBoundingClientRect().width + 8;
      list.scrollLeft = (years.length + stackIndex) * itemSpan - (list.clientWidth - itemSpan) / 2;
    }
  }

  function closeCalendarExpand(selectedYear) {
    var flipbook = byId('calendarFlipbook');
    var list = byId('calendarExpand');
    if (!expandOpen) {
      return;
    }
    expandOpen = false;
    updateStackExpandButton();
    if (list) {
      list.hidden = true;
    }
    if (flipbook) {
      flipbook.hidden = false;
    }
    if (selectedYear != null) {
      jumpStackToYear(selectedYear);
    }
    enableFrontDrag();
  }

  function toggleCalendarExpand() {
    if (expandOpen) {
      closeCalendarExpand();
    } else {
      openCalendarExpand();
    }
  }

  function jumpStackToYear(year) {
    var years = content.calendarYears;
    var index = years.indexOf(year);
    if (index < 0 || index === stackIndex) {
      return;
    }
    stackIndex = index;
    stackCards.forEach(function updateCard(card, depth) {
      var cardYear = years[stackIndex + depth];
      if (cardYear) {
        setStackCardYear(card, cardYear);
      }
      layoutStackCard(card, depth, false);
    });
    root.document.dispatchEvent(new root.CustomEvent('calendar:flip'));
  }

  function stepStackForward(swipeDir, front) {
    var gsap = root.gsap;
    var recycle = function afterExit() {
      stackCards.push(stackCards.shift());
      var backYear = content.calendarYears[stackIndex + STACK_DEPTH - 1];
      if (backYear) {
        setStackCardYear(stackCards[STACK_DEPTH - 1], backYear);
      }
      stackCards.forEach(function relayout(card, depth) { layoutStackCard(card, depth, true); });
      enableFrontDrag();
    };

    if (gsap && !stackReducedMotion) {
      gsap.to(front, {
        x: swipeDir * 420,
        y: -30,
        rotation: swipeDir * 22,
        opacity: 0,
        duration: .26,
        ease: 'power1.in',
        onComplete: recycle
      });
    } else {
      recycle();
    }
  }

  function stepStackBackward(swipeDir) {
    var gsap = root.gsap;
    // The dragged card isn't discarded - it just settles one layer back into the
    // pile, while the previous year's card is pulled from the back of the pool
    // and flies in from off-screen to take the front position.
    stackCards.unshift(stackCards.pop());
    var incoming = stackCards[0];
    setStackCardYear(incoming, content.calendarYears[stackIndex]);
    if (gsap) {
      gsap.set(incoming, { x: swipeDir * 420, y: -30, rotation: swipeDir * 22, opacity: 0 });
    }
    stackCards.forEach(function relayout(card, depth) { layoutStackCard(card, depth, true); });
    enableFrontDrag();
  }

  function stepStack(swipeDir) {
    var front = stackCards[0];
    var indexStep = swipeDir < 0 ? 1 : -1;
    var nextIndex = stackIndex + indexStep;
    if (!front || nextIndex < 0 || nextIndex >= content.calendarYears.length) {
      snapFrontBack();
      return;
    }
    if (stackDraggableInstance) {
      stackDraggableInstance.kill();
      stackDraggableInstance = null;
    }
    root.document.dispatchEvent(new root.CustomEvent('calendar:flip'));
    stackIndex = nextIndex;

    if (indexStep > 0) {
      stepStackForward(swipeDir, front);
    } else {
      stepStackBackward(swipeDir);
    }
  }

  function buildCalendarStack() {
    var book = byId('calendarFlipbook');
    if (!book || book.children.length) {
      return;
    }

    stackReducedMotion = Boolean(root.matchMedia) && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stackIndex = 0;

    for (var depth = 0; depth < STACK_DEPTH; depth += 1) {
      var card = root.document.createElement('button');
      var image = root.document.createElement('img');
      var label = root.document.createElement('span');

      card.type = 'button';
      card.className = 'stack-card';
      image.width = 240;
      image.height = 320;
      image.decoding = 'async';
      label.className = 'flip-year';

      card.appendChild(image);
      card.appendChild(label);
      book.appendChild(card);
      stackCards.push(card);

      if (content.calendarYears[depth]) {
        setStackCardYear(card, content.calendarYears[depth]);
      }
      layoutStackCard(card, depth, false);
    }

    enableFrontDrag();
  }

  function preloadCalendarImages() {
    content.calendarYears.forEach(function preload(year) {
      var probe = new Image();
      probe.src = 'assets/images/calendars/' + year + '.jpg';
    });
  }

  function buildLifeCards() {
    var track = byId('lifeTrack');
    if (!track || track.children.length) {
      return;
    }

    content.lifeRecords.forEach(function addRecord(record) {
      var article = root.document.createElement('article');
      article.className = 'life-card';
      article.innerHTML = [
        '<div class="life-card-inner">',
        '<button type="button" data-open-image="', record.image, '" data-alt="', record.year, '年生活台历原稿">',
        '<img data-src="', record.image, '" alt="', record.year, '年生活台历原稿" width="1600" height="900">',
        '<span class="life-card-year">', record.year, '</span>',
        '<blockquote>', record.text, '</blockquote>',
        '</button>',
        '</div>'
      ].join('');
      track.appendChild(article);
    });
    updateLifeCarousel();
  }

  function updateLifeCarousel() {
    var track = byId('lifeTrack');
    var current = byId('lifeCurrent');
    if (track) {
      track.style.transform = 'translateX(' + (-lifeIndex * 100) + '%)';
    }
    if (current) {
      current.textContent = String(lifeIndex + 1);
    }
  }

  function moveLife(direction) {
    lifeIndex = (lifeIndex + direction + content.lifeRecords.length) % content.lifeRecords.length;
    updateLifeCarousel();
    playCue('page');
    if (scenes && scenes.loadImages) {
      scenes.loadImages(byId('s7'));
    }
  }

  function setupLifeCarousel() {
    var carousel = root.document.querySelector('.life-carousel');
    byId('lifePrev').addEventListener('click', function previous() { moveLife(-1); });
    byId('lifeNext').addEventListener('click', function next() { moveLife(1); });
    if (!carousel) {
      return;
    }
    carousel.addEventListener('pointerdown', function startSwipe(event) {
      lifeStartX = event.clientX;
    });
    carousel.addEventListener('pointerup', function finishSwipe(event) {
      if (lifeStartX === null) {
        return;
      }
      var distance = event.clientX - lifeStartX;
      lifeStartX = null;
      if (Math.abs(distance) > 42) {
        moveLife(distance < 0 ? 1 : -1);
      }
    });
    carousel.addEventListener('pointercancel', function cancelSwipe() { lifeStartX = null; });
  }

  function buildSpendingChart() {
    var chart = byId('spendingChart');
    if (!chart || chart.children.length) {
      return;
    }
    var maximum = Math.max.apply(null, content.spending.map(function amount(item) { return item.amount; }));
    content.spending.forEach(function addBar(item) {
      var button = root.document.createElement('button');
      var percentage = core.chartHeight(item.amount, maximum);
      button.type = 'button';
      button.className = 'spending-item';
      button.dataset.openImage = item.image;
      button.dataset.alt = item.year + '年年货开支台历原稿：' + item.text;
      button.setAttribute('aria-label', item.year + '年年货开支' + item.amount + '元，点击查看原稿');
      button.innerHTML = [
        '<span class="spending-amount">¥', item.amount, '</span>',
        '<i class="spending-bar" style="height:', percentage, '%"></i>',
        '<span class="spending-year">', item.year, '</span>'
      ].join('');
      chart.appendChild(button);
    });
  }

  function closeQuiz() {
    var dialog = byId('quizDialog');
    if (!dialog || dialog.hidden) {
      return;
    }
    dialog.hidden = true;
    root.document.body.classList.remove('modal-open');
    if (quizTrigger && typeof quizTrigger.focus === 'function') {
      quizTrigger.focus({ preventScroll: true });
    }
    quizTrigger = null;
  }

  function goTo(screenId) {
    var target = byId(screenId);
    if (!target) {
      return;
    }
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function openQuiz(key, trigger) {
    var quiz = content.quizzes[key];
    var dialog = byId('quizDialog');
    var panel = byId('quizPanel');
    if (!quiz || !dialog || !panel) {
      return;
    }

    quizTrigger = trigger || root.document.activeElement;
    panel.innerHTML = '';
    var closeButton = root.document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'quiz-close';
    closeButton.setAttribute('aria-label', '稍后再答');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeQuiz);
    panel.appendChild(closeButton);

    var kicker = root.document.createElement('p');
    kicker.className = 'quiz-kicker';
    kicker.textContent = '时代小问答';
    panel.appendChild(kicker);

    var title = root.document.createElement('h2');
    title.id = 'quizTitle';
    title.textContent = quiz.question;
    panel.appendChild(title);

    var options = root.document.createElement('div');
    options.className = 'quiz-options';
    quiz.options.forEach(function addOption(option, index) {
      var button = root.document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.innerHTML = '<b>' + String.fromCharCode(65 + index) + '</b><span>' + option + '</span>';
      button.addEventListener('click', function answer() {
        var allOptions = Array.from(options.querySelectorAll('.quiz-option'));
        allOptions.forEach(function disable(item) { item.disabled = true; });
        button.classList.add(index === quiz.correct ? 'is-correct' : 'is-wrong');
        allOptions[quiz.correct].classList.add('is-correct');
        feedback.hidden = false;
        nextButton.hidden = false;
        playCue(index === quiz.correct ? 'light' : 'page');
        nextButton.focus();
      });
      options.appendChild(button);
    });
    panel.appendChild(options);

    var feedback = root.document.createElement('p');
    feedback.className = 'quiz-feedback';
    feedback.textContent = quiz.explanation;
    feedback.hidden = true;
    panel.appendChild(feedback);

    var nextButton = root.document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'primary-button quiz-next';
    nextButton.textContent = '继续阅读 →';
    nextButton.hidden = true;
    nextButton.addEventListener('click', function continueReading() {
      var next = quiz.next;
      closeQuiz();
      goTo(next);
    });
    panel.appendChild(nextButton);

    dialog.hidden = false;
    root.document.body.classList.add('modal-open');
    closeButton.focus({ preventScroll: true });
  }

  function setupAudio() {
    var audio = byId('inheritanceAudio');
    var button = byId('audioButton');
    var icon = button ? button.querySelector('.audio-icon') : null;
    var time = byId('audioTime');
    if (!audio || !button) {
      return;
    }

    function updateTime() {
      var duration = Number.isFinite(audio.duration) ? audio.duration : 8.9;
      time.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(duration);
    }

    button.addEventListener('click', function toggleAudio() {
      if (audio.paused) {
        media.pauseAll();
        audio.play().catch(function failed() { showToast('音频暂时无法播放，请稍后重试'); });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('play', function playing() {
      button.classList.add('is-playing');
      button.setAttribute('aria-pressed', 'true');
      if (icon) { icon.textContent = 'Ⅱ'; }
    });
    audio.addEventListener('pause', function paused() {
      button.classList.remove('is-playing');
      button.setAttribute('aria-pressed', 'false');
      if (icon) { icon.textContent = '▶'; }
    });
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('ended', updateTime);
  }

  function setupDelegatedActions() {
    var openingAudio = byId('openingPenSound');
    if (openingAudio) {
      openingAudio.volume = .6;
    }

    ['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach(function armEarlyUnlock(type) {
      root.document.addEventListener(type, function earlyUnlock() {
        unlockAudioContext();
        primeOpeningSound();
        attemptOpeningSound();
      }, { once: true, passive: true });
    });

    root.document.addEventListener('s1:ink-schedule', function onOpeningInk(event) {
      var detail = event.detail || {};
      openingSoundReadyAt = Date.now();
      openingSoundWindowMs = Number(detail.totalMs) || 3800;
      attemptOpeningSound();
    });

    root.document.addEventListener('calendar:flip', function onCalendarFlip() {
      playCue('page');
    });

    var flipbook = byId('calendarFlipbook');
    if (flipbook) {
      // Native dblclick is unreliable on touch - many mobile browsers only
      // synthesize it when pinch-zoom is enabled, which this page disables
      // via the viewport meta tag. Detect the double-tap ourselves instead.
      var lastTapTime = 0;
      var lastTapX = 0;
      var lastTapY = 0;
      flipbook.addEventListener('pointerup', function onFlipbookTap(event) {
        var draggedCard = event.target.closest('.stack-card');
        if (draggedCard && draggedCard.dataset.wasDragged === 'true') {
          return;
        }
        var now = Date.now();
        var dx = event.clientX - lastTapX;
        var dy = event.clientY - lastTapY;
        var isDoubleTap = (now - lastTapTime) < 400 && (dx * dx + dy * dy) < 1600;
        lastTapTime = isDoubleTap ? 0 : now;
        lastTapX = event.clientX;
        lastTapY = event.clientY;
        if (isDoubleTap) {
          event.preventDefault();
          unlockAudioContext();
          playCue('page');
          toggleCalendarExpand();
        }
      });
    }

    var stackExpandButton = byId('stackExpandBtn');
    if (stackExpandButton) {
      stackExpandButton.addEventListener('click', function onExpandClick() {
        unlockAudioContext();
        playCue('page');
        toggleCalendarExpand();
      });
    }

    var calendarExpandList = byId('calendarExpand');
    if (calendarExpandList) {
      calendarExpandList.addEventListener('scroll', handleExpandScroll, { passive: true });
    }

    root.document.addEventListener('click', function handleAction(event) {
      var goButton = event.target.closest('[data-go]');
      var imageButton = event.target.closest('[data-open-image]');
      var videoButton = event.target.closest('[data-open-video]');
      var quizButton = event.target.closest('[data-open-quiz]');
      var expandItem = event.target.closest('.expand-item');

      if (goButton) {
        unlockAudioContext();
        playCue(goButton.dataset.go === 's5' ? 'light' : 'page');
        goTo(goButton.dataset.go);
        return;
      }
      if (expandItem) {
        unlockAudioContext();
        playCue('page');
        closeCalendarExpand(Number(expandItem.dataset.year));
        return;
      }
      if (imageButton) {
        media.openImage(imageButton.dataset.openImage, imageButton.dataset.alt, imageButton);
        return;
      }
      if (videoButton) {
        media.openVideo(videoButton.dataset.openVideo, videoButton.dataset.poster, videoButton);
        return;
      }
      if (quizButton) {
        openQuiz(quizButton.dataset.openQuiz, quizButton);
      }
    });

    var quizDialog = byId('quizDialog');
    quizDialog.addEventListener('click', function closeBackdrop(event) {
      if (event.target === quizDialog) {
        closeQuiz();
      }
    });
    root.document.addEventListener('keydown', function escapeQuiz(event) {
      if (event.key === 'Escape' && !quizDialog.hidden) {
        closeQuiz();
      }
    });
  }

  function updateProgress(screenId, index) {
    var current = byId('currentScreen');
    var progress = byId('progressBar');
    var audio = byId('inheritanceAudio');
    var openingAudio = byId('openingPenSound');
    if (current) {
      current.textContent = String(index + 1).padStart(2, '0');
    }
    if (progress) {
      progress.style.width = (((index + 1) / 11) * 100) + '%';
    }
    if (screenId !== 's10' && audio && !audio.paused) {
      audio.pause();
    }
    if (screenId !== 's1' && openingAudio && !openingAudio.paused) {
      openingAudio.pause();
    }
    if (screenId === 's9' && puzzleController && !puzzleTimerStarted) {
      puzzleTimerStarted = true;
      puzzleController.startSkipTimer();
    }
  }

  function buildExperience() {
    if (experienceBuilt) {
      return;
    }
    buildCalendarStack();
    preloadCalendarImages();
    buildLifeCards();
    buildSpendingChart();
    setupLifeCarousel();
    setupAudio();
    setupDelegatedActions();

    media.init();
    poster.init({ quotes: content.posterQuotes });
    byId('openPoster').addEventListener('click', function openPoster() { poster.open(this); });

    var puzzleBoard = byId('puzzleBoard');
    puzzleBoard.style.setProperty('--puzzle-image', 'url("../images/donation/02.jpg")');
    puzzleController = puzzle.mount({
      board: puzzleBoard,
      success: byId('puzzleSuccess'),
      hint: byId('puzzleHint'),
      skipButton: byId('skipPuzzle'),
      skipAfterMs: 15000,
      startSkipTimer: false,
      onSolved: function puzzleSolved(wasSkipped) {
        if (!wasSkipped) {
          playCue('snap');
        }
      }
    });

    cueMuted = readStoredMute();
    updateSoundButton();
    byId('soundToggle').addEventListener('click', function toggleSound() {
      cueMuted = !cueMuted;
      storeMute(cueMuted);
      updateSoundButton();
      if (cueMuted) {
        var openingAudio = byId('openingPenSound');
        if (openingAudio && !openingAudio.paused) {
          openingAudio.pause();
        }
      } else {
        playCue('page');
      }
    });
    experienceBuilt = true;
  }

  function startScenes() {
    if (scenesRunning) {
      return;
    }
    scenes.init({ scroller: scroller, onActive: updateProgress });
    scenesRunning = true;
  }

  function stopScenes() {
    if (!scenesRunning) {
      return;
    }
    scenes.destroy();
    scenesRunning = false;
  }

  function showMode(mode) {
    if (mode === activeMode) {
      return;
    }
    activeMode = mode;
    desktopGate.hidden = true;
    rotateGate.hidden = true;
    experience.hidden = true;

    if (mode === 'desktop-gate') {
      stopScenes();
      media.pauseAll();
      desktopGate.hidden = false;
      makeQr(byId('desktopQr'), byId('desktopQrNote'));
    } else if (mode === 'rotate-phone') {
      stopScenes();
      media.pauseAll();
      rotateGate.hidden = false;
    } else {
      buildExperience();
      experience.hidden = false;
      startScenes();
    }
    root.document.body.classList.remove('is-booting');
  }

  function scheduleModeCheck() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function checkMode() { showMode(getMode()); }, 150);
  }

  function boot() {
    if (!core || !content || !media || !poster || !puzzle || !scenes) {
      root.document.body.classList.remove('is-booting');
      desktopGate = byId('desktopGate');
      desktopGate.hidden = false;
      byId('desktopQr').textContent = '页面组件加载失败，请刷新重试';
      return;
    }

    desktopGate = byId('desktopGate');
    rotateGate = byId('rotateGate');
    experience = byId('experience');
    scroller = byId('appScroller');
    root.addEventListener('resize', scheduleModeCheck, { passive: true });
    root.addEventListener('orientationchange', scheduleModeCheck, { passive: true });
    showMode(getMode());
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
