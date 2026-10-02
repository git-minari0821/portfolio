/* 予約・顧客管理：メニュー・担当者設定、データの初期化 */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;

  R.views.settings = function (view) {
    const menus = R.menus.all();
    const staff = R.staff.all();
    const usage = (key, id) => R.reservations.all().filter((r) => r[key] === id).length;

    view.innerHTML =
      '<div class="page-head"><div><h1>メニュー・担当者設定</h1><p class="page-desc">予約で選べる施術メニューと担当者を管理します。</p></div></div>' +
      '<div class="grid-2">' +
      '<section class="card"><h2 class="card-title">施術メニュー <button type="button" class="btn btn-primary btn-sm" data-new-menu>＋ 追加</button></h2>' +
      '<div class="table-wrap"><table class="data data-compact"><thead><tr><th>メニュー名</th><th class="ta-right">所要時間</th><th class="ta-right">料金</th><th class="ta-right">操作</th></tr></thead><tbody>' +
      menus.map((m) => '<tr><td>' + h(m.name) + '</td><td class="ta-right">' + m.minutes + '分</td><td class="ta-right">' + App.yen(m.price) + "</td>" +
        '<td class="ta-right"><button type="button" class="btn btn-ghost btn-sm" data-edit-menu="' + m.id + '">編集</button>' +
        '<button type="button" class="btn btn-ghost btn-sm text-danger" data-del-menu="' + m.id + '">削除</button></td></tr>').join("") +
      "</tbody></table></div></section>" +
      '<section class="card"><h2 class="card-title">担当者 <button type="button" class="btn btn-primary btn-sm" data-new-staff>＋ 追加</button></h2>' +
      '<div class="table-wrap"><table class="data data-compact"><thead><tr><th>名前</th><th>役職</th><th class="ta-right">操作</th></tr></thead><tbody>' +
      staff.map((s) => '<tr><td><span class="staff-dot" style="--c:' + s.color + '"></span>' + h(s.name) + "</td><td>" + h(s.role) + "</td>" +
        '<td class="ta-right"><button type="button" class="btn btn-ghost btn-sm" data-edit-staff="' + s.id + '">編集</button>' +
        '<button type="button" class="btn btn-ghost btn-sm text-danger" data-del-staff="' + s.id + '">削除</button></td></tr>').join("") +
      "</tbody></table></div></section>" +
      "</div>";
    view.appendChild(App.resetCard(R.resetData));

    view.addEventListener("click", async (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      const d = t.dataset;
      if ("newMenu" in d) menuForm(null);
      if (d.editMenu) menuForm(R.menus.get(d.editMenu));
      if ("newStaff" in d) staffForm(null);
      if (d.editStaff) staffForm(R.staff.get(d.editStaff));
      if (d.delMenu) remove(R.menus, d.delMenu, "menuId", "メニュー");
      if (d.delStaff) remove(R.staff, d.delStaff, "staffId", "担当者");
    });

    async function remove(col, id, key, label) {
      const item = col.get(id);
      const n = usage(key, id);
      if (n) { App.toast("「" + item.name + "」は予約" + n + "件で使われているため削除できません", "error"); return; }
      const ok = await App.confirm({ title: label + "を削除しますか？", message: "「" + item.name + "」を削除します。この操作は元に戻せません。", okLabel: "削除する", danger: true });
      if (!ok) return;
      col.remove(id);
      App.toast(label + "を削除しました", "success");
      App.rerender();
    }
  };

  function menuForm(menu) {
    const m = menu || { name: "", minutes: 60, price: "" };
    App.openModal({
      title: menu ? "メニューの編集" : "メニューの追加",
      submitLabel: menu ? "更新する" : "追加する",
      body: '<div class="form-grid cols-2">' +
        App.field({ name: "name", label: "メニュー名", required: true, value: m.name, wide: true, placeholder: "例）整体コース" }) +
        App.field({ name: "minutes", label: "所要時間", type: "select", required: true, value: m.minutes, options: [30, 60, 90, 120].map((x) => ({ value: x, label: x + "分" })) }) +
        App.field({ name: "price", label: "料金（税込・円）", type: "text", required: true, value: m.price, attrs: ' inputmode="numeric"', placeholder: "例）6600" }) +
        "</div>",
      onSubmit(form, close) {
        const v = App.formValues(form);
        const rules = App.rules;
        const errors = App.validate(v, {
          name: [[rules.required, "メニュー名を入力してください"], [rules.maxLen(30), "30文字以内で入力してください"],
            [(x) => !R.menus.all().some((o) => o.name === x && (!menu || o.id !== menu.id)), "同じ名前のメニューがすでにあります"]],
          price: [[rules.required, "料金を入力してください"], [rules.int, "半角の整数で入力してください"], [rules.min(0), "0円以上で入力してください"], [rules.max(1000000), "1,000,000円以下で入力してください"]],
        });
        if (!App.showErrors(form, errors)) return;
        const rec = { name: v.name, minutes: Number(v.minutes), price: Number(v.price) };
        if (menu) R.menus.update(menu.id, rec); else R.menus.insert(rec);
        close();
        App.toast(menu ? "メニューを更新しました" : "メニューを追加しました", "success");
        App.rerender();
      },
    });
  }

  function staffForm(person) {
    const s = person || { name: "", role: "スタッフ", color: R.STAFF_COLORS[R.staff.all().length % R.STAFF_COLORS.length].value };
    App.openModal({
      title: person ? "担当者の編集" : "担当者の追加",
      submitLabel: person ? "更新する" : "追加する",
      body: '<div class="form-grid cols-2">' +
        App.field({ name: "name", label: "名前", required: true, value: s.name, placeholder: "例）山田 花子" }) +
        App.field({ name: "role", label: "役職", value: s.role, placeholder: "例）スタッフ" }) +
        App.field({ name: "color", label: "カレンダーの色", type: "select", value: s.color, options: R.STAFF_COLORS }) +
        "</div>",
      onSubmit(form, close) {
        const v = App.formValues(form);
        const rules = App.rules;
        const errors = App.validate(v, {
          name: [[rules.required, "名前を入力してください"], [rules.maxLen(20), "20文字以内で入力してください"],
            [(x) => !R.staff.all().some((o) => o.name === x && (!person || o.id !== person.id)), "同じ名前の担当者がすでにいます"]],
          role: [[rules.maxLen(20), "20文字以内で入力してください"]],
        });
        if (!App.showErrors(form, errors)) return;
        if (person) R.staff.update(person.id, v); else R.staff.insert(v);
        close();
        App.toast(person ? "担当者を更新しました" : "担当者を追加しました", "success");
        App.rerender();
      },
    });
  }
})(window.App);
