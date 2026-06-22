"""
mkdocs hooks - 仅本地 serve 时生效的开发辅助。

功能：
1. on_files: 把仓库根 img/ 下所有图片注入 mkdocs files，让 serve 能服务它们到 /img/...
2. on_page_content: serve 时把 https://raw.githubusercontent.com/tlc191026/.../main/ 重写为站内 /，
   这样新插入但还没 push 的图能立刻在本地预览看到。

mkdocs build / gh-deploy（生产）时这两个钩子都不影响产物：
- on_files 即便注入了 files，最终复制到 site/img 是正常的（site_dir 里有 img 副本，gh-pages 上访问 raw 仍走 main）
- on_page_content 用 sys.argv 判断仅 serve 时改写
"""
from __future__ import annotations

import sys
from pathlib import Path

from mkdocs.structure.files import File


# 命令行包含 'serve' 才认为是开发模式（mkdocs serve）
IS_SERVE = any(a == "serve" for a in sys.argv)

REMOTE_RAW_PREFIX = "https://raw.githubusercontent.com/tlc191026/tlc191026.github.io/main/"


def on_files(files, config, **kwargs):
    """把仓库根 img/ 加入 mkdocs files。"""
    docs_dir = Path(config["docs_dir"])
    repo_root = docs_dir.parent
    img_root = repo_root / "img"
    if not img_root.exists():
        return files

    existing = {f.src_path.replace("\\", "/") for f in files}
    added = 0
    for p in img_root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(repo_root).as_posix()  # 例: 'img/before/2019.10.24_1.jpg'
        if rel in existing:
            continue
        try:
            f = File(
                path=rel,
                src_dir=str(repo_root),
                dest_dir=config["site_dir"],
                use_directory_urls=False,
            )
            files.append(f)
            added += 1
        except Exception:
            continue
    if added and IS_SERVE:
        print(f"[hooks] injected {added} files from img/ for local preview")
    return files


def on_page_content(html: str, page, config, **kwargs):
    """serve 时把远程 raw URL 重写为站内绝对路径，本地图能立刻显示。"""
    if not IS_SERVE:
        return html
    return html.replace(REMOTE_RAW_PREFIX, "/")


# 仅 serve 时注入的草稿预览监听脚本
# 接收来自 review APP (127.0.0.1:8001) 的 postMessage，在指定章节末尾插入/更新一个
# 草稿块（虚线高亮 + 「草稿」徽章），实现 WYSIWYG 实时预览。
DRAFT_PREVIEW_SCRIPT = r"""
<script>
(function () {
  'use strict';
  var REVIEW_ORIGIN = 'http://127.0.0.1:8001';
  var DRAFT_ID = 'draft-preview-block';
  var BADGE_ID = 'draft-preview-badge';

  // 一次性注入 CSS
  var css = document.createElement('style');
  css.textContent = ''
    + '#' + DRAFT_ID + '{'
    + '  position:relative;'
    + '  margin:1.2rem 0;'
    + '  padding:1.5rem 0.8rem 0.8rem;'
    + '  border:2px dashed #e8a838;'
    + '  border-radius:8px;'
    + '  background:rgba(232,168,56,0.05);'
    + '}'
    + '#' + BADGE_ID + '{'
    + '  position:absolute;'
    + '  top:-12px;'
    + '  left:14px;'
    + '  padding:2px 10px;'
    + '  background:#e8a838;'
    + '  color:white;'
    + '  font-size:0.7rem;'
    + '  font-weight:600;'
    + '  letter-spacing:0.06em;'
    + '  border-radius:3px;'
    + '  font-family:sans-serif;'
    + '}'
    + '#' + DRAFT_ID + ' img{cursor:default !important;transform:none !important;}'
    + '#' + DRAFT_ID + ' blockquote{margin-top:0.5rem;}';
  document.head.appendChild(css);

  function findSectionAnchor(sectionLabel) {
    // mkdocs 给 ## 2021.5.7-5.9 自动加 id="202157-59" （去标点）
    if (!sectionLabel) return null;
    var id = String(sectionLabel).replace(/[.—–-]/g, function(c){ return c === '-' ? '-' : ''; });
    // 上面这个 replace 把 . 去掉但保留 -；试两种 id 形式
    var candidates = [
      String(sectionLabel).replace(/\./g, ''),     // 标准 mkdocs slug
      id,                                          // 兜底
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.getElementById(candidates[i]);
      if (el) return el;
    }
    return null;
  }

  function findSectionEnd(h2) {
    // 从 h2 起向下找下一个 h2，返回该 h2 节点；找不到返回 null（=> 章节末尾就是文章末尾）
    var node = h2.nextElementSibling;
    while (node) {
      if (node.tagName === 'H2') return node;
      node = node.nextElementSibling;
    }
    return null;
  }

  function ensureDraftEl() {
    var el = document.getElementById(DRAFT_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = DRAFT_ID;
    var badge = document.createElement('span');
    badge.id = BADGE_ID;
    badge.textContent = '草稿预览（未提交）';
    el.appendChild(badge);
    var content = document.createElement('div');
    content.className = 'draft-content';
    el.appendChild(content);
    return el;
  }

  function placeDraft(msg) {
    var article = document.querySelector('.md-content__inner') || document.body;
    var draftEl = ensureDraftEl();
    var content = draftEl.querySelector('.draft-content');
    content.innerHTML = msg.html || '';

    // 决定锚点
    if (msg.section) {
      var h2 = findSectionAnchor(msg.section);
      if (h2) {
        var next = findSectionEnd(h2);
        if (next) {
          h2.parentNode.insertBefore(draftEl, next);
        } else {
          h2.parentNode.appendChild(draftEl);
        }
        // 滚动到草稿块附近，方便看见
        if (msg.scrollIntoView !== false) {
          draftEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    // 没匹配到章节：把草稿放在文章末尾，加一个临时 h2 标题表示「将新建」
    var oldHint = document.getElementById('draft-new-section-hint');
    if (oldHint) oldHint.remove();
    if (msg.section) {
      var hint = document.createElement('h2');
      hint.id = 'draft-new-section-hint';
      hint.style.cssText = 'color:#e8a838;border-left:3px solid #e8a838;padding-left:0.6rem;';
      hint.textContent = msg.section + '（将新建章节）';
      article.appendChild(hint);
    }
    article.appendChild(draftEl);
    if (msg.scrollIntoView !== false) {
      draftEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearDraft() {
    var el = document.getElementById(DRAFT_ID);
    if (el) el.remove();
    var hint = document.getElementById('draft-new-section-hint');
    if (hint) hint.remove();
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== REVIEW_ORIGIN) return;
    var msg = e.data || {};
    if (msg.type === 'draft.update') {
      placeDraft(msg);
    } else if (msg.type === 'draft.clear') {
      clearDraft();
    }
  });

  // 告诉父页面：iframe 已就绪，可以开始推消息
  setTimeout(function () {
    try {
      window.parent.postMessage({ type: 'preview.ready' }, REVIEW_ORIGIN);
    } catch (e) {}
  }, 100);
})();
</script>
"""


def on_post_page(output: str, page, config, **kwargs):
    """serve 时往 body 末尾注入草稿预览监听脚本。"""
    if not IS_SERVE:
        return output
    if "</body>" not in output:
        return output
    return output.replace("</body>", DRAFT_PREVIEW_SCRIPT + "\n</body>", 1)
