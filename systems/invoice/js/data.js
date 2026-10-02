/* 見積書・請求書：データの保存・サンプルデータ・金額計算・採番 */
(function (App) {
  "use strict";

  const V = (App.V = {});
  const store = (V.store = App.createStore("demo-invoice"));

  V.views = {};
  V.clients = App.createCollection(store, "clients");
  V.quotes = App.createCollection(store, "quotes");
  V.invoices = App.createCollection(store, "invoices");
  V.getCompany = () => store.get("company", {});
  V.setCompany = (c) => store.set("company", c);

  V.TERMS = {
    end_next: "月末締め翌月末払い",
    end_next2: "月末締め翌々月末払い",
    d30: "請求日から30日以内",
  };
  V.QUOTE_STATUS = {
    draft: { label: "下書き", tone: "gray" },
    sent: { label: "提出済み", tone: "info" },
    invoiced: { label: "請求書に変換済み", tone: "success" },
  };
  V.INVOICE_STATUS = {
    draft: { label: "下書き", tone: "gray" },
    issued: { label: "発行済み", tone: "info" },
    paid: { label: "入金済み", tone: "success" },
  };
  V.RATES = [10, 8];

  V.quoteBadge = (s) => App.badge(V.QUOTE_STATUS[s].label, V.QUOTE_STATUS[s].tone);
  V.invoiceBadge = (inv) => {
    if (V.isOverdue(inv)) return App.badge("支払期限超過", "danger");
    return App.badge(V.INVOICE_STATUS[inv.status].label, V.INVOICE_STATUS[inv.status].tone);
  };
  V.isOverdue = (inv) => inv.status === "issued" && inv.dueDate < App.today();

  /* 支払条件から支払期限を決める */
  V.dueDateFor = function (term, date) {
    if (term === "end_next2") return App.endOfMonth(App.addMonths(date.slice(0, 8) + "01", 2));
    if (term === "d30") return App.addDays(date, 30);
    return App.endOfMonth(App.addMonths(date.slice(0, 8) + "01", 1));
  };

  /* 明細の金額計算。消費税は「税率ごとに合計してから」1回だけ端数処理（切り捨て） */
  V.lineAmount = (it) => Math.floor(Number(it.qty) * Number(it.price));
  V.calc = function (items) {
    const byRate = {};
    V.RATES.forEach((r) => { byRate[r] = { base: 0, tax: 0 }; });
    (items || []).forEach((it) => {
      const rate = Number(it.rate) === 8 ? 8 : 10;
      byRate[rate].base += V.lineAmount(it);
    });
    let subtotal = 0, tax = 0;
    V.RATES.forEach((r) => {
      byRate[r].tax = Math.floor((byRate[r].base * r) / 100);
      subtotal += byRate[r].base;
      tax += byRate[r].tax;
    });
    return { byRate, subtotal, tax, total: subtotal + tax };
  };

  /* 書類番号の採番：Q-2026-0001 / I-2026-0001（年ごとに連番） */
  V.nextNo = function (kind, date) {
    const col = kind === "Q" ? V.quotes : V.invoices;
    const prefix = kind + "-" + date.slice(0, 4) + "-";
    const max = col.all().filter((d) => d.no.indexOf(prefix) === 0).reduce((m, d) => Math.max(m, Number(d.no.slice(prefix.length)) || 0), 0);
    return prefix + App.pad(max + 1, 4);
  };

  V.clientName = (c) => (c ? c.name + " " + c.honorific : "（削除された取引先）");

  /* ---------- サンプルデータ ---------- */
  const CLIENTS = [
    ["株式会社そらまめ商店", "御中", "営業部 田中", "end_next"],
    ["合同会社つきあかり", "御中", "代表 月岡", "end_next"],
    ["ことのは書房株式会社", "御中", "編集部 言野", "end_next2"],
    ["有限会社しろくま製菓", "御中", "企画室 白川", "end_next"],
    ["株式会社ほしぞら不動産", "御中", "総務課 星", "d30"],
    ["まるいち工務店株式会社", "御中", "丸井", "end_next"],
    ["株式会社ゆうなぎ珈琲", "御中", "店舗運営部 夕凪", "end_next"],
    ["こもれび雑貨店", "御中", "店長 木漏", "d30"],
    ["ととのい整体院", "御中", "院長 森川", "d30"],
    ["一般社団法人あおぞら子育てネット", "御中", "事務局 青空", "end_next2"],
    ["野々宮 さくら", "様", "", "d30"],
    ["株式会社みちしるべ観光", "御中", "広報担当 道", "end_next"],
  ];
  const PROJECTS = [
    { title: "コーポレートサイト リニューアル", items: [["トップページ デザイン・コーディング", 1, "式", 180000, 10], ["下層ページ制作", 6, "ページ", 35000, 10], ["お問い合わせフォーム設置", 1, "式", 40000, 10]] },
    { title: "ロゴ・名刺デザイン", items: [["ロゴデザイン（3案・修正2回）", 1, "式", 120000, 10], ["名刺デザイン", 2, "名分", 8000, 10]] },
    { title: "新商品パッケージデザイン", items: [["パッケージデザイン", 1, "式", 150000, 10], ["撮影用 焼き菓子（試作品）", 20, "個", 350, 8], ["商品撮影", 1, "式", 60000, 10]] },
    { title: "店舗チラシ・ポスター制作", items: [["チラシデザイン（A4両面）", 1, "式", 55000, 10], ["ポスターデザイン（B2）", 1, "式", 45000, 10]] },
    { title: "採用ページ制作", items: [["採用ページ デザイン・コーディング", 1, "式", 220000, 10], ["社員インタビュー 取材・原稿", 2, "名分", 30000, 10]] },
    { title: "イベント告知バナー制作", items: [["Webバナー制作", 4, "点", 12000, 10], ["SNS投稿用画像", 6, "点", 6000, 10]] },
    { title: "会報誌デザイン（秋号）", items: [["会報誌デザイン（8ページ）", 1, "式", 96000, 10], ["表紙イラスト", 1, "点", 30000, 10]] },
  ];

  V.seed = function () {
    const rnd = App.seededRandom(20261003);
    const today = App.today();
    const company = {
      name: "ひだまりデザイン事務所",
      person: "代表 日溜 ひかり",
      zip: "000-0000",
      address: "〇〇県〇〇市ひだまり町1-2-3 ひだまりビル3F",
      tel: "000-0000-0000",
      email: "info@example.com",
      invoiceNo: "T0000000000001",
      bank: "〇〇銀行 〇〇支店 普通 0000000\nヒダマリデザインジムショ",
    };
    const clients = CLIENTS.map(([name, honorific, person, terms], i) => ({
      id: "cl" + App.pad(i + 1),
      name, honorific, person, terms,
      zip: "000-000" + (i % 10),
      address: "〇〇県〇〇市〇〇町" + (i + 1) + "-" + ((i * 3) % 9 + 1),
      email: "client" + App.pad(i + 1) + "@example.com",
      tel: "000-0000-" + App.pad(2001 + i, 4),
    }));
    const mkItems = (p) => p.items.map(([name, qty, unit, price, rate]) => ({ id: App.uid(), name, qty, unit, price, rate }));

    const quotes = [];
    const invoices = [];
    const counters = {};
    const no = (kind, date) => {
      const key = kind + date.slice(0, 4);
      counters[key] = (counters[key] || 0) + 1;
      return kind + "-" + date.slice(0, 4) + "-" + App.pad(counters[key], 4);
    };

    // 毎月の保守費用（4社 × 6か月）
    const maintenance = [["cl01", 30000], ["cl05", 20000], ["cl07", 15000], ["cl12", 25000]];
    const events = [];
    for (let m = -5; m <= 0; m++) {
      const date = App.endOfMonth(App.addMonths(today.slice(0, 8) + "01", m));
      maintenance.forEach(([cid, price]) => events.push({ type: "maint", date: m === 0 ? today : date, cid, price }));
    }
    // 制作案件（見積 → 請求）
    for (let k = 0; k < 14; k++) {
      const qDate = App.addDays(today, -rnd.int(5, 170));
      events.push({ type: "project", date: qDate, cid: "cl" + App.pad(rnd.int(1, 12)), project: PROJECTS[k % PROJECTS.length] });
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    events.forEach((ev) => {
      const client = clients.find((c) => c.id === ev.cid);
      if (ev.type === "maint") {
        const inv = {
          id: App.uid(), no: no("I", ev.date), date: ev.date, clientId: ev.cid, title: "Webサイト保守費用（" + Number(ev.date.slice(5, 7)) + "月分）",
          items: [{ id: App.uid(), name: "Webサイト保守・更新作業（月額）", qty: 1, unit: "式", price: ev.price, rate: 10 }],
          dueDate: V.dueDateFor(client.terms, ev.date), note: "", quoteId: "", status: "issued", paidDate: "",
        };
        invoices.push(inv);
        return;
      }
      const q = {
        id: App.uid(), no: no("Q", ev.date), date: ev.date, clientId: ev.cid, title: ev.project.title,
        items: mkItems(ev.project), validUntil: App.addDays(ev.date, 30), note: "お見積りの有効期限内にご連絡ください。", status: "sent",
      };
      quotes.push(q);
      const invDate = App.addDays(ev.date, rnd.int(20, 45));
      if (invDate <= today && rnd.next() < 0.75) {
        q.status = "invoiced";
        invoices.push({
          id: App.uid(), no: "", date: invDate, clientId: ev.cid, title: ev.project.title, items: mkItems(ev.project),
          dueDate: V.dueDateFor(client.terms, invDate), note: "", quoteId: q.id, status: "issued", paidDate: "",
        });
      } else if (rnd.next() < 0.3) q.status = "draft";
    });

    // 請求書の番号は日付順に振り直し、期限を過ぎたものは入金済みにする（一部は未入金のまま）
    invoices.sort((a, b) => a.date.localeCompare(b.date));
    const invCounters = {};
    invoices.forEach((inv, i) => {
      const y = inv.date.slice(0, 4);
      invCounters[y] = (invCounters[y] || 0) + 1;
      inv.no = "I-" + y + "-" + App.pad(invCounters[y], 4);
      if (inv.dueDate < today) {
        if (i % 9 === 4 || i % 11 === 7) inv.status = "issued"; // 支払期限超過のサンプル
        else { inv.status = "paid"; inv.paidDate = App.addDays(inv.dueDate, -rnd.int(0, 10)); }
      }
    });
    // 今日付けの請求書のうち1件は下書きにしておく
    const todays = invoices.filter((x) => x.date === today);
    if (todays.length) todays[todays.length - 1].status = "draft";

    store.set("company", company);
    store.set("clients", clients);
    store.set("quotes", quotes);
    store.set("invoices", invoices);
    store.set("seeded", true);
  };

  V.resetData = function () {
    const session = store.get("session", null);
    store.clear();
    V.seed();
    store.set("session", session);
  };

  if (!store.get("seeded", false)) V.seed();
})(window.App);
