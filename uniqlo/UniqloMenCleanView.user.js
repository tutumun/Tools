// ==UserScript==
// @name         ユニクロ MEN期間限定ページ すっきり表示
// @namespace    tools.uniqlo.men-clean-view
// @license      MIT
// @version      0.0.1
// @description  MENの期間限定価格ページでWOMEN商品を非表示にし、件数を更新します。読み込み済みの商品が対象です。
// @match        https://www.uniqlo.com/jp/ja/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    // このスクリプトはページに読み込まれた商品を処理します。
    // 件数は読み込み済みの商品から計算するため、全件読み込み前は暫定値です。
    // サイトのHTML構造が変わると、非表示や件数更新が動作しなくなる場合があります。

    // 「待望の特別価格」の見出し・商品カルーセルを非表示にする設定。
    // true = ON：枠ごと隠して、下の商品一覧を上に詰めます。
    // false = OFF：特別価格枠を通常どおり表示します。
    // 変更後はスクリプトを保存して、ユニクロのページを再読み込みしてください。
    const HIDE_SPECIAL_OFFERS = true;

    const STYLE_ID = 'uniqlo-hide-women-style';
    const HIDDEN_CLASS = 'uniqlo-hide-women-card';
    const FEATURED_HIDDEN_CLASS = 'uniqlo-hide-special-offers';
    const ACTIVE_ATTRIBUTE = 'data-uniqlo-hide-women';
    const TARGET_PATH = '/jp/ja/feature/limited-offers/men';

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        html[${ACTIVE_ATTRIBUTE}] .${HIDDEN_CLASS},
        html[${ACTIVE_ATTRIBUTE}] .${FEATURED_HIDDEN_CLASS} { display: none !important; }
    `;
    document.head.appendChild(style);

    const countStates = new Map();
    const GRID_SELECTOR = '.fr-ec-product-collection--type-grid';

    function isTargetPage() {
        return location.pathname.replace(/\/+$/, '') === TARGET_PATH;
    }

    function updateCounts(hiddenCount, active) {
        // 元の件数を保持し、再実行のたびに二重に減算しない。
        for (const [node, state] of countStates) {
            if (!node.isConnected) {
                countStates.delete(node);
            } else if (!active) {
                if (node.nodeValue === state.rendered) node.nodeValue = state.original;
                countStates.delete(node);
            }
        }
        if (!active) return;

        document.querySelectorAll('span[data-testid="ITOTypography"], p[data-testid="ITOTypography"]').forEach((element) => {
            if (element.childNodes.length !== 1) return;
            const node = element.firstChild;
            if (node.nodeType !== Node.TEXT_NODE) return;

            const previous = countStates.get(node);
            // サイトが並べ替え・絞り込みで書き換えた場合は、新しい値を採用。
            const original = previous && node.nodeValue === previous.rendered
                ? previous.original : node.nodeValue;
            const match = original.match(/^\s*([\d,]+)\s*件\s*$/);
            if (!match) {
                countStates.delete(node);
                return;
            }

            const total = Number(match[1].replace(/,/g, ''));
            const rendered = `${Math.max(0, total - hiddenCount)}件 消した数(${hiddenCount}件)`;
            countStates.set(node, { original, rendered });
            // 値が変わるときだけ更新し、MutationObserverの無限ループを防ぐ。
            if (node.nodeValue !== rendered) node.nodeValue = rendered;
        });
    }

    function updateSpecialOffers(active) {
        const targets = new Set();
        if (active && HIDE_SPECIAL_OFFERS) {
            document.querySelectorAll('[_type="CmsHeading"]').forEach((heading) => {
                if (heading.textContent.trim() !== '待望の特別価格') return;
                const headingBlock = heading.closest('[_type="CmsContentsCard"]');
                const carouselBlock = headingBlock?.nextElementSibling;
                // 見出しと、その直後のカルーセルだけを対象にする。
                // 外枠ごとdisplay:noneにして、見出しの余白やページ送りも残さない。
                if (!carouselBlock?.querySelector('.fr-ec-carousel')
                    || carouselBlock.querySelector(GRID_SELECTOR)) return;
                targets.add(headingBlock);
                targets.add(carouselBlock);
            });
        }
        document.querySelectorAll(`.${FEATURED_HIDDEN_CLASS}`).forEach((element) => {
            if (!targets.has(element)) element.classList.remove(FEATURED_HIDDEN_CLASS);
        });
        targets.forEach((element) => element.classList.add(FEATURED_HIDDEN_CLASS));
    }

    function updateCards() {
        const active = isTargetPage();
        document.documentElement.toggleAttribute(ACTIVE_ATTRIBUTE, active);
        updateSpecialOffers(active);

        if (!active) {
            updateCounts(0, false);
            return;
        }

        // 再描画でカードが再利用された場合も、現在の表記で判定し直す。
        const hiddenCards = new Set();
        const hiddenProducts = new Set();
        document.querySelectorAll('a.product-tile__link').forEach((link) => {
            const label = link.querySelector('.product-tile__content-area')?.firstElementChild;
            if (!/^WOMEN\s*(?:[,，]|$)/i.test(label?.textContent.trim() ?? '')) return;

            // グリッド直下の外枠まで隠すことで、空白のマスを残さない。
            const collection = link.closest('.fr-ec-product-collection');
            let card = link;
            if (collection) {
                while (card.parentElement && card.parentElement !== collection) {
                    card = card.parentElement;
                }
            }
            hiddenCards.add(card);
            // 上部のおすすめ枠との重複を避け、商品一覧内だけを集計。
            if (collection?.classList.contains('fr-ec-product-collection--type-grid')) {
                hiddenProducts.add(new URL(link.href).pathname);
            }
        });

        document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => {
            if (!hiddenCards.has(card)) card.classList.remove(HIDDEN_CLASS);
        });
        hiddenCards.forEach((card) => card.classList.add(HIDDEN_CLASS));
        updateCounts(hiddenProducts.size, true);
    }

    let scheduled = false;
    function scheduleUpdate() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            updateCards();
        });
    }

    // 追加読み込み、並べ替え、絞り込み、ページ内遷移による再描画に追従。
    // 属性は監視しないため、このスクリプトのclass変更で再実行されない。
    new MutationObserver(scheduleUpdate).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
    window.addEventListener('popstate', scheduleUpdate);
    window.addEventListener('pageshow', scheduleUpdate);
    updateCards();
})();
