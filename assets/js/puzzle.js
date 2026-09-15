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

  function newlyCorrectSlots(before, after, candidateSlots) {
    if (!Array.isArray(before) || !Array.isArray(after) || !Array.isArray(candidateSlots)) {
      return [];
    }
    return candidateSlots.filter(function becameCorrect(slot) {
      return before[slot] !== slot && after[slot] === slot;
    });
  }

  function nextCompletionFrameIndex(currentIndex, frameCount) {
    var count = Math.max(1, Math.floor(Number(frameCount) || 0));
    var current = Math.max(0, Math.floor(Number(currentIndex) || 0));
    return (current + 1) % count;
  }

  function shouldCycleCompletionFrames(activeScreenId, completionReady) {
    return activeScreenId === 's9' && Boolean(completionReady);
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
    var completionAnnounced = false;

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
      if (completionAnnounced) {
        return;
      }
      completionAnnounced = true;
      if (success) {
        success.hidden = false;
        success.textContent = '好日子，是拼出来的。';
      }
      if (hint) {
        hint.hidden = true;
      }
      if (skipButton) {
        skipButton.hidden = true;
      }
      if (typeof settings.onSolved === 'function') {
        setTimeout(function announceCompletion() {
          settings.onSolved(Boolean(wasSkipped));
        }, wasSkipped ? 0 : 260);
      }
    }

    function announceCorrectSlots(slots) {
      slots.forEach(function announce(slot, index) {
        setTimeout(function showSnap() {
          var piece = board.querySelector('[data-slot="' + slot + '"]');
          if (piece) {
            piece.classList.add('is-correct-pop');
          }
          if (typeof settings.onCorrectPlacement === 'function') {
            settings.onCorrectPlacement({ slot: slot, piece: order[slot], element: piece });
          }
        }, index * 90);
      });
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

      var allPieces = Array.from(board.querySelectorAll('.puzzle-piece'));
      var pieces = Array.from(board.querySelectorAll('.puzzle-piece:not(:disabled)'));
      var slotRects = allPieces.map(function getRect(piece) { return piece.getBoundingClientRect(); });

      pieces.forEach(function makeDraggable(piece) {
        var slotIndex = Number(piece.dataset.slot);
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
            var targetIsLocked = order[targetIndex] === targetIndex && targetIndex !== slotIndex;
            var nextOrder = targetIndex === slotIndex || targetIsLocked
              ? order
              : swap(order, slotIndex, targetIndex);
            var correctSlots = newlyCorrectSlots(order, nextOrder, [slotIndex, targetIndex]);
            board.classList.remove('is-dragging');
            order = nextOrder;
            setTimeout(function allowClickAgain() { delete piece.dataset.wasDragged; }, 80);
            render(correctSlots, false);
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

      var previousOrder = order;
      var nextOrder = swap(order, selectedIndex, slotIndex);
      var correctSlots = newlyCorrectSlots(previousOrder, nextOrder, [selectedIndex, slotIndex]);
      order = nextOrder;
      selectedIndex = null;
      render(correctSlots, false);
    }

    function render(correctSlots, wasSkipped) {
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
        piece.className = 'puzzle-piece' + (pieceNumber === slotIndex ? ' is-locked' : '');
        piece.dataset.slot = String(slotIndex);
        piece.style.backgroundPosition = (column * 50) + '% ' + (row * 50) + '%';
        piece.setAttribute('aria-label', '拼图第' + (slotIndex + 1) + '格，图块' + (pieceNumber + 1) + (pieceNumber === slotIndex ? '，已拼对' : ''));
        piece.setAttribute('aria-pressed', 'false');
        piece.innerHTML = '<span>' + String(slotIndex + 1).padStart(2, '0') + '</span>';
        if (pieceNumber === slotIndex) {
          piece.disabled = true;
        } else {
          piece.addEventListener('click', handlePieceClick);
        }
        board.appendChild(piece);
      });

      announceCorrectSlots(correctSlots || []);

      if (isSolved(order)) {
        markSolved(Boolean(wasSkipped));
      } else {
        requestAnimationFrame(enableDragging);
      }
    }

    function skip() {
      order = solvedOrder.slice();
      render([], true);
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

    render([], false);

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
    newlyCorrectSlots: newlyCorrectSlots,
    nextCompletionFrameIndex: nextCompletionFrameIndex,
    shouldCycleCompletionFrames: shouldCycleCompletionFrames,
    isSolved: isSolved,
    mount: mount
  };
}));
