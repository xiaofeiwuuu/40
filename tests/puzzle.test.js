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
