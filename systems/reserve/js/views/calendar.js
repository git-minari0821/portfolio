/* 予約・顧客管理：予約カレンダー（週表示・月表示） */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;

  const state = { mode: "week", cursor: App.today(), staffId: "" };

  R.views.calendar = function (view) {
    const staff = R.staff.all();
    view.innerHTML =
      '<div class="page-head"><div><h1>予約カレンダー</h1><p class="page-desc">空いている枠をクリックすると予約を登録できます。予約をクリックすると編集できます。</p></div></div>' +
      '<div class="cal-toolbar">' +
      '  <div class="cal-nav">' +
      '    <button type="button" class="btn btn-secondary btn-sm" data-move="-1" aria-label="前へ">‹</button>' +
      '    <button type="button" class="btn btn-secondary btn-sm" data-today>今日</button>' +
      '    <button type="button" class="btn btn-secondary btn-sm" data-move="1" aria-label="次へ">›</button>' +
      '    <p class="cal-title" aria-live="polite"></p>' +
      "  </div>" +
      '  <div class="cal-controls">' +
      '    <div class="seg" role="group" aria-label="表示の切り替え">' +
      '      <button type="button" data-mode="week">週</button><button type="button" data-mode="month">月</button>' +
      "    </div>" +
      '    <label class="visually-hidden" for="cal-staff">担当者で絞り込み</label>' +
      '    <select id="cal-staff" class="input input-sm"><option value="">すべての担当者</option>' +
      staff.map((s) => '<option value="' + s.id + '"' + (state.staffId === s.id ? " selected" : "") + ">" + h(s.name) + "</option>").join("") +
      "    </select>" +
      "  </div>" +
      "</div>" +
      '<ul class="legend">' + staff.map((s) => '<li><span class="staff-dot" style="--c:' + s.color + '"></span>' + h(s.name) + "</li>").join("") + "</ul>" +
      '<div class="cal-body"></div>';

    const body = view.querySelector(".cal-body");
    const title = view.querySelector(".cal-title");

    function draw() {
      view.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
      if (state.mode === "week") drawWeek(body, title);
      else drawMonth(body, title);
    }

    view.querySelector("[data-today]").addEventListener("click", () => { state.cursor = App.today(); draw(); });
    view.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => {
      const n = Number(b.dataset.move);
      state.cursor = state.mode === "week" ? App.addDays(state.cursor, 7 * n) : App.addMonths(state.cursor.slice(0, 8) + "01", n);
      draw();
    }));
    view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { state.mode = b.dataset.mode; draw(); }));
    view.querySelector("#cal-staff").addEventListener("change", (e) => { state.staffId = e.target.value; draw(); });

    body.addEventListener("click", (e) => {
      const goWeek = e.target.closest("[data-goweek]");
      if (goWeek) { state.mode = "week"; state.cursor = goWeek.dataset.goweek; draw(); return; }
      const edit = e.target.closest("[data-edit]");
      if (edit) { R.openReservationForm({ reservation: R.reservations.get(edit.dataset.edit), onSaved: draw }); return; }
      const slot = e.target.closest("[data-slot]");
      if (slot) {
        R.openReservationForm({ preset: { date: slot.dataset.date, start: slot.dataset.slot, staffId: state.staffId }, onSaved: draw });
        return;
      }
      const cell = e.target.closest("[data-day]");
      if (cell) R.openReservationForm({ preset: { date: cell.dataset.day, staffId: state.staffId }, onSaved: draw });
    });

    draw();
  };

  function visibleReservations() {
    return R.reservations.all().filter((r) => r.status !== "canceled" && (!state.staffId || r.staffId === state.staffId));
  }

  /* ---------- 週表示 ---------- */
  function drawWeek(body, title) {
    const start = App.startOfWeek(state.cursor);
    const days = Array.from({ length: 7 }, (_, i) => App.addDays(start, i));
    const times = R.timeOptions();
    const lk = R.lookup();
    const today = App.today();
    const res = visibleReservations().filter((r) => r.date >= days[0] && r.date <= days[6]);
    const open = App.toMinutes(R.OPEN);

    title.textContent = App.fmtDate(days[0]) + " 〜 " + App.fmtDate(days[6]).slice(5);

    body.innerHTML =
      '<div class="cal-scroll"><div class="week" style="--slots:' + times.length + '">' +
      '<div class="week-head"><div></div>' +
      days.map((d) => {
        const wd = App.parseDate(d).getDay();
        return '<div class="week-day-head' + (d === today ? " is-today" : "") + (wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : "") + '">' +
          '<span class="num">' + Number(d.slice(8)) + "</span>" + App.WEEKDAYS[wd] + "</div>";
      }).join("") + "</div>" +
      '<div class="week-grid">' +
      '<div class="week-times">' + times.map((t) => '<div class="week-time num">' + (t.endsWith(":00") ? t : "") + "</div>").join("") + "</div>" +
      days.map((d) => {
        const slots = times.map((t) =>
          '<button type="button" class="week-slot" data-slot="' + t + '" data-date="' + d + '" aria-label="' + App.fmtDate(d, true) + " " + t + ' に予約を登録"></button>').join("");
        const dayRes = res.filter((r) => r.date === d);
        const layout = layoutLanes(dayRes);
        const blocks = dayRes.map((r) => {
          const lane = layout[r.id].lane;
          const top = (App.toMinutes(r.start) - open) / R.SLOT;
          const c = lk.customers[r.customerId];
          const s = lk.staff[r.staffId];
          const m = lk.menus[r.menuId];
          return '<button type="button" class="week-event' + (r.status === "visited" ? " is-visited" : "") + '" data-edit="' + r.id + '" ' +
            'style="--top:' + top + ";--len:" + (r.minutes / R.SLOT) + ";--lane:" + lane + ";--lanes:" + layout[r.id].lanes + ";--c:" + (s ? s.color : "#888") + '" ' +
            'title="' + h(r.start + "〜" + R.endTime(r) + " " + (c ? c.name : "") + " / " + (m ? m.name : "") + " / " + (s ? s.name : "")) + '">' +
            '<span class="ev-time num">' + r.start + "</span>" +
            '<span class="ev-name">' + h(c ? c.name : "―") + "</span>" +
            (r.minutes >= 60 ? '<span class="ev-menu">' + h(m ? m.name : "") + "</span>" : "") +
            "</button>";
        }).join("");
        return '<div class="week-col' + (d === today ? " is-today" : "") + '">' + slots + blocks + "</div>";
      }).join("") +
      "</div></div></div>";
  }

  /* 時間が重なる予約だけを横に並べる（重ならなければ列いっぱいに表示） */
  function layoutLanes(list) {
    const sorted = list.slice().sort((a, b) => a.start.localeCompare(b.start));
    const result = {};
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const laneEnds = [];
      cluster.forEach((r) => {
        const s = App.toMinutes(r.start);
        let lane = laneEnds.findIndex((end) => end <= s);
        if (lane < 0) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = s + r.minutes;
        result[r.id] = { lane };
      });
      cluster.forEach((r) => { result[r.id].lanes = laneEnds.length; });
      cluster = [];
    };
    sorted.forEach((r) => {
      const s = App.toMinutes(r.start);
      if (cluster.length && s >= clusterEnd) flush();
      cluster.push(r);
      clusterEnd = Math.max(clusterEnd, s + r.minutes);
    });
    flush();
    return result;
  }

  /* ---------- 月表示 ---------- */
  function drawMonth(body, title) {
    const first = state.cursor.slice(0, 8) + "01";
    const gridStart = App.startOfWeek(first);
    const month = App.monthKey(first);
    const today = App.today();
    const lk = R.lookup();
    const res = visibleReservations();
    const d0 = App.parseDate(first);
    title.textContent = d0.getFullYear() + "年" + (d0.getMonth() + 1) + "月";

    const cells = Array.from({ length: 42 }, (_, i) => App.addDays(gridStart, i));
    body.innerHTML =
      '<div class="cal-scroll"><div class="month">' +
      ["月", "火", "水", "木", "金", "土", "日"].map((w) => '<div class="month-head">' + w + "</div>").join("") +
      cells.map((d) => {
        const items = res.filter((r) => r.date === d).sort((a, b) => a.start.localeCompare(b.start));
        const wd = App.parseDate(d).getDay();
        return '<div class="month-cell' + (App.monthKey(d) !== month ? " is-other" : "") + (d === today ? " is-today" : "") + '" data-day="' + d + '">' +
          '<button type="button" class="month-date num' + (wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : "") + '" aria-label="' + App.fmtDate(d, true) + 'に予約を登録">' + Number(d.slice(8)) + "</button>" +
          items.slice(0, 3).map((r) => {
            const c = lk.customers[r.customerId];
            const s = lk.staff[r.staffId];
            return '<button type="button" class="month-event" data-edit="' + r.id + '" style="--c:' + (s ? s.color : "#888") + '">' +
              '<span class="num">' + r.start + "</span> " + h(c ? c.name.split(" ")[0] : "―") + "</button>";
          }).join("") +
          (items.length > 3 ? '<button type="button" class="month-more" data-goweek="' + d + '">他' + (items.length - 3) + "件</button>" : "") +
          "</div>";
      }).join("") +
      "</div></div>";
  }
})(window.App);
