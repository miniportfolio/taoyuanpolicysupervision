/* 讀取試算表：每個分頁 → 物件陣列（以第 1 列欄名為 key） */
(function () {
  "use strict";
  var TABS = ["局處", "官員", "任職", "政策", "政策局處", "進度", "議員", "質詢"];

  // RFC 4180 CSV 解析（支援引號、逗號、換行）
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, i = 0, c;
    text = text.replace(/^﻿/, "");
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); rows.push(row); row = []; f = "";
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, j) { if (h) o[h] = (r[j] || "").trim(); });
      return o;
    }).filter(function (o) { return o[head[0]]; });   // 第一欄（代碼）空白的列略過
  }

  var DEMO = /[?&]demo=1/.test(location.search);
  function urlFor(tab, cfg) {
    if (cfg.sheetId && !DEMO) {
      return "https://docs.google.com/spreadsheets/d/" + cfg.sheetId +
        "/gviz/tq?tqx=out:csv&headers=1&sheet=" + encodeURIComponent(tab);
    }
    return "data/demo/" + encodeURIComponent(tab) + ".csv";
  }

  function loadAll(cfg) {
    return Promise.all(TABS.map(function (t) {
      return fetch(urlFor(t, cfg), { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error(t + "：HTTP " + r.status);
        return r.text();
      }).then(function (txt) {
        if (/^\s*</.test(txt)) throw new Error(t + "：讀到的不是表格，請確認試算表已設為「知道連結的任何人都能檢視」");
        return [t, toObjects(parseCSV(txt))];
      });
    })).then(function (pairs) {
      var raw = {};
      pairs.forEach(function (p) { raw[p[0]] = p[1]; });
      return build(raw, !cfg.sheetId || DEMO);
    });
  }

  // 建立索引與關聯
  function build(T, demo) {
    var by = function (arr, k) { var m = {}; arr.forEach(function (o) { m[o[k]] = o; }); return m; };
    var D = {
      demo: demo, T: T,
      agency: by(T["局處"], "局處ID"), person: by(T["官員"], "人物ID"),
      policy: by(T["政策"], "政策ID"), councillor: by(T["議員"], "議員ID")
    };
    var byDateDesc = function (k) { return function (a, b) { return (b[k] || "").localeCompare(a[k] || ""); }; };

    T["任職"].sort(byDateDesc("到任日"));
    T["進度"].sort(byDateDesc("日期"));
    T["質詢"].sort(byDateDesc("日期"));

    // 局處：下屬、任職、參與政策、進度、被質詢
    T["局處"].forEach(function (a) { a._children = []; a._tenures = []; a._policies = []; a._steps = []; a._qs = []; });
    T["局處"].forEach(function (a) { var p = D.agency[a["上級局處ID"]]; if (p) p._children.push(a); });
    T["官員"].forEach(function (p) { p._tenures = []; p._qs = []; });
    T["任職"].forEach(function (t) {
      t._current = !t["卸任日"];
      var a = D.agency[t["局處ID"]], p = D.person[t["人物ID"]];
      if (a) a._tenures.push(t);
      if (p) p._tenures.push(t);
    });
    // 政策
    T["政策"].forEach(function (p) { p._agencies = []; p._steps = []; p._qs = []; });
    T["政策局處"].forEach(function (r) {
      var p = D.policy[r["政策ID"]], a = D.agency[r["局處ID"]];
      if (p) p._agencies.push(r);
      if (a) a._policies.push(r);
    });
    T["進度"].forEach(function (s) {
      var p = D.policy[s["政策ID"]], a = D.agency[s["局處ID"]];
      if (p) p._steps.push(s);
      if (a) a._steps.push(s);
    });
    // 議員與質詢
    T["議員"].forEach(function (c) { c._qs = []; });
    T["質詢"].forEach(function (q) {
      q._policies = (q["相關政策ID"] || "").split(/[,，、\s]+/).filter(Boolean);
      q._tags = (q["標籤"] || "").split(/[,，、\s]+/).filter(Boolean);
      var c = D.councillor[q["議員ID"]], p = D.person[q["答詢人物ID"]], a = D.agency[q["答詢局處ID"]];
      if (c) c._qs.push(q);
      if (p) p._qs.push(q);
      if (a) a._qs.push(q);
      q._policies.forEach(function (id) { if (D.policy[id]) D.policy[id]._qs.push(q); });
    });
    // 某人在某日期擔任的職位（質詢時的頭銜）
    D.roleAt = function (personId, date) {
      var p = D.person[personId]; if (!p) return null;
      return p._tenures.find(function (t) {
        return (!t["到任日"] || t["到任日"] <= date) && (!t["卸任日"] || t["卸任日"] >= date);
      }) || p._tenures[0] || null;
    };
    D.head = function (agencyId) {
      var a = D.agency[agencyId]; if (!a) return null;
      return a._tenures.find(function (t) { return t._current; }) || null;
    };
    return D;
  }

  window.TWData = { loadAll: loadAll, parseCSV: parseCSV };
})();
