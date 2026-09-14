const test = require('node:test');
const assert = require('node:assert/strict');

const content = require('../assets/js/content.js');

test('内容严格定义十一屏顺序', () => {
  assert.deepEqual(content.screens.map((screen) => screen.id), ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11']);
});

test('首屏和第四屏使用修正后的发布文案', () => {
  const s1 = content.screens.find((screen) => screen.id === 's1');
  const s4 = content.screens.find((screen) => screen.id === 's4');
  assert.equal(s1.lead, '2026年9月28日，巴中市平昌县元山镇元山社区85岁老党员陈治国，将自己连续记录了40年的40本台历，郑重捐给县档案馆，为共和国生日献上了一份特殊的礼物。');
  assert.equal(s4.quote, '1987年7月14日，特请张公电管所管电员王云述来家，在土墙上安好正规线路、插座和开关，正式安全用电。');
});

test('采访标签和答题跳转准确', () => {
  const s3 = content.screens.find((screen) => screen.id === 's3');
  const s10 = content.screens.find((screen) => screen.id === 's10');
  assert.equal(s3.mediaLabel, '播放陈治国自我介绍采访视频');
  assert.equal(s10.mediaLabel, '播放陈治国采访原声');
  assert.equal(content.quizzes.quiz1.next, 's7');
  assert.equal(content.quizzes.quiz2.next, 's10');
});

test('生活记录和年货开支均为四组', () => {
  assert.equal(content.lifeRecords.length, 4);
  assert.deepEqual(content.spending.map((item) => item.amount), [16, 79, 489, 1640]);
});

test('四十个台历年份连续', () => {
  assert.equal(content.calendarYears.length, 40);
  assert.equal(content.calendarYears[0], 1987);
  assert.equal(content.calendarYears.at(-1), 2026);
});

