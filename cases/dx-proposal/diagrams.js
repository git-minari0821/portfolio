/* 提案資料の図：業務フロー（スイムレーン図）とスケジュール（ガントチャート）
   図の中身はデータで管理しているので、手順の追加・変更はここを書き換えるだけで済みます */
(function () {
  "use strict";

  var LANES = ["店舗スタッフ", "店長", "本部"];

  /* 現状の業務フロー（problem: 課題がある手順） */
  var CURRENT = {
    title: "現状の業務フロー",
    steps: [
      { id: "a", lane: 0, col: 0, lines: ["販売・入荷のたびに", "紙の台帳へ記入"], problem: true },
      { id: "b", lane: 1, col: 1, lines: ["閉店後に台帳を", "Excelへ転記"], problem: true },
      { id: "c", lane: 1, col: 2, lines: ["在庫の少ない商品を", "目で見て探し、電話で発注"], problem: true },
      { id: "d", lane: 2, col: 2, lines: ["各店のExcelを", "メールで受け取る（週1回）"] },
      { id: "e", lane: 2, col: 3, lines: ["3店舗分を手作業で", "集計・在庫金額を計算"], problem: true },
      { id: "f", lane: 0, col: 3, lines: ["月末の棚卸", "（全商品を数えて紙に記入）"], problem: true },
    ],
    arrows: [["a", "b"], ["b", "c"], ["b", "d"], ["d", "e"], ["f", "e"]],
  };

  /* 改善後の業務フロー（changed: 変わる手順） */
  var FUTURE = {
    title: "改善後の業務フロー",
    steps: [
      { id: "a", lane: 0, col: 0, lines: ["販売・入荷を", "タブレットで登録"], changed: true },
      { id: "b", lane: 1, col: 1, lines: ["発注点を下回った商品を", "画面で確認（自動で警告）"], changed: true },
      { id: "c", lane: 1, col: 2, lines: ["発注書を画面で作成", "（仕入先ごとに自動で分割）"], changed: true },
      { id: "g", lane: 0, col: 2, lines: ["入荷したら", "「入荷済み」を押す"], changed: true },
      { id: "e", lane: 2, col: 3, lines: ["全店の在庫・在庫金額を", "いつでも画面で確認"], changed: true },
      { id: "f", lane: 0, col: 3, lines: ["棚卸は実際の数を", "入力するだけ（差は自動計算）"], changed: true },
    ],
    arrows: [["a", "b"], ["b", "c"], ["c", "g"], ["a", "e"], ["g", "e"], ["f", "e"]],
  };

  var W = 1000, LABEL = 110, LANE_H = 118, BOX_W = 186, BOX_H = 66, COL_W = 222, PAD_X = 130;

  function pos(step) {
    var x = PAD_X + step.col * COL_W;
    var y = step.lane * LANE_H + (LANE_H - BOX_H) / 2;
    return { x: x, y: y, cx: x + BOX_W / 2, cy: y + BOX_H / 2 };
  }

  function swimlane(flow, mode) {
    var H = LANES.length * LANE_H;
    var byId = {};
    flow.steps.forEach(function (s) { byId[s.id] = s; });
    var out = [];
    out.push('<svg viewBox="0 0 ' + W + " " + H + '" class="swimlane" role="img" aria-labelledby="sl-' + mode + '-t sl-' + mode + '-d">');
    out.push('<title id="sl-' + mode + '-t">' + flow.title + "</title>");
    out.push('<desc id="sl-' + mode + '-d">' + flow.steps.map(function (s, i) { return (i + 1) + "．" + LANES[s.lane] + "：" + s.lines.join(""); }).join("　") + "</desc>");
    out.push('<defs><marker id="arrow-' + mode + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="sl-arrowhead"/></marker></defs>');

    LANES.forEach(function (name, i) {
      out.push('<rect x="0" y="' + i * LANE_H + '" width="' + W + '" height="' + LANE_H + '" class="sl-lane ' + (i % 2 ? "sl-lane-alt" : "") + '"/>');
      out.push('<rect x="0" y="' + i * LANE_H + '" width="' + LABEL + '" height="' + LANE_H + '" class="sl-label-bg"/>');
      out.push('<text x="' + LABEL / 2 + '" y="' + (i * LANE_H + LANE_H / 2 + 5) + '" text-anchor="middle" class="sl-label">' + name + "</text>");
    });

    flow.arrows.forEach(function (pair) {
      var a = pos(byId[pair[0]]), b = pos(byId[pair[1]]);
      var d;
      if (byId[pair[0]].lane === byId[pair[1]].lane) {
        d = b.x > a.x ? "M" + (a.x + BOX_W) + " " + a.cy + " H" + (b.x - 4) : "M" + a.x + " " + a.cy + " H" + (b.x + BOX_W + 4);
      } else if (byId[pair[0]].col === byId[pair[1]].col) {
        var down = b.y > a.y;
        d = "M" + a.cx + " " + (down ? a.y + BOX_H : a.y) + " V" + (down ? b.y - 4 : b.y + BOX_H + 4);
      } else if (b.x > a.x) {
        var mid = a.x + BOX_W + (b.x - a.x - BOX_W) / 2;
        d = "M" + (a.x + BOX_W) + " " + a.cy + " H" + mid + " V" + b.cy + " H" + (b.x - 4);
      } else {
        // 右から左へ戻る矢印（例：棚卸の結果を転記）は、箱の上下を回り込む
        var up = b.y < a.y;
        d = "M" + a.cx + " " + (up ? a.y : a.y + BOX_H) + " V" + (up ? b.cy : b.cy) + " H" + (b.x + BOX_W + 4);
      }
      out.push('<path d="' + d + '" class="sl-arrow" marker-end="url(#arrow-' + mode + ')"/>');
    });

    flow.steps.forEach(function (s, i) {
      var p = pos(s);
      var cls = "sl-box" + (s.problem ? " is-problem" : "") + (s.changed ? " is-changed" : "");
      out.push('<g class="' + cls + '">');
      out.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + BOX_W + '" height="' + BOX_H + '" rx="8"/>');
      out.push('<circle cx="' + (p.x + 14) + '" cy="' + (p.y + 14) + '" r="10" class="sl-num-bg"/><text x="' + (p.x + 14) + '" y="' + (p.y + 18) + '" text-anchor="middle" class="sl-num">' + (i + 1) + "</text>");
      s.lines.forEach(function (line, j) {
        out.push('<text x="' + (p.cx + 6) + '" y="' + (p.cy - (s.lines.length - 1) * 9 + j * 18 + 5) + '" text-anchor="middle" class="sl-text">' + line + "</text>");
      });
      if (s.problem) out.push('<text x="' + (p.x + BOX_W - 8) + '" y="' + (p.y + 18) + '" text-anchor="end" class="sl-flag">課題</text>');
      if (s.changed) out.push('<text x="' + (p.x + BOX_W - 8) + '" y="' + (p.y + 18) + '" text-anchor="end" class="sl-flag">改善</text>');
      out.push("</g>");
    });
    out.push("</svg>");
    return out.join("");
  }

  /* ---------- スケジュール（9週間・約2か月） ---------- */
  var WEEKS = 9;
  var TASKS = [
    { name: "要件定義", note: "業務のヒアリング・機能の決定", start: 1, end: 2 },
    { name: "設計", note: "画面・データの設計", start: 2, end: 3 },
    { name: "開発", note: "機能の作成・途中確認（週1回）", start: 3, end: 6 },
    { name: "テスト", note: "お客様と一緒に動作確認", start: 6, end: 7 },
    { name: "導入・操作説明", note: "データ移行・スタッフ向け説明会", start: 8, end: 8 },
    { name: "運用サポート", note: "導入後の問い合わせ対応", start: 8, end: 9, light: true },
  ];

  function gantt() {
    var head = '<div class="gantt-row gantt-head"><div class="gantt-name">工程</div>' +
      Array.from({ length: WEEKS }, function (_, i) { return '<div class="gantt-week">' + (i + 1) + "週</div>"; }).join("") + "</div>";
    var rows = TASKS.map(function (t) {
      return '<div class="gantt-row"><div class="gantt-name"><strong>' + t.name + "</strong><small>" + t.note + "</small></div>" +
        '<div class="gantt-track" style="--weeks:' + WEEKS + '"><span class="gantt-bar' + (t.light ? " is-light" : "") + '" style="--s:' + t.start + ";--e:" + t.end + '">' +
        "<span class=\"visually-hidden\">" + t.start + "週目から" + t.end + "週目</span></span></div></div>";
    }).join("");
    var marks = '<div class="gantt-row gantt-marks"><div class="gantt-name"></div><div class="gantt-track" style="--weeks:' + WEEKS + '">' +
      '<span class="gantt-mark" style="--w:2">◆ 機能の確定</span><span class="gantt-mark" style="--w:7">◆ 受け入れ確認</span><span class="gantt-mark" style="--w:8">◆ 本番開始</span></div></div>';
    return '<div class="gantt" role="table" aria-label="導入スケジュール">' + head + rows + marks + "</div>";
  }

  document.querySelectorAll("[data-swimlane]").forEach(function (el) {
    el.innerHTML = swimlane(el.dataset.swimlane === "future" ? FUTURE : CURRENT, el.dataset.swimlane);
  });
  var g = document.querySelector("[data-gantt]");
  if (g) g.innerHTML = gantt();
})();
