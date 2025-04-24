// ==UserScript==
// @name         Prime Video 非表示ボタン
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  ホバー中に×表示・非表示処理・遷移防止・再描画対応
// @match        https://www.amazon.co.jp/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const observer = new MutationObserver((mutations, obs) => {
        const originalButtons = document.querySelectorAll(
            'button[aria-label="このシーズンを非表示にする"], button[aria-label="この映画を非表示にする"]'
        );

        console.log(`Found ${originalButtons.length} hide buttons`);

        originalButtons.forEach((btn) => {
            if (btn.classList.contains('custom-source')) return;

            const card = btn.closest('[data-testid="card"]');
            const packshot = card?.querySelector('[data-testid="packshot"]');
            if (!packshot || packshot.querySelector('.custom-fake-button')) return;

            obs.disconnect(); // 無限ループ防止

            btn.classList.add('custom-source');

            // ① クローンではなく完全独立なdivを使う
            const fakeButton = document.createElement('div');
            fakeButton.className = 'custom-fake-button';
            fakeButton.title = "このシーズンを非表示にする";
            fakeButton.innerText = '×';

            Object.assign(fakeButton.style, {
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '42px',
                height: '42px',
                backgroundColor: '#ff4d4d',
                border: '2px solid white',
                borderRadius: '50%',
                display: 'none', // 最初は非表示
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: '9999',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                userSelect: 'none',
            });

            // ② クリック時に最新のボタン取得して click()
            fakeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 遷移防止
                const cancelUnload = (event) => {
                    event.preventDefault();
                    event.returnValue = '';
                };
                window.addEventListener('beforeunload', cancelUnload);

                // 最新のボタンを取得してclick
                const latestBtn = card.querySelector(
                    'button[aria-label="このシーズンを非表示にする"], button[aria-label="この映画を非表示にする"]'
                );

                if (latestBtn) {
                    latestBtn.click();
                } else {
                    console.warn('最新の非表示ボタンが見つかりませんでした');
                }

                // ブロックは2秒後に解除
                setTimeout(() => {
                    window.removeEventListener('beforeunload', cancelUnload);
                }, 2000);
            });

            // ③ ホバー中だけ表示
            packshot.style.position = 'relative';
            packshot.addEventListener('mouseenter', () => {
                fakeButton.style.display = 'flex';
            });
            packshot.addEventListener('mouseleave', () => {
                fakeButton.style.display = 'none';
            });

            packshot.appendChild(fakeButton);
            // ④ 初回ホバーに対応：既にホバー状態ならすぐ表示
            if (packshot.matches(':hover')) {
                fakeButton.style.display = 'flex';
            }


            // 監視再開
            obs.observe(document.body, { childList: true, subtree: true });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
