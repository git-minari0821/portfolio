/* 見積書・請求書：取引先マスタ・自社情報設定 */
(function (App) {
  "use strict";
  const V = App.V;
  const h = App.h;

  /* ---------- 取引先マスタ ---------- */
  function openClientForm(client, onSaved) {
    const c = client || { name: "", honorific: "御中", person: "", zip: "", address: "", tel: "", email: "", terms: "end_next" };
    const used = client ? V.quotes.all().concat(V.invoices.all()).filter((d) => d.clientId === client.id).length : 0;
    App.openModal({
      title: client ? "取引先の編集" : "取引先の登録",
      submitLabel: client ? "更新する" : "登録する",
      wide: true,
      footerLeft: client ? '<button type="button" class="btn btn-danger-outline" data-delete>削除</button>' : "",
      body: '<div class="form-grid cols-2">' +
        App.field({ name: "name", label: "会社名・氏名", required: true, value: c.name, placeholder: "例）株式会社そらまめ商店" }) +
        App.field({ name: "honorific", label: "敬称", type: "select", required: true, value: c.honorific, options: [{ value: "御中", label: "御中（会社・団体）" }, { value: "様", label: "様（個人）" }] }) +
        App.field({ name: "person", label: "担当者", value: c.person, placeholder: "例）営業部 田中" , help: "書類には「担当者名 様」と印字されます" }) +
        App.field({ name: "terms", label: "支払条件", type: "select", required: true, value: c.terms, options: Object.keys(V.TERMS).map((k) => ({ value: k, label: V.TERMS[k] })) }) +
        App.field({ name: "zip", label: "郵便番号", value: c.zip, placeholder: "例）000-0000" }) +
        App.field({ name: "address", label: "住所", value: c.address, placeholder: "例）〇〇県〇〇市〇〇町1-2-3" }) +
        App.field({ name: "tel", label: "電話番号", type: "tel", value: c.tel, placeholder: "例）000-0000-0000" }) +
        App.field({ name: "email", label: "メールアドレス", type: "email", value: c.email, placeholder: "例）sample@example.com" }) +
        "</div>",
      onOpen(el, form, close) {
        const del = el.querySelector("[data-delete]");
        if (!del) return;
        del.addEventListener("click", async () => {
          if (used) { App.toast("この取引先は見積書・請求書（" + used + "件）で使われているため削除できません", "error"); return; }
          const ok = await App.confirm({ title: "取引先を削除しますか？", message: "「" + client.name + "」を削除します。この操作は元に戻せません。", okLabel: "削除する", danger: true });
          if (!ok) return;
          V.clients.remove(client.id);
          close();
          App.toast("取引先を削除しました", "success");
          onSaved();
        });
      },
      onSubmit(form, close) {
        const v = App.formValues(form);
        const rules = App.rules;
        const errors = App.validate(v, {
          name: [[rules.required, "会社名・氏名を入力してください"], [rules.maxLen(40), "40文字以内で入力してください"],
            [(x) => !V.clients.all().some((o) => o.name === x && (!client || o.id !== client.id)), "同じ名前の取引先がすでに登録されています"]],
          person: [[rules.maxLen(30), "30文字以内で入力してください"]],
          zip: [[rules.zip, "「000-0000」の形式で入力してください"]],
          address: [[rules.maxLen(80), "80文字以内で入力してください"]],
          tel: [[rules.tel, "ハイフン付きで入力してください（例：000-0000-0000）"]],
          email: [[rules.email, "メールアドレスの形式が正しくありません"]],
        });
        if (!App.showErrors(form, errors)) return;
        if (client) V.clients.update(client.id, v); else V.clients.insert(v);
        close();
        App.toast(client ? "取引先を更新しました" : "取引先を登録しました", "success");
        onSaved();
      },
    });
  }

  V.views.clients = function (view) {
    const counts = () => V.invoices.all().reduce((m, d) => { m[d.clientId] = (m[d.clientId] || 0) + 1; return m; }, {});
    let cnt = counts();
    view.innerHTML =
      '<div class="page-head"><div><h1>取引先マスタ</h1><p class="page-desc">行をクリックすると編集できます。支払条件は、請求書の支払期限の初期値に使われます。</p></div>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" data-csv>CSV出力</button><button type="button" class="btn btn-primary" data-new>＋ 取引先を登録</button></div></div>' +
      '<div class="table-area"></div>';
    const table = App.DataTable({
      el: view.querySelector(".table-area"),
      rows: () => V.clients.all(),
      search: (c) => c.name + c.person + c.address + c.email,
      searchPlaceholder: "会社名・担当者・住所で検索",
      filters: [{ name: "terms", label: "支払条件", options: Object.keys(V.TERMS).map((k) => ({ value: k, label: V.TERMS[k] })), test: (c, v) => c.terms === v }],
      sort: { key: "name", dir: "asc" },
      columns: [
        { key: "name", label: "会社名・氏名", render: (c) => "<strong>" + h(c.name) + "</strong> " + h(c.honorific) },
        { key: "person", label: "担当者" },
        { key: "address", label: "住所", render: (c) => (c.zip ? "〒" + h(c.zip) + " " : "") + h(c.address) },
        { key: "terms", label: "支払条件", value: (c) => V.TERMS[c.terms] },
        { key: "count", label: "請求書", align: "right", value: (c) => cnt[c.id] || 0, render: (c) => (cnt[c.id] || 0) + "件" },
      ],
      onRowClick: (c) => openClientForm(c, reload),
    });
    function reload() { cnt = counts(); table.refresh(); }
    view.querySelector("[data-new]").addEventListener("click", () => openClientForm(null, reload));
    view.querySelector("[data-csv]").addEventListener("click", () => {
      const rows = table.getRows();
      App.downloadCsv("取引先マスタ_" + App.today() + ".csv", ["会社名・氏名", "敬称", "担当者", "郵便番号", "住所", "電話番号", "メールアドレス", "支払条件"],
        rows.map((c) => [c.name, c.honorific, c.person, c.zip, c.address, c.tel, c.email, V.TERMS[c.terms]]));
      App.toast(rows.length + "件をCSVに出力しました", "success");
    });
  };

  /* ---------- 自社情報設定 ---------- */
  V.views.company = function (view) {
    const co = V.getCompany();
    view.innerHTML =
      '<div class="page-head"><div><h1>自社情報設定</h1><p class="page-desc">見積書・請求書に印字される発行元の情報です。</p></div></div>' +
      '<form class="card company-form" novalidate><h2 class="card-title">発行元の情報</h2><div class="form-grid cols-2">' +
      App.field({ name: "name", label: "会社名・屋号", required: true, value: co.name }) +
      App.field({ name: "person", label: "代表者・担当者", value: co.person }) +
      App.field({ name: "zip", label: "郵便番号", value: co.zip, placeholder: "例）000-0000" }) +
      App.field({ name: "address", label: "住所", required: true, value: co.address }) +
      App.field({ name: "tel", label: "電話番号", type: "tel", value: co.tel }) +
      App.field({ name: "email", label: "メールアドレス", type: "email", value: co.email }) +
      App.field({ name: "invoiceNo", label: "インボイス登録番号（適格請求書発行事業者）", required: true, value: co.invoiceNo, placeholder: "例）T0000000000000", help: "「T」と13桁の数字の形式です（例：T1234567890123）" }) +
      App.field({ name: "bank", label: "振込先", type: "textarea", required: true, value: co.bank, rows: 3, wide: true, placeholder: "例）〇〇銀行 〇〇支店 普通 0000000 カ）〇〇" }) +
      '</div><div class="form-actions"><button type="submit" class="btn btn-primary">保存する</button></div></form>';
    view.appendChild(App.resetCard(V.resetData));

    view.querySelector(".company-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const v = App.formValues(form);
      v.invoiceNo = v.invoiceNo.replace(/[Ｔｔ]/g, "T").replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).toUpperCase();
      form.invoiceNo.value = v.invoiceNo;
      const rules = App.rules;
      const errors = App.validate(v, {
        name: [[rules.required, "会社名・屋号を入力してください"], [rules.maxLen(40), "40文字以内で入力してください"]],
        person: [[rules.maxLen(30), "30文字以内で入力してください"]],
        zip: [[rules.zip, "「000-0000」の形式で入力してください"]],
        address: [[rules.required, "住所を入力してください"], [rules.maxLen(80), "80文字以内で入力してください"]],
        tel: [[rules.tel, "ハイフン付きで入力してください（例：000-0000-0000）"]],
        email: [[rules.email, "メールアドレスの形式が正しくありません"]],
        invoiceNo: [[rules.required, "登録番号を入力してください"], [(x) => /^T\d{13}$/.test(x), "「T」＋13桁の数字で入力してください（例：T1234567890123）"]],
        bank: [[rules.required, "振込先を入力してください"], [rules.maxLen(200), "200文字以内で入力してください"]],
      });
      if (!App.showErrors(form, errors)) return;
      V.setCompany(v);
      App.toast("自社情報を保存しました", "success");
    });
  };
})(window.App);
