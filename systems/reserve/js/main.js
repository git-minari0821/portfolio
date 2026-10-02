/* 予約・顧客管理：起動（メニューと画面の対応づけ） */
(function (App) {
  "use strict";
  const R = App.R;

  App.startApp({
    store: R.store,
    name: "ととのい整体院",
    subtitle: "予約・顧客管理",
    logo: '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="var(--accent)"/><path d="M9 19c2-5 10-7 12-2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
    portfolioUrl: "../../#systems",
    defaultRoute: "dashboard",
    nav: [
      { route: "dashboard", label: "ダッシュボード", icon: "dashboard" },
      { route: "calendar", label: "予約カレンダー", icon: "calendar" },
      { route: "reservations", label: "予約一覧", icon: "list" },
      { route: "customers", label: "顧客管理", icon: "users" },
      { route: "settings", label: "メニュー・担当者設定", icon: "settings" },
    ],
    routes: {
      dashboard: { title: "ダッシュボード", render: R.views.dashboard },
      calendar: { title: "予約カレンダー", render: R.views.calendar },
      reservations: { title: "予約一覧", render: R.views.reservations },
      customers: { title: "顧客管理", render: R.views.customers },
      settings: { title: "メニュー・担当者設定", render: R.views.settings },
    },
  });
})(window.App);
