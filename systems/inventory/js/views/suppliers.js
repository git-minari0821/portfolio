/* 在庫・発注管理：仕入先マスタ */
(function (App) {
  "use strict";
  const I = App.I;
  const h = App.h;

  function openSupplierForm(supplier, onSaved) {
    const s = supplier || { name: "", contact: "", tel: "", email: "", note: "" };
    const used = supplier ? I.products.all().filter((p) => p.supplierId === supplier.id).length : 0;
    App.openModal({
      title: supplier ? "仕入先の編集" : "仕入先の登録",
      submitLabel: supplier ? "更新する" : "登録する",
      footerLeft: supplier ? '<button type="button" class="btn btn-danger-outline" data-delete>削除</button>' : "",
      body: '<div class="form-grid cols-2">' +
        App.field({ name: "name", label: "仕入先名", required: true, value: s.name, wide: true, placeholder: "例）そよかぜ木工所" }) +
        App.field({ name: "contact", label: "担当者", value: s.contact, placeholder: "例）木村 様" }) +
        App.field({ name: "tel", label: "電話番号", type: "tel", value: s.tel, placeholder: "例）000-0000-0000" }) +
        App.field({ name: "email", label: "メールアドレス", type: "email", value: s.email, wide: true, placeholder: "例）sample@example.com" }) +
        App.field({ name: "note", label: "メモ", type: "textarea", value: s.note, wide: true, rows: 2, placeholder: "例）締め日・発注方法など" }) +
        "</div>",
      onOpen(el, form, close) {
        const del = el.querySelector("[data-delete]");
        if (!del) return;
        del.addEventListener("click", async () => {
          if (used) { App.toast("この仕入先は商品" + used + "件で使われているため削除できません", "error"); return; }
          const ok = await App.confirm({ title: "仕入先を削除しますか？", message: "「" + supplier.name + "」を削除します。この操作は元に戻せません。", okLabel: "削除する", danger: true });
          if (!ok) return;
          I.suppliers.remove(supplier.id);
          close();
          App.toast("仕入先を削除しました", "success");
          onSaved();
        });
      },
      onSubmit(form, close) {
        const v = App.formValues(form);
        const rules = App.rules;
        const errors = App.validate(v, {
          name: [[rules.required, "仕入先名を入力してください"], [rules.maxLen(40), "40文字以内で入力してください"],
            [(x) => !I.suppliers.all().some((o) => o.name === x && (!supplier || o.id !== supplier.id)), "同じ名前の仕入先がすでに登録されています"]],
          contact: [[rules.maxLen(20), "20文字以内で入力してください"]],
          tel: [[rules.tel, "ハイフン付きで入力してください（例：000-0000-0000）"]],
          email: [[rules.email, "メールアドレスの形式が正しくありません"]],
          note: [[rules.maxLen(200), "200文字以内で入力してください"]],
        });
        if (!App.showErrors(form, errors)) return;
        if (supplier) I.suppliers.update(supplier.id, v); else I.suppliers.insert(v);
        close();
        App.toast(supplier ? "仕入先を更新しました" : "仕入先を登録しました", "success");
        onSaved();
      },
    });
  }

  I.views.suppliers = function (view) {
    const count = () => I.products.all().reduce((m, p) => { m[p.supplierId] = (m[p.supplierId] || 0) + 1; return m; }, {});
    let counts = count();
    view.innerHTML =
      '<div class="page-head"><div><h1>仕入先マスタ</h1><p class="page-desc">行をクリックすると編集できます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><button type="button" class="btn btn-primary" data-new>＋ 仕入先を登録</button></div></div>' +
      '<div class="table-area"></div>';
    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => I.suppliers.all(),
      search: (s) => s.name + s.contact + s.tel + s.email,
      searchPlaceholder: "仕入先名・担当者・連絡先で検索",
      sort: { key: "name", dir: "asc" },
      columns: [
        { key: "name", label: "仕入先名", render: (s) => "<strong>" + h(s.name) + "</strong>" },
        { key: "contact", label: "担当者" },
        { key: "tel", label: "電話番号", render: (s) => '<span class="num">' + h(s.tel) + "</span>" },
        { key: "email", label: "メールアドレス" },
        { key: "products", label: "取扱商品数", align: "right", value: (s) => counts[s.id] || 0, render: (s) => (counts[s.id] || 0) + "件" },
      ],
      onRowClick: (s) => openSupplierForm(s, reload),
    });
    function reload() { counts = count(); table.refresh(); }
    view.querySelector("[data-new]").addEventListener("click", () => openSupplierForm(null, reload));
    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("仕入先マスタ_" + App.today() + ".csv", ["仕入先名", "担当者", "電話番号", "メールアドレス", "取扱商品数", "メモ"],
        rows.map((s) => [s.name, s.contact, s.tel, s.email, counts[s.id] || 0, s.note]));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };
})(window.App);
