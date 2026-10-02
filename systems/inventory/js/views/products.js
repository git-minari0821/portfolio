/* 在庫・発注管理：商品マスタ */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  /* 商品の入力チェック（画面の登録と CSV 取り込みで共通） */
  I.validateProduct = function (v, opts) {
    const rules = App.rules;
    const others = I.products.all().filter((p) => !opts.editingId || p.id !== opts.editingId);
    const codes = others.map((p) => p.code.toUpperCase()).concat(opts.extraCodes || []);
    const intRule = (label, max) => [[rules.required, label + "を入力してください"], [rules.int, "半角の整数で入力してください"], [rules.min(0), "0以上で入力してください"], [rules.max(max), App.num(max) + "以下で入力してください"]];
    const r = {
      code: [[rules.required, "商品コードを入力してください"], [(x) => /^[A-Za-z0-9-]{1,20}$/.test(x), "半角英数字とハイフン（20文字以内）で入力してください"],
        [(x) => codes.indexOf(String(x).toUpperCase()) < 0, "この商品コードはすでに使われています"]],
      name: [[rules.required, "商品名を入力してください"], [rules.maxLen(40), "40文字以内で入力してください"]],
      category: [[rules.required, "カテゴリを選択してください"], [(x) => I.CATEGORIES.indexOf(x) >= 0, "カテゴリが正しくありません"]],
      supplierId: [[rules.required, "仕入先を選択してください"], [(x) => Boolean(I.suppliers.get(x)), "仕入先が見つかりません"]],
      cost: intRule("仕入単価", 1000000),
      price: intRule("販売単価", 1000000),
      reorderPoint: intRule("発注点", 9999),
    };
    if (opts.withStock) r.stock = intRule("初期在庫", 9999);
    return App.validate(v, r);
  };

  function openProductForm(product, onSaved) {
    const p = product || { code: "", name: "", category: "", supplierId: "", cost: "", price: "", reorderPoint: "", stock: 0 };
    const suppliers = I.suppliers.all();
    const pending = I.pendingProductIds();
    App.openModal({
      title: product ? "商品の編集" : "商品の登録",
      submitLabel: product ? "更新する" : "登録する",
      wide: true,
      footerLeft: product ? '<button type="button" class="btn btn-danger-outline" data-delete>削除</button>' : "",
      body:
        '<div class="form-grid cols-2">' +
        App.field({ name: "code", label: "商品コード", required: true, value: p.code, placeholder: "例）KM-041", help: "半角英数字とハイフン。ほかの商品と同じコードは使えません" }) +
        App.field({ name: "name", label: "商品名", required: true, value: p.name, placeholder: "例）木のバターナイフ" }) +
        App.field({ name: "category", label: "カテゴリ", type: "select", required: true, value: p.category, placeholder: "選択してください", options: I.CATEGORIES.map((c) => ({ value: c, label: c })) }) +
        App.field({ name: "supplierId", label: "仕入先", type: "select", required: true, value: p.supplierId, placeholder: "選択してください", options: suppliers.map((s) => ({ value: s.id, label: s.name })) }) +
        App.field({ name: "cost", label: "仕入単価（円）", required: true, value: p.cost, attrs: ' inputmode="numeric"' }) +
        App.field({ name: "price", label: "販売単価（円）", required: true, value: p.price, attrs: ' inputmode="numeric"' }) +
        App.field({ name: "reorderPoint", label: "発注点（個）", required: true, value: p.reorderPoint, attrs: ' inputmode="numeric"', help: "在庫がこの数を下回ると、ダッシュボードに警告を表示します" }) +
        (product
          ? '<div class="field"><span class="field-label">現在の在庫</span><p class="num stock-now">' + p.stock + '個 <span class="field-help">（在庫数は「入出庫登録」で変更します）</span></p></div>'
          : App.field({ name: "stock", label: "初期在庫（個）", required: true, value: 0, attrs: ' inputmode="numeric"' })) +
        "</div>",
      onOpen(el, form, close) {
        const del = el.querySelector("[data-delete]");
        if (!del) return;
        del.addEventListener("click", async () => {
          if (pending[product.id]) { App.toast("発注中（" + pending[product.id] + "）の商品は削除できません", "error"); return; }
          const n = I.movements.all().filter((m) => m.productId === product.id).length;
          const ok = await App.confirm({
            title: "商品を削除しますか？",
            message: "「" + product.name + "」を削除します。\nこの商品の入出庫履歴（" + n + "件）も削除されます。この操作は元に戻せません。",
            okLabel: "削除する",
            danger: true,
          });
          if (!ok) return;
          I.movements.save(I.movements.all().filter((m) => m.productId !== product.id));
          I.products.remove(product.id);
          close();
          App.toast("商品を削除しました", "success");
          onSaved();
        });
      },
      onSubmit(form, close) {
        const v = App.formValues(form);
        const errors = I.validateProduct(v, { editingId: product && product.id, withStock: !product });
        if (!App.showErrors(form, errors)) return;
        const rec = { code: v.code, name: v.name, category: v.category, supplierId: v.supplierId, cost: Number(v.cost), price: Number(v.price), reorderPoint: Number(v.reorderPoint) };
        if (product) I.products.update(product.id, rec);
        else {
          const created = I.products.insert(Object.assign(rec, { stock: 0, createdAt: App.today() }));
          if (Number(v.stock) > 0) I.recordMovement({ productId: created.id, date: App.today(), type: "adjust", qty: Number(v.stock), note: "初期在庫", source: "initial" });
        }
        close();
        App.toast(product ? "商品を更新しました" : "商品を登録しました", "success");
        onSaved();
      },
    });
  }

  I.views.products = function (view) {
    let lk = I.lookup();
    view.innerHTML =
      '<div class="page-head"><div><h1>商品マスタ</h1><p class="page-desc">行をクリックすると編集できます。発注点を下回った商品は色付きで表示します。</p></div>' +
      '<div class="page-actions"><a class="btn btn-secondary" href="#/import">CSV取り込み</a><button type="button" class="btn btn-secondary" data-csv>CSV出力</button>' +
      '<button type="button" class="btn btn-primary" data-new>＋ 商品を登録</button></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => I.products.all(),
      search: (p) => p.code + p.name,
      searchPlaceholder: "商品コード・商品名で検索",
      filters: [
        { name: "category", label: "カテゴリ", options: I.CATEGORIES.map((c) => ({ value: c, label: c })), test: (p, v) => p.category === v },
        { name: "supplier", label: "仕入先", options: I.suppliers.all().map((s) => ({ value: s.id, label: s.name })), test: (p, v) => p.supplierId === v },
        { name: "status", label: "在庫状況", options: Object.keys(I.STOCK_STATUS).map((k) => ({ value: k, label: I.STOCK_STATUS[k].label })), test: (p, v) => I.stockStatus(p) === v },
      ],
      sort: { key: "code", dir: "asc" },
      columns: [
        { key: "code", label: "商品コード", render: (p) => '<span class="code">' + h(p.code) + "</span>" },
        { key: "name", label: "商品名" },
        { key: "category", label: "カテゴリ" },
        { key: "supplier", label: "仕入先", value: (p) => (lk.suppliers[p.supplierId] || {}).name || "" },
        { key: "cost", label: "仕入単価", align: "right", render: (p) => App.yen(p.cost) },
        { key: "price", label: "販売単価", align: "right", render: (p) => App.yen(p.price) },
        { key: "stock", label: "在庫", align: "right", render: (p) => '<strong class="num">' + p.stock + "</strong>" },
        { key: "reorderPoint", label: "発注点", align: "right" },
        { key: "status", label: "状況", value: (p) => ({ out: 0, low: 1, ok: 2 })[I.stockStatus(p)], render: I.stockBadge },
      ],
      rowClass: (p) => ({ out: "row-danger", low: "row-warning", ok: "" })[I.stockStatus(p)],
      onRowClick: (p) => openProductForm(p, reload),
    });
    function reload() { lk = I.lookup(); table.refresh(); }

    view.querySelector("[data-new]").addEventListener("click", () => openProductForm(null, reload));
    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("商品マスタ_" + App.today() + ".csv",
        ["商品コード", "商品名", "カテゴリ", "仕入先", "仕入単価", "販売単価", "発注点", "在庫数"],
        rows.map((p) => [p.code, p.name, p.category, (lk.suppliers[p.supplierId] || {}).name || "", p.cost, p.price, p.reorderPoint, p.stock]));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };
})(window.App);
