/* 見積書・請求書：ダッシュボード */
(function (App) {
  "use strict";
  const V = App.V;
  const h = App.h;

  V.stat = function (label, value, unit, sub, tone) {
    return '<div class="stat' + (tone ? " stat-" + tone : "") + '"><p class="stat-label">' + h(label) + '</p><p class="stat-value">' + value + "<small>" + unit + '</small></p><p class="stat-sub">' + h(sub) + "</p></div>";
  };

  V.views.dashboard = function (view) {
    const today = App.today();
    const month = App.monthKey(today);
    const invoices = V.invoices.all();
    const clients = V.clients.all().reduce((m, c) => { m[c.id] = c; return m; }, {});
    const total = (d) => V.calc(d.items).total;

    const billed = invoices.filter((d) => d.status !== "draft" && App.monthKey(d.date) === month);
    const unpaid = invoices.filter((d) => d.status === "issued");
    const overdue = unpaid.filter(V.isOverdue).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const upcoming = unpaid.filter((d) => !V.isOverdue(d)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
    const openQuotes = V.quotes.all().filter((q) => q.status === "sent").length;
    const sum = (rows) => rows.reduce((s, d) => s + total(d), 0);

    const row = (d, late) => '<li><div class="grow"><a href="#/preview/invoice/' + d.id + '">' + h(d.no) + "</a> " + h((clients[d.clientId] || {}).name || "") +
      '<p class="sub">' + h(d.title) + "</p></div>" +
      '<div class="ta-right"><p class="num"><strong>' + App.yen(total(d)) + "</strong></p>" +
      '<p class="sub ' + (late ? "text-danger" : "") + '">期限 ' + App.fmtDate(d.dueDate) + (late ? "（" + Math.round((App.parseDate(today) - App.parseDate(d.dueDate)) / 86400000) + "日超過）" : "") + "</p></div></li>";

    view.innerHTML =
      '<div class="page-head"><div><h1>ダッシュボード</h1><p class="page-desc">' + App.fmtDateJa(today) + " 時点の請求状況</p></div>" +
      '<div class="page-actions"><a class="btn btn-secondary" href="#/quotes/new">見積書を作成</a><a class="btn btn-primary" href="#/invoices/new">請求書を作成</a></div></div>' +
      '<div class="stat-grid">' +
      V.stat("今月の請求額", App.num(sum(billed)), "円", billed.length + "件（税込・下書きを除く）") +
      V.stat("未入金の請求書", unpaid.length, "件", "発行済みで入金待ち", unpaid.length ? "warning" : "") +
      V.stat("未入金の金額", App.num(sum(unpaid)), "円", "税込") +
      V.stat("支払期限を過ぎた請求書", overdue.length, "件", App.yen(sum(overdue)), overdue.length ? "danger" : "") +
      "</div>" +
      (overdue.length ? '<div class="alert alert-danger dash-alert"><strong>支払期限を過ぎた請求書が ' + overdue.length + " 件あります。</strong>入金状況を確認し、必要に応じて取引先に連絡してください。</div>" : "") +
      '<div class="grid-2">' +
      '<section class="card card-danger"><h2 class="card-title">支払期限を過ぎた請求書 <a href="#/invoices">請求書一覧へ</a></h2>' +
      (overdue.length ? '<ul class="simple-list">' + overdue.map((d) => row(d, true)).join("") + "</ul>" : '<p class="empty">ありません</p>') + "</section>" +
      '<section class="card"><h2 class="card-title">入金待ちの請求書 <small>支払期限の近い順</small></h2>' +
      (upcoming.length ? '<ul class="simple-list">' + upcoming.map((d) => row(d, false)).join("") + "</ul>" : '<p class="empty">ありません</p>') + "</section>" +
      "</div>" +
      '<section class="card"><h2 class="card-title">見積書</h2><p>提出済みで返答待ちの見積書が <strong>' + openQuotes + '件</strong> あります。 <a href="#/quotes">見積書一覧を見る</a></p></section>';
  };
})(window.App);
