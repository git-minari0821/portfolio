/* 在庫・発注管理：発注管理（発注書の作成・入荷処理） */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  /* ---------- 発注一覧 ---------- */
  function renderList(view) {
    const lk = I.lookup();
    view.innerHTML =
      '<div class="page-head"><div><h1>発注管理</h1><p class="page-desc">「入荷済み」にすると、発注した数量が自動で入庫されます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><a class="btn btn-primary" href="#/orders/new">＋ 発注書を作成</a></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => I.orders.all(),
      search: (o) => o.no + ((lk.suppliers[o.supplierId] || {}).name || "") + o.items.map((it) => (lk.products[it.productId] || {}).name || "").join(""),
      searchPlaceholder: "発注番号・仕入先・商品名で検索",
      filters: [
        { name: "status", label: "ステータス", options: Object.keys(I.ORDER_STATUS).map((k) => ({ value: k, label: I.ORDER_STATUS[k].label })), test: (o, v) => o.status === v },
        { name: "supplier", label: "仕入先", options: I.suppliers.all().map((s) => ({ value: s.id, label: s.name })), test: (o, v) => o.supplierId === v },
      ],
      sort: { key: "no", dir: "desc" },
      columns: [
        { key: "no", label: "発注番号", render: (o) => '<span class="code">' + h(o.no) + "</span>" },
        { key: "date", label: "発注日", render: (o) => App.fmtDate(o.date) },
        { key: "supplier", label: "仕入先", value: (o) => (lk.suppliers[o.supplierId] || {}).name || "" },
        { key: "items", label: "品目", value: (o) => o.items.length,
          render: (o) => { const first = lk.products[o.items[0].productId]; return h(first ? first.name : "") + (o.items.length > 1 ? ' <span class="text-sub">ほか' + (o.items.length - 1) + "件</span>" : ""); } },
        { key: "total", label: "発注金額", align: "right", value: I.orderTotal, render: (o) => App.yen(I.orderTotal(o)) },
        { key: "status", label: "ステータス", render: (o) => I.orderBadge(o.status) },
        { key: "receivedDate", label: "入荷日", render: (o) => (o.receivedDate ? App.fmtDate(o.receivedDate) : "―") },
      ],
      onRowClick: (o) => openOrder(o, () => App.rerender()),
    });

    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = [];
      table.getRows().forEach((o) => o.items.forEach((it) => {
        const p = lk.products[it.productId] || {};
        rows.push([o.no, o.date, (lk.suppliers[o.supplierId] || {}).name || "", p.code || "", p.name || "", it.qty, it.cost, it.qty * it.cost, I.ORDER_STATUS[o.status].label, o.receivedDate]);
      }));
      App.downloadCsv("発注一覧_" + App.today() + ".csv", ["発注番号", "発注日", "仕入先", "商品コード", "商品名", "数量", "仕入単価", "金額", "ステータス", "入荷日"], rows);
      App.toast(rows.length + "行をCSVに出力しました", "success");
    });
  }

  /* ---------- 発注書の詳細（入荷処理・削除） ---------- */
  function openOrder(order, onDone) {
    const lk = I.lookup();
    const sup = lk.suppliers[order.supplierId] || {};
    App.openModal({
      title: "発注書 " + order.no,
      wide: true,
      cancelLabel: "閉じる",
      footerLeft: order.status === "ordered"
        ? '<button type="button" class="btn btn-danger-outline" data-delete>削除</button> <button type="button" class="btn btn-primary" data-receive>入荷済みにする</button>'
        : "",
      body:
        '<dl class="desc-list"><dt>仕入先</dt><dd>' + h(sup.name || "") + "（" + h(sup.contact || "") + "）</dd>" +
        "<dt>発注日</dt><dd>" + App.fmtDate(order.date) + "</dd><dt>ステータス</dt><dd>" + I.orderBadge(order.status) +
        (order.receivedDate ? "　入荷日 " + App.fmtDate(order.receivedDate) : "") + "</dd></dl>" +
        '<div class="table-wrap mt"><table class="data data-compact"><thead><tr><th>商品</th><th class="ta-right">数量</th><th class="ta-right">仕入単価</th><th class="ta-right">金額</th></tr></thead><tbody>' +
        order.items.map((it) => { const p = lk.products[it.productId] || {}; return '<tr><td><span class="code">' + h(p.code || "") + "</span> " + h(p.name || "（削除された商品）") + '</td><td class="ta-right">' + it.qty + '</td><td class="ta-right">' + App.yen(it.cost) + '</td><td class="ta-right">' + App.yen(it.qty * it.cost) + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><th colspan="3" class="ta-right">合計</th><th class="ta-right">' + App.yen(I.orderTotal(order)) + "</th></tr></tfoot></table></div>",
      onOpen(el, form, close) {
        const recv = el.querySelector("[data-receive]");
        if (recv) recv.addEventListener("click", async () => {
          const ok = await App.confirm({ title: "入荷済みにしますか？", message: order.no + " の " + order.items.length + "品目を、今日の日付で在庫に入庫します。", okLabel: "入荷済みにする" });
          if (!ok) return;
          const today = App.today();
          order.items.forEach((it) => {
            if (I.products.get(it.productId)) I.recordMovement({ productId: it.productId, date: today, type: "in", qty: it.qty, note: "発注 " + order.no + " の入荷", source: "order" });
          });
          I.orders.update(order.id, { status: "received", receivedDate: today });
          close();
          App.toast(order.no + " を入荷済みにしました（在庫に入庫済み）", "success");
          onDone();
        });
        const del = el.querySelector("[data-delete]");
        if (del) del.addEventListener("click", async () => {
          const ok = await App.confirm({ title: "発注書を削除しますか？", message: order.no + " を削除します。この操作は元に戻せません。", okLabel: "削除する", danger: true });
          if (!ok) return;
          I.orders.remove(order.id);
          close();
          App.toast("発注書を削除しました", "success");
          onDone();
        });
      },
    });
  }

  /* ---------- 発注書の作成 ---------- */
  function renderNew(view) {
    const lk = I.lookup();
    const pending = I.pendingProductIds();
    const all = I.products.all().slice().sort((a, b) => a.code.localeCompare(b.code));
    // 発注点を下回っていて、まだ発注していない商品を候補にする
    let lines = all.filter((p) => I.stockStatus(p) !== "ok" && !pending[p.id])
      .map((p) => ({ productId: p.id, checked: true, qty: String(Math.max(1, p.reorderPoint * 2 - p.stock)) }));

    view.innerHTML =
      '<a class="back-link" href="#/orders">‹ 発注管理に戻る</a>' +
      '<div class="page-head"><div><h1>発注書の作成</h1><p class="page-desc">発注点を下回った商品が自動で入っています。数量を確認して作成してください。仕入先ごとに発注書を分けて作成します。</p></div></div>' +
      '<form class="card order-form" novalidate>' +
      '<div class="table-wrap"><table class="data order-lines"><thead><tr><th class="ta-center">発注</th><th>商品</th><th>仕入先</th><th class="ta-right">在庫 / 発注点</th><th class="ta-right">発注数量</th><th class="ta-right">仕入単価</th><th class="ta-right">金額</th></tr></thead><tbody></tbody></table></div>' +
      '<div data-error-for="lines"></div>' +
      '<div class="order-add"><label for="add-product" class="field-label">ほかの商品を追加</label><div class="inline">' +
      '<select id="add-product" class="input"><option value="">商品を選択</option>' +
      all.map((p) => '<option value="' + p.id + '">' + h(p.code + "　" + p.name + "（在庫 " + p.stock + "）") + "</option>").join("") +
      '</select><button type="button" class="btn btn-secondary" data-add>追加</button></div></div>' +
      '<div class="order-summary"></div>' +
      '<div class="form-actions"><a class="btn btn-secondary" href="#/orders">キャンセル</a><button type="submit" class="btn btn-primary">発注書を作成</button></div>' +
      "</form>";

    const form = view.querySelector(".order-form");
    const tbody = form.querySelector("tbody");
    const summary = form.querySelector(".order-summary");

    function drawLines() {
      if (!lines.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">発注が必要な商品はありません。下の「ほかの商品を追加」から選べます。</td></tr>';
      } else {
        tbody.innerHTML = lines.map((l, i) => {
          const p = lk.products[l.productId];
          const amount = /^\d+$/.test(l.qty) ? Number(l.qty) * p.cost : 0;
          return '<tr data-i="' + i + '"><td class="ta-center"><input type="checkbox" data-check aria-label="' + h(p.name) + 'を発注する"' + (l.checked ? " checked" : "") + "></td>" +
            '<td><span class="code">' + h(p.code) + "</span> " + h(p.name) + (pending[p.id] ? ' <span class="badge badge-warning">発注中</span>' : "") + "</td>" +
            "<td>" + h((lk.suppliers[p.supplierId] || {}).name || "") + "</td>" +
            '<td class="ta-right num"><span class="' + (p.stock < p.reorderPoint ? "text-warning" : "") + '">' + p.stock + "</span> / " + p.reorderPoint + "</td>" +
            '<td class="ta-right"><div class="field qty-field"><input class="input qty-input" name="qty-' + i + '" inputmode="numeric" value="' + h(l.qty) + '" aria-label="' + h(p.name) + 'の発注数量"' + (l.checked ? "" : " disabled") + "></div></td>" +
            '<td class="ta-right">' + App.yen(p.cost) + '</td><td class="ta-right" data-amount>' + App.yen(amount) + "</td></tr>";
        }).join("");
      }
      drawSummary();
    }
    function drawSummary() {
      const chosen = lines.filter((l) => l.checked);
      const total = chosen.reduce((s, l) => s + (/^\d+$/.test(l.qty) ? Number(l.qty) * lk.products[l.productId].cost : 0), 0);
      const sups = new Set(chosen.map((l) => lk.products[l.productId].supplierId));
      summary.innerHTML = "選択中：<strong>" + chosen.length + "品目</strong>（発注書 " + sups.size + "件）　合計 <strong>" + App.yen(total) + "</strong>";
    }

    tbody.addEventListener("input", (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (!tr || !e.target.classList.contains("qty-input")) return;
      const l = lines[Number(tr.dataset.i)];
      l.qty = e.target.value.trim();
      const p = lk.products[l.productId];
      tr.querySelector("[data-amount]").textContent = App.yen(/^\d+$/.test(l.qty) ? Number(l.qty) * p.cost : 0);
      drawSummary();
    });
    tbody.addEventListener("change", (e) => {
      if (!e.target.matches("[data-check]")) return;
      const tr = e.target.closest("tr[data-i]");
      const l = lines[Number(tr.dataset.i)];
      l.checked = e.target.checked;
      tr.querySelector(".qty-input").disabled = !l.checked;
      drawSummary();
    });
    form.querySelector("[data-add]").addEventListener("click", () => {
      const sel = form.querySelector("#add-product");
      if (!sel.value) return;
      if (lines.some((l) => l.productId === sel.value)) { App.toast("その商品はすでに一覧にあります", "error"); return; }
      const p = lk.products[sel.value];
      lines.push({ productId: p.id, checked: true, qty: String(Math.max(1, p.reorderPoint * 2 - p.stock)) });
      sel.value = "";
      drawLines();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = {};
      const chosen = lines.filter((l) => l.checked);
      if (!chosen.length) errors.lines = "発注する商品を1つ以上選んでください";
      lines.forEach((l, i) => {
        if (!l.checked) return;
        if (!/^\d+$/.test(l.qty) || Number(l.qty) < 1) errors["qty-" + i] = "1以上の整数";
        else if (Number(l.qty) > 9999) errors["qty-" + i] = "9,999以下";
      });
      if (!App.showErrors(form, errors)) return;

      const bySupplier = {};
      chosen.forEach((l) => {
        const p = lk.products[l.productId];
        (bySupplier[p.supplierId] = bySupplier[p.supplierId] || []).push({ productId: p.id, qty: Number(l.qty), cost: p.cost });
      });
      const today = App.today();
      const created = Object.keys(bySupplier).map((sid) => I.orders.insert({ no: I.nextOrderNo(today), date: today, supplierId: sid, items: bySupplier[sid], status: "ordered", receivedDate: "", note: "" }));
      App.toast("発注書を" + created.length + "件作成しました（" + created.map((o) => o.no).join("、") + "）", "success");
      App.navigate("orders");
    });

    drawLines();
  }

  I.views.orders = function (view, params) {
    if (params[0] === "new") { App.setTitle("発注書の作成"); renderNew(view); }
    else renderList(view);
  };
})(window.App);
