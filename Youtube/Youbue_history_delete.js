// ==UserScript==
// @name         YouTube History Quick Delete Button (Black Style JP)
// @namespace    https://example.com/
// @version      1.0
// @description  履歴ページの各動画に黒背景・白文字の「削除」ボタンを追加してワンクリックで履歴から削除
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function isHistoryPage() {
        return location.pathname.startsWith('/feed/history');
    }

    function processHistoryItems() {
        if (!isHistoryPage()) return;

        const items = document.querySelectorAll(
            'yt-lockup-view-model.ytd-item-section-renderer.lockup'
        );

        items.forEach((lockup) => {
            if (lockup.dataset.tmHistoryButtonAttached === '1') return;
            lockup.dataset.tmHistoryButtonAttached = '1';

            const menuContainer = lockup.querySelector(
                '.yt-lockup-metadata-view-model__menu-button'
            );
            if (!menuContainer) return;

            // ----------- ボタン生成 -----------
            const btn = document.createElement('button');
            btn.textContent = '削除';
            btn.title = 'この動画を再生履歴から削除';

            // --- 常時黒背景＋白文字のデザイン ---
            btn.style.marginLeft = '8px';
            btn.style.padding = '4px 10px';
            btn.style.fontSize = '12px';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '14px';

            btn.style.border = '1px solid #444';         // やや薄いグレー
            btn.style.background = 'rgba(0,0,0,0.85)';   // 黒 + 少し透明
            btn.style.color = '#fff';                    // 白文字
            btn.style.fontWeight = 'bold';
            btn.style.userSelect = 'none';

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteHistoryForItem(lockup);
            });

            menuContainer.appendChild(btn);
        });
    }

    function deleteHistoryForItem(lockup) {
        // 1. サムネ上の一発削除（×）を優先
        const oneClick = lockup.querySelector(
            '.yt-one-click-dismiss[data-block="unwatch"]'
        );
        if (oneClick) {
            oneClick.click();
            return;
        }

        // 2. ︙ → 「再生履歴から削除」
        const menuBtn = lockup.querySelector('button[aria-label="その他の操作"]');
        if (!menuBtn) return;

        menuBtn.click();

        setTimeout(() => {
            const spans = document.querySelectorAll(
                'yt-list-item-view-model span.yt-core-attributed-string'
            );
            for (const span of spans) {
                if (span.textContent.trim().includes('再生履歴から削除')) {
                    span.click();
                    break;
                }
            }
        }, 250);
    }

    const observer = new MutationObserver(() => {
        if (isHistoryPage()) {
            processHistoryItems();
        }
    });

    function init() {
        if (!document.body) return;

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        processHistoryItems();
    }

    window.addEventListener('yt-navigate-finish', () => {
        if (isHistoryPage()) {
            processHistoryItems();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
