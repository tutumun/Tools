// ==UserScript==
// @name         Prime Video ロゴ＆SVG検出統合版（Primeだけ許可）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Primeロゴのみ許可、他ロゴやStoreFilledなどは非表示（サムネイルsrc＋SVG title対応）
// @match        https://www.amazon.co.jp/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // SVG内のNGタイトル（これが含まれてたら消す）
    const forbiddenSVGTitles = [
        'Store Filled'
    ];

    const observer = new MutationObserver(() => {
        const cards = document.querySelectorAll('article[data-testid="card"]');
        console.log(`Found ${cards.length} cards`);

        cards.forEach(card => {
            if (card.classList.contains('custom-checked')) return;

            const packshot = card.querySelector('[data-testid="packshot"]');
            if (!packshot) return;

            const baseImage = packshot.querySelector('img[data-testid="base-image"]');
            const svgs = packshot.querySelectorAll('svg');

            let allow = true; // 初期状態は許可

            // --- サムネイル画像チェック ---
            if (baseImage) {
                const src = baseImage.src || '';

                if (src.includes('/logos/')) {
                    if (src.includes('/Prime/logos/')) {
                        allow = true; // PrimeならOK
                    } else {
                        allow = false; // その他のロゴなら非表示
                    }
                }
            }

            // --- SVG内タイトルチェック ---
            if (allow && svgs.length > 0) {
                svgs.forEach(svg => {
                    const titleText = svg.querySelector('title')?.textContent || '';
                    forbiddenSVGTitles.forEach(ngTitle => {
                        if (titleText.includes(ngTitle)) {
                            allow = false; // NGタイトルが含まれてたら非表示
                        }
                    });
                });
            }

            // --- 判定結果 ---
            if (!allow) {
                console.log('Hiding card due to logo or SVG title:', card);
                card.style.display = 'none';
                card.classList.add('custom-hidden');
            } else {
                card.classList.add('custom-checked');
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
