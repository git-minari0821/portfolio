/* 見積書・請求書：起動（メニューと画面の対応づけ） */
(function (App) {
  "use strict";
  const V = App.V;

  App.startApp({
    store: V.store,
    name: "ひだまりデザイン事務所",
    subtitle: "見積書・請求書作成",
    logo: '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><circle cx="16" cy="18" r="6" fill="#fff"/><path d="M16 6v3M7 9.5l2 2M25 9.5l-2 2M5 18h3M24 18h3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    portfolioUrl: "../../#systems",
    defaultRoute: "dashboard",
    nav: [
      { route: "dashboard", label: "ダッシュボード", icon: "dashboard" },
      { route: "quotes", label: "見積書", icon: "file" },
      { route: "invoices", label: "請求書", icon: "invoice" },
      { route: "clients", label: "取引先マスタ", icon: "users" },
      { route: "company", label: "自社情報設定", icon: "building" },
    ],
    routes: {
      dashboard: { title: "ダッシュボード", render: V.views.dashboard },
      quotes: { title: "見積書", render: V.views.quotes },
      invoices: { title: "請求書", render: V.views.invoices },
      preview: { title: "印刷プレビュー", nav: "invoices", render: V.views.preview },
      clients: { title: "取引先マスタ", render: V.views.clients },
      company: { title: "自社情報設定", render: V.views.company },
    },
  });
})(window.App);
