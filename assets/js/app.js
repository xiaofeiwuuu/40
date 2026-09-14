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
    if (audioContext) {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(function ignoreResumeError() {});
      }
      return audioContext;
    }

    var AudioContext = root.AudioContext || root.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }
    try {
      audioContext = new AudioContext();
    } catch (error) {
      audioContext = null;
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

  function buildCalendars() {
    var stage = byId('calendarStack');
    if (!stage || stage.children.length) {
      return;
    }

    content.calendarYears.forEach(function addCalendar(year, index) {
      var row = Math.floor(index / 10);
      var column = index % 10;
      var card = root.document.createElement('div');
      var image = root.document.createElement('img');
      var label = root.document.createElement('span');
      var x = (column - 4.5) * 17 + (row % 2 ? 8 : -5);
      var y = (row - 1.6) * 42 + (column % 3) * 3;
      var rotation = (column - 4.5) * 2.2 + (row - 1.5) * 1.7;

      card.className = 'calendar-card';
      card.style.zIndex = String(index + 1);
      card.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + rotation + 'deg)';
      image.dataset.src = 'assets/images/calendars/' + year + '.jpg';
      image.alt = year + '年台历封面';
      image.width = 480;
      image.height = 480;
      image.decoding = 'async';
      label.textContent = String(year);
      card.appendChild(image);
      card.appendChild(label);
      stage.appendChild(card);
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
    root.document.addEventListener('click', function handleAction(event) {
      var goButton = event.target.closest('[data-go]');
      var imageButton = event.target.closest('[data-open-image]');
      var videoButton = event.target.closest('[data-open-video]');
      var quizButton = event.target.closest('[data-open-quiz]');

      if (goButton) {
        unlockAudioContext();
        playCue(goButton.dataset.go === 's5' ? 'light' : 'page');
        goTo(goButton.dataset.go);
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
    if (current) {
      current.textContent = String(index + 1).padStart(2, '0');
    }
    if (progress) {
      progress.style.width = (((index + 1) / 11) * 100) + '%';
    }
    if (screenId !== 's10' && audio && !audio.paused) {
      audio.pause();
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
    buildCalendars();
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
      if (!cueMuted) {
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
