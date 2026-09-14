const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../assets/js/core.js');

test('触控手机和平板进入完整体验', () => {
  assert.equal(core.getPresentationMode({ maxTouchPoints: 5, coarsePointer: true, finePointer: false, hover: false, width: 390, height: 844 }), 'experience');
  assert.equal(core.getPresentationMode({ maxTouchPoints: 5, coarsePointer: true, finePointer: false, hover: false, width: 1180, height: 820 }), 'experience');
});

test('精细指针电脑即使窗口较窄也显示扫码提示', () => {
  assert.equal(core.getPresentationMode({ maxTouchPoints: 0, coarsePointer: false, finePointer: true, hover: true, width: 700, height: 900 }), 'desktop-gate');
});

test('矮屏手机横屏要求旋转', () => {
  assert.equal(core.getPresentationMode({ maxTouchPoints: 5, coarsePointer: true, finePointer: false, hover: false, width: 844, height: 390 }), 'rotate-phone');
});

test('平板横屏保持完整体验', () => {
  assert.equal(core.getPresentationMode({ maxTouchPoints: 5, coarsePointer: true, finePointer: false, hover: false, width: 1024, height: 768 }), 'experience');
});

test('柱形高度使用线性比例并限制在零到一百', () => {
  assert.equal(core.chartHeight(1640, 1640), 100);
  assert.equal(core.chartHeight(820, 1640), 50);
  assert.equal(core.chartHeight(16, 1640), 16 / 16.4);
  assert.equal(core.chartHeight(-1, 1640), 0);
  assert.equal(core.chartHeight(1700, 1640), 100);
  assert.equal(core.chartHeight(10, 0), 0);
});

test('二维码只为已经部署的网页地址生成', () => {
  assert.equal(core.canCreateQr('https:'), true);
  assert.equal(core.canCreateQr('http:'), true);
  assert.equal(core.canCreateQr('file:'), false);
});

test('下一屏按既定顺序计算且末屏没有下一屏', () => {
  const ids = ['s1', 's2', 's3'];
  assert.equal(core.nextScreenId('s1', ids), 's2');
  assert.equal(core.nextScreenId('s3', ids), null);
  assert.equal(core.nextScreenId('missing', ids), null);
});

