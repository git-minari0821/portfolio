/* 在庫・発注管理：ダッシュボード（在庫推移グラフつき） */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  I.views = I.views || {};

  I.stat = function (label, value, unit, sub, tone) {
    return '<div class="stat' + (tone ? " stat-" + tone : "") + '"><p class="stat-label">' + h(label) + '</p><p class="stat-value">' + value + "<small>" + unit + '</small></p><p class="stat-sub">' + h(sub) + "</p></div>";
  };

  I.views.dashboard = function (view) {
    const products = I.products.all();
    const lk = I.lookup();
    const month = App.monthKey(App.today());
    const monthMoves = I.movements.all().filter((m) => App.monthKey(m.date) === month);
    const inQty = monthMoves.filter((m) => m.type === "in").reduce((s, m) => s + m.qty, 0);
    const outQty = monthMoves.filter((m) => m.type === "out").reduce((s, m) => s - m.qty, 0);
    const outCount = products.filter((p) => I.stockStatus(p) === "out").length;
    const alerts = products.filter((p) => I.stockStatus(p) !== "ok").sort((a, b) => a.stock / a.reorderPoint - b.stock / b.reorderPoint);
    const value = products.reduce((s, p) => s + p.stock * p.cost, 0);
    const pending = I.pendingProductIds();
    const chartDefault = (alerts[0] || products[0] || {}).id;

    view.innerHTML =
      '<div class="page-head"><div><h1>ダッシュボード</h1><p class="page-desc">' + App.fmtDateJa(App.today()) + " 時点の在庫状況</p></div>" +
      '<div class="page-actions"><a class="btn btn-secondary" href="#/movements">入出庫を登録</a><a class="btn btn-primary" href="#/orders/new">発注書を作成</a></div></div>' +
      '<div class="stat-grid">' +
      I.stat("在庫切れ", outCount, "件", "在庫が0の商品", outCount ? "danger" : "") +
      I.stat("発注点を下回った商品", alerts.length, "件", "在庫切れを含む", alerts.length ? "warning" : "") +
      I.stat("今月の入庫 / 出庫", App.num(inQty) + '<small>個</small> / ' + App.num(outQty), "個", "棚卸調整を除く") +
      I.stat("在庫金額の合計", App.num(value), "円", "在庫数 × 仕入単価") +
      "</div>" +
      '<div class="grid-2">' +
      '<section class="card"><h2 class="card-title">発注点を下回った商品 <small>' + alerts.length + "件</small></h2>" +
      (alerts.length
        ? '<ul class="simple-list">' + alerts.map((p) =>
            '<li class="alert-row alert-row-' + I.stockStatus(p) + '"><span class="alert-icon" aria-hidden="true">!</span><div class="grow"><p><span class="code">' + h(p.code) + "</span> " + h(p.name) + "</p>" +
            '<p class="sub">' + h((lk.suppliers[p.supplierId] || {}).name || "") + (pending[p.id] ? "　・発注中（" + h(pending[p.id]) + "）" : "") + "</p></div>" +
            '<div class="ta-right"><p class="num"><strong class="' + (p.stock === 0 ? "text-danger" : "text-warning") + '">' + p.stock + "</strong> / 発注点 " + p.reorderPoint + "</p>" + I.stockBadge(p) + "</div></li>").join("") + "</ul>" +
          '<div class="form-actions"><a class="btn btn-primary btn-sm" href="#/orders/new">この一覧から発注書を作成</a></div>'
        : '<p class="empty">発注点を下回った商品はありません</p>') +
      "</section>" +
      '<section class="card"><h2 class="card-title">在庫推移 <small>直近30日</small></h2>' +
      '<div class="field"><label for="chart-product" class="visually-hidden">商品を選ぶ</label><select id="chart-product" class="input">' +
      products.map((p) => '<option value="' + p.id + '"' + (p.id === chartDefault ? " selected" : "") + ">" + h(p.code + "　" + p.name) + "</option>").join("") +
      "</select></div>" +
      '<div class="chart" aria-live="polite"></div>' +
      "</section>" +
      "</div>";

    const select = view.querySelector("#chart-product");
    const chart = view.querySelector(".chart");
    const draw = () => { chart.innerHTML = I.stockChart(select.value); };
    select.addEventListener("change", draw);
    if (products.length) draw();
  };

  /* 在庫推移の折れ線グラフ（外部ライブラリを使わずSVGで描く） */
  I.stockChart = function (productId) {
    const p = I.products.get(productId);
    const data = I.stockHistory(productId, 30);
    if (!p || !data.length) return '<p class="empty">データがありません</p>';
    const W = 600, H = 240, L = 40, R = 16, T = 16, B = 32;
    const maxY = Math.max(5, p.reorderPoint, ...data.map((d) => d.stock));
    const niceMax = Math.ceil(maxY / 5) * 5;
    const x = (i) => L + (i * (W - L - R)) / (data.length - 1);
    const y = (v) => T + (H - T - B) * (1 - v / niceMax);
    const points = data.map((d, i) => x(i).toFixed(1) + "," + y(d.stock).toFixed(1)).join(" ");
    let grid = "";
    for (let k = 0; k <= 5; k++) {
      const v = (niceMax / 5) * k;
      grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="ch-grid"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" class="ch-label" text-anchor="end">' + Math.round(v) + "</text>";
    }
    const xLabels = data.map((d, i) => ((i % 7 === 0 && i < data.length - 4) || i === data.length - 1)
      ? '<text x="' + x(i) + '" y="' + (H - 10) + '" class="ch-label" text-anchor="' + (i === data.length - 1 ? "end" : i === 0 ? "start" : "middle") + '">' + Number(d.date.slice(5, 7)) + "/" + Number(d.date.slice(8)) + "</text>" : "").join("");
    const dots = data.map((d, i) => '<circle cx="' + x(i) + '" cy="' + y(d.stock) + '" r="3" class="ch-dot"><title>' + App.fmtDate(d.date) + "：" + d.stock + "個</title></circle>").join("");
    const rpY = y(p.reorderPoint);
    const last = data[data.length - 1];
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="chart-svg" role="img" aria-label="' + h(p.name) + "の直近30日の在庫推移。現在の在庫は" + last.stock + "個、発注点は" + p.reorderPoint + '個">' +
      grid +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + rpY + '" y2="' + rpY + '" class="ch-rp"/>' +
      '<text x="' + (W - R) + '" y="' + (rpY - 5) + '" class="ch-rp-label" text-anchor="end">発注点 ' + p.reorderPoint + "</text>" +
      '<polyline points="' + points + '" class="ch-line"/>' + dots + xLabels +
      "</svg>" +
      '<p class="chart-note">現在の在庫：<strong>' + last.stock + "個</strong>（30日前：" + data[0].stock + "個）</p>";
  };
})(window.App);
