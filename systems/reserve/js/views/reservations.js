/* 予約・顧客管理：予約一覧 */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;

  R.views.reservations = function (view) {
    let lk = R.lookup();
    const reload = () => { lk = R.lookup(); table.refresh(); };
    const name = (map, id) => (map[id] ? map[id].name : "");

    view.innerHTML =
      '<div class="page-head"><div><h1>予約一覧</h1><p class="page-desc">日付・担当者・ステータスで絞り込めます。行をクリックすると編集できます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button>' +
      '<button type="button" class="btn btn-primary" data-new>＋ 予約を登録</button></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => R.reservations.all(),
      search: (r) => {
        const c = lk.customers[r.customerId];
        return c ? c.name + c.kana + c.tel : "";
      },
      searchPlaceholder: "顧客名・ふりがな・電話番号で検索",
      filters: [
        { name: "from", label: "日付（から）", type: "date", test: (r, v) => r.date >= v },
        { name: "to", label: "日付（まで）", type: "date", test: (r, v) => r.date <= v },
        { name: "staff", label: "担当者", options: R.staff.all().map((s) => ({ value: s.id, label: s.name })), test: (r, v) => r.staffId === v },
        { name: "status", label: "ステータス", options: Object.keys(R.STATUS).map((k) => ({ value: k, label: R.STATUS[k].label })), test: (r, v) => r.status === v },
      ],
      sort: { key: "date", dir: "desc" },
      columns: [
        { key: "date", label: "日付", value: (r) => r.date + " " + r.start, render: (r) => '<span class="num">' + App.fmtDate(r.date, true) + "</span>" },
        { key: "start", label: "時間", render: (r) => '<span class="num">' + r.start + "〜" + R.endTime(r) + "</span>" },
        { key: "customer", label: "顧客", value: (r) => (lk.customers[r.customerId] || {}).kana || "", render: (r) => h(name(lk.customers, r.customerId) || "（削除された顧客）") },
        { key: "menu", label: "メニュー", value: (r) => name(lk.menus, r.menuId) },
        { key: "staff", label: "担当者", value: (r) => name(lk.staff, r.staffId),
          render: (r) => '<span class="staff-dot" style="--c:' + ((lk.staff[r.staffId] || {}).color || "#999") + '"></span>' + h(name(lk.staff, r.staffId)) },
        { key: "price", label: "料金", align: "right", render: (r) => App.yen(r.price) },
        { key: "status", label: "ステータス", render: (r) => R.statusBadge(r.status) },
      ],
      rowClass: (r) => (r.status === "canceled" ? "row-muted" : ""),
      onRowClick: (r) => R.openReservationForm({ reservation: r, onSaved: reload }),
    });

    view.querySelector("[data-new]").addEventListener("click", () => R.openReservationForm({ onSaved: reload }));
    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("予約一覧_" + App.today() + ".csv",
        ["日付", "開始", "終了", "顧客名", "ふりがな", "電話番号", "メニュー", "担当者", "料金", "ステータス", "メモ"],
        rows.map((r) => {
          const c = lk.customers[r.customerId] || {};
          return [r.date, r.start, R.endTime(r), c.name || "", c.kana || "", c.tel || "", name(lk.menus, r.menuId), name(lk.staff, r.staffId), r.price, R.STATUS[r.status].label, r.note];
        }));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };
})(window.App);
