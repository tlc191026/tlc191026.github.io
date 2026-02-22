/* ====================================================
   桐&辰爱情网站 - 交互脚本
   ==================================================== */

// ====================
// 计时器相关变量
// ====================
let timerInterval = null;
const startDate = new Date('2019-10-26');

// ====================
// 初始化函数
// ====================

function initPage() {
  initScrollAnimation();
  initLightbox();
  initClickHeart();
  initTimer();
}

// ====================
// 1. 滚动淡入动画
// ====================

function initScrollAnimation() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
        fadeInObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 观察需要动画的元素
  const animatedElements = document.querySelectorAll(
    '.md-typeset h2, .md-typeset h3, .md-typeset p, ' +
    '.md-typeset img, .md-typeset blockquote'
  );

  animatedElements.forEach(el => {
    el.classList.add('fade-in-element');
    fadeInObserver.observe(el);
  });
}

// ====================
// 2. 图片灯箱效果
// ====================

function initLightbox() {
  // 检查灯箱是否已存在
  let lightbox = document.querySelector('.lightbox-overlay');

  if (!lightbox) {
    // 创建灯箱容器
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
      <div class="lightbox-container">
        <img class="lightbox-image" src="" alt="">
        <button class="lightbox-close">&times;</button>
        <div class="lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(lightbox);

    // 关闭灯箱
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // 图片点击事件
  const images = document.querySelectorAll('.md-typeset img');
  images.forEach(img => {
    // 移除旧的事件监听器（如果有）
    img.removeEventListener('click', handleImageClick);
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', handleImageClick);
  });

  function handleImageClick() {
    const lightboxImg = lightbox.querySelector('.lightbox-image');
    const caption = lightbox.querySelector('.lightbox-caption');
    lightboxImg.src = this.src;
    caption.textContent = this.alt || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// ====================
// 3. 点击爱心效果
// ====================

function initClickHeart() {
  document.addEventListener('click', handleClickHeart);
}

function handleClickHeart(e) {
  // 只在内容区域触发
  if (e.target.closest('.md-content')) {
    createClickHeart(e.clientX, e.clientY);
  }
}

function createClickHeart(x, y) {
  const heart = document.createElement('div');
  heart.className = 'click-heart';
  heart.textContent = '❤️';
  heart.style.left = (x - 10) + 'px';
  heart.style.top = (y - 10) + 'px';
  document.body.appendChild(heart);

  setTimeout(() => heart.remove(), 800);
}

// ====================
// 4. 爱情计时器
// ====================

function initTimer() {
  const timerContainer = document.querySelector('.love-timer');

  if (timerContainer) {
    // 清除之前的计时器
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    function updateTimer() {
      const now = new Date();
      const diff = now - startDate;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      timerContainer.innerHTML = `
        <div class="timer-display">
          <span class="timer-item">
            <strong>${days}</strong>
            <small>天</small>
          </span>
          <span class="timer-separator">:</span>
          <span class="timer-item">
            <strong>${String(hours).padStart(2, '0')}</strong>
            <small>时</small>
          </span>
          <span class="timer-separator">:</span>
          <span class="timer-item">
            <strong>${String(minutes).padStart(2, '0')}</strong>
            <small>分</small>
          </span>
          <span class="timer-separator">:</span>
          <span class="timer-item">
            <strong>${String(seconds).padStart(2, '0')}</strong>
            <small>秒</small>
          </span>
        </div>
        <p class="timer-message">我们在一起的美好时光 💕</p>
      `;
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }
}

// ====================
// 初始化
// ====================

// 初始加载
document.addEventListener('DOMContentLoaded', initPage);

// 监听 MkDocs Material 页面切换事件
document.addEventListener('DOMContentSwitch', initPage);
