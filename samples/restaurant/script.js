/* 博多もつ鍋 かざぐるま：言語切り替え・お品書き・タブ・メニュー */
(function () {
  "use strict";

  var STORAGE_KEY = "kazaguruma-lang";
  var current = "ja";

  function h(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function t(key) {
    var dict = window.I18N[current] || window.I18N.ja;
    return key in dict ? dict[key] : window.I18N.ja[key];
  }
  function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }

  // localStorage は使えない環境もあるので、失敗しても何もしない
  function loadLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveLang(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* 保存できなくても表示は切り替える */ }
  }

  /* ---------- お品書き・コース ---------- */
  var CHILI = '<svg class="chili-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c0 2 1 3 3 3-1 6-5 12-12 13 3-3 5-8 6-12 1-2 2-4 3-4Z"/><path d="M14 4c1-1 2-1 3-1"/></svg>';

  function renderMenu() {
    document.querySelectorAll("[data-menu]").forEach(function (ul) {
      var items = window.MENU[ul.dataset.menu] || [];
      ul.innerHTML = items.map(function (m) {
        var spicy = m.spicy
          ? '<span class="spicy" aria-label="' + h(t("menu.spicy")) + " " + m.spicy + '/3">' + Array(m.spicy + 1).join(CHILI) + "</span>"
          : "";
        var allergens = m.allergens.length
          ? '<ul class="allergens" aria-label="' + h(t("menu.allergens")) + '">' + m.allergens.map(function (a) {
              return '<li class="allergen allergen-' + a + '"><span class="allergen-dot" aria-hidden="true"></span>' + h(t("allergen." + a)) + "</li>";
            }).join("") + "</ul>"
          : "";
        return '<li class="menu-item' + (m.recommend ? " is-recommend" : "") + '">' +
          '<div class="menu-head">' +
          '<h3 class="menu-name">' + (m.recommend ? '<span class="recommend">' + h(t("menu.recommend")) + "</span>" : "") + h(m.name[current] || m.name.ja) + spicy + "</h3>" +
          '<p class="menu-price">' + yen(m.price) + (m.unit ? "<small>／" + h(t("menu.perPerson")) + "</small>" : "") + "</p>" +
          "</div>" +
          '<p class="menu-desc">' + h(m.desc[current] || m.desc.ja) + "</p>" + allergens + "</li>";
      }).join("");
    });

    var courses = document.querySelector("[data-courses]");
    if (courses) {
      courses.innerHTML = window.COURSES.map(function (c) {
        return '<article class="course"><div class="course-head"><h3>' + h(t("course." + c.key + ".name")) + "</h3>" +
          '<p class="course-price">' + yen(c.price) + "<small>／" + h(t("course.price")) + "</small></p></div>" +
          '<ul class="course-tags"><li>' + c.items + " " + h(t("course.items")) + "</li><li>" + c.minutes + " " + h(t("course.min")) + "</li>" +
          (c.drink ? "<li>" + h(t("course.drink")) + "</li>" : "") + "</ul>" +
          "<p>" + h(t("course." + c.key + ".text")) + "</p></article>";
      }).join("");
    }
  }

  /* ---------- 言語を切り替える ---------- */
  function applyLang(code) {
    var lang = window.LANGS.find(function (l) { return l.code === code; }) || window.LANGS[0];
    current = lang.code;
    document.documentElement.lang = lang.htmlLang;
    document.title = t("meta.title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.desc"));

    // 翻訳データの文章はすべて自分たちで用意したものなので、<br> を含むものだけ innerHTML で入れる
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(";").forEach(function (pair) {
        var p = pair.split(":");
        el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });

    document.querySelector(".lang-current").textContent = lang.label;
    document.querySelectorAll(".lang-list button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === current)); });
    updateMenuLabel();
    renderMenu();
  }

  /* 言語の一覧 */
  var langBtn = document.querySelector(".lang-btn");
  var langList = document.getElementById("lang-list");
  langList.innerHTML = window.LANGS.map(function (l) {
    return '<li><button type="button" lang="' + l.htmlLang + '" data-lang="' + l.code + '">' + h(l.label) + "</button></li>";
  }).join("");
  function setLangOpen(open) {
    langList.hidden = !open;
    langBtn.setAttribute("aria-expanded", String(open));
  }
  langBtn.addEventListener("click", function () { setLangOpen(langList.hidden); });
  langList.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lang]");
    if (!b) return;
    applyLang(b.dataset.lang);
    saveLang(b.dataset.lang);
    setLangOpen(false);
    langBtn.focus();
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".lang")) setLangOpen(false); });

  /* ---------- ハンバーガーメニュー ---------- */
  var menuBtn = document.querySelector(".menu-btn");
  function updateMenuLabel() {
    var open = document.body.classList.contains("menu-open");
    menuBtn.setAttribute("aria-label", t(open ? "nav.close" : "nav.open"));
  }
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    updateMenuLabel();
  }
  menuBtn.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
  document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    setMenu(false);
    if (!langList.hidden) { setLangOpen(false); langBtn.focus(); }
  });

  /* ---------- タブ ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      var next = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  /* ---------- 写真が未配置のときはプレースホルダー ---------- */
  document.querySelectorAll(".ph img").forEach(function (img) {
    var missing = function () { img.classList.add("is-missing"); };
    if (img.complete && img.naturalWidth === 0) missing();
    else img.addEventListener("error", missing);
  });

  /* ---------- サンプル用の通知 ---------- */
  var toast = document.querySelector(".toast");
  var timer;
  document.querySelectorAll(".js-sample-link").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      toast.textContent = t("reserve.sample");
      toast.classList.add("is-show");
      clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove("is-show"); }, 3000);
    });
  });

  /* ---------- 最初の言語：保存済み → ブラウザの言語 → 日本語 ---------- */
  var saved = loadLang();
  var browser = (navigator.language || "ja").slice(0, 2).toLowerCase();
  var initial = saved || (window.I18N[browser] ? browser : "ja");
  applyLang(window.I18N[initial] ? initial : "ja");
})();
