// 作品のスクリーンショットが未配置（読み込み失敗）のときは画像を隠し、
// CSS のダミー枠「スクリーンショット準備中」を見せる。
document.querySelectorAll(".work-thumb img").forEach(function (img) {
  function markMissing() {
    img.classList.add("is-missing");
  }

  if (img.complete && img.naturalWidth === 0) {
    markMissing();
  } else {
    img.addEventListener("error", markMissing);
  }
});
