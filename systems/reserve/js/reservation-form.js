/* 予約・顧客管理：予約の登録・編集フォーム（カレンダー・一覧・顧客詳細から共通で使う） */
(function (App) {
  "use strict";
  const R = App.R;
  const h = App.h;
  const NEW = "__new";

  R.openReservationForm = function (opts) {
    const editing = opts.reservation || null;
    const preset = opts.preset || {};
    const r = editing || {
      date: preset.date || App.today(),
      start: preset.start || "10:00",
      staffId: preset.staffId || "",
      menuId: "",
      customerId: preset.customerId || "",
      status: "booked",
      note: "",
    };
    const menus = R.menus.all();
    const staff = R.staff.all();
    const customers = R.customers.all().slice().sort((a, b) => a.kana.localeCompare(b.kana, "ja"));

    const body =
      '<div class="form-grid cols-2">' +
      App.field({ name: "date", label: "日付", type: "date", required: true, value: r.date }) +
      App.field({ name: "start", label: "開始時刻", type: "select", required: true, value: r.start, options: R.timeOptions().map((t) => ({ value: t, label: t })) }) +
      App.field({ name: "menuId", label: "メニュー", type: "select", required: true, value: r.menuId, placeholder: "選択してください", options: menus.map((m) => ({ value: m.id, label: m.name + "（" + m.minutes + "分・" + App.yen(m.price) + "）" })) }) +
      App.field({ name: "staffId", label: "担当者", type: "select", required: true, value: r.staffId, placeholder: "選択してください", options: staff.map((s) => ({ value: s.id, label: s.name })) }) +
      App.field({ name: "customerId", label: "顧客", type: "select", required: true, value: r.customerId, placeholder: "選択してください", wide: true,
        options: [{ value: NEW, label: "＋ 新しい顧客を登録して予約する" }].concat(customers.map((c) => ({ value: c.id, label: c.name + "（" + c.kana + "）" + c.tel }))) }) +
      '<div class="field-wide form-grid cols-3 new-customer" hidden>' +
      App.field({ name: "newName", label: "お名前", required: true, placeholder: "例）山田 花子" }) +
      App.field({ name: "newKana", label: "ふりがな", required: true, placeholder: "例）やまだ はなこ" }) +
      App.field({ name: "newTel", label: "電話番号", type: "tel", required: true, placeholder: "例）090-0000-0000" }) +
      "</div>" +
      App.field({ name: "status", label: "ステータス", type: "select", value: r.status, options: Object.keys(R.STATUS).map((k) => ({ value: k, label: R.STATUS[k].label })) }) +
      '<div class="field"><span class="field-label">終了予定</span><p class="end-preview num">―</p></div>' +
      App.field({ name: "note", label: "予約メモ", type: "textarea", value: r.note, wide: true, rows: 2, placeholder: "例）初回は問診票の記入あり" }) +
      "</div>";

    App.openModal({
      title: editing ? "予約の編集" : "予約の登録",
      body,
      wide: true,
      submitLabel: editing ? "更新する" : "登録する",
      footerLeft: editing ? '<button type="button" class="btn btn-danger-outline" data-delete>削除</button>' : "",
      onOpen(el, form, close) {
        const newBox = form.querySelector(".new-customer");
        const toggleNew = () => {
          const on = form.customerId.value === NEW;
          newBox.hidden = !on;
          newBox.querySelectorAll("input").forEach((i) => { i.disabled = !on; });
        };
        const updateEnd = () => {
          const m = menus.find((x) => x.id === form.menuId.value);
          form.querySelector(".end-preview").textContent = m ? form.start.value + " 〜 " + App.fromMinutes(App.toMinutes(form.start.value) + m.minutes) + "（" + m.minutes + "分）" : "―";
        };
        form.customerId.addEventListener("change", toggleNew);
        form.menuId.addEventListener("change", updateEnd);
        form.start.addEventListener("change", updateEnd);
        toggleNew();
        updateEnd();

        const del = el.querySelector("[data-delete]");
        if (del) {
          del.addEventListener("click", async () => {
            const c = R.customers.get(editing.customerId);
            const ok = await App.confirm({
              title: "予約を削除しますか？",
              message: App.fmtDate(editing.date, true) + " " + editing.start + "　" + (c ? c.name + " 様" : "") + "\nこの操作は元に戻せません。",
              okLabel: "削除する",
              danger: true,
            });
            if (!ok) return;
            R.reservations.remove(editing.id);
            close();
            App.toast("予約を削除しました", "success");
            if (opts.onSaved) opts.onSaved();
          });
        }
      },
      onSubmit(form, close) {
        const v = App.formValues(form);
        const menu = menus.find((m) => m.id === v.menuId);
        const rules = App.rules;
        const errors = App.validate(v, {
          date: [[rules.required, "日付を入力してください"], [rules.date, "日付の形式が正しくありません"]],
          start: [[rules.required, "開始時刻を選択してください"],
            [() => !menu || App.toMinutes(v.start) + menu.minutes <= App.toMinutes(R.CLOSE), "終了が営業時間（" + R.CLOSE + "）を過ぎます"]],
          menuId: [[rules.required, "メニューを選択してください"]],
          staffId: [[rules.required, "担当者を選択してください"]],
          customerId: [[rules.required, "顧客を選択してください"]],
          note: [[rules.maxLen(200), "メモは200文字以内で入力してください"]],
        });
        if (v.customerId === NEW) {
          Object.assign(errors, App.validate(v, {
            newName: [[rules.required, "お名前を入力してください"], [rules.maxLen(30), "30文字以内で入力してください"]],
            newKana: [[rules.required, "ふりがなを入力してください"], [R.isKana, "ひらがな・カタカナで入力してください"]],
            newTel: [[rules.required, "電話番号を入力してください"], [rules.tel, "ハイフン付きで入力してください（例：090-0000-0000）"],
              [(t) => !R.customers.all().some((c) => c.tel === t), "この電話番号の顧客はすでに登録されています"]],
          }));
        }

        const candidate = {
          id: editing ? editing.id : null,
          date: v.date,
          start: v.start,
          minutes: menu ? menu.minutes : 0,
          staffId: v.staffId,
        };
        if (!errors.date && !errors.start && menu && v.staffId && v.status !== "canceled") {
          const hit = R.findConflict(candidate);
          if (hit) {
            const c = R.customers.get(hit.customerId);
            const s = R.staff.get(hit.staffId);
            errors.start = "同じ時間帯に " + (s ? s.name : "") + " の予約があります（" + hit.start + "〜" + R.endTime(hit) + " " + (c ? c.name + " 様" : "") + "）";
          }
        }
        if (!App.showErrors(form, errors)) return;

        let customerId = v.customerId;
        if (customerId === NEW) {
          customerId = R.customers.insert({ name: v.newName, kana: v.newKana, tel: v.newTel, email: "", createdAt: App.today(), nextVisit: "", memo: "", notes: [] }).id;
        }
        const record = {
          date: v.date, start: v.start, menuId: v.menuId, minutes: menu.minutes,
          price: editing && editing.menuId === v.menuId ? editing.price : menu.price,
          staffId: v.staffId, customerId, status: v.status, note: v.note,
        };
        if (editing) R.reservations.update(editing.id, record);
        else R.reservations.insert(record);
        close();
        App.toast(editing ? "予約を更新しました" : "予約を登録しました", "success");
        if (opts.onSaved) opts.onSaved();
      },
    });
  };

  R.isKana = (v) => !v || /^[ぁ-んァ-ヶー\s　]+$/.test(v);
})(window.App);
