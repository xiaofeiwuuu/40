(function attachPuzzle(root, factory) {
  var api = factory(root);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.H5Puzzle = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPuzzle(root) {
  'use strict';

  var solvedOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  function isSolved(order) {
    return Array.isArray(order)
      && order.length === solvedOrder.length
      && order.every(function checkPiece(piece, index) { return piece === index; });
  }

  function swap(order, firstIndex, secondIndex) {
    var next = Array.isArray(order) ? order.slice() : [];
    var temporary = next[firstIndex];
    next[firstIndex] = next[secondIndex];
    next[secondIndex] = temporary;
    return next;
  }

  function createShuffledOrder(random) {
    var rng = typeof random === 'function' ? random : Math.random;
    var order = solvedOrder.slice();

    for (var index = order.length - 1; index > 0; index -= 1) {
      var target = Math.floor(rng() * (index + 1));
      order = swap(order, index, target);
    }

    return isSolved(order) ? swap(order, 0, 1) : order;
  }

  function mount(options) {
    var settings = options || {};
    var board = settings.board;
    var success = settings.success;
    var hint = settings.hint;
    var skipButton = settings.skipButton;
    var order = createShuffledOrder(settings.random);
    var selectedIndex = null;
    var dragInstances = [];
    var destroyed = false;
    var skipTimer = null;

    if (!board) {
      return { destroy: function noop() {} };
    }

    function destroyDraggables() {
      dragInstances.forEach(function destroy(instance) {
        if (instance && typeof instance.kill === 'function') {
          instance.kill();
        }
      });
      dragInstances = [];
    }

    function markSolved(wasSkipped) {
      if (success) {
        success.hidden = false;
        success.textContent = wasSkipped ? '完整的40年，已经呈现在眼前。' : '好日子，是拼出来的。';
      }
      if (hint) {
        hint.hidden = true;
      }
      if (skipButton) {
        skipButton.hidden = true;
      }
      if (typeof settings.onSolved === 'function') {
        settings.onSolved(Boolean(wasSkipped));
      }
    }

    function findNearestSlot(piece, slotRects) {
      var rect = piece.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var nearest = 0;
      var nearestDistance = Infinity;

      slotRects.forEach(function compare(slotRect, index) {
        var x = slotRect.left + slotRect.width / 2;
        var y = slotRect.top + slotRect.height / 2;
        var distance = Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });

      return nearest;
    }

    function enableDragging() {
      var Draggable = root.Draggable;
      if (!Draggable || typeof Draggable.create !== 'function' || isSolved(order)) {
        return;
      }

      var pieces = Array.from(board.querySelectorAll('.puzzle-piece'));
      var slotRects = pieces.map(function getRect(piece) { return piece.getBoundingClientRect(); });

      pieces.forEach(function makeDraggable(piece, slotIndex) {
        var instances = Draggable.create(piece, {
          type: 'x,y',
          bounds: board,
          edgeResistance: 0.78,
          minimumMovement: 6,
          onDragStart: function onDragStart() {
            board.classList.add('is-dragging');
            piece.dataset.wasDragged = 'true';
            slotRects = Array.from(board.querySelectorAll('.puzzle-piece')).map(function getRect(item) {
              return item.getBoundingClientRect();
            });
          },
          onDragEnd: function onDragEnd() {
            var targetIndex = findNearestSlot(piece, slotRects);
            board.classList.remove('is-dragging');
            order = targetIndex === slotIndex ? order : swap(order, slotIndex, targetIndex);
            setTimeout(function allowClickAgain() { delete piece.dataset.wasDragged; }, 80);
            render();
          }
        });
        dragInstances = dragInstances.concat(instances || []);
      });
    }

    function handlePieceClick(event) {
      var piece = event.currentTarget;
      if (piece.dataset.wasDragged === 'true' || isSolved(order)) {
        return;
      }

      var slotIndex = Number(piece.dataset.slot);
      if (selectedIndex === null) {
        selectedIndex = slotIndex;
        piece.classList.add('is-selected');
        piece.setAttribute('aria-pressed', 'true');
        return;
      }

      if (selectedIndex === slotIndex) {
        selectedIndex = null;
        piece.classList.remove('is-selected');
        piece.setAttribute('aria-pressed', 'false');
        return;
      }

      order = swap(order, selectedIndex, slotIndex);
      selectedIndex = null;
      render();
    }

    function render() {
      if (destroyed) {
        return;
      }

      destroyDraggables();
      board.innerHTML = '';
      order.forEach(function renderPiece(pieceNumber, slotIndex) {
        var column = pieceNumber % 3;
        var row = Math.floor(pieceNumber / 3);
        var piece = document.createElement('button');
        piece.type = 'button';
        piece.className = 'puzzle-piece';
        piece.dataset.slot = String(slotIndex);
        piece.style.backgroundPosition = (column * 50) + '% ' + (row * 50) + '%';
        piece.setAttribute('aria-label', '拼图第' + (slotIndex + 1) + '格，图块' + (pieceNumber + 1));
        piece.setAttribute('aria-pressed', 'false');
        piece.innerHTML = '<span>' + String(slotIndex + 1).padStart(2, '0') + '</span>';
        piece.addEventListener('click', handlePieceClick);
        board.appendChild(piece);
      });

      if (isSolved(order)) {
        markSolved(false);
      } else {
        requestAnimationFrame(enableDragging);
      }
    }

    function skip() {
      order = solvedOrder.slice();
      render();
      markSolved(true);
    }

    function startSkipTimer() {
      clearTimeout(skipTimer);
      if (skipButton && !destroyed && !isSolved(order)) {
        skipButton.hidden = true;
        skipTimer = setTimeout(function revealSkip() {
          if (!destroyed && !isSolved(order)) {
            skipButton.hidden = false;
          }
        }, Number(settings.skipAfterMs) || 15000);
      }
    }

    if (skipButton) {
      skipButton.addEventListener('click', skip);
      if (settings.startSkipTimer !== false) {
        startSkipTimer();
      }
    }

    render();

    return {
      destroy: function destroy() {
        destroyed = true;
        clearTimeout(skipTimer);
        destroyDraggables();
        if (skipButton) {
          skipButton.removeEventListener('click', skip);
        }
        board.innerHTML = '';
      },
      getOrder: function getOrder() { return order.slice(); },
      skip: skip,
      startSkipTimer: startSkipTimer
    };
  }

  return {
    createShuffledOrder: createShuffledOrder,
    swap: swap,
    isSolved: isSolved,
    mount: mount
  };
}));
