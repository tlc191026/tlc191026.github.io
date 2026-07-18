---
hide:
  - navigation
  - toc
  - footer
---

<div class="login-page">
  <div class="login-card">
    <p class="login-tag">EST. 2019 · NO. 191026</p>
    <h2 class="login-title">桐 &amp; 辰</h2>
    <p class="login-sub">请输入访问密码</p>
    <form id="login-form" class="login-form" autocomplete="off">
      <input type="password" id="login-input" class="login-input"
             placeholder="密码" autocomplete="current-password" autofocus>
      <button type="submit" class="login-submit">进入</button>
    </form>
    <p id="login-error" class="login-error" aria-live="polite"></p>
  </div>
</div>

<script>
(function() {
  'use strict';

  // 与 auth-gate.js 中保持一致的 session 键
  var PASSWORD_HASH = '3a3e098240074899f4be50e11de1ef80130eeb1568771aa7b7b6fe744b1a12f8';
  var SESSION_KEY = 'site_authenticated';

  // 已登录则直接回到目标页（避免重复登录）
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    redirectBack();
    return;
  }

  async function sha256(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function redirectBack() {
    var params = new URLSearchParams(location.search);
    var target = params.get('redirect') || '/';
    // 限定为同源相对路径，防止 open-redirect
    if (!target.startsWith('/') || target.startsWith('//')) target = '/';
    location.replace(target);
  }

  function init() {
    var form = document.getElementById('login-form');
    var input = document.getElementById('login-input');
    var err = document.getElementById('login-error');
    if (!form || !input) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var pwd = input.value;
      if (!pwd) {
        err.textContent = '请输入密码';
        return;
      }
      err.textContent = '';
      var hash = await sha256(pwd);
      if (hash === PASSWORD_HASH) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        redirectBack();
      } else {
        err.textContent = '密码错误';
        input.select();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
