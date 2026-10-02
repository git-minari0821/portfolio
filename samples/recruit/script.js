document.documentElement.classList.add("js");

// ---------- ハンバーガーメニュー ----------
(function () {
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("global-nav");
  if (!btn || !nav) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    document.body.classList.toggle("menu-open", open);
  }

  btn.addEventListener("click", function () {
    setOpen(btn.getAttribute("aria-expanded") !== "true");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setOpen(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();

// ---------- FAQ アコーディオン ----------
document.querySelectorAll(".faq-q").forEach(function (q) {
  q.addEventListener("click", function () {
    var open = q.getAttribute("aria-expanded") !== "true";
    q.setAttribute("aria-expanded", String(open));
    q.closest(".faq-item").classList.toggle("is-open", open);
  });
});

// ---------- スクロールでふわっと表示 ----------
(function () {
  var targets = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  targets.forEach(function (el) { io.observe(el); });
})();

// ---------- 写真が未配置のときはプレースホルダーを見せる ----------
document.querySelectorAll(".ph img").forEach(function (img) {
  function missing() { img.classList.add("is-missing"); }
  if (img.complete && img.naturalWidth === 0) missing();
  else img.addEventListener("error", missing);
});

// ---------- サンプル用の通知 ----------
var toast = document.querySelector(".toast");
var toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("is-show"); }, 3000);
}

document.querySelectorAll(".js-sample-link").forEach(function (a) {
  a.addEventListener("click", function (e) {
    e.preventDefault();
    showToast("サンプルのため、予約ページには移動しません");
  });
});

// ---------- フォーム（サンプルのため送信しない） ----------
document.querySelectorAll("form.js-sample-form").forEach(function (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var result = form.querySelector(".form-result");
    if (result) {
      result.textContent = "サンプルのため送信されません（入力内容はどこにも送られていません）";
      result.hidden = false;
    }
    showToast("サンプルのため送信されません");
  });
});

// ---------- タブ切り替え ----------
document.querySelectorAll("[role='tablist']").forEach(function (list) {
  var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));

  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(tab); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); select(next); next.focus(); }
    });
  });
});
