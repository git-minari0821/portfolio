/* 在庫・発注管理：入出庫登録・入出庫履歴 */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  const qtyText = (m) => '<span class="num ' + (m.qty < 0 ? "qty-minus" : "qty-plus") + '">' + (m.qty > 0 ? "+" : "") + m.qty + "</span>";

  /* ---------- 入出庫登録 ---------- */
  I.views.movements = function (view) {
    const products = I.products.all().slice().sort((a, b) => a.code.localeCompare(b.code));
    const lk = I.lookup();
    const recent = I.movements.all().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);

    view.innerHTML =
      '<div class="page-head"><div><h1>入出庫登録</h1><p class="page-desc">入庫・出庫・棚卸調整を記録すると、在庫数が自動で更新されます。</p></div></div>' +
      '<div class="grid-2">' +
      '<section class="card"><h2 class="card-title">入出庫を記録する</h2>' +
      '<form class="move-form form-grid" novalidate>' +
      '<fieldset class="field"><legend class="field-label">区分<span class="req">必須</span></legend><div class="seg seg-wide" role="radiogroup">' +
      Object.keys(I.TYPES).map((k, i) => '<label><input type="radio" name="type" value="' + k + '"' + (i === 0 ? " checked" : "") + "><span>" + I.TYPES[k].label + "</span></label>").join("") +
      "</div></fieldset>" +
      App.field({ name: "productId", label: "商品", type: "select", required: true, placeholder: "選択してください", options: products.map((p) => ({ value: p.id, label: p.code + "　" + p.name + "（在庫 " + p.stock + "）" })) }) +
      '<div class="form-grid cols-2">' +
      App.field({ name: "qty", label: "数量（個）", required: true, attrs: ' inputmode="numeric"' }) +
      App.field({ name: "date", label: "日付", type: "date", required: true, value: App.today() }) +
      "</div>" +
      '<p class="move-preview" aria-live="polite"></p>' +
      App.field({ name: "note", label: "メモ", placeholder: "例）店頭販売、定期入荷、破損 など" }) +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">記録する</button></div>' +
      "</form></section>" +
      '<section class="card"><h2 class="card-title">最近の入出庫 <a href="#/history">履歴をすべて見る</a></h2>' +
      (recent.length
        ? '<ul class="simple-list">' + recent.map((m) => {
            const p = lk.products[m.productId] || {};
            return "<li>" + I.typeBadge(m.type) + '<div class="grow"><p>' + h(p.name || "（削除された商品）") + '</p><p class="sub">' + App.fmtDate(m.date) + (m.note ? "　" + h(m.note) : "") + "</p></div>" +
              '<div class="ta-right">' + qtyText(m) + '<p class="sub">在庫 ' + m.after + "</p></div></li>";
          }).join("") + "</ul>"
        : '<p class="empty">まだ記録はありません</p>') +
      "</section></div>";

    const form = view.querySelector(".move-form");
    const qtyLabel = form.querySelector('label[for^="f-qty"]');
    const preview = form.querySelector(".move-preview");

    function update() {
      const type = form.querySelector("[name=type]:checked").value;
      qtyLabel.firstChild.textContent = type === "adjust" ? "実在庫数（個）" : "数量（個）";
      const p = I.products.get(form.productId.value);
      const q = Number(form.qty.value);
      if (!p) { preview.textContent = ""; return; }
      let after = p.stock;
      if (/^\d+$/.test(form.qty.value)) after = type === "in" ? p.stock + q : type === "out" ? p.stock - q : q;
      preview.innerHTML = "現在の在庫 <strong>" + p.stock + "</strong>個 → 記録後 <strong class=\"" + (after < 0 ? "text-danger" : "") + "\">" + after + "</strong>個";
    }
    form.addEventListener("input", update);
    form.addEventListener("change", update);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = App.formValues(form);
      const p = I.products.get(v.productId);
      const rules = App.rules;
      const errors = App.validate(v, {
        productId: [[rules.required, "商品を選択してください"]],
        qty: [[rules.required, "数量を入力してください"], [(x) => /^\d+$/.test(x), "半角の整数で入力してください"], [rules.max(9999), "9,999以下で入力してください"],
          [(x) => v.type === "adjust" || Number(x) >= 1, "1以上で入力してください"],
          [(x) => !p || v.type !== "out" || Number(x) <= p.stock, "在庫が足りません（現在の在庫：" + (p ? p.stock : 0) + "個）。出庫すると在庫がマイナスになります"],
          [(x) => !p || v.type !== "adjust" || Number(x) !== p.stock, "現在の在庫と同じ数です（調整の必要はありません）"]],
        date: [[rules.required, "日付を入力してください"], [rules.date, "日付の形式が正しくありません"], [(x) => x <= App.today(), "未来の日付は登録できません"]],
        note: [[rules.maxLen(100), "100文字以内で入力してください"]],
      });
      if (!App.showErrors(form, errors)) return;
      const qty = v.type === "in" ? Number(v.qty) : v.type === "out" ? -Number(v.qty) : Number(v.qty) - p.stock;
      const err = I.recordMovement({ productId: p.id, date: v.date, type: v.type, qty, note: v.note || (v.type === "adjust" ? "棚卸調整" : "") });
      if (err) { App.showErrors(form, { qty: err }); return; }
      App.toast(p.name + "：" + I.TYPES[v.type].label + "を記録しました（在庫 " + I.products.get(p.id).stock + "個）", "success");
      App.rerender();
    });
  };

  /* ---------- 入出庫履歴 ---------- */
  I.views.history = function (view) {
    const lk = I.lookup();
    const products = I.products.all().slice().sort((a, b) => a.code.localeCompare(b.code));
    view.innerHTML =
      '<div class="page-head"><div><h1>入出庫履歴</h1><p class="page-desc">期間・商品・区分で絞り込めます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><a class="btn btn-primary" href="#/movements">＋ 入出庫を登録</a></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => I.movements.all(),
      search: (m) => { const p = lk.products[m.productId] || {}; return (p.code || "") + (p.name || "") + m.note; },
      searchPlaceholder: "商品コード・商品名・メモで検索",
      filters: [
        { name: "from", label: "期間（から）", type: "date", value: App.addDays(App.today(), -30), test: (m, v) => m.date >= v },
        { name: "to", label: "期間（まで）", type: "date", test: (m, v) => m.date <= v },
        { name: "product", label: "商品", options: products.map((p) => ({ value: p.id, label: p.code + " " + p.name })), test: (m, v) => m.productId === v },
        { name: "type", label: "区分", options: Object.keys(I.TYPES).map((k) => ({ value: k, label: I.TYPES[k].label })), test: (m, v) => m.type === v },
      ],
      sort: { key: "date", dir: "desc" },
      columns: [
        { key: "date", label: "日付", value: (m) => m.date + App.pad(m.createdAt || 0, 14), render: (m) => '<span class="num">' + App.fmtDate(m.date) + "</span>" },
        { key: "type", label: "区分", render: (m) => I.typeBadge(m.type) },
        { key: "code", label: "商品コード", value: (m) => (lk.products[m.productId] || {}).code || "", render: (m) => '<span class="code">' + h((lk.products[m.productId] || {}).code || "―") + "</span>" },
        { key: "name", label: "商品名", value: (m) => (lk.products[m.productId] || {}).name || "（削除された商品）" },
        { key: "qty", label: "数量", align: "right", render: qtyText },
        { key: "after", label: "記録後の在庫", align: "right" },
        { key: "note", label: "メモ", sortable: false },
      ],
    });

    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("入出庫履歴_" + App.today() + ".csv", ["日付", "区分", "商品コード", "商品名", "数量", "記録後の在庫", "メモ"],
        rows.map((m) => { const p = lk.products[m.productId] || {}; return [m.date, I.TYPES[m.type].label, p.code || "", p.name || "", m.qty, m.after, m.note]; }));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };
})(window.App);
