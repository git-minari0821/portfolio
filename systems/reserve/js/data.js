/* 予約・顧客管理：データの保存・サンプルデータ・共通の計算 */
(function (App) {
  "use strict";

  const R = (App.R = {});
  const store = (R.store = App.createStore("demo-reserve"));

  R.staff = App.createCollection(store, "staff");
  R.menus = App.createCollection(store, "menus");
  R.customers = App.createCollection(store, "customers");
  R.reservations = App.createCollection(store, "reservations");

  R.OPEN = "10:00";
  R.CLOSE = "20:00";
  R.SLOT = 30;

  R.STATUS = {
    booked: { label: "予約済み", tone: "info" },
    visited: { label: "来店済み", tone: "success" },
    canceled: { label: "キャンセル", tone: "gray" },
  };
  R.STAFF_COLORS = [
    { value: "#0f766e", label: "グリーン" },
    { value: "#c2410c", label: "オレンジ" },
    { value: "#7c3aed", label: "パープル" },
    { value: "#2563eb", label: "ブルー" },
    { value: "#be185d", label: "ピンク" },
  ];

  R.statusBadge = (status) => App.badge(R.STATUS[status].label, R.STATUS[status].tone);

  /* 予約の開始時刻リスト（30分ごと） */
  R.timeOptions = function () {
    const list = [];
    for (let m = App.toMinutes(R.OPEN); m < App.toMinutes(R.CLOSE); m += R.SLOT) list.push(App.fromMinutes(m));
    return list;
  };

  R.endTime = (r) => App.fromMinutes(App.toMinutes(r.start) + r.minutes);

  /* 同じ担当者・同じ日で時間が重なる予約を探す（キャンセルは除く） */
  R.findConflict = function (candidate) {
    const s = App.toMinutes(candidate.start);
    const e = s + candidate.minutes;
    return R.reservations.all().find((r) =>
      r.id !== candidate.id &&
      r.status !== "canceled" &&
      r.staffId === candidate.staffId &&
      r.date === candidate.date &&
      App.toMinutes(r.start) < e &&
      s < App.toMinutes(r.start) + r.minutes
    ) || null;
  };

  R.lookup = function () {
    const map = (rows) => rows.reduce((m, r) => { m[r.id] = r; return m; }, {});
    return { staff: map(R.staff.all()), menus: map(R.menus.all()), customers: map(R.customers.all()) };
  };

  /* 顧客ごとの来店回数・最終来店日・次の予約 */
  R.customerStats = function () {
    const today = App.today();
    const stats = {};
    R.customers.all().forEach((c) => { stats[c.id] = { visits: 0, lastVisit: "", nextBooking: null }; });
    R.reservations.all().forEach((r) => {
      const s = stats[r.customerId];
      if (!s) return;
      if (r.status === "visited") {
        s.visits++;
        if (r.date > s.lastVisit) s.lastVisit = r.date;
      }
      if (r.status === "booked" && r.date >= today) {
        if (!s.nextBooking || r.date + r.start < s.nextBooking.date + s.nextBooking.start) s.nextBooking = r;
      }
    });
    return stats;
  };

  /* ---------- サンプルデータ ---------- */
  const NAMES = [
    ["青木 誠", "あおき まこと"], ["石田 美咲", "いしだ みさき"], ["上野 健太", "うえの けんた"], ["江口 由紀", "えぐち ゆき"],
    ["大塚 翔", "おおつか しょう"], ["片山 彩", "かたやま あや"], ["菊地 大輔", "きくち だいすけ"], ["久保 恵", "くぼ めぐみ"],
    ["小島 拓也", "こじま たくや"], ["斉藤 真由", "さいとう まゆ"], ["島田 隆", "しまだ たかし"], ["杉本 麻衣", "すぎもと まい"],
    ["関 直樹", "せき なおき"], ["高野 優子", "たかの ゆうこ"], ["千葉 浩二", "ちば こうじ"], ["筒井 千尋", "つつい ちひろ"],
    ["寺田 亮", "てらだ りょう"], ["遠山 さやか", "とおやま さやか"], ["中川 修", "なかがわ おさむ"], ["西村 香織", "にしむら かおり"],
    ["野口 達也", "のぐち たつや"], ["長谷川 舞", "はせがわ まい"], ["平田 慎吾", "ひらた しんご"], ["藤井 奈々", "ふじい なな"],
    ["星野 学", "ほしの まなぶ"], ["松田 理恵", "まつだ りえ"], ["宮本 和也", "みやもと かずや"], ["村上 沙織", "むらかみ さおり"],
    ["森下 悠", "もりした ゆう"], ["矢野 智子", "やの ともこ"], ["山崎 剛", "やまざき つよし"], ["吉岡 明日香", "よしおか あすか"],
    ["渡部 圭", "わたなべ けい"], ["秋山 陽子", "あきやま ようこ"], ["今井 俊介", "いまい しゅんすけ"], ["岡田 真理", "おかだ まり"],
    ["川口 雄一", "かわぐち ゆういち"], ["木下 綾乃", "きのした あやの"], ["坂本 光", "さかもと ひかる"], ["田村 美穂", "たむら みほ"],
  ];
  const NOTES = [
    "デスクワーク中心。夕方に肩まわりの重さを感じやすいとのこと。",
    "右肩の張りが強め。力加減は弱めを希望。",
    "長時間の運転が多い。腰まわりを重点的に。",
    "前回より首の動かしやすさを実感しているとのこと。",
    "在宅勤務で座る時間が長い。ストレッチを2種類お伝えした。",
    "強めの圧が好み。肩甲骨まわりを中心に。",
  ];

  R.seed = function () {
    const rnd = App.seededRandom(20261003);
    const today = App.today();

    const staff = [
      { id: "st1", name: "森川 ゆう", role: "院長", color: "#0f766e" },
      { id: "st2", name: "高瀬 なつみ", role: "スタッフ", color: "#c2410c" },
      { id: "st3", name: "小野寺 けい", role: "スタッフ", color: "#7c3aed" },
    ];
    const menus = [
      { id: "m1", name: "初回体験", minutes: 60, price: 3300 },
      { id: "m2", name: "整体コース", minutes: 60, price: 6600 },
      { id: "m3", name: "じっくりコース", minutes: 90, price: 9350 },
      { id: "m4", name: "クイック整体", minutes: 30, price: 3850 },
    ];

    // 顧客：登録日は過去6か月に分散。うち6名は今月の新規
    const monthStart = today.slice(0, 8) + "01";
    const daysThisMonth = Math.max(0, Math.round((App.parseDate(today) - App.parseDate(monthStart)) / 86400000));
    const customers = NAMES.map((n, i) => {
      const no = App.pad(i + 1, 3);
      const createdAt = i >= NAMES.length - 6
        ? App.addDays(monthStart, Math.min(daysThisMonth, rnd.int(0, Math.max(0, daysThisMonth))))
        : App.addDays(today, -rnd.int(35, 180));
      return {
        id: "c" + no,
        name: n[0],
        kana: n[1],
        tel: "090-0000-0" + no,
        email: "sample" + no + "@example.com",
        createdAt,
        nextVisit: "",
        memo: "",
        notes: [],
      };
    });

    // 予約：45日前〜20日後。担当者・時間が重ならないように入れる
    const reservations = [];
    const conflict = (c) => reservations.some((r) =>
      r.staffId === c.staffId && r.date === c.date &&
      App.toMinutes(r.start) < App.toMinutes(c.start) + c.minutes &&
      App.toMinutes(c.start) < App.toMinutes(r.start) + r.minutes);
    const times = R.timeOptions();
    const firstDone = {};

    for (let offset = -45; offset <= 20; offset++) {
      const date = App.addDays(today, offset);
      const count = offset === 0 ? 5 : rnd.int(offset > 7 ? 0 : 1, offset > 7 ? 2 : 4);
      for (let k = 0; k < count; k++) {
        const candidates = customers.filter((c) => c.createdAt <= date);
        if (!candidates.length) continue;
        const cust = rnd.pick(candidates);
        const menu = firstDone[cust.id] ? rnd.pick([menus[1], menus[1], menus[2], menus[3]]) : menus[0];
        const st = rnd.pick(staff);
        let start = rnd.pick(times);
        if (App.toMinutes(start) + menu.minutes > App.toMinutes(R.CLOSE)) start = "18:00";
        const r = { id: "r" + (reservations.length + 1), date, start, minutes: menu.minutes, price: menu.price, menuId: menu.id, staffId: st.id, customerId: cust.id, status: "booked", note: "" };
        if (conflict(r)) continue;
        if (offset < 0) r.status = rnd.next() < 0.9 ? "visited" : "canceled";
        if (r.status === "visited") firstDone[cust.id] = true;
        reservations.push(r);
      }
    }

    // カルテと次回来店予定日（最終来店の3〜4週間後）
    customers.forEach((c) => {
      const visits = reservations.filter((r) => r.customerId === c.id && r.status === "visited").sort((a, b) => (a.date < b.date ? 1 : -1));
      const hasBooking = reservations.some((r) => r.customerId === c.id && r.status === "booked");
      visits.slice(0, 2).forEach((v, i) => {
        if (rnd.next() < 0.7) c.notes.push({ id: App.uid() + i, date: v.date, text: rnd.pick(NOTES) });
      });
      if (visits.length && !hasBooking) c.nextVisit = App.addDays(visits[0].date, rnd.pick([21, 28]));
    });

    store.set("staff", staff);
    store.set("menus", menus);
    store.set("customers", customers);
    store.set("reservations", reservations);
    store.set("seeded", true);
  };

  R.resetData = function () {
    const session = store.get("session", null);
    store.clear();
    R.seed();
    store.set("session", session);
  };

  if (!store.get("seeded", false)) R.seed();
})(window.App);
