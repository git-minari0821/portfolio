/* 見積書・請求書：作成・編集画面（明細の追加・削除・並べ替え、金額の自動計算） */
(function (App) {
  "use strict";
  const V = App.V;
  const h = App.h;


  /* kind: "quote" | "invoice" */
  V.renderEditor = function (view, kind, id) {
    const isQuote = kind === "quote";
    const col = isQuote ? V.quotes : V.invoices;
    const label = isQuote ? "見積書" : "請求書";
    const listRoute = isQuote ? "quotes" : "invoices";
    const existing = id ? col.get(id) : null;
    if (id && !existing) {
      view.innerHTML = '<a class="back-link" href="#/' + listRoute + '">‹ 一覧に戻る</a><div class="card"><p class="empty">' + label + "が見つかりません</p></div>";
      return;
    }
    const today = App.today();
    const clients = V.clients.all();
    const doc = existing ? JSON.parse(JSON.stringify(existing)) : {
      clientId: "", title: "", date: today, note: "",
      items: [{ id: App.uid(), name: "", qty: 1, unit: "式", price: "", rate: 10 }],
      validUntil: App.addDays(today, 30), dueDate: "",
    };
    App.setTitle(existing ? label + "の編集（" + existing.no + "）" : label + "の作成");

    view.innerHTML =
      '<a class="back-link" href="#/' + listRoute + '">‹ ' + label + "一覧に戻る</a>" +
      '<div class="page-head"><div><h1>' + (existing ? label + "の編集" : label + "の作成") + "</h1>" +
      '<p class="page-desc">' + (existing ? "書類番号 " + h(existing.no) : "書類番号は保存時に自動で採番します") + "</p></div>" +
      (existing ? '<div class="page-actions"><a class="btn btn-secondary" href="#/preview/' + kind + "/" + existing.id + '">印刷プレビュー</a></div>' : "") +
      "</div>" +
      '<form class="doc-form" novalidate>' +
      '<section class="card"><h2 class="card-title">基本情報</h2><div class="form-grid cols-3">' +
      App.field({ name: "clientId", label: "取引先", type: "select", required: true, value: doc.clientId, placeholder: "選択してください", options: clients.map((c) => ({ value: c.id, label: c.name })) }) +
      App.field({ name: "title", label: "件名", required: true, value: doc.title, placeholder: "例）コーポレートサイト制作" }) +
      App.field({ name: "date", label: isQuote ? "見積日" : "請求日", type: "date", required: true, value: doc.date }) +
      (isQuote
        ? App.field({ name: "validUntil", label: "有効期限", type: "date", required: true, value: doc.validUntil })
        : App.field({ name: "dueDate", label: "支払期限", type: "date", required: true, value: doc.dueDate, help: "取引先を選ぶと、支払条件から自動で入ります" })) +
      "</div></section>" +
      '<section class="card"><h2 class="card-title">明細 <small>端数は切り捨て・税率ごとに消費税を計算</small></h2>' +
      '<div class="table-wrap"><table class="data items-table"><thead><tr><th class="col-order">順</th><th>品目</th><th class="ta-right">数量</th><th>単位</th><th class="ta-right">単価（税抜）</th><th>税率</th><th class="ta-right">金額</th><th class="col-ops"><span class="visually-hidden">操作</span></th></tr></thead><tbody></tbody></table></div>' +
      '<div data-error-for="items"></div>' +
      '<button type="button" class="btn btn-secondary btn-sm add-line" data-add>＋ 明細を追加</button>' +
      '<div class="totals" aria-live="polite"></div>' +
      "</section>" +
      '<section class="card"><h2 class="card-title">備考</h2>' +
      App.field({ name: "note", label: "備考（書類に印字されます）", type: "textarea", value: doc.note, rows: 3 }) +
      "</section>" +
      '<div class="form-actions sticky-actions">' +
      '<a class="btn btn-secondary" href="#/' + listRoute + '">キャンセル</a>' +
      '<button type="submit" class="btn btn-secondary" data-mode="draft">下書き保存</button>' +
      '<button type="submit" class="btn btn-primary" data-mode="issue">' + (isQuote ? "保存して提出済みにする" : "保存して発行する") + "</button>" +
      "</div></form>";

    const form = view.querySelector(".doc-form");
    const tbody = form.querySelector("tbody");
    const totals = form.querySelector(".totals");
    let submitMode = "draft";

    /* ---------- 明細行 ---------- */
    function drawItems() {
      tbody.innerHTML = doc.items.map((it, i) =>
        '<tr data-i="' + i + '">' +
        '<td class="col-order"><div class="order-btns">' +
        '<button type="button" class="icon-btn" data-up aria-label="' + (i + 1) + '行目を上へ"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="icon-btn" data-down aria-label="' + (i + 1) + '行目を下へ"' + (i === doc.items.length - 1 ? " disabled" : "") + ">↓</button></div></td>" +
        '<td><div class="field"><input class="input" name="item-' + i + '-name" value="' + h(it.name) + '" aria-label="' + (i + 1) + '行目の品目" placeholder="品目"></div></td>' +
        '<td><div class="field"><input class="input ta-right w-qty" name="item-' + i + '-qty" value="' + h(it.qty) + '" inputmode="decimal" aria-label="' + (i + 1) + '行目の数量"></div></td>' +
        '<td><div class="field"><input class="input w-unit" name="item-' + i + '-unit" value="' + h(it.unit) + '" aria-label="' + (i + 1) + '行目の単位"></div></td>' +
        '<td><div class="field"><input class="input ta-right w-price" name="item-' + i + '-price" value="' + h(it.price) + '" inputmode="numeric" aria-label="' + (i + 1) + '行目の単価"></div></td>' +
        '<td><div class="field"><select class="input w-rate" name="item-' + i + '-rate" aria-label="' + (i + 1) + '行目の税率">' +
        V.RATES.map((r) => '<option value="' + r + '"' + (Number(it.rate) === r ? " selected" : "") + ">" + r + "%" + (r === 8 ? "（軽減）" : "") + "</option>").join("") + "</select></div></td>" +
        '<td class="ta-right line-amount">' + App.yen(validNum(it) ? V.lineAmount(it) : 0) + "</td>" +
        '<td class="col-ops"><button type="button" class="icon-btn" data-remove aria-label="' + (i + 1) + '行目を削除">×</button></td>' +
        "</tr>").join("");
      drawTotals();
    }
    const validNum = (it) => /^\d+(\.\d{1,2})?$/.test(String(it.qty)) && /^\d+$/.test(String(it.price));

    function drawTotals() {
      const t = V.calc(doc.items.filter(validNum));
      totals.innerHTML = '<dl class="totals-list">' +
        "<dt>小計（税抜）</dt><dd>" + App.yen(t.subtotal) + "</dd>" +
        V.RATES.filter((r) => t.byRate[r].base || r === 10).map((r) =>
          "<dt>" + r + "%対象 " + App.yen(t.byRate[r].base) + " の消費税</dt><dd>" + App.yen(t.byRate[r].tax) + "</dd>").join("") +
        '<dt class="grand">合計（税込）</dt><dd class="grand">' + App.yen(t.total) + "</dd></dl>";
    }

    function syncFromInputs() {
      tbody.querySelectorAll("tr[data-i]").forEach((tr) => {
        const it = doc.items[Number(tr.dataset.i)];
        ["name", "qty", "unit", "price", "rate"].forEach((k) => {
          const el = tr.querySelector('[name$="-' + k + '"]');
          it[k] = k === "rate" ? Number(el.value) : el.value.trim();
        });
      });
    }

    tbody.addEventListener("input", (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (!tr) return;
      syncFromInputs();
      const it = doc.items[Number(tr.dataset.i)];
      tr.querySelector(".line-amount").textContent = App.yen(validNum(it) ? V.lineAmount(it) : 0);
      drawTotals();
    });
    tbody.addEventListener("change", () => { syncFromInputs(); drawTotals(); });
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (!tr) return;
      const i = Number(tr.dataset.i);
      syncFromInputs();
      let focusSel = null;
      if (e.target.closest("[data-remove]")) {
        if (doc.items.length === 1) { App.toast("明細は1行以上必要です", "error"); return; }
        doc.items.splice(i, 1);
      } else if (e.target.closest("[data-up]") && i > 0) {
        doc.items.splice(i - 1, 0, doc.items.splice(i, 1)[0]);
        focusSel = '[data-i="' + (i - 1) + '"] [data-up]';
      } else if (e.target.closest("[data-down]") && i < doc.items.length - 1) {
        doc.items.splice(i + 1, 0, doc.items.splice(i, 1)[0]);
        focusSel = '[data-i="' + (i + 1) + '"] [data-down]';
      } else return;
      App.clearErrors(form);
      drawItems();
      const f = focusSel && tbody.querySelector(focusSel);
      if (f && !f.disabled) f.focus();
    });
    form.querySelector("[data-add]").addEventListener("click", () => {
      syncFromInputs();
      if (doc.items.length >= 30) { App.toast("明細は30行までです", "error"); return; }
      doc.items.push({ id: App.uid(), name: "", qty: 1, unit: "式", price: "", rate: 10 });
      drawItems();
      tbody.querySelector('[name="item-' + (doc.items.length - 1) + '-name"]').focus();
    });

    // 請求書：取引先を選んだら支払条件から支払期限を入れる
    if (!isQuote) {
      const setDue = () => {
        const c = V.clients.get(form.clientId.value);
        if (c && App.isValidDate(form.date.value)) form.dueDate.value = V.dueDateFor(c.terms, form.date.value);
      };
      form.clientId.addEventListener("change", setDue);
      form.date.addEventListener("change", () => { if (!existing) setDue(); });
      if (!doc.dueDate) setDue();
    }

    form.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { submitMode = b.dataset.mode; }));

    /* ---------- 保存 ---------- */
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      syncFromInputs();
      const v = App.formValues(form);
      const rules = App.rules;
      const limitKey = isQuote ? "validUntil" : "dueDate";
      const errors = App.validate(v, {
        clientId: [[rules.required, "取引先を選択してください"]],
        title: [[rules.required, "件名を入力してください"], [rules.maxLen(40), "40文字以内で入力してください"]],
        date: [[rules.required, "日付を入力してください"], [rules.date, "日付の形式が正しくありません"]],
        [limitKey]: [[rules.required, (isQuote ? "有効期限" : "支払期限") + "を入力してください"], [rules.date, "日付の形式が正しくありません"],
          [(x) => !App.isValidDate(v.date) || x >= v.date, (isQuote ? "有効期限" : "支払期限") + "は" + (isQuote ? "見積日" : "請求日") + "以降の日付にしてください"]],
        note: [[rules.maxLen(300), "300文字以内で入力してください"]],
      });
      doc.items.forEach((it, i) => {
        const p = "item-" + i + "-";
        Object.assign(errors, App.validate({ [p + "name"]: it.name, [p + "qty"]: it.qty, [p + "unit"]: it.unit, [p + "price"]: it.price }, {
          [p + "name"]: [[rules.required, "品目を入力"], [rules.maxLen(40), "40文字以内"]],
          [p + "qty"]: [[rules.required, "数量を入力"], [(x) => /^\d+(\.\d{1,2})?$/.test(x), "小数第2位までの数値"], [(x) => Number(x) > 0, "0より大きい数"], [rules.max(99999), "99,999以下"]],
          [p + "unit"]: [[rules.maxLen(6), "6文字以内"]],
          [p + "price"]: [[rules.required, "単価を入力"], [(x) => /^\d+$/.test(x), "半角の整数"], [rules.max(99999999), "99,999,999以下"]],
        }));
      });
      if (!App.showErrors(form, errors)) { App.toast("入力内容を確認してください", "error"); return; }

      const items = doc.items.map((it) => ({ id: it.id || App.uid(), name: it.name, qty: Number(it.qty), unit: it.unit, price: Number(it.price), rate: Number(it.rate) }));
      const base = { clientId: v.clientId, title: v.title, date: v.date, note: v.note, items, [limitKey]: v[limitKey] };
      const issue = submitMode === "issue";
      let saved;
      if (existing) {
        const patch = Object.assign({}, base);
        if (issue && existing.status === "draft") patch.status = isQuote ? "sent" : "issued";
        saved = col.update(existing.id, patch);
      } else {
        saved = col.insert(Object.assign(base, isQuote
          ? { no: V.nextNo("Q", v.date), status: issue ? "sent" : "draft" }
          : { no: V.nextNo("I", v.date), status: issue ? "issued" : "draft", paidDate: "", quoteId: "" }));
      }
      App.toast(label + "（" + saved.no + "）を" + (existing ? "更新" : "作成") + "しました", "success");
      App.navigate(listRoute);
    });

    drawItems();
  };
})(window.App);
