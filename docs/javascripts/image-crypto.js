/**
 * 图片加密解密模块
 * 使用Web Crypto API进行AES解密
 */

(function() {
  'use strict';

  // ====================
  // 配置
  // ====================

  // 密码hash（用于验证密码正确性，设置为您的密码SHA256 hash）
  // 可以通过运行 node -e "console.log(require('crypto').createHash('sha256').update('您的密码').digest('hex'))" 生成
  let PASSWORD_HASH = '3a3e098240074899f4be50e11de1ef80130eeb1568771aa7b7b6fe744b1a12f8'; // 留空表示不验证hash，直接尝试解密

  // 加密图片路径前缀
  const ENCRYPTED_PATH_PREFIX = '../encrypted-images/';

  // sessionStorage key
  const SESSION_KEY = 'gallery_password';

  // ====================
  // Web Crypto API 加密/解密
  // ====================

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function decryptData(encryptedData, ivHex, password) {
    const enc = new TextEncoder();
    const salt = enc.encode('salt'); // 与加密脚本保持一致

    const key = await deriveKey(password, salt);

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const data = new Uint8Array(encryptedData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: iv },
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return null;
    }
  }

  // ====================
  // 密码验证
  // ====================

  async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyPassword(password) {
    if (!PASSWORD_HASH) return true; // 未设置hash则跳过验证
    const hash = await hashPassword(password);
    return hash === PASSWORD_HASH;
  }

  // ====================
  // UI 组件
  // ====================

  function createPasswordUI() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'password-overlay';
    overlay.id = 'password-overlay';

    // 创建密码输入框
    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
      <div class="password-icon">🔒</div>
      <h3 class="password-title">私密相册</h3>
      <p class="password-desc">请输入密码查看照片</p>
      <div class="password-input-group">
        <input type="password" class="password-input" id="gallery-password-input"
               placeholder="请输入密码" autocomplete="off">
        <button class="password-submit" id="gallery-password-submit">确认</button>
      </div>
      <div class="password-error" id="password-error"></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 事件绑定
    const input = document.getElementById('gallery-password-input');
    const submitBtn = document.getElementById('gallery-password-submit');

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSubmit();
    });

    // 聚焦输入框
    setTimeout(() => input.focus(), 100);

    function handleSubmit() {
      const password = input.value;
      if (!password) {
        showError('请输入密码');
        return;
      }

      verifyAndDecrypt(password);
    }
  }

  function showError(message) {
    const errorEl = document.getElementById('password-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  function hidePasswordUI() {
    const overlay = document.getElementById('password-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // ====================
  // 图片解密与显示
  // ====================

  async function loadAndDecryptImage(encryptedPath, password) {
    try {
      const response = await fetch(encryptedPath);
      if (!response.ok) return null;

      const json = await response.json();
      const decryptedBase64 = await decryptData(json.data, json.iv, password);

      if (decryptedBase64) {
        // 根据原始文件名判断MIME类型
        const ext = json.originalName.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        return `data:${mimeTypes[ext] || 'image/jpeg'};base64,${decryptedBase64}`;
      }
      return null;
    } catch (e) {
      console.error('解密失败:', e);
      return null;
    }
  }

  async function decryptAllImages(password) {
    const encryptedImages = document.querySelectorAll('img[data-encrypted]');

    for (const img of encryptedImages) {
      const encryptedPath = img.getAttribute('data-encrypted');

      // 检查缓存
      const cacheKey = `decrypted_${encryptedPath}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        img.src = cached;
        continue;
      }

      const dataUrl = await loadAndDecryptImage(encryptedPath, password);
      if (dataUrl) {
        img.src = dataUrl;
        // 缓存解密结果
        sessionStorage.setItem(cacheKey, dataUrl);
      } else {
        img.src = 'data:image/svg+xml,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
          '<rect fill="#f5f5f5" width="200" height="150"/>' +
          '<text x="50%" y="50%" fill="#999" text-anchor="middle">解密失败</text>' +
          '</svg>'
        );
      }
    }
  }

  async function verifyAndDecrypt(password) {
    const isValid = await verifyPassword(password);
    if (!isValid) {
      showError('密码错误，请重试');
      return;
    }

    // 保存密码到session
    sessionStorage.setItem(SESSION_KEY, password);

    // 隐藏密码界面
    hidePasswordUI();

    // 解密并显示图片
    await decryptAllImages(password);

    // 重新初始化灯箱（处理新加载的图片）
    if (typeof initLightbox === 'function') {
      initLightbox();
    }
  }

  // ====================
  // 初始化
  // ====================

  function init() {
    // 检查是否是加密相册页面
    const hasEncryptedImages = document.querySelectorAll('img[data-encrypted]').length > 0;
    if (!hasEncryptedImages) return;

    // 检查是否已有密码
    const savedPassword = sessionStorage.getItem(SESSION_KEY);

    if (savedPassword) {
      // 尝试使用保存的密码解密
      verifyAndDecrypt(savedPassword);
    } else {
      // 显示密码输入界面
      createPasswordUI();
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露设置密码hash的方法
  window.setGalleryPasswordHash = function(hash) {
    PASSWORD_HASH = hash;
  };

})();
