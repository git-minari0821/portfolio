/* 在庫・発注管理：データの保存・サンプルデータ・在庫の計算 */
(function (App) {
  "use strict";

  const I = (App.I = {});
  const store = (I.store = App.createStore("demo-inventory"));

  I.suppliers = App.createCollection(store, "suppliers");
  I.products = App.createCollection(store, "products");
  I.movements = App.createCollection(store, "movements");
  I.orders = App.createCollection(store, "orders");

  I.CATEGORIES = ["キッチン雑貨", "器・食器", "文房具", "インテリア", "ファブリック", "アロマ・香り"];
  I.TYPES = {
    in: { label: "入庫", tone: "info" },
    out: { label: "出庫", tone: "accent" },
    adjust: { label: "棚卸調整", tone: "warning" },
  };
  I.ORDER_STATUS = {
    ordered: { label: "発注済み", tone: "warning" },
    received: { label: "入荷済み", tone: "success" },
  };

  I.typeBadge = (t) => App.badge(I.TYPES[t].label, I.TYPES[t].tone);
  I.orderBadge = (s) => App.badge(I.ORDER_STATUS[s].label, I.ORDER_STATUS[s].tone);

  /* 在庫の状態：在庫切れ／要発注（発注点を下回る）／通常 */
  I.stockStatus = function (p) {
    if (p.stock <= 0) return "out";
    if (p.stock < p.reorderPoint) return "low";
    return "ok";
  };
  I.STOCK_STATUS = {
    out: { label: "在庫切れ", tone: "danger" },
    low: { label: "要発注", tone: "warning" },
    ok: { label: "通常", tone: "gray" },
  };
  I.stockBadge = (p) => {
    const s = I.STOCK_STATUS[I.stockStatus(p)];
    return App.badge(s.label, s.tone);
  };

  I.lookup = function () {
    const map = (rows) => rows.reduce((m, r) => { m[r.id] = r; return m; }, {});
    return { products: map(I.products.all()), suppliers: map(I.suppliers.all()) };
  };

  /* 入出庫を記録して在庫数を更新する。在庫がマイナスになる場合はエラー文を返す */
  I.recordMovement = function (m) {
    const p = I.products.get(m.productId);
    if (!p) return "商品が見つかりません";
    const after = p.stock + m.qty;
    if (after < 0) return "在庫が足りません（現在の在庫：" + p.stock + "個）";
    I.products.update(p.id, { stock: after });
    I.movements.insert({ date: m.date, productId: p.id, type: m.type, qty: m.qty, after, note: m.note || "", source: m.source || "manual", createdAt: Date.now() });
    return null;
  };

  /* 発注中（未入荷）の商品IDの一覧 */
  I.pendingProductIds = function () {
    const ids = {};
    I.orders.all().filter((o) => o.status === "ordered").forEach((o) => o.items.forEach((it) => { ids[it.productId] = o.no; }));
    return ids;
  };

  I.nextOrderNo = function (date) {
    const year = date.slice(0, 4);
    const prefix = "PO-" + year + "-";
    const max = I.orders.all().filter((o) => o.no.indexOf(prefix) === 0).reduce((m, o) => Math.max(m, Number(o.no.slice(prefix.length))), 0);
    return prefix + App.pad(max + 1, 4);
  };

  I.orderTotal = (o) => o.items.reduce((s, it) => s + it.qty * it.cost, 0);

  /* 直近 days 日の各日の終わりの在庫数（今の在庫から入出庫をさかのぼって計算） */
  I.stockHistory = function (productId, days) {
    const p = I.products.get(productId);
    if (!p) return [];
    const today = App.today();
    const moves = I.movements.all().filter((m) => m.productId === productId);
    const result = [];
    let stock = p.stock;
    for (let i = 0; i < days; i++) {
      const date = App.addDays(today, -i);
      result.unshift({ date, stock });
      moves.filter((m) => m.date === date).forEach((m) => { stock -= m.qty; });
    }
    return result;
  };

  /* ---------- サンプルデータ ---------- */
  const SUPPLIERS = [
    ["sp1", "そよかぜ木工所", "木村", "000-0000-1001"],
    ["sp2", "ひなた陶房", "日向", "000-0000-1002"],
    ["sp3", "あおば文具卸", "青山", "000-0000-1003"],
    ["sp4", "こはく布物店", "小林", "000-0000-1004"],
    ["sp5", "ゆらぎ香房", "由良", "000-0000-1005"],
    ["sp6", "みなと生活雑貨商事", "港", "000-0000-1006"],
  ];
  // [名前, カテゴリ, 仕入先, 仕入単価, 販売単価, 発注点]
  const PRODUCTS = [
    ["木のバターナイフ", 0, "sp1", 480, 1100, 8], ["くるみのカトラリーセット", 0, "sp1", 1500, 3300, 5], ["ひのきの鍋敷き", 0, "sp1", 600, 1400, 6],
    ["ステンレス計量スプーン", 0, "sp6", 350, 880, 10], ["シリコン保存ふた", 0, "sp6", 400, 990, 10], ["琺瑯ミルクパン", 0, "sp6", 2200, 4400, 4],
    ["白磁のマグカップ", 1, "sp2", 900, 2200, 8], ["藍染め小皿", 1, "sp2", 700, 1650, 10], ["粉引きの飯碗", 1, "sp2", 1100, 2420, 6],
    ["ガラスのタンブラー", 1, "sp6", 650, 1540, 8], ["木の丸トレイ", 1, "sp1", 1300, 2860, 4], ["土鍋（一人用）", 1, "sp2", 2500, 5280, 3],
    ["活版印刷のメモ帳", 2, "sp3", 280, 660, 15], ["真鍮のブックマーク", 2, "sp3", 450, 1100, 8], ["クラフト封筒セット", 2, "sp3", 220, 550, 15],
    ["蝋引きのノート", 2, "sp3", 520, 1210, 10], ["木軸のボールペン", 2, "sp1", 800, 1980, 6], ["和紙の便箋", 2, "sp3", 380, 880, 10],
    ["ドライフラワーのスワッグ", 3, "sp6", 1200, 2750, 4], ["ガラスの一輪挿し", 3, "sp6", 750, 1760, 6], ["木製の壁掛け時計", 3, "sp1", 3200, 6600, 2],
    ["ラタンの小物入れ", 3, "sp6", 900, 2090, 5], ["陶器のアロマポット", 3, "sp2", 1400, 3080, 4], ["真鍮のフック", 3, "sp6", 300, 770, 10],
    ["リネンのキッチンクロス", 4, "sp4", 650, 1540, 10], ["ガーゼのハンカチ", 4, "sp4", 380, 880, 12], ["刺し子の布巾", 4, "sp4", 450, 1100, 10],
    ["帆布のトートバッグ", 4, "sp4", 1500, 3520, 5], ["リネンのエプロン", 4, "sp4", 2000, 4620, 4], ["コットンのランチョンマット", 4, "sp4", 500, 1210, 8],
    ["ひのきのアロマオイル", 5, "sp5", 900, 2200, 6], ["柚子のハンドクリーム", 5, "sp5", 600, 1430, 10], ["お香（白檀）", 5, "sp5", 400, 990, 10],
    ["ソイキャンドル（小）", 5, "sp5", 700, 1650, 8], ["ルームスプレー（森）", 5, "sp5", 850, 1980, 6], ["サシェ（ラベンダー）", 5, "sp5", 350, 880, 10],
    ["竹の歯ブラシ", 0, "sp6", 180, 440, 20], ["蜜蝋ラップ", 0, "sp6", 700, 1650, 8], ["麻の巾着袋", 4, "sp4", 420, 990, 10], ["豆皿セット", 1, "sp2", 1600, 3520, 4],
  ];

  I.seed = function () {
    const rnd = App.seededRandom(20261003);
    const today = App.today();
    const DAYS = 45;
    const suppliers = SUPPLIERS.map(([id, name, contact, tel], i) => ({
      id, name, contact: contact + " 様", tel, email: "supplier0" + (i + 1) + "@example.com", note: "",
    }));
    const products = [];
    const movements = [];
    const move = (p, date, type, qty, note, source) => {
      p.stock += qty;
      movements.push({ id: "mv" + (movements.length + 1), date, productId: p.id, type, qty, after: p.stock, note, source, createdAt: 0 });
    };

    PRODUCTS.forEach((row, i) => {
      const [name, cat, sup, cost, price, rp] = row;
      const no = App.pad(i + 1, 3);
      const p = { id: "p" + no, code: "KM-" + no, name, category: I.CATEGORIES[cat], supplierId: sup, cost, price, reorderPoint: rp, stock: 0, createdAt: App.addDays(today, -DAYS) };
      products.push(p);
      move(p, App.addDays(today, -DAYS), "adjust", rp * 2 + rnd.int(4, 14), "期首在庫", "initial");

      // 在庫切れ（3商品）・要発注（6商品）になるよう、終盤に多めに売れる商品を決めておく
      const target = i % 13 === 4 ? "out" : i % 7 === 2 ? "low" : "ok";
      for (let d = -DAYS + 1; d <= 0; d++) {
        const date = App.addDays(today, d);
        if (rnd.next() < 0.28 && p.stock > 0 && (target === "ok" || d < -2)) {
          const q = Math.min(p.stock, rnd.int(1, 3));
          move(p, date, "out", -q, "店頭販売", "manual");
        }
        if ((target === "ok" || d < -5) && p.stock <= p.reorderPoint && rnd.next() < 0.7) {
          move(p, date, "in", p.reorderPoint * 2, "定期入荷", "manual");
        }
        if (d === -10 && i % 9 === 0 && p.stock > 0) move(p, date, "adjust", -1, "棚卸差異（破損）", "manual");
        if (d === -2 && target !== "ok") {
          const goal = target === "out" ? 0 : Math.max(1, p.reorderPoint - rnd.int(2, 4));
          if (p.stock > goal) move(p, date, "out", goal - p.stock, target === "out" ? "法人向けまとめ販売" : "店頭販売", "manual");
        }
      }
    });

    // 入出庫の並びを日付順に（同じ日は登録順）
    movements.sort((a, b) => a.date.localeCompare(b.date));
    movements.forEach((m, i) => { m.createdAt = i; });

    // 発注：入荷済み2件、発注済み1件
    const orders = [];
    const lowItems = products.filter((p) => p.stock < p.reorderPoint);
    const pending = lowItems.filter((p) => p.supplierId === "sp3").slice(0, 2);
    if (pending.length) {
      orders.push({ id: "o3", no: "PO-" + today.slice(0, 4) + "-0003", date: App.addDays(today, -1), supplierId: "sp3",
        items: pending.map((p) => ({ productId: p.id, qty: p.reorderPoint * 2, cost: p.cost })), status: "ordered", receivedDate: "", note: "" });
    }
    orders.unshift(
      { id: "o1", no: "PO-" + today.slice(0, 4) + "-0001", date: App.addDays(today, -30), supplierId: "sp2",
        items: [{ productId: "p007", qty: 16, cost: 900 }, { productId: "p008", qty: 20, cost: 700 }], status: "received", receivedDate: App.addDays(today, -26), note: "" },
      { id: "o2", no: "PO-" + today.slice(0, 4) + "-0002", date: App.addDays(today, -18), supplierId: "sp4",
        items: [{ productId: "p025", qty: 20, cost: 650 }, { productId: "p026", qty: 24, cost: 380 }], status: "received", receivedDate: App.addDays(today, -15), note: "" }
    );

    store.set("suppliers", suppliers);
    store.set("products", products);
    store.set("movements", movements);
    store.set("orders", orders);
    store.set("seeded", true);
  };

  I.resetData = function () {
    const session = store.get("session", null);
    store.clear();
    I.seed();
    store.set("session", session);
  };

  if (!store.get("seeded", false)) I.seed();
})(window.App);
