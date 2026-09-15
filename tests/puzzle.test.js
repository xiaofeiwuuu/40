const test = require('node:test');
const assert = require('node:assert/strict');

const puzzle = require('../assets/js/puzzle.js');

test('洗牌结果不会以完成状态开始', () => {
  assert.notDeepEqual(puzzle.createShuffledOrder(() => 0.5), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('交换不修改原数组且完成判断严格', () => {
  const original = [1, 0, 2, 3, 4, 5, 6, 7, 8];
  const result = puzzle.swap(original, 0, 1);

  assert.deepEqual(original, [1, 0, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(puzzle.isSolved(result), true);
  assert.equal(puzzle.isSolved([0, 1, 2, 3, 4, 5, 6, 8, 7]), false);
});

test('只报告一次移动中新归位的拼块', () => {
  const before = [1, 0, 2, 3, 4, 5, 6, 7, 8];
  const after = puzzle.swap(before, 0, 1);

  assert.deepEqual(puzzle.newlyCorrectSlots(before, after, [0, 1]), [0, 1]);
  assert.deepEqual(puzzle.newlyCorrectSlots(after, after, [0, 1]), []);
});

test('完成画面在两帧间循环交替', () => {
  let current = 0;
  const sequence = [];
  for (let index = 0; index < 4; index += 1) {
    current = puzzle.nextCompletionFrameIndex(current, 2);
    sequence.push(current);
  }
  assert.deepEqual(sequence, [1, 0, 1, 0]);
});

test('只有第九屏当前可见时才继续交替', () => {
  assert.equal(puzzle.shouldCycleCompletionFrames('s9', true), true);
  assert.equal(puzzle.shouldCycleCompletionFrames('s10', true), false);
  assert.equal(puzzle.shouldCycleCompletionFrames('s9', false), false);
});
