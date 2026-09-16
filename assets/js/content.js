(function attachContent(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.H5Content = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createContent() {
  'use strict';

  var calendarYears = Array.from({ length: 40 }, function makeYear(_, index) {
    return 1987 + index;
  });

  var screens = [
    {
      id: 's1',
      chapter: '打开时间',
      eyebrow: '一份献给时间的礼物',
      title: '40本台历 见证变迁',
      titleImage: 'assets/images/scenes/s1-title-mark.png',
      background: 'assets/images/scenes/s1-time-monument.webp',
      lead: '2026年9月28日，巴中市平昌县元山镇元山社区85岁老党员陈治国，将自己连续记录了40年的40本台历，郑重捐给县档案馆，为共和国生日献上了一份特殊的礼物。'
    },
    {
      id: 's2',
      chapter: '打开时间',
      eyebrow: '1987—2026',
      title: '翻开40年',
      background: 'assets/images/scenes/s2-calendar-river-years.webp',
      subtitle: '一位老党员40本台历里的家国变迁'
    },
    {
      id: 's3',
      chapter: '记录改变',
      eyebrow: '初心 · 根脉',
      title: '笔从未停歇',
      background: 'assets/images/scenes/s3-writing-archive-bg.webp',
      quote: '1987年正月初一，他在第一本台历上写下：“新的一年，希望日子越过越好。”40年，14600多个日夜，他的笔从未停歇。',
      mediaLabel: '播放陈治国自我介绍采访视频',
      video: 'assets/video/s3-intro.mp4',
      poster: 'assets/video/posters/s3-intro.jpg',
      manuscript: 'assets/images/records/s4-1987.jpg'
    },
    {
      id: 's4',
      chapter: '记录改变',
      eyebrow: '1987 · 告别煤油灯',
      title: '家里亮起电灯',
      background: 'assets/images/scenes/s4-electric-light-bg.webp',
      quote: '1987年7月14日，特请张公电管所管电员王云述来家，在土墙上安好正规线路、插座和开关，正式安全用电。',
      manuscript: 'assets/images/records/s4-1987.jpg'
    },
    {
      id: 's5',
      chapter: '记录改变',
      eyebrow: '1990 · 第一台电视机',
      title: '方寸荧屏，看见远方',
      background: 'assets/images/scenes/s5-television-night-bg.webp',
      quote: '1990年4月1日，今日买上海牌的14英寸黑白电视机一部花费387元。',
      mediaLabel: '播放陈治国讲述第一台电视机的采访视频',
      video: 'assets/video/s5-tv.mp4',
      poster: 'assets/video/posters/s5-tv.jpg',
      manuscript: 'assets/images/records/s5-1990.jpg'
    },
    {
      id: 's6',
      chapter: '记录改变',
      eyebrow: '2006 · 农业税取消',
      title: '两道红线，划过千年',
      background: 'assets/images/scenes/s6-tax-wheat-bg.webp',
      quote: '2006年1月1日，看新闻，取消农民农业税！',
      mediaLabel: '播放农业税取消相关采访视频',
      video: 'assets/video/s6-tax.mp4',
      poster: 'assets/video/posters/s6-tax.jpg',
      manuscript: 'assets/images/records/s6-2006.jpg'
    },
    {
      id: 's7',
      chapter: '日子变好',
      eyebrow: '柴米油盐里的时代',
      title: '日子越过越好',
      background: 'assets/images/scenes/s7-good-life-bg.webp',
      subtitle: '四次落笔，四个普通家庭的生活切面'
    },
    {
      id: 's8',
      chapter: '日子变好',
      eyebrow: '1990—2020',
      title: '腰包越来越鼓',
      background: 'assets/images/scenes/s8-spending-new-year-bg.webp',
      subtitle: '台历记录的年货开支'
    },
    {
      id: 's9',
      chapter: '日子变好',
      eyebrow: '一块一块，把日子拼完整',
      title: '拼出好日子',
      background: 'assets/images/scenes/s9-village-life-bg.webp',
      subtitle: '拖动拼图，或依次点击两块进行交换',
      puzzleImage: 'assets/images/scenes/s9-good-life-base.webp',
      completionFrames: [
        'assets/images/scenes/s9-good-life-walk-a.webp',
        'assets/images/scenes/s9-good-life-walk-b.webp'
      ]
    },
    {
      id: 's10',
      chapter: '共同记忆',
      eyebrow: '传承 · 接力',
      title: '记录不会停下',
      background: 'assets/images/scenes/s10-legacy-room-bg.webp',
      oldQuote: '我年纪大了，眼睛花了，以后记录的事，就交给女儿陈芳了。',
      newQuote: '父亲用台历，我用手机。方式不同，但初心一样。时代在变，记录的方式在变，但我们爱党、信党、跟党走的初心永远不会变。',
      attribution: '——陈芳',
      mediaLabel: '播放陈治国采访原声',
      audio: 'assets/audio/s10.mp3'
    },
    {
      id: 's11',
      chapter: '共同记忆',
      eyebrow: '2026 · 捐赠献礼',
      title: '我决定把40本台历，捐赠给档案馆',
      background: 'assets/images/scenes/s11-archive-finale-bg.webp',
      subtitle: '一个人的日常，成为一座城共同的记忆。'
    }
  ];

  var lifeRecords = [
    {
      year: 2001,
      text: '2001年1月7日，修十大队公路，砸碎石。',
      scene: 'assets/images/scenes/s7-2001.webp',
      image: 'assets/images/records/s7-2001.jpg'
    },
    {
      year: 2004,
      text: '2004年4月13日，在成都，妹弟崔定元一同出去耍，请我吃肯德基，确实可以，也是我第一次吃到这种味道。',
      scene: 'assets/images/scenes/s7-2004.webp',
      image: 'assets/images/records/s7-2004.jpg'
    },
    {
      year: 2015,
      text: '2015年4月6日，家中正式安通天然气，上户费4380元。',
      scene: 'assets/images/scenes/s7-2015.webp',
      image: 'assets/images/records/s7-2015.jpg'
    },
    {
      year: 2020,
      text: '2020年12月10日，剩的4000元赞助陈芳购买那台现代车用。',
      scene: 'assets/images/scenes/s7-2020.webp',
      image: 'assets/images/records/s7-2020.jpg'
    }
  ];

  var spending = [
    {
      year: 1990,
      amount: 16,
      text: '购煤炭、肥料，给孩子缝衣服……共计16元。',
      image: 'assets/images/records/s8-1990.jpg'
    },
    {
      year: 2000,
      amount: 79,
      text: '车费6元，东西及秋衣2件19元，烟2条39元……共计79元。',
      image: 'assets/images/records/s8-2000.jpg'
    },
    {
      year: 2010,
      amount: 489,
      text: '柑子15斤、酒2件、水果糖14斤……共计489元。',
      image: 'assets/images/records/s8-2010.jpg'
    },
    {
      year: 2020,
      amount: 1640,
      text: '灯笼2个、不锈锅1个，肉、各类蔬菜、糖等食品，压岁钱……共计1640元。',
      image: 'assets/images/records/s8-2020.jpg'
    }
  ];

  var quizzes = {
    quiz1: {
      question: '中国从哪一年起全面取消农业税？',
      options: ['2000年', '2006年', '2010年', '2015年'],
      correct: 1,
      explanation: '2005年12月29日，十届全国人大常委会第十九次会议决定，自2006年1月1日起，废止《中华人民共和国农业税条例》，全面取消农业税，中国的农业税从此退出历史舞台。',
      image: 'assets/images/scenes/quiz1-agricultural-tax.webp',
      answeredImage: 'assets/images/scenes/quiz1-agricultural-tax-answered.webp',
      imageAspect: '1374 / 1145',
      answerArea: { top: 45, right: 22, bottom: 28, left: 22 },
      autoOpenOn: 's7',
      mandatory: true,
      correctCloseDelayMs: 1000,
      next: 's7'
    },
    quiz2: {
      question: '我国在（　）年脱贫攻坚取得全面胜利。',
      options: ['2019', '2020', '2021', '2022'],
      correct: 2,
      explanation: '2021年2月25日，习近平总书记在全国脱贫攻坚总结表彰大会上庄严宣告：我国脱贫攻坚战取得了全面胜利，现行标准下9899万农村贫困人口全部脱贫，832个贫困县全部摘帽，12.8万个贫困村全部出列，区域性整体贫困得到解决，完成了消除绝对贫困的艰巨任务，创造了又一个彪炳史册的人间奇迹。他同时强调，要切实做好巩固拓展脱贫攻坚成果同乡村振兴有效衔接各项工作，让脱贫基础更加稳固、成效更可持续。',
      emphasis: ['2021', '2', '25', '9899', '832', '12.8'],
      image: 'assets/images/scenes/quiz2-poverty-relief.webp',
      answeredImage: 'assets/images/scenes/quiz2-poverty-relief-answered.webp',
      imageAspect: '3 / 2',
      answerArea: { top: 46, right: 21.5, bottom: 30.5, left: 24.5 },
      autoOpenOn: 's10',
      mandatory: true,
      correctCloseDelayMs: 1000,
      next: 's10'
    }
  };

  var donationImages = [
    'assets/images/donation/02.jpg',
    'assets/images/donation/03.jpg',
    'assets/images/donation/04.jpg',
    'assets/images/donation/05.jpg',
    'assets/images/donation/06.jpg'
  ];

  var posterQuotes = [
    '新的一年，希望日子越过越好。',
    '好日子，是一笔一画记录下来的。',
    '个人的日常，也能成为时代的注脚。',
    '方式在变，记录生活的初心不变。'
  ];

  return {
    calendarYears: calendarYears,
    screens: screens,
    lifeRecords: lifeRecords,
    spending: spending,
    quizzes: quizzes,
    donationImages: donationImages,
    posterQuotes: posterQuotes
  };
}));
