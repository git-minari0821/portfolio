/* 共通：ログイン画面・管理画面の枠（サイドメニュー）・画面の切り替え */
(function (App) {
  "use strict";
  const h = App.h;

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-6-5-6.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    swap: '<path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    invoice: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20"/><path d="M8 7h4M8 11h4M8 15h4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  };
  App.icon = (name) => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";

  App.startApp = function (cfg) {
    const root = document.getElementById("app");
    const store = cfg.store;
    App.navigate = (path) => { location.hash = "#/" + path; };

    function renderLogin() {
      document.title = "ログイン｜" + cfg.name + "（デモ）";
      root.innerHTML =
        '<div class="demo-banner">※このシステムは制作実績用のデモです。データはお使いのブラウザ内にのみ保存されます。</div>' +
        '<main class="login">' +
        '  <form class="login-card" novalidate>' +
        '    <div class="login-brand">' + cfg.logo + "<div><p class=\"login-name\">" + h(cfg.name) + '</p><p class="login-sub">' + h(cfg.subtitle) + "</p></div></div>" +
        '    <h1 class="login-title">ログイン</h1>' +
        '    <p class="login-note">デモのため任意の値でログインできます</p>' +
        App.field({ name: "loginId", label: "ログインID", required: true, value: "demo", attrs: ' autocomplete="off"' }) +
        App.field({ name: "password", label: "パスワード", type: "password", required: true, value: "demo", attrs: ' autocomplete="off"' }) +
        '    <button type="submit" class="btn btn-primary btn-block">ログイン</button>' +
        '    <a class="login-back" href="' + cfg.portfolioUrl + '">ポートフォリオに戻る</a>' +
        "  </form>" +
        "</main>";
      const form = root.querySelector("form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = App.formValues(form);
        const errors = App.validate(v, {
          loginId: [[App.rules.required, "ログインIDを入力してください"]],
          password: [[App.rules.required, "パスワードを入力してください"]],
        });
        if (!App.showErrors(form, errors)) return;
        store.set("session", { user: v.loginId, at: Date.now() });
        renderShell();
        if (!location.hash || location.hash === "#/") App.navigate(cfg.defaultRoute);
        else route();
        App.toast("ログインしました");
      });
    }

    let view;
    function renderShell() {
      const session = store.get("session", {});
      root.innerHTML =
        '<div class="demo-banner">※このシステムは制作実績用のデモです。データはお使いのブラウザ内にのみ保存されます。</div>' +
        '<div class="shell">' +
        '  <aside class="sidebar" id="sidebar" aria-label="メニュー">' +
        '    <div class="brand">' + cfg.logo + '<div><p class="brand-name">' + h(cfg.name) + '</p><p class="brand-sub">' + h(cfg.subtitle) + "</p></div></div>" +
        '    <nav class="side-nav">' +
        cfg.nav.map((n) => '<a href="#/' + n.route + '" data-route="' + n.route + '">' + App.icon(n.icon) + "<span>" + h(n.label) + "</span></a>").join("") +
        "    </nav>" +
        '    <a class="side-back" href="' + cfg.portfolioUrl + '">← ポートフォリオに戻る</a>' +
        "  </aside>" +
        '  <div class="sidebar-backdrop" data-menu-close></div>' +
        '  <div class="main-area">' +
        '    <header class="topbar">' +
        '      <button type="button" class="menu-btn" aria-controls="sidebar" aria-expanded="false" aria-label="メニューを開く"><span></span><span></span><span></span></button>' +
        '      <p class="topbar-title"></p>' +
        '      <div class="topbar-user"><span class="user-name">' + h(session.user || "demo") + ' さん</span>' +
        '        <button type="button" class="btn btn-ghost btn-sm" data-logout>' + App.icon("logout") + '<span class="sp-hide">ログアウト</span></button></div>' +
        "    </header>" +
        '    <main id="view" class="view" tabindex="-1"></main>' +
        "  </div>" +
        "</div>";
      view = root.querySelector("#view");

      const btn = root.querySelector(".menu-btn");
      const setMenu = (open) => {
        document.body.classList.toggle("menu-open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      };
      btn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
      root.querySelector("[data-menu-close]").addEventListener("click", () => setMenu(false));
      root.querySelectorAll(".side-nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

      root.querySelector("[data-logout]").addEventListener("click", () => {
        store.set("session", null);
        document.body.classList.remove("menu-open");
        renderLogin();
        App.toast("ログアウトしました");
      });
    }

    App.setTitle = function (title) {
      const el = document.querySelector(".topbar-title");
      if (el) el.textContent = title;
      document.title = title + "｜" + cfg.name + "（デモ）";
    };

    function route() {
      if (!store.get("session", null)) { renderLogin(); return; }
      if (!view) renderShell();
      const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
      let name = parts[0] || cfg.defaultRoute;
      if (!cfg.routes[name]) name = cfg.defaultRoute;
      const r = cfg.routes[name];
      const navKey = r.nav || name;
      document.querySelectorAll(".side-nav a").forEach((a) => {
        const on = a.dataset.route === navKey;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      App.setTitle(r.title);
      // 画面ごとに要素を作り直して、前の画面のイベントが残らないようにする
      const fresh = view.cloneNode(false);
      view.replaceWith(fresh);
      view = fresh;
      r.render(view, parts.slice(1));
      window.scrollTo(0, 0);
    }
    App.rerender = route;

    window.addEventListener("hashchange", route);
    if (!store.get("session", null)) renderLogin();
    else { renderShell(); route(); }
  };

  /* 設定画面で使う「初期状態に戻す」カード */
  App.resetCard = function (onReset) {
    const wrap = document.createElement("section");
    wrap.className = "card";
    wrap.innerHTML =
      '<h2 class="card-title">データを初期状態に戻す</h2>' +
      '<p class="card-text">登録・変更したデータをすべて消して、最初のサンプルデータに戻します。</p>' +
      '<button type="button" class="btn btn-danger-outline">初期状態に戻す</button>';
    wrap.querySelector("button").addEventListener("click", async () => {
      const ok = await App.confirm({
        title: "初期状態に戻しますか？",
        message: "登録・変更したデータはすべて消え、元に戻せません。",
        okLabel: "初期状態に戻す",
        danger: true,
      });
      if (!ok) return;
      onReset();
      App.toast("データを初期状態に戻しました", "success");
      App.rerender();
    });
    return wrap;
  };
})(window.App);
