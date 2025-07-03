// ==UserScript==
// @name         CAM4 Modal AutoClose
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  CAM4の登録モーダルを検出して自動で削除し、背景クリックで完全非表示（3秒間隔）
// @match        *://*.cam4.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /** 
   * モーダルのセレクタ（部分一致で検出）
   * モーダルのクラスは動的に変更される可能性があるため、class部分一致にしておく
   */
  const MODAL_SELECTOR = 'div[class*="Modal__dialog__"]';

  /**
   * チェック間隔（ミリ秒）
   * 3秒ごとにモーダルの存在を確認
   */
  const CHECK_INTERVAL_MS = 3000;

  /**
   * 背景の黒オーバーレイを解除するために、
   * 画面中央を仮想クリックする
   */
  function clickScreenCenter() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const target = document.elementFromPoint(centerX, centerY) || document.body;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    target.dispatchEvent(clickEvent);
  }

  /**
   * モーダルが存在する場合は削除し、
   * 背景解除のため画面中央をクリックする
   */
  function handleModalIfExists() {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (modal) {
      modal.remove();
      // モーダル削除後に少し待ってからクリック
      setTimeout(clickScreenCenter, 200);
    }
  }

  // 3秒ごとにモーダル処理を実行
  setInterval(handleModalIfExists, CHECK_INTERVAL_MS);
})();
