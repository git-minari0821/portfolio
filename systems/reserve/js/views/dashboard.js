/* 予約・顧客管理：ダッシュボード */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;

  R.views = R.views || {};

  R.views.dashboard = function (view) {
    const today = App.today();
    const weekStart = App.startOfWeek(today);
    const weekEnd = App.addDays(weekStart, 6);
    const month = App.monthKey(today);
    const all = R.reservations.all();
    const lk = R.lookup();
    const stats = R.customerStats();

    const todays = all.filter((r) => r.date === today && r.status !== "canceled").sort((a, b) => a.start.localeCompare(b.start));
    const weekCount = all.filter((r) => r.date >= weekStart && r.date <= weekEnd && r.status !== "canceled").length;
    const newCustomers = R.customers.all().filter((c) => App.monthKey(c.createdAt) === month).length;
    const sales = all.filter((r) => r.status === "visited" && App.monthKey(r.date) === month).reduce((s, r) => s + r.price, 0);

    // 次回来店予定日が 7日前〜7日後 の顧客
    const follow = R.customers.all()
      .filter((c) => c.nextVisit && c.nextVisit >= App.addDays(today, -7) && c.nextVisit <= App.addDays(today, 7))
      .sort((a, b) => a.nextVisit.localeCompare(b.nextVisit));

    view.innerHTML =
      '<div class="page-head"><div><h1>ダッシュボード</h1><p class="page-desc">' + App.fmtDateJa(today) + "（" + App.WEEKDAYS[App.parseDate(today).getDay()] + "）の状況</p></div>" +
      '<div class="page-actions"><button type="button" class="btn btn-primary" data-new>＋ 予約を登録</button></div></div>' +
      '<div class="stat-grid">' +
      stat("今日の予約", todays.length, "件", "キャンセルを除く") +
      stat("今週の予約数", weekCount, "件", App.fmtDate(weekStart).slice(5) + "〜" + App.fmtDate(weekEnd).slice(5)) +
      stat("今月の新規顧客", newCustomers, "名", "今月に登録した顧客") +
      stat("今月の売上（来店済み）", App.num(sales), "円", "メニュー料金の合計") +
      "</div>" +
      '<div class="grid-2">' +
      '  <section class="card"><h2 class="card-title">今日の予約 <a href="#/calendar">カレンダーを見る</a></h2>' +
      (todays.length
        ? '<ul class="simple-list today-list">' + todays.map((r) => {
            const c = lk.customers[r.customerId];
            const s = lk.staff[r.staffId];
            const m = lk.menus[r.menuId];
            return '<li><span class="time-chip num">' + r.start + "<small>〜" + R.endTime(r) + "</small></span>" +
              '<div class="grow"><button type="button" class="link-btn" data-edit="' + r.id + '">' + h(c ? c.name : "（削除された顧客）") + " 様</button>" +
              '<p class="sub"><span class="staff-dot" style="--c:' + (s ? s.color : "#999") + '"></span>' + h(s ? s.name : "") + "／" + h(m ? m.name : "") + "</p></div>" +
              (r.status === "booked"
                ? '<button type="button" class="btn btn-secondary btn-sm" data-visit="' + r.id + '">来店済みにする</button>'
                : R.statusBadge(r.status)) +
              "</li>";
          }).join("") + "</ul>"
        : '<p class="empty">今日の予約はありません</p>') +
      "  </section>" +
      '  <section class="card"><h2 class="card-title">次回来店予定が近い顧客 <small>前後7日以内</small></h2>' +
      (follow.length
        ? '<ul class="simple-list">' + follow.map((c) => {
            const st = stats[c.id];
            const late = c.nextVisit < today;
            return '<li><div class="grow"><a href="#/customers/' + c.id + '">' + h(c.name) + " 様</a>" +
              '<p class="sub">最終来店 ' + (st.lastVisit ? App.fmtDate(st.lastVisit) : "―") + "／" + h(c.tel) + "</p></div>" +
              '<div class="ta-right"><p class="num ' + (late ? "text-warning" : "") + '">' + App.fmtDate(c.nextVisit, true) + "</p>" +
              (st.nextBooking ? App.badge("予約あり", "success") : App.badge(late ? "予定日を過ぎています" : "予約なし", late ? "warning" : "gray")) +
              "</div></li>";
          }).join("") + "</ul>"
        : '<p class="empty">該当する顧客はいません</p>') +
      "  </section>" +
      "</div>";

    view.querySelector("[data-new]").addEventListener("click", () => R.openReservationForm({ preset: { date: today }, onSaved: App.rerender }));
    view.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) R.openReservationForm({ reservation: R.reservations.get(edit.dataset.edit), onSaved: App.rerender });
      const visit = e.target.closest("[data-visit]");
      if (visit) {
        R.reservations.update(visit.dataset.visit, { status: "visited" });
        App.toast("来店済みにしました", "success");
        App.rerender();
      }
    });
  };

  function stat(label, value, unit, sub) {
    return '<div class="stat"><p class="stat-label">' + h(label) + '</p><p class="stat-value">' + value + "<small>" + unit + '</small></p><p class="stat-sub">' + h(sub) + "</p></div>";
  }
  R.stat = stat;
})(window.App);
