/* 在庫・発注管理：起動（メニューと画面の対応づけ） */
(function (App) {
  "use strict";
  const I = App.I;

  App.startApp({
    store: I.store,
    name: "こもれび雑貨店",
    subtitle: "在庫・発注管理",
    logo: '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M16 7 25 12v9l-9 5-9-5v-9Z M7 12l9 5 9-5 M16 17v9" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    portfolioUrl: "../../#systems",
    defaultRoute: "dashboard",
    nav: [
      { route: "dashboard", label: "ダッシュボード", icon: "dashboard" },
      { route: "products", label: "商品マスタ", icon: "box" },
      { route: "movements", label: "入出庫登録", icon: "swap" },
      { route: "history", label: "入出庫履歴", icon: "history" },
      { route: "orders", label: "発注管理", icon: "cart" },
      { route: "suppliers", label: "仕入先マスタ", icon: "truck" },
      { route: "import", label: "CSV取り込み", icon: "upload" },
      { route: "settings", label: "設定", icon: "settings" },
    ],
    routes: {
      dashboard: { title: "ダッシュボード", render: I.views.dashboard },
      products: { title: "商品マスタ", render: I.views.products },
      movements: { title: "入出庫登録", render: I.views.movements },
      history: { title: "入出庫履歴", render: I.views.history },
      orders: { title: "発注管理", render: I.views.orders },
      suppliers: { title: "仕入先マスタ", render: I.views.suppliers },
      import: { title: "CSV取り込み", render: I.views.import },
      settings: { title: "設定", render: I.views.settings },
    },
  });
})(window.App);
