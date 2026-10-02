/* 見積書・請求書：見積書一覧・請求書一覧（請求書への変換、入金処理など） */
(function (App) {
  "use strict";
  const V = App.V;
  const h = App.h;

  const total = (d) => V.calc(d.items).total;
  const actionBtn = (action, label, tone) => '<button type="button" class="btn btn-' + (tone || "ghost") + ' btn-sm" data-action="' + action + '">' + label + "</button>";

  /* 見積書 → 請求書に変換 */
  V.convertToInvoice = async function (q) {
    const c = V.clients.get(q.clientId);
    const ok = await App.confirm({
      title: "請求書に変換しますか？",
      message: q.no + "「" + q.title + "」の内容で、請求書（下書き）を作成します。\n請求日は今日、支払期限は取引先の支払条件から設定します。",
      okLabel: "請求書を作成",
    });
    if (!ok) return;
    const today = App.today();
    const inv = V.invoices.insert({
      no: V.nextNo("I", today), date: today, clientId: q.clientId, title: q.title,
      items: q.items.map((it) => Object.assign({}, it, { id: App.uid() })),
      dueDate: V.dueDateFor(c ? c.terms : "end_next", today), note: "", quoteId: q.id, status: "draft", paidDate: "",
    });
    V.quotes.update(q.id, { status: "invoiced" });
    App.toast("請求書 " + inv.no + " を作成しました。内容を確認して発行してください", "success");
    App.navigate("invoices/edit/" + inv.id);
  };

  async function deleteDoc(col, d, label) {
    const ok = await App.confirm({ title: label + "を削除しますか？", message: d.no + "「" + d.title + "」を削除します。この操作は元に戻せません。", okLabel: "削除する", danger: true });
    if (!ok) return false;
    col.remove(d.id);
    App.toast(label + "を削除しました", "success");
    return true;
  }

  /* ---------- 見積書一覧 ---------- */
  V.views.quotes = function (view, params) {
    if (params[0] === "new") return V.renderEditor(view, "quote");
    if (params[0] === "edit") return V.renderEditor(view, "quote", params[1]);
    const clients = V.clients.all().reduce((m, c) => { m[c.id] = c; return m; }, {});

    view.innerHTML =
      '<div class="page-head"><div><h1>見積書</h1><p class="page-desc">行をクリックすると編集できます。「請求書に変換」で、同じ内容の請求書を作成できます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><a class="btn btn-primary" href="#/quotes/new">＋ 見積書を作成</a></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => V.quotes.all(),
      search: (q) => q.no + q.title + ((clients[q.clientId] || {}).name || ""),
      searchPlaceholder: "書類番号・件名・取引先で検索",
      filters: [
        { name: "status", label: "ステータス", options: Object.keys(V.QUOTE_STATUS).map((k) => ({ value: k, label: V.QUOTE_STATUS[k].label })), test: (q, v) => q.status === v },
        { name: "from", label: "見積日（から）", type: "date", test: (q, v) => q.date >= v },
        { name: "to", label: "見積日（まで）", type: "date", test: (q, v) => q.date <= v },
      ],
      sort: { key: "no", dir: "desc" },
      columns: [
        { key: "no", label: "書類番号", render: (q) => '<span class="code">' + h(q.no) + "</span>" },
        { key: "date", label: "見積日", render: (q) => App.fmtDate(q.date) },
        { key: "client", label: "取引先", value: (q) => (clients[q.clientId] || {}).name || "" },
        { key: "title", label: "件名" },
        { key: "total", label: "金額（税込）", align: "right", value: total, render: (q) => App.yen(total(q)) },
        { key: "validUntil", label: "有効期限", render: (q) => '<span class="' + (q.status === "sent" && q.validUntil < App.today() ? "text-warning" : "") + '">' + App.fmtDate(q.validUntil) + "</span>" },
        { key: "status", label: "ステータス", render: (q) => V.quoteBadge(q.status) },
        { key: "ops", label: "操作", sortable: false, render: (q) =>
          actionBtn("preview", "プレビュー") + (q.status !== "invoiced" ? actionBtn("convert", "請求書に変換", "secondary") : "") + actionBtn("delete", "削除", "ghost text-danger") },
      ],
      rowClass: (q) => (q.status === "invoiced" ? "row-muted" : ""),
      onRowClick: (q) => App.navigate("quotes/edit/" + q.id),
      onAction: async (action, q) => {
        if (action === "preview") App.navigate("preview/quote/" + q.id);
        if (action === "convert") V.convertToInvoice(q);
        if (action === "delete" && (await deleteDoc(V.quotes, q, "見積書"))) table.refresh();
      },
    });

    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("見積書一覧_" + App.today() + ".csv", ["書類番号", "見積日", "取引先", "件名", "小計", "消費税", "合計", "有効期限", "ステータス"],
        rows.map((q) => { const t = V.calc(q.items); return [q.no, q.date, (clients[q.clientId] || {}).name || "", q.title, t.subtotal, t.tax, t.total, q.validUntil, V.QUOTE_STATUS[q.status].label]; }));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };

  /* ---------- 請求書一覧 ---------- */
  V.views.invoices = function (view, params) {
    if (params[0] === "new") return V.renderEditor(view, "invoice");
    if (params[0] === "edit") return V.renderEditor(view, "invoice", params[1]);
    const clients = V.clients.all().reduce((m, c) => { m[c.id] = c; return m; }, {});
    const statusOptions = Object.keys(V.INVOICE_STATUS).map((k) => ({ value: k, label: V.INVOICE_STATUS[k].label })).concat([{ value: "overdue", label: "支払期限超過" }]);

    view.innerHTML =
      '<div class="page-head"><div><h1>請求書</h1><p class="page-desc">ステータスや支払期限で絞り込めます。入金を確認したら「入金済み」にしてください。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><a class="btn btn-primary" href="#/invoices/new">＋ 請求書を作成</a></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => V.invoices.all(),
      search: (d) => d.no + d.title + ((clients[d.clientId] || {}).name || ""),
      searchPlaceholder: "書類番号・件名・取引先で検索",
      filters: [
        { name: "status", label: "ステータス", options: statusOptions, test: (d, v) => (v === "overdue" ? V.isOverdue(d) : d.status === v) },
        { name: "dueFrom", label: "支払期限（から）", type: "date", test: (d, v) => d.dueDate >= v },
        { name: "dueTo", label: "支払期限（まで）", type: "date", test: (d, v) => d.dueDate <= v },
      ],
      sort: { key: "no", dir: "desc" },
      columns: [
        { key: "no", label: "書類番号", render: (d) => '<span class="code">' + h(d.no) + "</span>" },
        { key: "date", label: "請求日", render: (d) => App.fmtDate(d.date) },
        { key: "client", label: "取引先", value: (d) => (clients[d.clientId] || {}).name || "" },
        { key: "title", label: "件名" },
        { key: "total", label: "請求額（税込）", align: "right", value: total, render: (d) => App.yen(total(d)) },
        { key: "dueDate", label: "支払期限", render: (d) => '<span class="' + (V.isOverdue(d) ? "text-danger" : "") + '">' + App.fmtDate(d.dueDate) + "</span>" },
        { key: "status", label: "ステータス", render: V.invoiceBadge },
        { key: "ops", label: "操作", sortable: false, render: (d) =>
          actionBtn("preview", "プレビュー") +
          (d.status === "draft" ? actionBtn("issue", "発行する", "secondary") : "") +
          (d.status === "issued" ? actionBtn("paid", "入金済みにする", "secondary") : "") +
          (d.status === "paid" ? '<span class="paid-date">入金 ' + App.fmtDate(d.paidDate).slice(5) + "</span>" : "") +
          (d.status === "draft" ? actionBtn("delete", "削除", "ghost text-danger") : "") },
      ],
      rowClass: (d) => (V.isOverdue(d) ? "row-danger" : ""),
      onRowClick: (d) => App.navigate("invoices/edit/" + d.id),
      onAction: async (action, d) => {
        if (action === "preview") App.navigate("preview/invoice/" + d.id);
        if (action === "issue") {
          V.invoices.update(d.id, { status: "issued" });
          App.toast(d.no + " を発行済みにしました", "success");
          table.refresh();
        }
        if (action === "paid") {
          const ok = await App.confirm({ title: "入金済みにしますか？", message: d.no + "　" + V.clientName(clients[d.clientId]) + "\n請求額 " + App.yen(total(d)) + " の入金を、今日の日付で記録します。", okLabel: "入金済みにする" });
          if (!ok) return;
          V.invoices.update(d.id, { status: "paid", paidDate: App.today() });
          App.toast(d.no + " を入金済みにしました", "success");
          table.refresh();
        }
        if (action === "delete" && (await deleteDoc(V.invoices, d, "請求書"))) table.refresh();
      },
    });

    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("請求書一覧_" + App.today() + ".csv", ["書類番号", "請求日", "取引先", "件名", "小計", "10%対象", "10%消費税", "8%対象", "8%消費税", "合計", "支払期限", "ステータス", "入金日"],
        rows.map((d) => { const t = V.calc(d.items); return [d.no, d.date, (clients[d.clientId] || {}).name || "", d.title, t.subtotal, t.byRate[10].base, t.byRate[10].tax, t.byRate[8].base, t.byRate[8].tax, t.total, d.dueDate, V.isOverdue(d) ? "支払期限超過" : V.INVOICE_STATUS[d.status].label, d.paidDate]; }));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };
})(window.App);
