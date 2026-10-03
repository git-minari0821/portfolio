/* 提案資料：印刷ボタンと、目次の現在位置の表示 */
(function () {
  "use strict";

  var printBtn = document.querySelector("[data-print]");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (!("IntersectionObserver" in window) || !links.length) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (a) { a.removeAttribute("aria-current"); });
      var a = byId[entry.target.id];
      if (a) a.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".slide").forEach(function (s) { io.observe(s); });
})();
