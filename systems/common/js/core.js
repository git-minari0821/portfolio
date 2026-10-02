/* 共通：データ保存・日付・金額・CSV・入力チェック */
window.App = window.App || {};

(function (App) {
  "use strict";

  /* ---------- localStorage（使えない環境ではメモリに保存） ---------- */
  App.createStore = function (namespace) {
    let memory = {};
    const fullKey = (key) => namespace + ":" + key;
    const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

    return {
      get(key, fallback) {
        try {
          const raw = localStorage.getItem(fullKey(key));
          if (raw !== null) return JSON.parse(raw);
        } catch (e) { /* 読めなければメモリの値を使う */ }
        return key in memory ? clone(memory[key]) : fallback;
      },
      set(key, value) {
        memory[key] = clone(value);
        try { localStorage.setItem(fullKey(key), JSON.stringify(value)); } catch (e) { /* 保存できなくても画面は続ける */ }
      },
      clear() {
        memory = {};
        try {
          Object.keys(localStorage)
            .filter((k) => k.indexOf(namespace + ":") === 0)
            .forEach((k) => localStorage.removeItem(k));
        } catch (e) { /* noop */ }
      },
    };
  };

  /* 配列データ（id付きのレコード）を扱う */
  App.createCollection = function (store, key) {
    const all = () => store.get(key, []);
    const save = (rows) => store.set(key, rows);
    return {
      all,
      save,
      get: (id) => all().find((r) => r.id === id) || null,
      insert(record) {
        const rows = all();
        const row = Object.assign({ id: App.uid() }, record);
        rows.push(row);
        save(rows);
        return row;
      },
      update(id, patch) {
        const rows = all();
        const i = rows.findIndex((r) => r.id === id);
        if (i < 0) return null;
        rows[i] = Object.assign({}, rows[i], patch);
        save(rows);
        return rows[i];
      },
      remove(id) {
        save(all().filter((r) => r.id !== id));
      },
    };
  };

  App.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  /* 決まった並びの乱数（サンプルデータを毎回同じにする） */
  App.seededRandom = function (seed) {
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
    };
  };

  /* ---------- 文字列 ---------- */
  App.h = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  App.pad = (n, len) => String(n).padStart(len || 2, "0");

  /* ---------- 日付（YYYY-MM-DD の文字列で扱う） ---------- */
  App.toISODate = function (d) {
    return d.getFullYear() + "-" + App.pad(d.getMonth() + 1) + "-" + App.pad(d.getDate());
  };
  App.parseDate = function (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  App.today = () => App.toISODate(new Date());
  App.addDays = function (iso, days) {
    const d = App.parseDate(iso);
    d.setDate(d.getDate() + days);
    return App.toISODate(d);
  };
  App.addMonths = function (iso, months) {
    const d = App.parseDate(iso);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return App.toISODate(d);
  };
  App.endOfMonth = function (iso) {
    const d = App.parseDate(iso);
    return App.toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };
  App.startOfWeek = function (iso) {
    const d = App.parseDate(iso);
    const diff = (d.getDay() + 6) % 7; // 月曜はじまり
    d.setDate(d.getDate() - diff);
    return App.toISODate(d);
  };
  App.monthKey = (iso) => iso.slice(0, 7);
  App.isValidDate = function (iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false;
    return App.toISODate(App.parseDate(iso)) === iso;
  };
  App.WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  App.fmtDate = function (iso, withWeekday) {
    if (!iso) return "";
    const d = App.parseDate(iso);
    const s = d.getFullYear() + "/" + App.pad(d.getMonth() + 1) + "/" + App.pad(d.getDate());
    return withWeekday ? s + "（" + App.WEEKDAYS[d.getDay()] + "）" : s;
  };
  App.fmtDateJa = function (iso) {
    if (!iso) return "";
    const d = App.parseDate(iso);
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  };

  /* 時刻 "HH:MM" ⇔ 分 */
  App.toMinutes = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };
  App.fromMinutes = (min) => App.pad(Math.floor(min / 60)) + ":" + App.pad(min % 60);

  /* ---------- 数値・金額 ---------- */
  App.num = (n) => Number(n || 0).toLocaleString("ja-JP");
  App.yen = (n) => "¥" + App.num(n);

  /* ---------- CSV ---------- */
  function csvCell(value) {
    const s = String(value == null ? "" : value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* Excel で文字化けしないよう BOM 付き UTF-8 で保存する */
  App.downloadCsv = function (filename, headers, rows) {
    const lines = [headers].concat(rows).map((r) => r.map(csvCell).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  App.parseCsv = function (text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const src = text.replace(/^﻿/, "");
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (quoted) {
        if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  };

  /* ---------- 入力チェック ----------
     rules: { 項目名: [ [チェック関数, メッセージ], ... ] }
     チェック関数が false を返したら、その項目のエラーとする（項目ごとに最初の1件だけ） */
  App.validate = function (values, rules) {
    const errors = {};
    Object.keys(rules).forEach((name) => {
      for (const [check, message] of rules[name]) {
        if (!check(values[name], values)) { errors[name] = message; break; }
      }
    });
    return errors;
  };

  App.rules = {
    required: (v) => String(v == null ? "" : v).trim() !== "",
    maxLen: (n) => (v) => String(v || "").length <= n,
    int: (v) => v === "" || v == null || /^-?\d+$/.test(String(v).trim()),
    min: (n) => (v) => v === "" || v == null || Number(v) >= n,
    max: (n) => (v) => v === "" || v == null || Number(v) <= n,
    date: (v) => !v || App.isValidDate(v),
    tel: (v) => !v || /^0\d{1,4}-\d{1,4}-\d{3,4}$/.test(v),
    email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    zip: (v) => !v || /^\d{3}-\d{4}$/.test(v),
  };
})(window.App);
