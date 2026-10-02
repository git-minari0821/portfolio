/* 見積書・請求書：印刷・PDF用プレビュー（A4帳票。インボイス制度の記載事項を表示） */
(function (App) {
  "use strict";
  const V = App.V;
  const h = App.h;
  const br = (s) => h(s).replace(/\n/g, "<br>");

  V.views.preview = function (view, params) {
    const kind = params[0] === "quote" ? "quote" : "invoice";
    const isQuote = kind === "quote";
    const doc = (isQuote ? V.quotes : V.invoices).get(params[1]);
    const back = isQuote ? "quotes" : "invoices";
    if (!doc) {
      view.innerHTML = '<a class="back-link" href="#/' + back + '">‹ 一覧に戻る</a><div class="card"><p class="empty">書類が見つかりません</p></div>';
      return;
    }
    const co = V.getCompany();
    const client = V.clients.get(doc.clientId);
    const t = V.calc(doc.items);
    const hasReduced = doc.items.some((it) => Number(it.rate) === 8);
    const docName = isQuote ? "御見積書" : "請求書";
    App.setTitle(docName + " " + doc.no);

    view.innerHTML =
      '<div class="preview-toolbar no-print">' +
      '<a class="back-link" href="#/' + back + '">‹ 一覧に戻る</a>' +
      '<div class="page-actions">' +
      '<a class="btn btn-secondary" href="#/' + back + "/edit/" + doc.id + '">編集</a>' +
      '<button type="button" class="btn btn-primary" data-print>印刷・PDFで保存</button></div>' +
      '<p class="preview-hint">印刷画面で「送信先：PDFに保存」を選ぶと、PDFファイルとして保存できます。</p>' +
      (!isQuote && doc.status === "draft" ? '<div class="alert alert-warning">この請求書は下書きです。発行する前に内容を確認してください。</div>' : "") +
      "</div>" +
      '<div class="paper-wrap"><article class="paper" aria-label="' + docName + 'のプレビュー">' +
      '<header class="paper-head"><h1 class="paper-title">' + docName + "</h1>" +
      '<dl class="paper-meta"><dt>書類番号</dt><dd>' + h(doc.no) + "</dd><dt>" + (isQuote ? "見積日" : "請求日") + "</dt><dd>" + App.fmtDateJa(doc.date) + "</dd></dl></header>" +
      '<div class="paper-parties">' +
      '<div class="paper-to"><p class="to-name">' + h(client ? client.name : "（削除された取引先）") + '<span class="to-honorific">' + h(client ? client.honorific : "") + "</span></p>" +
      (client && client.person ? '<p class="to-person">' + h(client.person) + " 様</p>" : "") +
      (client ? '<p class="to-addr">〒' + h(client.zip) + " " + h(client.address) + "</p>" : "") +
      '<p class="to-lead">' + (isQuote ? "下記のとおりお見積り申し上げます。" : "下記のとおりご請求申し上げます。") + "</p>" +
      '<p class="paper-subject">件名：' + h(doc.title) + "</p>" +
      '<div class="paper-amount"><span>' + (isQuote ? "御見積金額" : "ご請求金額") + '</span><strong>' + App.yen(t.total) + '</strong><small>（税込）</small></div>' +
      '<p class="paper-limit">' + (isQuote ? "有効期限：" + App.fmtDateJa(doc.validUntil) : "お支払期限：" + App.fmtDateJa(doc.dueDate)) + "</p>" +
      "</div>" +
      '<div class="paper-from"><p class="from-name">' + h(co.name) + "</p>" +
      (co.person ? "<p>" + h(co.person) + "</p>" : "") +
      "<p>〒" + h(co.zip) + "<br>" + h(co.address) + "</p>" +
      "<p>TEL " + h(co.tel) + (co.email ? "<br>" + h(co.email) : "") + "</p>" +
      '<p class="from-reg">登録番号：' + h(co.invoiceNo || "（未設定）") + "</p>" +
      '<div class="stamp" aria-hidden="true">印</div>' +
      "</div></div>" +
      '<table class="paper-items"><thead><tr><th class="c-name">品目</th><th class="c-num">数量</th><th class="c-unit">単位</th><th class="c-num">単価</th><th class="c-num">金額</th></tr></thead><tbody>' +
      doc.items.map((it) => '<tr><td class="c-name">' + h(it.name) + (Number(it.rate) === 8 ? ' <span class="reduced">※</span>' : "") + "</td>" +
        '<td class="c-num">' + App.num(it.qty) + '</td><td class="c-unit">' + h(it.unit) + '</td><td class="c-num">' + App.num(it.price) + '</td><td class="c-num">' + App.num(V.lineAmount(it)) + "</td></tr>").join("") +
      Array.from({ length: Math.max(0, 8 - doc.items.length) }, () => '<tr class="blank"><td colspan="5">&nbsp;</td></tr>').join("") +
      "</tbody></table>" +
      '<div class="paper-bottom">' +
      '<div class="paper-notes">' +
      (hasReduced ? '<p class="reduced-note">※印は軽減税率（8%）対象です。</p>' : "") +
      (!isQuote ? '<div class="paper-box"><p class="box-title">お振込先</p><p>' + br(co.bank || "") + '</p><p class="box-sub">振込手数料はご負担くださいますようお願いいたします。</p></div>' : "") +
      (doc.note ? '<div class="paper-box"><p class="box-title">備考</p><p>' + br(doc.note) + "</p></div>" : "") +
      "</div>" +
      '<table class="paper-sum"><tbody>' +
      "<tr><th>小計（税抜）</th><td>" + App.yen(t.subtotal) + "</td></tr>" +
      V.RATES.filter((r) => t.byRate[r].base > 0 || r === 10).map((r) =>
        "<tr><th>" + r + "%対象（税抜）</th><td>" + App.yen(t.byRate[r].base) + "</td></tr><tr><th>　消費税（" + r + "%）</th><td>" + App.yen(t.byRate[r].tax) + "</td></tr>").join("") +
      '<tr class="sum-total"><th>合計（税込）</th><td>' + App.yen(t.total) + "</td></tr>" +
      "</tbody></table></div>" +
      '<p class="paper-foot">※このPDFは制作実績用のデモで作成したサンプルです。記載の会社・取引先は架空のものです。</p>' +
      "</article></div>";

    view.querySelector("[data-print]").addEventListener("click", () => window.print());
  };
})(window.App);
