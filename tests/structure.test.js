const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const html = readFileSync(join(__dirname, '../index.html'), 'utf8');

test('文档包含设备提示和十一屏内容', () => {
  const ids = [
    'desktopGate', 'rotateGate', 'experience', 'appScroller',
    's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11'
  ];

  for (const id of ids) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('文档没有外部运行依赖', () => {
  assert.doesNotMatch(html, /fonts\.googleapis|cdnjs|unpkg|jsdelivr/);
});

test('生产脚本全部是延迟加载的经典脚本', () => {
  const scripts = [...html.matchAll(/<script([^>]*)src=["']([^"']+)["'][^>]*>/g)];
  assert.ok(scripts.length >= 8);

  for (const script of scripts) {
    assert.match(script[1], /defer/);
    assert.doesNotMatch(script[1], /type=["']module["']/);
  }
});

test('每屏都暴露主要交互钩子', () => {
  const hooks = [
    's1-start', 'calendar-flipbook', 'intro-video', 'light-compare', 'tv-video',
    'tax-video', 'life-cards', 'spending-chart', 'puzzle-board', 'legacy-audio',
    'poster-create'
  ];

  for (const hook of hooks) {
    assert.match(html, new RegExp(`data-hook=["']${hook}["']`));
  }
});

test('第九屏以上滑提示代替答题按钮', () => {
  const match = html.match(/<section class="screen screen-puzzle"[\s\S]*?<section class="screen screen-inheritance"/);
  assert.ok(match);
  assert.match(match[0], /class="scroll-hint"[^>]*>向上滑动</);
  assert.doesNotMatch(match[0], /data-open-quiz="quiz2"/);
  assert.doesNotMatch(match[0], />答题继续</);
});
