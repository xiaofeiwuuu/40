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

test('第一、二屏使用同一红金时间叙事的独立背景', () => {
  const s1 = content.screens.find((screen) => screen.id === 's1');
  const s2 = content.screens.find((screen) => screen.id === 's2');

  assert.equal(s1.background, 'assets/images/scenes/s1-time-monument.webp');
  assert.equal(s1.titleImage, 'assets/images/scenes/s1-title-mark.png');
  assert.equal(s2.background, 'assets/images/scenes/s2-calendar-river-years.webp');
  assert.notEqual(s1.background, s2.background);
});

test('第三至第十屏及终章使用各自的叙事背景', () => {
  const backgrounds = Object.fromEntries(content.screens.map((screen) => [screen.id, screen.background]));

  assert.deepEqual({
    s3: backgrounds.s3,
    s4: backgrounds.s4,
    s5: backgrounds.s5,
    s6: backgrounds.s6,
    s7: backgrounds.s7,
    s8: backgrounds.s8,
    s9: backgrounds.s9,
    s10: backgrounds.s10,
    s11: backgrounds.s11
  }, {
    s3: 'assets/images/scenes/s3-writing-archive-bg.webp',
    s4: 'assets/images/scenes/s4-electric-light-bg.webp',
    s5: 'assets/images/scenes/s5-television-night-bg.webp',
    s6: 'assets/images/scenes/s6-tax-wheat-bg.webp',
    s7: 'assets/images/scenes/s7-good-life-bg.webp',
    s8: 'assets/images/scenes/s8-spending-new-year-bg.webp',
    s9: 'assets/images/scenes/s9-village-life-bg.webp',
    s10: 'assets/images/scenes/s10-legacy-room-bg.webp',
    s11: 'assets/images/scenes/s11-archive-finale-bg.webp'
  });
});

test('采访标签和答题跳转准确', () => {
  const s3 = content.screens.find((screen) => screen.id === 's3');
  const s10 = content.screens.find((screen) => screen.id === 's10');
  assert.equal(s3.mediaLabel, '播放陈治国自我介绍采访视频');
  assert.equal(s10.mediaLabel, '播放陈治国采访原声');
  assert.equal(content.quizzes.quiz1.next, 's7');
  assert.equal(content.quizzes.quiz2.next, 's10');
});

test('两道问答都用弹窗卡片底图并在答对一秒后关闭', () => {
  const quiz1 = content.quizzes.quiz1;
  const quiz2 = content.quizzes.quiz2;

  assert.equal(quiz1.autoOpenOn, 's7');
  assert.equal(quiz1.image, 'assets/images/scenes/quiz1-agricultural-tax.webp');
  assert.equal(quiz1.correctCloseDelayMs, 1000);
  assert.equal(quiz2.correctCloseDelayMs, 1000);
});

test('脱贫攻坚答题在第十屏自动打开并使用完整解析', () => {
  const quiz = content.quizzes.quiz2;
  assert.equal(quiz.autoOpenOn, 's10');
  assert.equal(quiz.mandatory, true);
  assert.equal(quiz.image, 'assets/images/scenes/quiz2-poverty-relief.webp');
  assert.equal(quiz.explanation, '2021年2月25日，习近平总书记在全国脱贫攻坚总结表彰大会上庄严宣告：我国脱贫攻坚战取得了全面胜利，现行标准下9899万农村贫困人口全部脱贫，832个贫困县全部摘帽，12.8万个贫困村全部出列，区域性整体贫困得到解决，完成了消除绝对贫困的艰巨任务，创造了又一个彪炳史册的人间奇迹。他同时强调，要切实做好巩固拓展脱贫攻坚成果同乡村振兴有效衔接各项工作，让脱贫基础更加稳固、成效更可持续。');
  assert.deepEqual(quiz.emphasis, ['2021', '2', '25', '9899', '832', '12.8']);
});

test('生活记录和年货开支均为四组', () => {
  assert.equal(content.lifeRecords.length, 4);
  assert.deepEqual(content.spending.map((item) => item.amount), [16, 79, 489, 1640]);
});

test('第九屏拼图完成后有两帧行人画面', () => {
  const s9 = content.screens.find((screen) => screen.id === 's9');
  assert.equal(s9.puzzleImage, 'assets/images/scenes/s9-good-life-base.webp');
  assert.deepEqual(s9.completionFrames, [
    'assets/images/scenes/s9-good-life-walk-a.webp',
    'assets/images/scenes/s9-good-life-walk-b.webp'
  ]);
});

test('四十个台历年份连续', () => {
  assert.equal(content.calendarYears.length, 40);
  assert.equal(content.calendarYears[0], 1987);
  assert.equal(content.calendarYears.at(-1), 2026);
});
