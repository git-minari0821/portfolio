/* 在庫・発注管理：設定（データの初期化） */
(function (App) {
  "use strict";
  const I = App.I;

  I.views.settings = function (view) {
    view.innerHTML =
      '<div class="page-head"><div><h1>設定</h1><p class="page-desc">デモ用のデータを管理します。</p></div></div>' +
      '<section class="card"><h2 class="card-title">登録されているデータ</h2><dl class="desc-list">' +
      "<dt>商品</dt><dd>" + I.products.all().length + "件</dd>" +
      "<dt>仕入先</dt><dd>" + I.suppliers.all().length + "件</dd>" +
      "<dt>入出庫履歴</dt><dd>" + I.movements.all().length + "件</dd>" +
      "<dt>発注書</dt><dd>" + I.orders.all().length + "件</dd>" +
      "</dl></section>";
    view.appendChild(App.resetCard(I.resetData));
  };
})(window.App);
