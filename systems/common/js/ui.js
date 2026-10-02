/* 共通：トースト・モーダル・確認ダイアログ・フォームのエラー表示 */
(function (App) {
  "use strict";
  const h = App.h;

  /* ---------- トースト ---------- */
  App.toast = function (message, type) {
    let box = document.querySelector(".toast-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "toast-box";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "toast" + (type ? " toast-" + type : "");
    t.textContent = message;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-show"));
    setTimeout(() => {
      t.classList.remove("is-show");
      setTimeout(() => t.remove(), 300);
    }, 2800);
  };

  /* ---------- モーダル ---------- */
  App.openModal = function (opts) {
    const lastFocus = document.activeElement;
    const formId = "modal-form-" + App.uid();
    const wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML =
      '<div class="modal-backdrop" data-close></div>' +
      '<div class="modal-dialog' + (opts.wide ? " modal-wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="' + formId + '-title">' +
      '  <div class="modal-head"><h2 id="' + formId + '-title">' + h(opts.title) + '</h2>' +
      '    <button type="button" class="icon-btn" data-close aria-label="閉じる">×</button></div>' +
      '  <form id="' + formId + '" class="modal-body" novalidate>' + (opts.body || "") + "</form>" +
      '  <div class="modal-foot">' +
      '    <div class="modal-foot-left">' + (opts.footerLeft || "") + "</div>" +
      '    <button type="button" class="btn btn-secondary" data-close>' + h(opts.cancelLabel || "キャンセル") + "</button>" +
      (opts.onSubmit
        ? '    <button type="submit" form="' + formId + '" class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '">' + h(opts.submitLabel || "保存する") + "</button>"
        : "") +
      "  </div>" +
      "</div>";
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");

    const form = wrap.querySelector("form");
    const close = () => {
      wrap.remove();
      if (!document.querySelector(".modal")) document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    function onKey(e) {
      const modals = document.querySelectorAll(".modal");
      if (wrap !== modals[modals.length - 1]) return; // いちばん手前のモーダルだけが反応する
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = wrap.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        const list = Array.prototype.filter.call(items, (el) => !el.disabled && el.offsetParent !== null);
        if (!list.length) return;
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === list[list.length - 1]) { e.preventDefault(); list[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    wrap.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (opts.onSubmit) opts.onSubmit(form, close);
    });

    if (opts.onOpen) opts.onOpen(wrap, form, close);
    const first = form.querySelector("input:not([type=hidden]), select, textarea") || wrap.querySelector(".modal-foot .btn");
    if (first) first.focus();
    return { el: wrap, form, close };
  };

  /* ブラウザ標準の confirm の代わり。Promise<boolean> を返す */
  App.confirm = function (opts) {
    return new Promise((resolve) => {
      let done = false;
      const m = App.openModal({
        title: opts.title || "確認",
        body: '<p class="confirm-message">' + h(opts.message).replace(/\n/g, "<br>") + "</p>",
        submitLabel: opts.okLabel || "OK",
        danger: opts.danger,
        onSubmit: (form, close) => { done = true; close(); resolve(true); },
      });
      const observer = new MutationObserver(() => {
        if (!document.body.contains(m.el)) { observer.disconnect(); if (!done) resolve(false); }
      });
      observer.observe(document.body, { childList: true });
      const ok = m.el.querySelector(".modal-foot [type=submit]");
      if (ok) ok.focus();
    });
  };

  /* ---------- フォーム ---------- */
  App.formValues = function (form) {
    const values = {};
    Array.prototype.forEach.call(form.elements, (el) => {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") values[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) values[el.name] = el.value; else if (!(el.name in values)) values[el.name] = ""; }
      else values[el.name] = el.value.trim();
    });
    return values;
  };

  App.clearErrors = function (root) {
    root.querySelectorAll(".field-error").forEach((el) => el.remove());
    root.querySelectorAll("[aria-invalid]").forEach((el) => {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    });
  };

  /* エラーは、その項目のすぐ下に表示する */
  App.showErrors = function (root, errors) {
    App.clearErrors(root);
    let firstEl = null;
    Object.keys(errors).forEach((name) => {
      const id = "err-" + App.uid();
      const msg = '<p class="field-error" id="' + id + '">' + h(errors[name]) + "</p>";
      const slot = root.querySelector('[data-error-for="' + name + '"]');
      const input = root.querySelector('[name="' + name + '"]');
      if (slot) slot.insertAdjacentHTML("beforeend", msg);
      else if (input) {
        const field = input.closest(".field") || input.parentElement;
        field.insertAdjacentHTML("beforeend", msg);
      } else return;
      if (input) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", id);
      }
      if (!firstEl) firstEl = input || slot;
    });
    if (firstEl && firstEl.focus) firstEl.focus();
    return Object.keys(errors).length === 0;
  };

  /* よく使う入力欄のHTML */
  App.field = function (o) {
    const id = "f-" + o.name + "-" + App.uid();
    const req = o.required ? '<span class="req">必須</span>' : "";
    const attrs = (o.attrs || "") + (o.required ? " required" : "");
    let control;
    if (o.type === "select") {
      control = '<select id="' + id + '" name="' + o.name + '"' + attrs + ">" +
        (o.placeholder ? '<option value="">' + h(o.placeholder) + "</option>" : "") +
        o.options.map((op) => '<option value="' + h(op.value) + '"' + (String(op.value) === String(o.value) ? " selected" : "") + ">" + h(op.label) + "</option>").join("") +
        "</select>";
    } else if (o.type === "textarea") {
      control = '<textarea id="' + id + '" name="' + o.name + '" rows="' + (o.rows || 3) + '"' + attrs + (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : "") + ">" + h(o.value) + "</textarea>";
    } else {
      control = '<input id="' + id + '" name="' + o.name + '" type="' + (o.type || "text") + '" value="' + h(o.value) + '"' + attrs + (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : "") + ">";
    }
    return '<div class="field' + (o.wide ? " field-wide" : "") + '"><label for="' + id + '">' + h(o.label) + req + "</label>" + control + (o.help ? '<p class="field-help">' + h(o.help) + "</p>" : "") + "</div>";
  };

  App.badge = (label, tone) => '<span class="badge badge-' + (tone || "gray") + '">' + h(label) + "</span>";
})(window.App);
