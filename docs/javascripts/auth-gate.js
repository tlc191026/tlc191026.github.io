/**
 * 网站访问控制：未登录跳转到独立登录页
 * 必须放在 extra_javascript 的最前面，优先于其他脚本执行
 */
(function() {
  'use strict';

  // 开发期放行：mkdocs serve (端口 8000) 不触发密码门，便于本地预览与审核
  if (location.port === '8000') return;

  var SESSION_KEY = 'site_authenticated';
  var LOGIN_PATH = '/login/';

  // 当前页面是登录页本身：放行
  var path = location.pathname;
  if (path === LOGIN_PATH || path.endsWith('/login/index.html')) return;

  // 已登录：放行
  if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

  // 未登录：先把页面隐藏，再 replace 跳转，避免内容闪烁
  // 用 documentElement 而不是 body，因为 body 此时可能还没解析到
  document.documentElement.style.visibility = 'hidden';

  var target = path + location.search + location.hash;
  // 同源相对路径白名单，防 open-redirect
  if (!target.startsWith('/') || target.startsWith('//')) target = '/';

  location.replace(LOGIN_PATH + '?redirect=' + encodeURIComponent(target));
})();
