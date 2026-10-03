/* 全ページ共通：メニュー・ページトップ・お知らせ・施工事例の表示 */
(function () {
  "use strict";

  function h(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- ハンバーガーメニュー ----------
  var btn = document.querySelector(".menu-btn");
  if (btn) {
    var setOpen = function (open) {
      document.body.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    };
    btn.addEventListener("click", function () { setOpen(!document.body.classList.contains("menu-open")); });
    document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  // ---------- ページトップへ戻る ----------
  var top = document.querySelector(".page-top");
  if (top) {
    var onScroll = function () { top.classList.toggle("is-show", window.scrollY > 400); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
      var skip = document.querySelector(".logo");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  // ---------- 写真が未配置のときはプレースホルダーを見せる ----------
  function watchImages(root) {
    root.querySelectorAll(".ph img").forEach(function (img) {
      var missing = function () { img.classList.add("is-missing"); };
      if (img.complete && img.naturalWidth === 0) missing();
      else img.addEventListener("error", missing);
    });
  }

  // ---------- お知らせ（新しい順に表示） ----------
  var newsList = document.querySelector("[data-news]");
  if (newsList && window.NEWS) {
    var limit = Number(newsList.dataset.news) || window.NEWS.length;
    var sorted = window.NEWS.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, limit);
    var latest = sorted.length ? sorted[0].date : "";
    newsList.innerHTML = sorted.map(function (n) {
      return '<li class="news-item"><time datetime="' + n.date + '">' + n.date.replace(/-/g, ".") + "</time>" +
        '<span class="news-cat">' + h(n.category) + "</span>" +
        '<p class="news-title">' + h(n.title) + (n.date === latest ? '<span class="news-new">NEW</span>' : "") + "</p></li>";
    }).join("");
  }

  // ---------- 施工事例（ビフォー・アフター比較つき） ----------
  function workCard(w, i) {
    var cat = window.WORK_CATEGORIES[w.category];
    var id = "cmp-" + i;
    return '<article class="work" data-category="' + w.category + '">' +
      '<div class="compare">' +
      '<div class="ph ph-before" data-label="施工前の写真"><img src="images/work-' + (i + 1) + '-before.jpg" alt="' + h(w.title) + '（施工前）" loading="lazy"></div>' +
      '<div class="ph ph-after" data-label="施工後の写真"><img src="images/work-' + (i + 1) + '-after.jpg" alt="' + h(w.title) + '（施工後）" loading="lazy"></div>' +
      '<span class="compare-label before" aria-hidden="true">BEFORE</span><span class="compare-label after" aria-hidden="true">AFTER</span>' +
      '<label class="visually-hidden" for="' + id + '">施工前と施工後の表示の割合</label>' +
      '<input id="' + id + '" type="range" min="0" max="100" value="50">' +
      '<span class="compare-line" aria-hidden="true"></span>' +
      "</div>" +
      '<div class="work-body"><span class="work-cat">' + h(cat) + "</span><h3>" + h(w.title) + "</h3>" +
      '<dl class="work-meta"><dt>地域</dt><dd>' + h(w.area) + "</dd><dt>工期</dt><dd>" + h(w.period) + "</dd><dt>費用</dt><dd>" + h(w.cost) + "</dd></dl>" +
      '<p class="work-desc">' + h(w.desc) + "</p></div></article>";
  }

  var worksGrid = document.querySelector("[data-works]");
  if (worksGrid && window.WORKS) {
    var max = Number(worksGrid.dataset.works) || window.WORKS.length;
    worksGrid.innerHTML = window.WORKS.slice(0, max).map(workCard).join("");
    watchImages(worksGrid);

    worksGrid.addEventListener("input", function (e) {
      if (e.target.type !== "range") return;
      e.target.closest(".compare").style.setProperty("--pos", e.target.value + "%");
    });

    // カテゴリで絞り込み（施工事例ページのみ）
    var filter = document.querySelector("[data-filter]");
    var count = document.querySelector(".works-count");
    if (filter) {
      var apply = function (cat) {
        var n = 0;
        worksGrid.querySelectorAll(".work").forEach(function (el) {
          var show = cat === "all" || el.dataset.category === cat;
          el.hidden = !show;
          if (show) n++;
        });
        filter.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cat === cat)); });
        if (count) count.textContent = (cat === "all" ? "すべて" : window.WORK_CATEGORIES[cat]) + "：" + n + "件";
      };
      filter.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-cat]");
        if (b) apply(b.dataset.cat);
      });
      var initial = new URLSearchParams(location.search).get("cat");
      apply(window.WORK_CATEGORIES[initial] ? initial : "all");
    }
  }

  watchImages(document);
})();
