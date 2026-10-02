/* 共通：一覧表（検索・絞り込み・並べ替え・ページ送り） */
(function (App) {
  "use strict";
  const h = App.h;

  /*
    opts = {
      el,                     表を描画する要素
      columns: [{ key, label, value(row), render(row), sortable, align }],
      rows: () => 配列,
      search: (row) => 検索対象の文字列,  searchPlaceholder,
      filters: [{ name, label, type: "select" | "date", options, value, test(row, value) }],
      sort: { key, dir: "asc" | "desc" },
      pageSize: 20,
      onRowClick(row), onAction(action, row), rowClass(row), emptyText
    }
  */
  App.DataTable = function (opts) {
    const pageSize = opts.pageSize || 20;
    const filters = opts.filters || [];
    const state = {
      q: "",
      filters: {},
      sortKey: opts.sort ? opts.sort.key : null,
      sortDir: opts.sort ? opts.sort.dir : "asc",
      page: 1,
    };
    filters.forEach((f) => { state.filters[f.name] = f.value || ""; });

    const colValue = (col, row) => (col.value ? col.value(row) : row[col.key]);

    function getRows() {
      const q = state.q.toLowerCase();
      let rows = opts.rows().filter((row) => {
        if (q && opts.search && opts.search(row).toLowerCase().indexOf(q) < 0) return false;
        return filters.every((f) => {
          const v = state.filters[f.name];
          return v === "" || v == null || f.test(row, v);
        });
      });
      const col = opts.columns.find((c) => c.key === state.sortKey);
      if (col) {
        const dir = state.sortDir === "desc" ? -1 : 1;
        rows = rows.slice().sort((a, b) => {
          const va = colValue(col, a);
          const vb = colValue(col, b);
          if (va == null || va === "") return 1;
          if (vb == null || vb === "") return -1;
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb), "ja") * dir;
        });
      }
      return rows;
    }

    /* ---------- ツールバー（1回だけ描画して、入力中のフォーカスを保つ） ---------- */
    const searchId = "q-" + App.uid();
    opts.el.innerHTML =
      '<div class="table-toolbar">' +
      (opts.search
        ? '<div class="tool-field tool-search"><label for="' + searchId + '" class="visually-hidden">検索</label>' +
          '<input id="' + searchId + '" type="search" placeholder="' + h(opts.searchPlaceholder || "キーワードで検索") + '"></div>'
        : "") +
      filters.map((f) => {
        const id = "flt-" + f.name + "-" + App.uid();
        const control = f.type === "date"
          ? '<input id="' + id + '" type="date" data-filter="' + f.name + '" value="' + h(state.filters[f.name]) + '">'
          : '<select id="' + id + '" data-filter="' + f.name + '"><option value="">すべて</option>' +
            f.options.map((o) => '<option value="' + h(o.value) + '"' + (String(o.value) === String(state.filters[f.name]) ? " selected" : "") + ">" + h(o.label) + "</option>").join("") +
            "</select>";
        return '<div class="tool-field"><label for="' + id + '">' + h(f.label) + "</label>" + control + "</div>";
      }).join("") +
      "</div>" +
      '<p class="table-meta" aria-live="polite"></p>' +
      '<div class="table-wrap"><table class="data"><thead></thead><tbody></tbody></table></div>' +
      '<nav class="pager" aria-label="ページ送り"></nav>';

    const thead = opts.el.querySelector("thead");
    const tbody = opts.el.querySelector("tbody");
    const meta = opts.el.querySelector(".table-meta");
    const pager = opts.el.querySelector(".pager");

    const searchInput = opts.el.querySelector("#" + searchId);
    if (searchInput) {
      searchInput.addEventListener("input", () => { state.q = searchInput.value.trim(); state.page = 1; refresh(); });
    }
    opts.el.querySelectorAll("[data-filter]").forEach((el) => {
      el.addEventListener("change", () => { state.filters[el.dataset.filter] = el.value; state.page = 1; refresh(); });
    });

    thead.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sort]");
      if (!btn) return;
      const key = btn.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else { state.sortKey = key; state.sortDir = "asc"; }
      refresh();
    });

    function findRow(tr) {
      return opts.rows().find((r) => String(r.id) === tr.dataset.id);
    }
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) { if (opts.onAction) opts.onAction(actionBtn.dataset.action, findRow(tr)); return; }
      if (e.target.closest("a, button, input, select")) return;
      if (opts.onRowClick) opts.onRowClick(findRow(tr));
    });
    tbody.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target.tagName !== "TR") return;
      if (opts.onRowClick) opts.onRowClick(findRow(e.target));
    });
    pager.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      refresh();
      opts.el.scrollIntoView({ block: "start", behavior: "smooth" });
    });

    function refresh() {
      const rows = getRows();
      const pages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (state.page > pages) state.page = pages;
      const start = (state.page - 1) * pageSize;
      const pageRows = rows.slice(start, start + pageSize);

      thead.innerHTML = "<tr>" + opts.columns.map((c) => {
        const align = c.align ? ' class="ta-' + c.align + '"' : "";
        if (c.sortable === false) return "<th" + align + ' scope="col">' + h(c.label) + "</th>";
        const active = state.sortKey === c.key;
        const ariaSort = active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none";
        const mark = active ? (state.sortDir === "asc" ? "▲" : "▼") : "↕";
        return "<th" + align + ' scope="col" aria-sort="' + ariaSort + '"><button type="button" class="sort-btn' + (active ? " is-active" : "") + '" data-sort="' + c.key + '">' +
          h(c.label) + '<span class="sort-mark" aria-hidden="true">' + mark + "</span></button></th>";
      }).join("") + "</tr>";

      if (!pageRows.length) {
        tbody.innerHTML = '<tr><td colspan="' + opts.columns.length + '" class="empty-cell">' + h(opts.emptyText || "該当するデータがありません") + "</td></tr>";
      } else {
        tbody.innerHTML = pageRows.map((row) => {
          const cls = (opts.rowClass ? opts.rowClass(row) : "") + (opts.onRowClick ? " is-clickable" : "");
          return '<tr data-id="' + h(row.id) + '" class="' + cls + '"' + (opts.onRowClick ? ' tabindex="0"' : "") + ">" +
            opts.columns.map((c) => {
              const v = c.render ? c.render(row) : h(colValue(c, row));
              return "<td" + (c.align ? ' class="ta-' + c.align + '"' : "") + ' data-label="' + h(c.label) + '">' + v + "</td>";
            }).join("") + "</tr>";
        }).join("");
      }

      meta.textContent = rows.length ? "全" + rows.length + "件中 " + (start + 1) + "〜" + Math.min(start + pageSize, rows.length) + "件を表示" : "0件";

      if (pages <= 1) { pager.innerHTML = ""; return; }
      let html = '<button type="button" class="pager-btn" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? " disabled" : "") + ' aria-label="前のページ">‹</button>';
      for (let p = 1; p <= pages; p++) {
        if (pages > 7 && p !== 1 && p !== pages && Math.abs(p - state.page) > 1) {
          if (p === 2 || p === pages - 1) html += '<span class="pager-gap">…</span>';
          continue;
        }
        html += '<button type="button" class="pager-btn' + (p === state.page ? " is-current" : "") + '" data-page="' + p + '"' + (p === state.page ? ' aria-current="page"' : "") + ">" + p + "</button>";
      }
      html += '<button type="button" class="pager-btn" data-page="' + (state.page + 1) + '"' + (state.page === pages ? " disabled" : "") + ' aria-label="次のページ">›</button>';
      pager.innerHTML = html;
    }

    refresh();
    return { refresh, getRows, state };
  };
})(window.App);
