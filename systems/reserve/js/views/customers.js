/* 予約・顧客管理：顧客一覧・顧客詳細（来店履歴・カルテ） */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;

  /* ---------- 顧客の登録・編集フォーム ---------- */
  function openCustomerForm(customer, onSaved) {
    const c = customer || { name: "", kana: "", tel: "", email: "", nextVisit: "", memo: "" };
    App.openModal({
      title: customer ? "顧客情報の編集" : "顧客の登録",
      submitLabel: customer ? "更新する" : "登録する",
      body:
        '<div class="form-grid cols-2">' +
        App.field({ name: "name", label: "お名前", required: true, value: c.name, placeholder: "例）山田 花子" }) +
        App.field({ name: "kana", label: "ふりがな", required: true, value: c.kana, placeholder: "例）やまだ はなこ" }) +
        App.field({ name: "tel", label: "電話番号", type: "tel", required: true, value: c.tel, placeholder: "例）090-0000-0000" }) +
        App.field({ name: "email", label: "メールアドレス", type: "email", value: c.email, placeholder: "例）sample@example.com" }) +
        App.field({ name: "nextVisit", label: "次回来店予定日（目安）", type: "date", value: c.nextVisit }) +
        App.field({ name: "memo", label: "備考", type: "textarea", value: c.memo, wide: true, rows: 2 }) +
        "</div>",
      onSubmit(form, close) {
        const v = App.formValues(form);
        const others = R.customers.all().filter((x) => !customer || x.id !== customer.id);
        const rules = App.rules;
        const errors = App.validate(v, {
          name: [[rules.required, "お名前を入力してください"], [rules.maxLen(30), "30文字以内で入力してください"]],
          kana: [[rules.required, "ふりがなを入力してください"], [R.isKana, "ひらがな・カタカナで入力してください"], [rules.maxLen(40), "40文字以内で入力してください"]],
          tel: [[rules.required, "電話番号を入力してください"], [rules.tel, "ハイフン付きで入力してください（例：090-0000-0000）"],
            [(t) => !others.some((x) => x.tel === t), "この電話番号の顧客はすでに登録されています"]],
          email: [[rules.email, "メールアドレスの形式が正しくありません"], [rules.maxLen(100), "100文字以内で入力してください"]],
          nextVisit: [[rules.date, "日付の形式が正しくありません"]],
          memo: [[rules.maxLen(200), "200文字以内で入力してください"]],
        });
        if (!App.showErrors(form, errors)) return;
        let saved;
        if (customer) saved = R.customers.update(customer.id, v);
        else saved = R.customers.insert(Object.assign(v, { createdAt: App.today(), notes: [] }));
        close();
        App.toast(customer ? "顧客情報を更新しました" : "顧客を登録しました", "success");
        onSaved(saved);
      },
    });
  }

  /* ---------- 顧客一覧 ---------- */
  function renderList(view) {
    let stats = R.customerStats();
    view.innerHTML =
      '<div class="page-head"><div><h1>顧客管理</h1><p class="page-desc">行をクリックすると、来店履歴やカルテを確認できます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button>' +
      '<button type="button" class="btn btn-primary" data-new>＋ 顧客を登録</button></div></div>' +
      '<div class="table-area"></div>';

    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => R.customers.all(),
      search: (c) => c.name + c.kana + c.tel + c.email,
      searchPlaceholder: "名前・ふりがな・電話番号・メールで検索",
      filters: [
        { name: "booking", label: "次回の予約", options: [{ value: "yes", label: "予約あり" }, { value: "no", label: "予約なし" }],
          test: (c, v) => (v === "yes") === Boolean(stats[c.id].nextBooking) },
        { name: "visits", label: "来店回数", options: [{ value: "0", label: "未来店" }, { value: "1", label: "1回" }, { value: "2", label: "2回以上" }],
          test: (c, v) => { const n = stats[c.id].visits; return v === "2" ? n >= 2 : n === Number(v); } },
      ],
      sort: { key: "lastVisit", dir: "desc" },
      columns: [
        { key: "kana", label: "お名前", render: (c) => '<span class="cell-main">' + h(c.name) + '</span><span class="cell-sub">' + h(c.kana) + "</span>" },
        { key: "tel", label: "電話番号", render: (c) => '<span class="num">' + h(c.tel) + "</span>" },
        { key: "visits", label: "来店回数", align: "right", value: (c) => stats[c.id].visits, render: (c) => stats[c.id].visits + "回" },
        { key: "lastVisit", label: "最終来店日", value: (c) => stats[c.id].lastVisit, render: (c) => (stats[c.id].lastVisit ? App.fmtDate(stats[c.id].lastVisit) : '<span class="text-sub">―</span>') },
        { key: "nextBooking", label: "次回の予約", value: (c) => (stats[c.id].nextBooking ? stats[c.id].nextBooking.date : ""),
          render: (c) => (stats[c.id].nextBooking ? App.fmtDate(stats[c.id].nextBooking.date) + " " + stats[c.id].nextBooking.start : '<span class="text-sub">―</span>') },
        { key: "createdAt", label: "登録日", render: (c) => App.fmtDate(c.createdAt) },
      ],
      onRowClick: (c) => App.navigate("customers/" + c.id),
    });

    view.querySelector("[data-new]").addEventListener("click", () => openCustomerForm(null, () => { stats = R.customerStats(); table.refresh(); }));
    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("顧客一覧_" + App.today() + ".csv",
        ["お名前", "ふりがな", "電話番号", "メールアドレス", "来店回数", "最終来店日", "次回来店予定日", "登録日", "備考"],
        rows.map((c) => [c.name, c.kana, c.tel, c.email, stats[c.id].visits, stats[c.id].lastVisit, c.nextVisit, c.createdAt, c.memo]));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  }

  /* ---------- 顧客詳細 ---------- */
  function renderDetail(view, id) {
    const c = R.customers.get(id);
    if (!c) {
      view.innerHTML = '<a class="back-link" href="#/customers">‹ 顧客一覧に戻る</a><div class="card"><p class="empty">顧客が見つかりません（削除された可能性があります）</p></div>';
      return;
    }
    const lk = R.lookup();
    const st = R.customerStats()[c.id];
    const history = R.reservations.all().filter((r) => r.customerId === c.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const notes = (c.notes || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    App.setTitle(c.name + " 様");

    view.innerHTML =
      '<a class="back-link" href="#/customers">‹ 顧客一覧に戻る</a>' +
      '<div class="page-head"><div><h1>' + h(c.name) + ' 様</h1><p class="page-desc">' + h(c.kana) + "</p></div>" +
      '<div class="page-actions"><button type="button" class="btn btn-danger-outline" data-delete>削除</button>' +
      '<button type="button" class="btn btn-secondary" data-edit>編集</button>' +
      '<button type="button" class="btn btn-primary" data-book>＋ この顧客で予約</button></div></div>' +
      '<div class="stat-grid">' +
      R.stat("来店回数", st.visits, "回", "来店済みの予約") +
      R.stat("最終来店日", st.lastVisit ? App.fmtDate(st.lastVisit).slice(5) : "―", "", st.lastVisit ? st.lastVisit.slice(0, 4) + "年" : "まだ来店していません") +
      R.stat("次回の予約", st.nextBooking ? App.fmtDate(st.nextBooking.date).slice(5) : "―", "", st.nextBooking ? st.nextBooking.start + "〜" : "予約なし") +
      R.stat("累計のご利用額", App.num(history.filter((r) => r.status === "visited").reduce((s, r) => s + r.price, 0)), "円", "来店済みの合計") +
      "</div>" +
      '<div class="grid-2">' +
      '<section class="card"><h2 class="card-title">基本情報</h2><dl class="desc-list">' +
      "<dt>電話番号</dt><dd class=\"num\">" + h(c.tel) + "</dd>" +
      "<dt>メール</dt><dd>" + (c.email ? h(c.email) : "―") + "</dd>" +
      "<dt>次回来店予定日</dt><dd>" + (c.nextVisit ? App.fmtDate(c.nextVisit, true) : "―") + "</dd>" +
      "<dt>登録日</dt><dd>" + App.fmtDate(c.createdAt) + "</dd>" +
      "<dt>備考</dt><dd>" + (c.memo ? h(c.memo) : "―") + "</dd>" +
      "</dl></section>" +
      '<section class="card"><h2 class="card-title">カルテ（施術メモ）</h2>' +
      '<form class="note-form" novalidate><div class="field"><label for="note-text" class="visually-hidden">施術メモ</label>' +
      '<textarea id="note-text" name="text" rows="2" placeholder="例）右肩の張りが強め。力加減は弱めを希望。"></textarea></div>' +
      '<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">メモを追加</button></div></form>' +
      (notes.length
        ? '<ul class="note-list">' + notes.map((n) => '<li><p class="note-date num">' + App.fmtDate(n.date, true) + '</p><p class="note-text">' + h(n.text) + "</p>" +
            '<button type="button" class="icon-btn" data-del-note="' + n.id + '" aria-label="このメモを削除">×</button></li>').join("") + "</ul>"
        : '<p class="empty">まだメモはありません</p>') +
      "</section>" +
      "</div>" +
      '<section class="card"><h2 class="card-title">来店・予約履歴 <small>' + history.length + "件</small></h2>" +
      (history.length
        ? '<div class="table-wrap"><table class="data"><thead><tr><th>日付</th><th>時間</th><th>メニュー</th><th>担当者</th><th class="ta-right">料金</th><th>ステータス</th></tr></thead><tbody>' +
          history.map((r) => '<tr class="is-clickable' + (r.status === "canceled" ? " row-muted" : "") + '" data-res="' + r.id + '" tabindex="0">' +
            '<td class="num">' + App.fmtDate(r.date, true) + '</td><td class="num">' + r.start + "〜" + R.endTime(r) + "</td>" +
            "<td>" + h((lk.menus[r.menuId] || {}).name || "") + "</td><td>" + h((lk.staff[r.staffId] || {}).name || "") + "</td>" +
            '<td class="ta-right">' + App.yen(r.price) + "</td><td>" + R.statusBadge(r.status) + "</td></tr>").join("") +
          "</tbody></table></div>"
        : '<p class="empty">履歴はありません</p>') +
      "</section>";

    const rerender = () => App.rerender(); // 画面を作り直す（イベントの重複を防ぐ）
    view.querySelector("[data-edit]").addEventListener("click", () => openCustomerForm(c, rerender));
    view.querySelector("[data-book]").addEventListener("click", () => R.openReservationForm({ preset: { customerId: c.id }, onSaved: rerender }));
    view.querySelector("[data-delete]").addEventListener("click", async () => {
      const count = history.length;
      const ok = await App.confirm({
        title: "顧客を削除しますか？",
        message: c.name + " 様の顧客情報とカルテを削除します。" + (count ? "\nこの顧客の予約・来店履歴（" + count + "件）も削除されます。" : "") + "\nこの操作は元に戻せません。",
        okLabel: "削除する",
        danger: true,
      });
      if (!ok) return;
      R.reservations.save(R.reservations.all().filter((r) => r.customerId !== c.id));
      R.customers.remove(c.id);
      App.toast("顧客を削除しました", "success");
      App.navigate("customers");
    });

    view.querySelector(".note-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const v = App.formValues(form);
      const errors = App.validate(v, {
        text: [[App.rules.required, "メモを入力してください"], [App.rules.maxLen(300), "300文字以内で入力してください"]],
      });
      if (!App.showErrors(form, errors)) return;
      const latest = R.customers.get(c.id);
      R.customers.update(c.id, { notes: (latest.notes || []).concat([{ id: App.uid(), date: App.today(), text: v.text }]) });
      App.toast("カルテにメモを追加しました", "success");
      rerender();
    });

    view.addEventListener("click", async (e) => {
      const del = e.target.closest("[data-del-note]");
      if (del) {
        const ok = await App.confirm({ title: "メモを削除しますか？", message: "この操作は元に戻せません。", okLabel: "削除する", danger: true });
        if (!ok) return;
        const latest = R.customers.get(c.id);
        R.customers.update(c.id, { notes: latest.notes.filter((n) => n.id !== del.dataset.delNote) });
        App.toast("メモを削除しました", "success");
        rerender();
        return;
      }
      const row = e.target.closest("[data-res]");
      if (row) R.openReservationForm({ reservation: R.reservations.get(row.dataset.res), onSaved: rerender });
    });
    view.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.dataset && e.target.dataset.res) e.target.click();
    });
  }

  R.views.customers = function (view, params) {
    if (params[0]) renderDetail(view, params[0]);
    else renderList(view);
  };
})(window.App);
