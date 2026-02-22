/**
 * 网站密码保护
 * 进入网站时需要输入密码
 */

(function() {
  'use strict';

  // ====================
  // 配置
  // ====================

  // 密码的SHA256 hash
  // 生成方法: node -e "console.log(require('crypto').createHash('sha256').update('您的密码').digest('hex'))"
  const PASSWORD_HASH = '3a3e098240074899f4be50e11de1ef80130eeb1568771aa7b7b6fe744b1a12f8';

  // sessionStorage key
  const SESSION_KEY = 'site_authenticated';

  // ====================
  // 密码验证
  // ====================

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyPassword(password) {
    const hash = await hashPassword(password);
    return hash === PASSWORD_HASH;
  }

  // ====================
  // UI
  // ====================

  function createPasswordUI() {
    const overlay = document.createElement('div');
    overlay.className = 'site-password-overlay';
    overlay.id = 'site-password-overlay';

    overlay.innerHTML = `
      <div class="site-password-modal">
        <div class="site-password-icon">🔒</div>
        <h2 class="site-password-title">桐&辰的小站</h2>
        <p class="site-password-desc">请输入密码访问</p>
        <div class="site-password-input-group">
          <input type="password" class="site-password-input" id="site-password-input"
                 placeholder="请输入密码" autocomplete="off" autofocus>
          <button class="site-password-submit" id="site-password-submit">进入</button>
        </div>
        <div class="site-password-error" id="site-password-error"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('site-password-input');
    const submitBtn = document.getElementById('site-password-submit');

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });

    setTimeout(() => input.focus(), 100);

    async function handleSubmit() {
      const password = input.value;
      if (!password) {
        showError('请输入密码');
        return;
      }

      const isValid = await verifyPassword(password);
      if (isValid) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        hidePasswordUI();
      } else {
        showError('密码错误');
        input.value = '';
        input.focus();
      }
    }

    function showError(msg) {
      const error = document.getElementById('site-password-error');
      error.textContent = msg;
      error.style.display = 'block';
    }
  }

  function hidePasswordUI() {
    const overlay = document.getElementById('site-password-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // ====================
  // 初始化
  // ====================

  function init() {
    const isAuthenticated = sessionStorage.getItem(SESSION_KEY);
    if (!isAuthenticated) {
      // 阻止页面内容显示
      document.body.style.overflow = 'hidden';
      createPasswordUI();
    }
  }

  // 尽早执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
