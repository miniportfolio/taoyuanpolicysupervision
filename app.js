/* 桃園市政監督：前台（hash 路由，無框架） */
(function () {
  "use strict";
  var CFG = window.TW_CONFIG || {}, D = null;
  var $main = document.getElementById("main");

  // ---------- 小工具 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function link(href, text) { return '<a href="' + href + '">' + esc(text) + "</a>"; }
  function src(u, label) {
    var s = safeUrl(u);
    return s ? '<a class="src" href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(label || "出處") + " ↗</a>" : "";
  }
  var STATUS = ["未啟動", "規劃中", "進行中", "已完成", "部分完成／調整"];
  function statusPill(s) {
    var i = STATUS.indexOf(s);
    return '<span class="pill st' + (i < 0 ? "x" : i) + '">' + esc(s || "未填") + "</span>";
  }
  function srcType(t) {
    return t ? '<span class="tag ' + (t === "選舉公報" ? "gz" : t === "競選期間說法" ? "cm" : "nw") + '">' + esc(t) + "</span>" : "";
  }
  function agencyName(id) { var a = D.agency[id]; return a ? a["名稱"] : id; }
  function agencyLink(id) { return D.agency[id] ? link("#/agency/" + id, agencyName(id)) : esc(id); }
  function personLink(id) { var p = D.person[id]; return p ? link("#/person/" + id, p["姓名"]) : esc(id); }
  function policyLink(id) { var p = D.policy[id]; return p ? link("#/policy/" + id, p["政策名稱"]) : esc(id); }
  function cllrLink(id) { var c = D.councillor[id]; return c ? link("#/councillor/" + id, c["姓名"]) : esc(id); }
  function empty(msg) { return '<p class="empty">' + esc(msg) + "</p>"; }
  function videoLink(q) {
    var u = safeUrl(q["影片網址"]); if (!u) return q["開始時間"] ? '<span class="muted">' + esc(q["開始時間"]) + "</span>" : "";
    var t = q["開始時間"] || "", sec = t.split(":").reduce(function (a, b) { return a * 60 + (+b || 0); }, 0);
    if (sec && /youtu\.?be/.test(u)) u += (u.indexOf("?") < 0 ? "?" : "&") + "t=" + sec;
    return '<a class="src" href="' + esc(u) + '" target="_blank" rel="noopener">▶ 影片' + (t ? " " + esc(t) : "") + "</a>";
  }

  // 質詢卡片（各頁共用）
  function qCard(q, hide) {
    hide = hide || {};
    var role = D.roleAt(q["答詢人物ID"], q["日期"]);
    var who = [];
    if (!hide.cllr) who.push('<b>' + cllrLink(q["議員ID"]) + "</b> 質詢");
    if (!hide.person && q["答詢人物ID"]) who.push("答詢：" + personLink(q["答詢人物ID"]) + (role ? "（" + esc(agencyName(role["局處ID"]) + role["職稱"]) + "）" : ""));
    else if (!hide.agency && q["答詢局處ID"]) who.push("答詢：" + agencyLink(q["答詢局處ID"]));
    var pol = q._policies.length ? '<div class="rel">相關政策：' + q._policies.map(policyLink).join("、") + "</div>" : "";
    return '<li class="q"><div class="qh"><time>' + esc(q["日期"]) + "</time> " + esc(q["會議"] || "") +
      (q["主題"] ? ' · <b>' + esc(q["主題"]) + "</b>" : "") + "</div>" +
      '<div class="who">' + who.join("　") + "</div>" +
      (q["摘要"] ? "<p>" + esc(q["摘要"]) + "</p>" : "") + pol +
      '<div class="meta">' + q._tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + videoLink(q) + "</div></li>";
  }
  function qList(arr, hide) { return arr.length ? '<ul class="qs">' + arr.map(function (q) { return qCard(q, hide); }).join("") + "</ul>" : empty("目前沒有相關質詢紀錄。"); }

  // 進度時間軸
  function steps(arr, showPolicy) {
    if (!arr.length) return empty("還沒有公開進度紀錄。");
    return '<ol class="tl">' + arr.map(function (s) {
      return "<li><time>" + esc(s["日期"]) + '</time><div><span class="tag step">' + esc(s["環節"] || "其他") + "</span>" +
        (showPolicy ? " " + policyLink(s["政策ID"]) : "") +
        (s["局處ID"] ? ' <span class="muted">主管機關：</span>' + agencyLink(s["局處ID"]) : "") +
        (s["狀態變更為"] ? " → " + statusPill(s["狀態變更為"]) : "") +
        (s["說明"] ? "<p>" + esc(s["說明"]) + "</p>" : "") + src(s["出處網址"]) + "</div></li>";
    }).join("") + "</ol>";
  }

  // ---------- 頁面 ----------
  var R = {};

  R.home = function () {
    var P = D.T["政策"], cnt = {};
    STATUS.forEach(function (s) { cnt[s] = 0; });
    P.forEach(function (p) { if (cnt[p["目前狀態"]] != null) cnt[p["目前狀態"]]++; });
    var total = P.length || 1;
    var bar = STATUS.map(function (s, i) {
      return cnt[s] ? '<span class="seg st' + i + '" style="flex:' + cnt[s] + '" title="' + s + " " + cnt[s] + '"></span>' : "";
    }).join("");
    var legend = STATUS.map(function (s, i) {
      return '<a class="lg" href="#/policies?st=' + encodeURIComponent(s) + '"><span class="dot st' + i + '"></span>' + s + " <b>" + cnt[s] + "</b></a>";
    }).join("");
    var gz = P.filter(function (p) { return p["來源類型"] === "選舉公報"; }).length;
    return '<section class="hero"><h1>' + esc(CFG.siteName || "桃園市政監督") + "</h1>" +
      "<p>追蹤" + (CFG.mayor ? "桃園市長 <b>" + esc(CFG.mayor) + "</b>" : "桃園市長") + "的政見執行進度，以及市議員在議會的質詢表現。所有內容都附公開出處。</p>" +
      '<p class="stance">站長公開支持民進黨，但對所有政黨用同一套標準檢驗。' + link("#/about", "立場與規則") + "</p></section>" +
      '<section class="card"><h2>政見進度 <small>' + P.length + " 項（選舉公報 " + gz + " 項）</small></h2>" +
      '<div class="bar">' + bar + '</div><div class="legend">' + legend + "</div>" +
      '<a class="more" href="#/policies">看全部政見 →</a></section>' +
      '<div class="grid2"><section class="card"><h2>最新進度</h2>' + steps(D.T["進度"].slice(0, 5), true) + '<a class="more" href="#/policies">更多 →</a></section>' +
      '<section class="card"><h2>最新質詢</h2>' + qList(D.T["質詢"].slice(0, 5)) + '<a class="more" href="#/questions">更多 →</a></section></div>' +
      '<div class="grid3">' +
      '<a class="tile" href="#/agencies"><b>' + D.T["局處"].length + "</b><span>局處與職掌</span></a>" +
      '<a class="tile" href="#/councillors"><b>' + D.T["議員"].length + "</b><span>市議員</span></a>" +
      '<a class="tile" href="#/questions"><b>' + D.T["質詢"].length + "</b><span>質詢紀錄</span></a></div>";
  };

  R.policies = function (q) {
    var st = q.st || "", ty = q.ty || "", cat = q.cat || "";
    var cats = []; D.T["政策"].forEach(function (p) { if ((p["領域"] || p["類別"]) && cats.indexOf((p["領域"] || p["類別"])) < 0) cats.push((p["領域"] || p["類別"])); });
    var list = D.T["政策"].filter(function (p) {
      return (!st || p["目前狀態"] === st) && (!ty || p["來源類型"] === ty) && (!cat || (p["領域"] || p["類別"]) === cat);
    });
    function chips(key, vals, cur) {
      return ['<a class="chip' + (cur ? "" : " on") + '" href="' + qs(q, key, "") + '">全部</a>'].concat(vals.map(function (v) {
        return '<a class="chip' + (cur === v ? " on" : "") + '" href="' + qs(q, key, v) + '">' + esc(v) + "</a>";
      })).join("");
    }
    return "<h1>政見追蹤</h1>" + subtabs(PO_TABS, "#/policies") +
      '<div class="filters"><div><span>來源</span>' + chips("ty", ["選舉公報", "競選期間說法", "就職後新增"], ty) + "</div>" +
      "<div><span>狀態</span>" + chips("st", STATUS, st) + "</div>" +
      (cats.length ? "<div><span>領域</span>" + chips("cat", cats, cat) + "</div>" : "") + "</div>" +
      '<p class="muted">' + list.length + " 項</p>" +
      (list.length ? '<ul class="cards">' + list.map(function (p) {
        var last = p._steps[0], lead = p._agencies.filter(function (r) { return r["角色"] === "主責"; })[0];
        return '<li><a class="pc" href="#/policy/' + esc(p["政策ID"]) + '"><div class="top">' + statusPill(p["目前狀態"]) + srcType(p["來源類型"]) +
          (p["需中央配合"] === "是" ? '<span class="tag cen">需中央配合</span>' : "") + "</div>" +
          "<h3>" + esc(p["政策名稱"]) + "</h3>" +
          '<div class="muted">' + (lead ? "主責：" + esc(agencyName(lead["局處ID"])) : "尚未標註主責局處") +
          (last ? "　最新：" + esc(last["環節"]) + "（" + esc(last["日期"]) + "）" : "") + "</div></a></li>";
      }).join("") + "</ul>" : empty("沒有符合條件的政見。"));
  };

  R.policy = function (id) {
    var p = D.policy[id]; if (!p) return notFound();
    var last = p._steps[0];
    var roles = ["主責", "協辦", "需中央配合"];
    var ag = roles.map(function (r) {
      var rows = p._agencies.filter(function (x) { return x["角色"] === r; });
      return rows.length ? "<li><b>" + r + "</b>　" + rows.map(function (x) {
        var h = D.head(x["局處ID"]);
        return agencyLink(x["局處ID"]) + (h ? '<span class="muted">（' + esc(h["職稱"]) + " " + personLink(h["人物ID"]) + "）</span>" : "") +
          (x["依據說明"] ? '<div class="why">' + esc(x["依據說明"]) + " " + src(x["出處網址"]) + "</div>" : "");
      }).join("") + "</li>" : "";
    }).join("");
    return '<nav class="crumb">' + link("#/policies", "政見追蹤") + " / " + esc(p["政策ID"]) + "</nav>" +
      "<h1>" + esc(p["政策名稱"]) + "</h1>" +
      '<div class="top">' + statusPill(p["目前狀態"]) + srcType(p["來源類型"]) + ((p["領域"] || p["類別"]) ? '<span class="tag">' + esc((p["領域"] || p["類別"])) + "</span>" : "") +
      (p["需中央配合"] === "是" ? '<span class="tag cen">需中央配合</span>' : "") +
      (p["狀態更新日"] ? '<span class="muted">狀態更新：' + esc(p["狀態更新日"]) + "</span>" : "") + "</div>" +
      (p["原文"] ? '<blockquote class="' + (p["來源類型"] === "選舉公報" ? "gz" : "cm") + '">' + esc(p["原文"]) +
        "<footer>" + esc(p["市長"] || "") + "・" + esc(p["來源類型"] || "") + " " + src(p["出處網址"]) + "</footer></blockquote>" : "") +
      '<section class="card"><h2>目前停在哪裡</h2>' + (last ?
        '<p class="now"><span class="tag step">' + esc(last["環節"]) + "</span>" + (last["局處ID"] ? " 主管機關：" + agencyLink(last["局處ID"]) : "") +
        '　<span class="muted">最後一筆公開紀錄：' + esc(last["日期"]) + "</span></p>" +
        '<p class="fine">依公開資料標示最新的環節與主管機關；停在某環節不等於該局處有責任，原因以有出處的說明為準。</p>'
        : empty("還沒有公開進度紀錄。")) + "</section>" +
      '<section class="card"><h2>參與的局處</h2>' + (ag ? '<ul class="roles">' + ag + "</ul>" : empty("尚未標註負責局處。")) + "</section>" +
      '<section class="card"><h2>進度紀錄</h2>' + steps(p._steps) + "</section>" +
      '<section class="card"><h2>議會質詢</h2>' + qList(p._qs) + "</section>" +
      (p["備註"] ? '<p class="fine">備註：' + esc(p["備註"]) + "</p>" : "");
  };

  R.agencies = function () {
    var ROOT = "D000", root = D.agency[ROOT];
    var L = [["一級機關", "一級機關"], ["區公所", "區公所"], ["其他", "事業機構與行政法人"], ["中央機關", "中央機關"]];
    // 二級機關收在上級卡片裡；其餘依層級分組
    var list = D.T["局處"].filter(function (a) { return a["局處ID"] !== ROOT && a["層級"] !== "二級機關"; });
    function card(a) {
      var h = D.head(a["局處ID"]);
      var kids = a._children.filter(function (c) { return c["層級"] === "二級機關"; });
      return '<li><a href="#/agency/' + esc(a["局處ID"]) + '"><b>' + esc(a["名稱"]) + "</b>" +
        '<span class="muted">' + (h ? esc(h["職稱"]) + " " + esc((D.person[h["人物ID"]] || {})["姓名"] || "") : "") + "</span>" +
        "<p>" + esc(a["職掌摘要"]) + "</p>" +
        (kids.length ? '<div class="sub">下屬：' + kids.map(function (c) { return esc(c["名稱"]); }).join("、") + "</div>" : "") +
        "</a></li>";
    }
    var top = "";
    if (root) {
      var h = D.head(ROOT);
      top = '<a class="rootcard" href="#/agency/' + ROOT + '"><b>' + esc(root["名稱"]) + "</b>" +
        (h ? '<span class="muted">' + esc(h["職稱"]) + " " + esc((D.person[h["人物ID"]] || {})["姓名"] || "") + "</span>" : "") +
        "<p>" + esc(root["職掌摘要"]) + "</p></a>";
    }
    return "<h1>局處與職掌</h1>" + subtabs(AG_TABS, "#/agencies") + "<p class=\"muted\">點進局處可看職掌、歷任首長、負責的政見與被質詢紀錄。</p>" + top +
      L.map(function (g) {
        var arr = list.filter(function (a) { return (a["層級"] || "其他") === g[0]; });
        return arr.length ? "<h2>" + g[1] + ' <small>' + arr.length + '</small></h2><ul class="ags">' + arr.map(card).join("") + "</ul>" : "";
      }).join("");
  };

  R.agency = function (id) {
    var a = D.agency[id]; if (!a) return notFound();
    var up = D.agency[a["上級局處ID"]], h = D.head(id);
    var hist = a._tenures.length ? '<table class="tbl"><tr><th>姓名</th><th>職稱</th><th>任期</th><th></th></tr>' + a._tenures.map(function (t) {
      return "<tr" + (t._current ? ' class="cur"' : "") + "><td>" + personLink(t["人物ID"]) + "</td><td>" + esc(t["職稱"]) + "</td><td>" + esc(t["到任日"]) + " – " + (t._current ? "在任" : esc(t["卸任日"])) + "</td><td>" + src(t["出處網址"]) + "</td></tr>";
    }).join("") + "</table>" : empty("還沒有任職紀錄。");
    var pol = a._policies.length ? '<ul class="plain">' + a._policies.map(function (r) {
      var p = D.policy[r["政策ID"]];
      return "<li>" + '<span class="tag">' + esc(r["角色"]) + "</span> " + policyLink(r["政策ID"]) + (p ? " " + statusPill(p["目前狀態"]) : "") + "</li>";
    }).join("") + "</ul>" : empty("目前沒有標註負責的政見。");
    return '<nav class="crumb">' + link("#/agencies", "局處與職掌") + (up ? " / " + link("#/agency/" + up["局處ID"], up["名稱"]) : "") + "</nav>" +
      "<h1>" + esc(a["名稱"]) + "</h1>" +
      '<div class="top"><span class="tag">' + esc(a["層級"] || "") + "</span>" + src(a["官網"], "官網") + src(a["出處網址"], "職掌出處") + "</div>" +
      '<section class="card"><h2>職掌</h2><p>' + esc(a["職掌摘要"] || "未填") + "</p>" +
      (up ? '<p class="muted">上級：' + agencyLink(up["局處ID"]) + "</p>" : "") +
      (a._children.length ? '<p class="muted">下屬機關（' + a._children.length + "）：" + a._children.map(function (c) { return agencyLink(c["局處ID"]); }).join("、") + "</p>" : "") +
      (a["備註"] ? '<p class="fine">' + esc(a["備註"]) + "</p>" : "") + "</section>" +
      '<section class="card"><h2>首長</h2>' + (h ? '<p class="now">現任：' + personLink(h["人物ID"]) + " " + esc(h["職稱"]) + '<span class="muted">（' + esc(h["到任日"]) + " 到任）</span></p>" : "") + hist + "</section>" +
      '<section class="card"><h2>負責的政見</h2>' + pol + "</section>" +
      '<section class="card"><h2>擔任主管機關的進度</h2>' + steps(a._steps, true) + "</section>" +
      '<section class="card"><h2>被質詢紀錄</h2>' + qList(a._qs, { agency: 1 }) + "</section>";
  };

  R.person = function (id) {
    var p = D.person[id]; if (!p) return notFound();
    return '<nav class="crumb">' + link("#/agencies", "局處與職掌") + " / 官員</nav><h1>" + esc(p["姓名"]) + "</h1>" +
      (p["備註"] ? "<p>" + esc(p["備註"]) + "</p>" : "") +
      '<section class="card"><h2>任職紀錄</h2>' + (p._tenures.length ? '<ul class="plain">' + p._tenures.map(function (t) {
        return "<li>" + agencyLink(t["局處ID"]) + " " + esc(t["職稱"]) + '　<span class="muted">' + esc(t["到任日"]) + " – " + (t._current ? "在任" : esc(t["卸任日"])) + "</span> " + src(t["出處網址"]) + "</li>";
      }).join("") + "</ul>" : empty("還沒有任職紀錄。")) + "</section>" +
      '<section class="card"><h2>議會答詢</h2>' + qList(p._qs, { person: 1 }) + "</section>";
  };

  R.councillors = function (q) {
    var party = q.party || "";
    var parties = []; D.T["議員"].forEach(function (c) { if (c["政黨"] && parties.indexOf(c["政黨"]) < 0) parties.push(c["政黨"]); });
    var list = D.T["議員"].filter(function (c) { return !party || c["政黨"] === party; });
    var dist = {}; list.forEach(function (c) { (dist[c["選區"] || "?"] = dist[c["選區"] || "?"] || []).push(c); });
    var keys = Object.keys(dist).sort(function (a, b) { return (+a || 99) - (+b || 99); });
    return "<h1>市議員</h1>" +
      '<div class="filters"><div><span>政黨</span><a class="chip' + (party ? "" : " on") + '" href="' + qs(q, "party", "") + '">全部</a>' +
      parties.map(function (p) { return '<a class="chip' + (party === p ? " on" : "") + '" href="' + qs(q, "party", p) + '">' + esc(p) + "</a>"; }).join("") + "</div></div>" +
      (keys.length ? keys.map(function (k) {
        return "<h2>第 " + esc(k) + ' 選區</h2><ul class="ags">' + dist[k].map(function (c) {
          return '<li><a href="#/councillor/' + esc(c["議員ID"]) + '"><b>' + esc(c["姓名"]) + '</b><span class="muted">' + esc(c["政黨"]) + (c["連任"] === "是" ? "・連任" : "") + "</span>" +
            "<p>質詢 " + c._qs.length + " 次</p></a></li>";
        }).join("") + "</ul>";
      }).join("") : empty("還沒有議員資料。"));
  };

  R.councillor = function (id) {
    var c = D.councillor[id]; if (!c) return notFound();
    var tc = {}; c._qs.forEach(function (q) { q._tags.forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
    var tags = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; });
    return '<nav class="crumb">' + link("#/councillors", "市議員") + "</nav><h1>" + esc(c["姓名"]) + "</h1>" +
      '<div class="top"><span class="tag">' + esc(c["政黨"]) + '</span><span class="tag">第 ' + esc(c["選區"]) + " 選區</span>" +
      (c["屆別"] ? '<span class="tag">第 ' + esc(c["屆別"]) + " 屆</span>" : "") + (c["連任"] === "是" ? '<span class="tag">連任</span>' : "") + "</div>" +
      '<div class="grid2"><section class="card"><h2>選舉公報上說要關注的議題</h2><p>' + esc(c["公報政見摘要"] || "未填") + "</p>" + src(c["出處網址"]) + "</section>" +
      '<section class="card"><h2>實際質詢的主題</h2>' + (tags.length ? '<ul class="plain">' + tags.map(function (t) { return '<li><span class="tag">' + esc(t) + "</span> " + tc[t] + " 次</li>"; }).join("") + "</ul>" : empty("還沒有質詢紀錄。")) +
      '<p class="fine">兩欄對照：公報說要關注的議題，與實際質詢的主題是否一致。</p></section></div>' +
      '<section class="card"><h2>質詢紀錄 <small>' + c._qs.length + " 筆</small></h2>" + qList(c._qs, { cllr: 1 }) + "</section>";
  };

  R.questions = function (q) {
    var tag = q.tag || "";
    var all = {}; D.T["質詢"].forEach(function (x) { x._tags.forEach(function (t) { all[t] = 1; }); });
    var list = D.T["質詢"].filter(function (x) { return !tag || x._tags.indexOf(tag) >= 0; });
    return "<h1>質詢紀錄</h1>" +
      '<div class="filters"><div><span>標籤</span><a class="chip' + (tag ? "" : " on") + '" href="' + qs(q, "tag", "") + '">全部</a>' +
      Object.keys(all).map(function (t) { return '<a class="chip' + (tag === t ? " on" : "") + '" href="' + qs(q, "tag", t) + '">' + esc(t) + "</a>"; }).join("") + "</div></div>" +
      qList(list);
  };

  R.about = function () {
    return "<h1>立場與規則</h1>" +
      '<p class="draft">草稿：請站長確認後再正式公開。</p>' +
      '<section class="card"><h2>立場揭露</h2><p>站長公開支持民進黨。支持一個政黨，是希望它更好，所以對民進黨籍的首長與議員，一樣用同一套標準檢驗；不恰當的言行，一樣會記錄。</p></section>' +
      '<section class="card"><h2>政見的基準</h2><ul class="plain">' +
      '<li><span class="tag gz">選舉公報</span>候選人登記在選舉公報上的政見，是正式承諾，也是主要追蹤基準。</li>' +
      '<li><span class="tag cm">競選期間說法</span>報導、政見會、文宣中的承諾，一樣追蹤，但標明出處，並和公報分開計算。</li>' +
      '<li><span class="tag cen">需中央配合</span>需要中央修法、核定或補助才能完成的政見會另外標示，避免把中央的進度算在市府頭上。</li></ul></section>' +
      '<section class="card"><h2>政見狀態的判定標準</h2><table class="tbl">' +
      [["未啟動", "沒有預算、沒有公開計畫"], ["規劃中", "有公開的計畫、研究案或說明"], ["進行中", "已編列預算或已發包"], ["已完成", "有可驗收的成果"], ["部分完成／調整", "範圍縮小或做法改變，並說明改了什麼"]]
        .map(function (r) { return "<tr><td>" + statusPill(r[0]) + "</td><td>" + r[1] + "</td></tr>"; }).join("") +
      "</table><p class=\"fine\">每次狀態改變都附上公開證據。判定標準公開後不任意更改；若有調整，會記錄調整日期與原因。</p></section>" +
      '<section class="card"><h2>「卡在哪裡」怎麼寫</h2><p>只標示公開資料看得到的最新環節與主管機關。停在某個環節，不等於該局處有責任；「為什麼卡住」只有在議會答詢、審計報告或報導有明確說明時才寫，並附出處。</p></section>' +
      '<section class="card"><h2>議員怎麼看</h2><p>議員沒有執行權，因此不用「達成率」評分，而是看議會表現：質詢了什麼、答詢官員怎麼回、與選舉公報上說要關注的議題是否一致。</p></section>' +
      '<section class="card"><h2>更正與合作揭露</h2><p>發現錯誤歡迎指正，確認後會修正並保留修正紀錄。若資料由議員辦公室或其他單位提供，會在該筆資料標明來源；本平台不收取政黨或候選人的任何費用。</p></section>';
  };

  // ---------- 視覺化共用 ----------
  var ROLE = { "主責": { c: "#00897b", dash: "7 4", w: 2.2 }, "協辦": { c: "#6b6fd6", dash: "3 4", w: 1.6 }, "需中央配合": { c: "#cf6a26", dash: "1.5 4", w: 1.8 } };
  var STC = ["#9aa3a3", "#3b7dd8", "#d99a1b", "#2e9a5b", "#8a63c9"];
  function subtabs(items, cur) {
    return '<nav class="subtabs">' + items.map(function (x) { return '<a href="' + x[0] + '"' + (x[0] === cur ? ' class="on"' : "") + ">" + x[1] + "</a>"; }).join("") + "</nav>";
  }
  var AG_TABS = [["#/agencies", "局處列表"], ["#/org", "組織圖"], ["#/load", "負擔與進度"]];
  var PO_TABS = [["#/policies", "政見列表"], ["#/map", "政策與局處關聯圖"]];
  function kindOf(a) { var n = a["備註"] || ""; return n.indexOf("輔助機關") === 0 ? "輔助機關" : n.indexOf("業務機關") === 0 ? "業務機關" : a["層級"]; }
  function headName(id) { var h = D.head(id); return h ? esc(h["職稱"]) + " " + esc((D.person[h["人物ID"]] || {})["姓名"] || "") : ""; }

  // ---------- 組織圖 ----------
  R.org = function () {
    var root = D.agency["D000"], L1 = D.T["局處"].filter(function (a) { return a["層級"] === "一級機關"; });
    function node(a) {
      var kids = a._children.filter(function (c) { return c["層級"] === "二級機關"; });
      return '<div class="on1"><a class="onode" href="#/agency/' + esc(a["局處ID"]) + '"><b>' + esc(a["名稱"]) + "</b><span>" + headName(a["局處ID"]) + "</span></a>" +
        (kids.length ? '<details><summary>' + kids.length + " 個下屬機關</summary><ul>" + kids.map(function (k) { return '<li><a href="#/agency/' + esc(k["局處ID"]) + '">' + esc(k["名稱"]) + "</a></li>"; }).join("") + "</ul></details>" : "") + "</div>";
    }
    function branch(title, arr, note) {
      return arr.length ? '<section class="obranch"><h2>' + title + " <small>" + arr.length + "</small></h2>" + (note ? '<p class="fine">' + note + "</p>" : "") + '<div class="ogrid">' + arr.map(node).join("") + "</div></section>" : "";
    }
    var biz = L1.filter(function (a) { return kindOf(a) !== "輔助機關"; }), sup = L1.filter(function (a) { return kindOf(a) === "輔助機關"; });
    var dist = D.T["局處"].filter(function (a) { return a["層級"] === "區公所"; }), ent = D.T["局處"].filter(function (a) { return a["層級"] === "其他" && a["局處ID"] !== "D000"; });
    var vice = D.T["任職"].filter(function (t) { return t["局處ID"] === "D000" && t._current && t["職稱"] !== "市長"; });
    return "<h1>局處與職掌</h1>" + subtabs(AG_TABS, "#/org") +
      '<div class="otop">' + (root ? '<a class="onode root" href="#/agency/D000"><b>' + esc(root["名稱"]) + "</b><span>" + headName("D000") + "</span></a>" : "") +
      (vice.length ? '<div class="ovice">' + vice.map(function (t) { return esc(t["職稱"]) + " " + personLink(t["人物ID"]); }).join("　") + "</div>" : "") + "</div>" +
      '<div class="otrunk"></div>' +
      branch("業務機關", biz, "負責對市民的各項業務") + branch("輔助機關", sup, "負責市府內部的人事、預算、法制、管考等支援工作") +
      branch("區公所", dist, "派出機關，由市長指揮命令，受民政局指導與監督；復興區為山地原住民自治區") +
      branch("事業機構與行政法人", ent, "市府出資或監督") +
      '<p class="fine">依桃園市政府組織架構圖（113 年）與組織自治條例整理；點任一機關可看職掌、首長與負責的政見。</p>';
  };

  // ---------- 政策與局處關聯圖 ----------
  R.map = function (q) {
    var P = D.T["政策"].slice(), rows = D.T["政策局處"].filter(function (r) { return D.policy[r["政策ID"]] && D.agency[r["局處ID"]]; });
    if (!P.length) return "<h1>政見追蹤</h1>" + subtabs(PO_TABS, "#/map") + empty("還沒有政見資料。");
    var dom = function (p) { return p["領域"] || p["類別"] || "未分類"; };
    P.sort(function (a, b) { return dom(a).localeCompare(dom(b)) || a["政策ID"].localeCompare(b["政策ID"]); });
    // 只畫有連線的局處，依連線數排序
    var cnt = {}; rows.forEach(function (r) { cnt[r["局處ID"]] = (cnt[r["局處ID"]] || 0) + (r["角色"] === "主責" ? 2 : 1); });
    var A = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || a.localeCompare(b); });
    var RH = 34, top = 30, W = 900, PX = 290, AX = 610, h;
    var py = {}, y = top, lastDom = null, labels = "";
    P.forEach(function (p) {
      if (dom(p) !== lastDom) { lastDom = dom(p); labels += '<text class="mdom" x="8" y="' + (y + 14) + '">' + esc(lastDom) + "</text>"; y += RH * 0.8; }
      py[p["政策ID"]] = y + RH / 2; y += RH;
    });
    var ay = {}, aTop = top + Math.max(0, (y - top - A.length * RH) / 2);
    A.forEach(function (id, i) { ay[id] = aTop + i * RH + RH / 2; });
    h = Math.max(y, aTop + A.length * RH) + 12;
    var lines = rows.map(function (r) {
      var s = ROLE[r["角色"]] || ROLE["協辦"], y1 = py[r["政策ID"]], y2 = ay[r["局處ID"]], mx = (PX + AX) / 2;
      return '<path class="mlink" data-p="' + esc(r["政策ID"]) + '" data-a="' + esc(r["局處ID"]) + '" d="M' + PX + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + AX + " " + y2 +
        '" stroke="' + s.c + '" stroke-width="' + s.w + '" stroke-dasharray="' + s.dash + '"><title>' + esc(D.policy[r["政策ID"]]["政策名稱"] + " → " + agencyName(r["局處ID"]) + "（" + r["角色"] + "）") + "</title></path>";
    }).join("");
    var pn = P.map(function (p) {
      var i = STATUS.indexOf(p["目前狀態"]), y0 = py[p["政策ID"]];
      return '<a href="#/policy/' + esc(p["政策ID"]) + '"><g class="mnode" data-p="' + esc(p["政策ID"]) + '"><rect x="18" y="' + (y0 - 13) + '" width="' + (PX - 18) + '" height="26" rx="6"/>' +
        '<circle cx="32" cy="' + y0 + '" r="5" fill="' + (STC[i] || "#bbb") + '"/><text x="44" y="' + (y0 + 5) + '">' + esc(trunc(p["政策名稱"], 16)) + "</text>" +
        '<title>' + esc(p["政策名稱"] + "｜" + (p["目前狀態"] || "未填") + "｜" + (p["來源類型"] || "")) + "</title></g></a>";
    }).join("");
    var an = A.map(function (id) {
      var y0 = ay[id];
      return '<a href="#/agency/' + esc(id) + '"><g class="mnode" data-a="' + esc(id) + '"><rect x="' + AX + '" y="' + (y0 - 13) + '" width="' + (W - AX - 8) + '" height="26" rx="6"/>' +
        '<text x="' + (AX + 12) + '" y="' + (y0 + 5) + '">' + esc(trunc(agencyName(id), 13)) + "</text><title>" + esc(agencyName(id)) + "</title></g></a>";
    }).join("");
    var legend = Object.keys(ROLE).map(function (k) {
      return '<span class="lgr"><svg width="34" height="10"><line x1="0" y1="5" x2="34" y2="5" stroke="' + ROLE[k].c + '" stroke-width="' + ROLE[k].w + '" stroke-dasharray="' + ROLE[k].dash + '"/></svg>' + k + "</span>";
    }).join("") + STATUS.map(function (s, i) { return '<span class="lgr"><span class="dot" style="background:' + STC[i] + '"></span>' + s + "</span>"; }).join("");
    var table = '<details class="tview"><summary>以表格檢視</summary><table class="tbl"><tr><th>政見</th><th>局處</th><th>角色</th><th>狀態</th></tr>' +
      rows.map(function (r) { var p = D.policy[r["政策ID"]]; return "<tr><td>" + policyLink(r["政策ID"]) + "</td><td>" + agencyLink(r["局處ID"]) + "</td><td>" + esc(r["角色"]) + "</td><td>" + statusPill(p["目前狀態"]) + "</td></tr>"; }).join("") + "</table></details>";
    return "<h1>政見追蹤</h1>" + subtabs(PO_TABS, "#/map") +
      '<p class="muted">左邊是政見（圓點顏色代表狀態，依領域分組），右邊是負責的局處，虛線代表兩者的關係。滑鼠移到任一項目上，會只顯示和它有關的線；點一下可進入該頁。</p>' +
      '<div class="legend">' + legend + "</div>" +
      '<div class="mapwrap"><svg id="pmap" viewBox="0 0 ' + W + " " + h + '" width="' + W + '" height="' + h + '" role="img" aria-label="政策與局處關聯圖">' +
      '<text class="mhead" x="18" y="18">政見</text><text class="mhead" x="' + AX + '" y="18">局處</text>' + labels + lines + pn + an + "</svg></div>" + table;
  };
  function trunc(s, n) { s = s || ""; return s.length > n ? s.slice(0, n) + "…" : s; }
  function bindMap() {
    var svg = document.getElementById("pmap"); if (!svg) return;
    var links = svg.querySelectorAll(".mlink");
    function on(key, val) {
      svg.classList.add("focus");
      links.forEach(function (l) { l.classList.toggle("hi", l.getAttribute(key) === val); });
      svg.querySelectorAll(".mnode").forEach(function (n) {
        var rel = n.getAttribute(key) === val || [].some.call(links, function (l) { return l.getAttribute(key) === val && (l.getAttribute("data-p") === n.getAttribute("data-p") || l.getAttribute("data-a") === n.getAttribute("data-a")) && (n.getAttribute("data-p") || n.getAttribute("data-a")); });
        n.classList.toggle("hi", !!rel);
      });
    }
    function off() { svg.classList.remove("focus"); svg.querySelectorAll(".hi").forEach(function (x) { x.classList.remove("hi"); }); }
    svg.querySelectorAll(".mnode").forEach(function (n) {
      var k = n.getAttribute("data-p") ? "data-p" : "data-a", v = n.getAttribute(k);
      n.addEventListener("mouseenter", function () { on(k, v); }); n.addEventListener("mouseleave", off);
      n.addEventListener("focusin", function () { on(k, v); }); n.addEventListener("focusout", off);
    });
  }

  // ---------- 局處負擔與進度 ----------
  R.load = function () {
    var today = new Date().toISOString().slice(0, 10);
    var A = D.T["局處"].filter(function (a) { return a._policies.length || a._qs.length; }).map(function (a) {
      var lead = a._policies.filter(function (r) { return r["角色"] === "主責"; }), co = a._policies.length - lead.length;
      var st = STATUS.map(function (s) { return lead.filter(function (r) { var p = D.policy[r["政策ID"]]; return p && p["目前狀態"] === s; }).length; });
      var last = null; lead.forEach(function (r) { var p = D.policy[r["政策ID"]]; if (p && p._steps[0] && (!last || p._steps[0]["日期"] > last)) last = p._steps[0]["日期"]; });
      var days = last ? Math.round((Date.parse(today) - Date.parse(last)) / 864e5) : null;
      return { a: a, lead: lead.length, co: co, st: st, days: days, last: last, qs: a._qs.length };
    }).sort(function (x, y) { return (y.lead * 2 + y.co) - (x.lead * 2 + x.co) || y.qs - x.qs; });
    if (!A.length) return "<h1>局處與職掌</h1>" + subtabs(AG_TABS, "#/load") + empty("還沒有政見或質詢資料，填入後這裡會自動計算。");
    var maxN = Math.max.apply(null, A.map(function (x) { return x.lead + x.co; })) || 1, maxQ = Math.max.apply(null, A.map(function (x) { return x.qs; })) || 1;
    var rowsH = A.map(function (x) {
      var id = x.a["局處ID"], bw = function (n) { return (n / maxN * 100).toFixed(1) + "%"; };
      var stbar = x.lead ? x.st.map(function (n, i) { return n ? '<span class="seg" style="flex:' + n + ";background:" + STC[i] + '" title="' + STATUS[i] + " " + n + '"></span>' : ""; }).join("") : "";
      return '<tr><th scope="row">' + agencyLink(id) + "</th>" +
        '<td><div class="lbar" title="主責 ' + x.lead + "、協辦 " + x.co + '"><span class="lb lead" style="width:' + bw(x.lead) + '"></span><span class="lb co" style="width:' + bw(x.co) + '"></span></div><span class="num">' + x.lead + " / " + x.co + "</span></td>" +
        '<td>' + (stbar ? '<div class="sbar">' + stbar + "</div>" : '<span class="muted">—</span>') + "</td>" +
        '<td class="num">' + (x.days == null ? '<span class="muted">—</span>' : esc(x.last) + (x.days >= 0 ? '<br><span class="muted">' + x.days + " 天前</span>" : "")) + "</td>" +
        '<td><div class="qbar"><span style="width:' + (x.qs / maxQ * 100).toFixed(1) + '%"></span></div><span class="num">' + x.qs + "</span></td></tr>";
    }).join("");
    return "<h1>局處與職掌</h1>" + subtabs(AG_TABS, "#/load") +
      '<div class="note-card"><b>這一頁不打「效率分數」。</b>公開資料只看得到結果、看不到原因：同樣停滯，可能是局處延宕，也可能在等中央核定或議會預算。所以這裡只列出可以查證的數字，請搭配各政見的進度紀錄一起判讀。</div>' +
      '<div class="legend"><span class="lgr"><span class="sw lead"></span>主責政見</span><span class="lgr"><span class="sw co"></span>協辦政見</span>' +
      STATUS.map(function (s, i) { return '<span class="lgr"><span class="dot" style="background:' + STC[i] + '"></span>' + s + "</span>"; }).join("") + "</div>" +
      '<div class="tscroll"><table class="tbl load"><tr><th>局處</th><th>負責政見（主責 / 協辦）</th><th>主責政見的狀態</th><th>距最近公開進度</th><th>被質詢次數</th></tr>' + rowsH + "</table></div>" +
      '<p class="fine">排序依負擔（主責算 2、協辦算 1）。「距最近公開進度」取該局處主責政見中最新一筆進度紀錄的日期；天數長不一定代表延宕，請點進政見看原因。</p>';
  };

  function notFound() { return "<h1>找不到這一頁</h1><p>" + link("#/", "回首頁") + "</p>"; }

  // ---------- 路由 ----------
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ""), qi = h.indexOf("?"), q = {};
    if (qi >= 0) { h.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); }); h = h.slice(0, qi); }
    var parts = h.split("/").filter(Boolean).map(decodeURIComponent);
    return { page: parts[0] || "home", id: parts[1], q: q };
  }
  function qs(q, k, v) {
    var o = {}; Object.keys(q).forEach(function (x) { o[x] = q[x]; }); if (v) o[k] = v; else delete o[k];
    var r = parseHash(), s = Object.keys(o).map(function (x) { return encodeURIComponent(x) + "=" + encodeURIComponent(o[x]); }).join("&");
    return "#/" + r.page + (s ? "?" + s : "");
  }
  var NAV = { home: "", map: "policies", org: "agencies", load: "agencies", policies: "policies", policy: "policies", agencies: "agencies", agency: "agencies", person: "agencies", councillors: "councillors", councillor: "councillors", questions: "questions", about: "about" };
  function render() {
    var r = parseHash(), f = R[r.page];
    $main.innerHTML = (D.demo ? '<div class="demo">目前是<b>示範模式</b>：政見進度、狀態與質詢都是虛構的範例。<a href="./">回正式網站</a></div>' : "") +
      (f ? f(r.id && r.page !== "policies" ? r.id : r.q, r.q) : notFound());
    bindMap();
    document.querySelectorAll("header nav a").forEach(function (a) { a.classList.toggle("on", a.dataset.k === NAV[r.page]); });
    var h1 = $main.querySelector("h1");
    document.title = (r.page === "home" ? "" : (h1 ? h1.textContent + "｜" : "")) + (CFG.siteName || "桃園市政監督");
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", function () { if (D) render(); });
  TWData.loadAll(CFG).then(function (d) { D = d; render(); }).catch(function (e) {
    $main.innerHTML = '<div class="err"><h1>資料讀取失敗</h1><p>' + esc(e.message) + "</p><p>請確認試算表已「發布到網路」且共用設定為「知道連結的任何人都能檢視」。</p></div>";
  });
})();
