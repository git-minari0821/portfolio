/* お問い合わせ：入力チェック → 確認画面 → 完了画面（サンプルのため実際には送信しない） */
(function () {
  "use strict";

  var form = document.getElementById("step-input");
  var confirmBox = document.getElementById("step-confirm");
  var doneBox = document.getElementById("step-done");
  if (!form) return;

  var LABELS = { topic: "ご相談の内容", name: "お名前", kana: "ふりがな", tel: "電話番号", email: "メールアドレス", address: "工事場所の市区町村", contact: "ご希望の連絡方法", message: "ご相談の詳細" };
  var values = {};

  function h(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 全角の数字・ハイフンを半角にそろえる
  function normalizeTel(v) {
    return v.replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xfee0); }).replace(/[‐－―ー−]/g, "-").replace(/\s/g, "");
  }

  function validate(v) {
    var e = {};
    if (!v.topic) e.topic = "ご相談の内容を選んでください";
    if (!v.name) e.name = "お名前を入力してください";
    else if (v.name.length > 30) e.name = "30文字以内で入力してください";
    if (!v.kana) e.kana = "ふりがなを入力してください";
    else if (!/^[ぁ-んァ-ヶー\s　]+$/.test(v.kana)) e.kana = "ひらがな・カタカナで入力してください";
    var digits = v.tel.replace(/-/g, "");
    if (!v.tel) e.tel = "電話番号を入力してください";
    else if (!/^[0-9-]+$/.test(v.tel) || !/^0\d{9,10}$/.test(digits)) e.tel = "電話番号の形式が正しくありません（例：000-0000-0000）";
    if (!v.email) e.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "メールアドレスの形式が正しくありません";
    if (v.address.length > 50) e.address = "50文字以内で入力してください";
    if (!v.message) e.message = "ご相談の詳細を入力してください";
    else if (v.message.length > 1000) e.message = "1000文字以内で入力してください";
    if (!v.agree) e.agree = "個人情報の取り扱いへの同意が必要です";
    return e;
  }

  function showErrors(errors) {
    form.querySelectorAll(".field-error").forEach(function (el) { el.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });
    var summary = form.querySelector(".error-summary");
    var keys = Object.keys(errors);
    keys.forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      var row = input.closest(".form-row");
      var p = document.createElement("p");
      p.className = "field-error";
      p.id = "err-" + name;
      p.textContent = errors[name];
      row.appendChild(p);
      form.querySelectorAll('[name="' + name + '"]').forEach(function (el) {
        el.setAttribute("aria-invalid", "true");
        el.setAttribute("aria-describedby", p.id);
      });
    });
    if (keys.length) {
      summary.hidden = false;
      summary.textContent = keys.length + "件の入力内容に誤りがあります。各項目のメッセージを確認してください。";
      form.querySelector('[name="' + keys[0] + '"]').focus();
    } else summary.hidden = true;
    return keys.length === 0;
  }

  function setStep(n) {
    document.querySelectorAll(".steps li").forEach(function (li) {
      var s = Number(li.dataset.step);
      li.classList.toggle("is-done", s < n);
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    form.hidden = n !== 1;
    confirmBox.hidden = n !== 2;
    doneBox.hidden = n !== 3;
    var target = n === 1 ? form : n === 2 ? confirmBox : doneBox;
    document.querySelector(".steps").scrollIntoView({ behavior: "smooth", block: "start" });
    if (n !== 1) target.focus({ preventScroll: true });
  }

  var counter = form.querySelector(".char-count");
  form.message.addEventListener("input", function () { counter.textContent = form.message.value.length; });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    form.tel.value = normalizeTel(form.tel.value);
    var checked = form.querySelector('[name="topic"]:checked');
    values = {
      topic: checked ? checked.value : "",
      name: form.querySelector('[name="name"]').value.trim(),
      kana: form.kana.value.trim(),
      tel: form.tel.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      contact: form.contact.value,
      message: form.message.value.trim(),
      agree: form.agree.checked,
    };
    if (!showErrors(validate(values))) return;
    confirmBox.querySelector(".confirm-list").innerHTML = Object.keys(LABELS).map(function (k) {
      return "<dt>" + LABELS[k] + "</dt><dd>" + (values[k] ? h(values[k]) : "（未入力）") + "</dd>";
    }).join("");
    setStep(2);
  });

  confirmBox.querySelector("[data-back]").addEventListener("click", function () { setStep(1); });
  confirmBox.querySelector("[data-send]").addEventListener("click", function () {
    // サンプルのため、ここでは送信しない（実際のサイトではここでフォームの送信先に送る）
    setStep(3);
  });
})();
