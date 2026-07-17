// 桐辰照片审核 - Electron 主进程
// 双击启动 → 拉起 mkdocs serve(8000) + 审核 APP(8001) → 窗口加载审核页
// 关窗即停所有子进程

const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// 开发态: __dirname = electron-app/，父目录 = 仓库根
// 打包后: exe 位于 electron-app/dist/win-unpacked/，需向上 3 级到仓库根
const REPO = app.isPackaged
  ? path.resolve(path.dirname(process.execPath), '..', '..', '..')
  : path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO, 'tmp', 'scripts', '04_review_app');
const MKDOCS_PORT = 8000;
const APP_PORT = 8001;

let procs = [];
let mainWindow = null;

function log(msg) {
  console.log(`[tlc-review] ${msg}`);
}

function spawnSvc(label, cmd, args, cwd) {
  log(`启动 ${label}: ${cmd} ${args.join(' ')}`);
  const p = spawn(cmd, args, {
    cwd,
    shell: true,
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  procs.push(p);
  p.stdout.on('data', d => process.stdout.write(`[${label}] ${d}`));
  p.stderr.on('data', d => process.stderr.write(`[${label}] ${d}`));
  p.on('exit', (code) => log(`${label} 退出 code=${code}`));
  return p;
}

function checkUrl(url, cb, tries) {
  tries = tries || 0;
  if (tries > 150) return cb(false); // ~75s 超时
  const req = http.get(url, (res) => {
    // 消耗 body 避免挂起
    res.resume();
    if (res.statusCode === 200 || res.statusCode === 302) cb(true);
    else setTimeout(() => checkUrl(url, cb, tries + 1), 500);
  });
  req.on('error', () => setTimeout(() => checkUrl(url, cb, tries + 1), 500));
  req.setTimeout(3000, () => { req.destroy(); setTimeout(() => checkUrl(url, cb, tries + 1), 500); });
}

function killAll() {
  procs.forEach(p => {
    if (!p || p.exitCode !== null) return;
    try {
      // Windows: 用 taskkill 杀进程树
      spawn('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true });
    } catch (e) { /* ignore */ }
  });
  procs = [];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    title: '桐辰照片审核',
    backgroundColor: '#faf7f2',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}/`);

  // 预览站链接（8000）走外部浏览器，避免在 Electron 内开第二窗
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes(`:${MKDOCS_PORT}`) || url.startsWith('http://127.0.0.1:8000')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  log(`仓库根: ${REPO}`);

  // 1. 启动 mkdocs serve（本地预览 + hooks 草稿预览注入）
  spawnSvc('mkdocs', 'python', [
    '-m', 'mkdocs', 'serve',
    '--dev-addr', `127.0.0.1:${MKDOCS_PORT}`,
  ], REPO);

  // 2. 启动审核 APP
  spawnSvc('review', 'python', [
    '-m', 'uvicorn', 'main:app',
    '--host', '127.0.0.1',
    '--port', String(APP_PORT),
  ], APP_DIR);

  // 3. 等两个服务就绪
  log('等待服务就绪...');
  checkUrl(`http://127.0.0.1:${MKDOCS_PORT}/`, (okMkdocs) => {
    if (!okMkdocs) {
      dialog.showErrorBox('启动失败', 'mkdocs serve 在 75s 内未就绪，请检查 Python/mkdocs 是否已安装');
      app.quit();
      return;
    }
    log('mkdocs 就绪');
    checkUrl(`http://127.0.0.1:${APP_PORT}/api/queue/counts`, (okApp) => {
      if (!okApp) {
        dialog.showErrorBox('启动失败', '审核 APP 在 75s 内未就绪，请检查 uvicorn/fastapi 是否已安装');
        app.quit();
        return;
      }
      log('审核 APP 就绪');
      createWindow();
    });
  });
});

app.on('window-all-closed', () => {
  killAll();
  app.quit();
});

app.on('before-quit', killAll);
app.on('quit', killAll);
