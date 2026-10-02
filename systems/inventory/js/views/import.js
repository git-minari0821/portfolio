/* 在庫・発注管理：商品マスタのCSV取り込み（プレビュー・エラー行の表示つき） */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  const HEADERS = ["商品コード", "商品名", "カテゴリ", "仕入先", "仕入単価", "販売単価", "発注点", "初期在庫"];
  const KEYS = ["code", "name", "category", "supplier", "cost", "price", "reorderPoint", "stock"];

  /* デモ用のサンプルCSV（エラー行をわざと含む） */
  const SAMPLE = [
    HEADERS.join(","),
    "KM-101,木のしゃもじ,キッチン雑貨,そよかぜ木工所,380,880,8,20",
    "KM-102,ガラスの保存瓶,キッチン雑貨,みなと生活雑貨商事,550,1320,6,12",
    "KM-103,手織りのコースター,ファブリック,こはく布物店,300,770,10,30",
    "KM-001,重複している商品,器・食器,ひなた陶房,500,1100,5,10",
    "KM-104,価格の入力ミス,文房具,あおば文具卸,三百,660,10,10",
    "KM-105,登録のない仕入先,インテリア,存在しない商店,800,1980,4,5",
    "KM-106,ミニ一輪挿し,器・食器,ひなた陶房,450,1100,6,15",
    ",商品コードなし,文房具,あおば文具卸,200,550,10,10",
  ].join("\r\n");

  I.views.import = function (view) {
    let rows = [];

    view.innerHTML =
      '<a class="back-link" href="#/products">‹ 商品マスタに戻る</a>' +
      '<div class="page-head"><div><h1>CSV取り込み（商品マスタ）</h1><p class="page-desc">CSVファイルから商品を一括で登録します。取り込む前に内容を確認でき、エラーのある行は取り込まれません。</p></div></div>' +
      '<section class="card"><h2 class="card-title">1. CSVファイルを選ぶ</h2>' +
      '<p class="card-text">1行目は見出し（' + HEADERS.join("、") + "）にしてください。文字コードは UTF-8 です（Excel では「CSV UTF-8」で保存）。</p>" +
      '<div class="import-actions">' +
      '<label class="btn btn-primary file-btn">CSVファイルを選択<input type="file" accept=".csv,text/csv" class="visually-hidden" data-file></label>' +
      '<button type="button" class="btn btn-secondary" data-sample>サンプルCSVで試す</button>' +
      '<button type="button" class="btn btn-ghost" data-template>ひな形をダウンロード</button>' +
      "</div><p class=\"file-name text-sub\"></p></section>" +
      '<section class="card preview" hidden><h2 class="card-title">2. 内容を確認する <small class="preview-count"></small></h2><div class="preview-body"></div>' +
      '<div class="form-actions"><button type="button" class="btn btn-secondary" data-clear>やり直す</button><button type="button" class="btn btn-primary" data-import>取り込む</button></div></section>';

    const preview = view.querySelector(".preview");
    const importBtn = view.querySelector("[data-import]");

    function load(text, name) {
      view.querySelector(".file-name").textContent = name;
      const table = App.parseCsv(text);
      if (!table.length) { App.toast("CSVにデータがありません", "error"); return; }
      const head = table[0].map((x) => x.trim());
      const missing = HEADERS.filter((x) => head.indexOf(x) < 0);
      if (missing.length) {
        preview.hidden = false;
        view.querySelector(".preview-body").innerHTML = '<div class="alert alert-danger">見出しの行に「' + h(missing.join("」「")) + "」がありません。ひな形をダウンロードして形式を確認してください。</div>";
        view.querySelector(".preview-count").textContent = "";
        importBtn.disabled = true;
        rows = [];
        return;
      }
      const supplierByName = I.suppliers.all().reduce((m, s) => { m[s.name] = s.id; return m; }, {});
      const seenCodes = [];
      rows = table.slice(1).map((cells, i) => {
        const v = {};
        KEYS.forEach((k, j) => { v[k] = (cells[head.indexOf(HEADERS[j])] || "").trim(); });
        v.supplierId = supplierByName[v.supplier] || "";
        const errors = I.validateProduct(Object.assign({}, v, { supplierId: v.supplierId || (v.supplier ? "__none" : "") }), { withStock: true, extraCodes: seenCodes.slice() });
        if (errors.supplierId) errors.supplierId = v.supplier ? "仕入先「" + v.supplier + "」が仕入先マスタにありません" : "仕入先を入力してください";
        if (v.code) seenCodes.push(v.code.toUpperCase());
        return { line: i + 2, v, errors: Object.keys(errors).map((k) => errors[k]) };
      });
      drawPreview();
    }

    function drawPreview() {
      const ok = rows.filter((r) => !r.errors.length).length;
      preview.hidden = false;
      view.querySelector(".preview-count").textContent = "全" + rows.length + "行（取り込み可 " + ok + "行・エラー " + (rows.length - ok) + "行）";
      view.querySelector(".preview-body").innerHTML =
        (rows.length - ok ? '<div class="alert alert-warning">エラーのある ' + (rows.length - ok) + " 行は取り込まれません。CSVを修正して選び直すこともできます。</div>" : "") +
        '<div class="table-wrap mt"><table class="data"><thead><tr><th>行</th><th>判定</th>' + HEADERS.map((x) => "<th>" + x + "</th>").join("") + "<th>エラー内容</th></tr></thead><tbody>" +
        rows.map((r) => '<tr class="' + (r.errors.length ? "row-danger" : "") + '"><td class="num">' + r.line + "</td><td>" + (r.errors.length ? App.badge("エラー", "danger") : App.badge("OK", "success")) + "</td>" +
          KEYS.map((k) => "<td>" + h(r.v[k]) + "</td>").join("") +
          '<td class="wrap-cell text-danger">' + r.errors.map(h).join("<br>") + "</td></tr>").join("") +
        "</tbody></table></div>";
      importBtn.disabled = ok === 0;
      importBtn.textContent = "エラーのない " + ok + " 行を取り込む";
    }

    view.querySelector("[data-file]").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) { App.toast("ファイルが大きすぎます（1MBまで）", "error"); return; }
      const reader = new FileReader();
      reader.onload = () => load(String(reader.result), file.name);
      reader.onerror = () => App.toast("ファイルを読み込めませんでした", "error");
      reader.readAsText(file, "utf-8");
      e.target.value = "";
    });
    view.querySelector("[data-sample]").addEventListener("click", () => load(SAMPLE, "サンプルCSV（エラー行を含む）"));
    view.querySelector("[data-template]").addEventListener("click", () => {
      App.downloadCsv("商品マスタ_ひな形.csv", HEADERS, [["KM-201", "商品名の例", I.CATEGORIES[0], (I.suppliers.all()[0] || {}).name || "", 500, 1200, 5, 10]]);
    });
    view.querySelector("[data-clear]").addEventListener("click", () => App.rerender());
    importBtn.addEventListener("click", async () => {
      const okRows = rows.filter((r) => !r.errors.length);
      const yes = await App.confirm({ title: "取り込みますか？", message: okRows.length + "件の商品を登録します。", okLabel: "取り込む" });
      if (!yes) return;
      const today = App.today();
      okRows.forEach((r) => {
        const p = I.products.insert({ code: r.v.code, name: r.v.name, category: r.v.category, supplierId: r.v.supplierId, cost: Number(r.v.cost), price: Number(r.v.price), reorderPoint: Number(r.v.reorderPoint), stock: 0, createdAt: today });
        if (Number(r.v.stock) > 0) I.recordMovement({ productId: p.id, date: today, type: "adjust", qty: Number(r.v.stock), note: "CSV取り込み（初期在庫）", source: "import" });
      });
      App.toast(okRows.length + "件の商品を取り込みました", "success");
      App.navigate("products");
    });
  };
})(window.App);
