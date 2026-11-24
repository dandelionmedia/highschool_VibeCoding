/* =========================================================
   VIBE CODING LAB - 동작 스크립트
   (복사 버튼, XP·퀘스트, 미션 필터·검색, 상세 창, 맨위 버튼)
   ========================================================= */
(function () {
  "use strict";

  var DATA = window.VC_DATA || { cats: [], topics: [], bugfix: [] };
  var CATS = DATA.cats, TOPICS = DATA.topics, BUGFIX = DATA.bugfix;
  var CAT = {};
  CATS.forEach(function (c) { CAT[c.id] = c; });

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function pad3(n) { return ("00" + n).slice(-3); }

  /* ---------- 글자 처리 ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var ROLE = "너는 고등학생과 함께 작업하는 친절한 웹 개발자야.";
  var BUG_FILLS = ["(원하는 무드: 예) 고급스러운 블랙&amp;골드)", "(버튼 이름)", "(추가할 기능)"];

  // [만들 것] 같은 블록 제목은 하늘색, [여기에 …] 빈칸은 노란색으로 표시
  function highlight(text) {
    return String(text).split("\n").map(function (line) {
      var safe = esc(line);
      if (/^\[[^\]]+\]$/.test(line) && !/^\[여기에/.test(line)) return '<span class="sec">' + safe + "</span>";
      if (/^\[기술 조건/.test(line)) return '<span class="sec">' + safe + "</span>";
      safe = safe.replace(ROLE, '<span class="role">' + ROLE + "</span>");
      return safe.replace(/\[여기에[^\]]*\]/g, '<span class="fill">$&</span>');
    }).join("\n");
  }
  function highlightBug(text) {
    var safe = esc(text);
    BUG_FILLS.forEach(function (f) { safe = safe.split(f).join('<span class="fill">' + f + "</span>"); });
    return safe;
  }

  var LV_NAME = { 1: "★ 쉬움", 2: "★★ 보통", 3: "★★★ 도전" };
  var LV_TIME = { 1: "1차시", 2: "", 3: "2~3차시" };

  function topicEmoji(t) {
    var c = CAT[t.cat];
    if (!c) return "✨";
    if (t.sub && c.subs.length) {
      for (var i = 0; i < c.subs.length; i++) if (c.subs[i].name === t.sub) return c.subs[i].emoji;
    }
    return c.emoji;
  }
  function catLabel(t) {
    var c = CAT[t.cat];
    if (!c) return "";
    return t.sub ? "패션 " + t.sub.replace(/^[①-⑨]\s*/, "") : c.name;
  }
  function tagsHTML(t) {
    return (
      '<span class="tag">' + esc(catLabel(t)) + "</span>" +
      '<span class="tag tag--lv' + t.lv + '">' + LV_NAME[t.lv] + (LV_TIME[t.lv] ? " · " + LV_TIME[t.lv] : "") + "</span>" +
      '<span class="tag' + (t.type === "게임" ? " tag--game" : "") + '">' + (t.type === "게임" ? "🎮 게임" : "🧩 웹앱") + "</span>"
    );
  }

  /* ---------- 효과음 (소리 파일 없이 브라우저에서 직접 만듦) ---------- */
  var Sound = (function () {
    var ctx = null, master = null, on = true;
    try { if (window.localStorage.getItem("vclab-sound") === "off") on = false; } catch (e) { /* 저장소 막힘 */ }
    function ac() {
      if (!on) return null;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        try {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.2; // 전체 음량 (0~1)
          master.connect(ctx.destination);
        } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, start, dur, type, vol, toFreq) {
      var c = ac();
      if (!c) return;
      var t0 = c.currentTime + (start || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t0);
      if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function seq(notes, type, vol, gap) {
      notes.forEach(function (n, i) { tone(n[0], i * (gap || 0.09), n[1] || 0.12, type, vol); });
    }
    return {
      isOn: function () { return on; },
      setOn: function (v) {
        on = !!v;
        try { window.localStorage.setItem("vclab-sound", on ? "on" : "off"); } catch (e) { /* 무시 */ }
        if (on) this.coin();
      },
      click: function () { tone(880, 0, 0.05, "square", 0.2, 1320); },
      select: function () { seq([[660, 0.06], [990, 0.08]], "square", 0.22, 0.05); },
      tick: function () { tone(1200, 0, 0.03, "square", 0.15); },
      coin: function () { seq([[988, 0.08], [1319, 0.3]], "square", 0.32, 0.08); },
      open: function () { tone(330, 0, 0.2, "triangle", 0.4, 990); },
      close: function () { tone(880, 0, 0.12, "triangle", 0.3, 330); },
      ding: function () { seq([[1047, 0.1], [1568, 0.3]], "triangle", 0.45, 0.07); },
      whoosh: function () { tone(220, 0, 0.3, "sawtooth", 0.15, 1760); },
      sparkle: function () { seq([[1319, 0.06], [1568, 0.06], [2093, 0.14]], "triangle", 0.32, 0.05); },
      error: function () { seq([[196, 0.12], [147, 0.22]], "sawtooth", 0.22, 0.12); },
      levelUp: function () { seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.08], [1047, 0.35]], "square", 0.28, 0.09); },
      fanfare: function () {
        seq([[523, 0.12], [523, 0.12], [523, 0.12], [698, 0.3], [880, 0.15], [784, 0.12], [1047, 0.6]], "square", 0.28, 0.13);
        seq([[262, 0.4], [349, 0.4], [392, 0.4], [523, 0.8]], "triangle", 0.32, 0.22);
      }
    };
  })();

  function initSound() {
    var btn = document.getElementById("soundBtn");
    function paint() {
      if (!btn) return;
      var on = Sound.isOn();
      btn.classList.toggle("is-off", !on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "효과음 끄기" : "효과음 켜기");
      $(".sound-btn__ico", btn).textContent = on ? "🔊" : "🔇";
      $(".sound-btn__txt", btn).textContent = on ? "SOUND ON" : "SOUND OFF";
    }
    if (btn) btn.addEventListener("click", function () {
      Sound.setOn(!Sound.isOn());
      paint();
      toast(Sound.isOn() ? "🔊 효과음을 켰어요" : "🔇 효과음을 껐어요");
    });
    paint();
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      if (t.closest(".copy-btn, .quick, #soundBtn, #q4btn, #randomBtn, .card__open, [data-close]")) return;
      if (t.closest("#toTop")) { Sound.whoosh(); return; }
      if (t.closest("[data-idea]")) { Sound.sparkle(); return; }
      if (t.closest(".nav a, .group, .subs .chip, .seg__btn")) { Sound.select(); return; }
      if (t.closest("button, .btn, .logo")) Sound.click();
    }, true);
  }

  /* ---------- 미션 카드 ---------- */
  var state = { group: "all", sub: "", lv: 0, type: "", q: "" };
  var GROUPS = [
    { id: "all", emoji: "🌐", name: "전체 미션" },
    { id: "fashion", emoji: "⭐", name: "패션디자인 전공", badge: "전공 특화" },
    { id: "school", emoji: "🏫", name: "학교생활·일상" },
    { id: "hobby", emoji: "🎧", name: "취미·관심사" },
    { id: "game", emoji: "🎮", name: "게임" },
    { id: "career", emoji: "🧭", name: "진로 탐색 20" }
  ];
  function topicGroup(t) { return CAT[t.cat] ? CAT[t.cat].group : ""; }

  function renderGroups() {
    var mount = document.getElementById("groupTabs");
    if (!mount) return;
    mount.innerHTML = GROUPS.map(function (g) {
      var n = g.id === "all" ? TOPICS.length : TOPICS.filter(function (t) { return topicGroup(t) === g.id; }).length;
      return (
        '<button type="button" role="tab" class="group group--' + g.id + (g.id === state.group ? " is-on" : "") + '" data-group="' + g.id + '" aria-selected="' + (g.id === state.group) + '">' +
          '<span class="group__emo" aria-hidden="true">' + g.emoji + "</span>" +
          '<span class="group__name">' + esc(g.name) + "</span>" +
          '<span class="group__n">' + n + " MISSIONS</span>" +
          (g.badge ? '<span class="group__badge">' + g.badge + "</span>" : "") +
        "</button>"
      );
    }).join("");
    mount.addEventListener("click", function (e) {
      var b = e.target.closest(".group");
      if (!b) return;
      state.group = b.getAttribute("data-group");
      state.sub = "";
      $$(".group", mount).forEach(function (x) {
        var on = x === b;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
      });
      renderSubs();
      applyFilter();
    });
  }

  function renderSubs() {
    var mount = document.getElementById("subChips");
    if (!mount) return;
    var items = [];
    if (state.group === "fashion") {
      var fc = CATS.filter(function (c) { return c.group === "fashion"; })[0];
      if (fc) items = fc.subs.map(function (s) {
        return { key: "s:" + s.name, emoji: s.emoji, name: s.name.replace(/^[①-⑨]\s*/, ""), n: TOPICS.filter(function (t) { return t.sub === s.name; }).length };
      });
    } else if (state.group === "career") {
      items = CATS.filter(function (c) { return c.group === "career"; }).map(function (c) {
        return { key: "c:" + c.id, emoji: c.emoji, name: c.name, n: TOPICS.filter(function (t) { return t.cat === c.id; }).length };
      });
    }
    if (!items.length) { mount.innerHTML = ""; return; }
    mount.innerHTML =
      '<button type="button" class="chip is-on" data-sub="">전체</button>' +
      items.map(function (it) {
        return '<button type="button" class="chip" data-sub="' + esc(it.key) + '"><span aria-hidden="true">' + it.emoji + "</span>" + esc(it.name) + " <small>" + it.n + "</small></button>";
      }).join("");
  }
  function initSubs() {
    var mount = document.getElementById("subChips");
    if (!mount) return;
    mount.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state.sub = b.getAttribute("data-sub");
      $$(".chip", mount).forEach(function (x) { x.classList.toggle("is-on", x === b); });
      applyFilter();
    });
  }

  function renderCards() {
    var mount = document.getElementById("missionGrid");
    if (!mount) return;
    mount.innerHTML = TOPICS.map(function (t, i) {
      return (
        '<article class="card" id="m' + t.n + '" data-i="' + i + '">' +
          '<div class="card__top"><span class="card__no">No.' + pad3(t.n) + '</span><span class="card__clear">CLEAR</span><span class="card__emo" aria-hidden="true">' + topicEmoji(t) + "</span></div>" +
          '<h3 class="card__title"><button type="button" class="card__open" data-open="' + i + '">' + esc(t.title) + "</button></h3>" +
          (t.what ? '<p class="card__what">' + esc(t.what) + "</p>" : "") +
          '<div class="tags">' + tagsHTML(t) + "</div>" +
          '<div class="card__foot"><span class="card__view">프롬프트 보기 →</span>' +
          '<button type="button" class="quick" data-quick="' + i + '" aria-label="' + esc(t.title) + ' 프롬프트 바로 복사">⚡ 바로 복사</button></div>' +
        "</article>"
      );
    }).join("");
    mount.addEventListener("click", function (e) {
      if (e.target.closest(".quick")) return;
      var card = e.target.closest(".card");
      if (card) openModal(+card.getAttribute("data-i"));
    });
  }

  var visible = [];
  function matches(t) {
    var g = topicGroup(t);
    if (state.group !== "all" && g !== state.group) return false;
    if (state.sub) {
      if (state.sub.indexOf("s:") === 0 && t.sub !== state.sub.slice(2)) return false;
      if (state.sub.indexOf("c:") === 0 && t.cat !== state.sub.slice(2)) return false;
    }
    if (state.lv && t.lv !== state.lv) return false;
    if (state.type && t.type !== state.type) return false;
    if (state.q) {
      var q = state.q;
      if (/^\d+$/.test(q)) return String(t.n) === q || t.title.indexOf(q) > -1;
      var hay = (t.title + " " + t.what + " " + catLabel(t) + " " + (CAT[t.cat] ? CAT[t.cat].name : "") + " " + t.type + " " + t.missions.join(" ")).toLowerCase();
      var words = q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }
  function applyFilter() {
    visible = [];
    var cards = $$("#missionGrid .card");
    TOPICS.forEach(function (t, i) {
      var ok = matches(t);
      if (ok) visible.push(i);
      if (cards[i]) cards[i].classList.toggle("is-hidden", !ok);
    });
    setText("resultCount", visible.length);
    var label = "전체 미션";
    var g = GROUPS.filter(function (x) { return x.id === state.group; })[0];
    if (g && g.id !== "all") label = g.name;
    var sb = $("#subChips .chip.is-on");
    if (state.sub && sb) label += " › " + sb.textContent.replace(/\s*\d+\s*$/, "").trim();
    if (state.q) label += " · “" + state.q + "” 검색";
    setText("resultLabel", label);
    var empty = document.getElementById("emptyMsg");
    if (empty) empty.hidden = visible.length > 0;
  }

  function initToolbar() {
    $$(".seg").forEach(function (seg) {
      seg.addEventListener("click", function (e) {
        var b = e.target.closest(".seg__btn");
        if (!b) return;
        $$(".seg__btn", seg).forEach(function (x) { x.classList.toggle("is-on", x === b); });
        if (b.hasAttribute("data-lv")) state.lv = +b.getAttribute("data-lv");
        if (b.hasAttribute("data-type")) state.type = b.getAttribute("data-type");
        applyFilter();
      });
    });
    var input = document.getElementById("searchInput");
    var timer;
    if (input) input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = input.value.trim(); applyFilter(); }, 160);
    });
    var rnd = document.getElementById("randomBtn");
    if (rnd) rnd.addEventListener("click", randomMission);
  }

  function randomMission() {
    if (!visible.length) { Sound.error(); toast("뽑을 미션이 없어요. 필터를 바꿔 보세요"); return; }
    var pick = visible[Math.floor(Math.random() * visible.length)];
    if (reduceMotion) { openModal(pick); return; }
    var title = document.getElementById("modalTitle");
    openModal(pick);
    var spins = 0, max = 12;
    var target = TOPICS[pick];
    (function roll() {
      if (spins >= max) {
        renderModal(pick);
        Sound.sparkle();
        confetti(30);
        return;
      }
      var r = TOPICS[visible[Math.floor(Math.random() * visible.length)]];
      if (title) title.textContent = "🎲 " + r.title;
      setText("modalNo", "MISSION " + pad3(r.n));
      Sound.tick();
      spins++;
      setTimeout(roll, 40 + spins * 12);
    })();
    return target;
  }

  /* ---------- 미션 상세 창 ---------- */
  var modal = document.getElementById("modal");
  var current = -1, lastFocus = null;

  function renderModal(i) {
    var t = TOPICS[i];
    if (!t) return;
    current = i;
    setText("modalNo", "MISSION " + pad3(t.n));
    setText("modalTitle", t.title);
    setText("modalIcon", topicEmoji(t));
    setText("modalWhat", t.what ? "🎯 " + t.what : "");
    setText("modalFile", "mission_" + pad3(t.n) + ".txt");
    $("#modalTags").innerHTML = tagsHTML(t);
    $("#modalPrompt").innerHTML = highlight(t.prompt);
    $("#modalMissions").innerHTML = t.missions.map(function (m, k) {
      var key = "m" + t.n + "-a" + (k + 1);
      return (
        '<li class="mission"><span class="mission__no">+' + (k + 1) + "</span><p>" + esc(m) + "</p>" +
        '<button type="button" class="copy-btn copy-btn--sm' + (copied[key] ? " is-copied" : "") + '" data-mission="' + i + ":" + k + '" data-key="' + key + '">' +
        '<span class="copy-btn__ico" aria-hidden="true">' + (copied[key] ? "✔" : "▶") + '</span><span class="copy-btn__lbl">' + (copied[key] ? "복사완료" : "복사") + "</span></button></li>"
      );
    }).join("");
    var btn = document.getElementById("modalCopy");
    btn.setAttribute("data-key", "m" + t.n);
    setCopied(btn, !!copied["m" + t.n]);
    var pos = visible.indexOf(i);
    $("#modalPrev").disabled = pos <= 0;
    $("#modalNext").disabled = pos < 0 || pos >= visible.length - 1;
    var sc = document.getElementById("modalScroll");
    if (sc) sc.scrollTop = 0;
  }
  function openModal(i) {
    if (!modal) return;
    if (modal.hidden) {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.documentElement.classList.add("is-locked");
      Sound.open();
    }
    renderModal(i);
    var panel = $(".modal__panel", modal);
    if (panel) panel.focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove("is-locked");
    Sound.close();
    var card = TOPICS[current] && document.getElementById("m" + TOPICS[current].n);
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
    else if (card) card.focus();
  }
  function step(dir) {
    var pos = visible.indexOf(current);
    var next = visible[pos + dir];
    if (next === undefined) return;
    Sound.select();
    renderModal(next);
  }
  function initModal() {
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
    });
    $("#modalPrev").addEventListener("click", function () { step(-1); });
    $("#modalNext").addEventListener("click", function () { step(1); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); closeModal(); }
      if (e.key === "Tab") {
        var f = $$('button:not([disabled]), [href], pre[tabindex]', $(".modal__panel", modal)).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === $(".modal__panel", modal))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- 버그 픽스 ---------- */
  function renderBugs() {
    var mount = document.getElementById("bugList");
    if (!mount) return;
    mount.innerHTML = BUGFIX.map(function (b, i) {
      var id = "bug-" + (i + 1);
      return (
        '<article class="bug reveal">' +
          '<div class="bug__head"><span class="bug__no">0' + (i + 1) + "</span><h3>" + esc(b.title) + "</h3></div>" +
          '<div class="term"><div class="term__bar"><i></i><i></i><i></i><span>bugfix_0' + (i + 1) + '.txt</span></div>' +
          '<pre class="term__body" id="' + id + '" tabindex="0">' + highlightBug(b.prompt) + "</pre></div>" +
          '<div class="copy-row"><button type="button" class="copy-btn" data-copy="' + id + '" data-key="b' + (i + 1) + '">' +
          '<span class="copy-btn__ico" aria-hidden="true">▶</span><span class="copy-btn__lbl">프롬프트 한번에 복사</span></button></div>' +
        "</article>"
      );
    }).join("");
  }

  /* ---------- 복사 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }
  function selectText(el) {
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
    } catch (e) { /* 무시 */ }
  }
  function setCopied(btn, on) {
    var small = btn.classList.contains("copy-btn--sm");
    btn.classList.toggle("is-copied", on);
    var lbl = $(".copy-btn__lbl", btn), ico = $(".copy-btn__ico", btn);
    if (lbl) lbl.textContent = on ? (small ? "복사완료" : "프롬프트 복사완료") : (small ? "복사" : "프롬프트 한번에 복사");
    if (ico) ico.textContent = on ? "✔" : "▶";
  }

  function initCopy() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".copy-btn, .quick");
      if (!btn) return;
      var text = "", key = "", pre = null;
      if (btn.hasAttribute("data-quick")) {
        var t = TOPICS[+btn.getAttribute("data-quick")];
        if (!t) return;
        text = t.prompt; key = "m" + t.n;
      } else if (btn.hasAttribute("data-mission")) {
        var p = btn.getAttribute("data-mission").split(":");
        var tm = TOPICS[+p[0]];
        if (!tm) return;
        text = tm.missions[+p[1]]; key = btn.getAttribute("data-key");
      } else {
        pre = document.getElementById(btn.getAttribute("data-copy"));
        if (!pre) return;
        text = pre.textContent.replace(/ /g, " ").trim();
        key = btn.getAttribute("data-key");
      }
      copyText(text).then(function () {
        if (btn.classList.contains("quick")) {
          btn.classList.add("is-copied");
          btn.textContent = "✔ 복사완료";
        } else {
          btn.classList.remove("is-copied"); void btn.offsetWidth;
          setCopied(btn, true);
        }
        Sound.coin();
        var gained = gainXP(key);
        floatXP(btn, gained ? "+" + gained + " XP" : "COPY OK");
        if (key === "my" && /\[여기에/.test(text)) toast("✏️ 아직 빈칸이 남아 있어요! 채우고 다시 복사해 보세요");
        else if (/-a\d+$/.test(key)) toast("🔼 추가 미션 복사! 같은 대화창에 이어서 붙여넣기");
        else toast("📋 복사 완료! 제미나이 입력창에 붙여넣기 (Ctrl+V)");
      }).catch(function () {
        Sound.error();
        if (pre) selectText(pre);
        else if (current > -1 && !modal.hidden) selectText(document.getElementById("modalPrompt"));
        toast("자동 복사가 막혔어요. 선택된 글자를 Ctrl+C로 복사하세요");
      });
    });
  }
  function floatXP(btn, label) {
    if (reduceMotion) return;
    var f = document.createElement("span");
    f.className = "xp-float";
    f.textContent = label;
    btn.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
  }

  /* ---------- XP · 레벨 · 퀘스트 ---------- */
  var copied = {};
  var xp = 0;
  var LEVELS = [
    { at: 0, name: "루키 프롬프터" },
    { at: 30, name: "바이브 빌더" },
    { at: 70, name: "버그 헌터" },
    { at: 120, name: "앱 크리에이터" },
    { at: 180, name: "AI 아키텍트" },
    { at: 260, name: "레전드 개발자" }
  ];
  var currentLevel = 0;
  var questDone = { q1: false, q2: false, q3: false, q4: false };
  var allClearShown = false;

  function levelIndex(v) {
    var idx = 0;
    for (var i = 0; i < LEVELS.length; i++) if (v >= LEVELS[i].at) idx = i;
    return idx;
  }
  function gainXP(key) {
    if (!key || copied[key]) return 0;
    copied[key] = true;
    var add = key === "my" ? 15 : /^m\d+$/.test(key) ? 10 : 5;
    xp += add;
    var m = key.match(/^m(\d+)$/);
    if (m) { var card = document.getElementById("m" + m[1]); if (card) card.classList.add("is-cleared"); }
    updateHUD();
    updateQuests();
    return add;
  }
  function updateHUD() {
    var idx = levelIndex(xp), cur = LEVELS[idx], next = LEVELS[idx + 1];
    var pct = next ? ((xp - cur.at) / (next.at - cur.at)) * 100 : 100;
    setText("xpNum", xp);
    setText("xpLevel", "LV." + (idx + 1));
    setText("xpName", cur.name);
    var fill = document.getElementById("xpFill");
    if (fill) fill.style.width = Math.max(4, Math.min(100, pct)) + "%";
    if (idx > currentLevel) {
      currentLevel = idx;
      var box = $(".xp");
      if (box) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
      setTimeout(function () { Sound.levelUp(); toast("🆙 LEVEL UP!  「" + cur.name + "」 달성", true); }, 450);
      confetti(40);
    }
  }
  function updateQuests() {
    var keys = Object.keys(copied);
    var before = { q1: questDone.q1, q2: questDone.q2, q3: questDone.q3 };
    var ups = keys.filter(function (k) { return /-a\d+$/.test(k); }).length;
    questDone.q1 = keys.some(function (k) { return /^m\d+$/.test(k); });
    questDone.q2 = ups >= 2;
    questDone.q3 = keys.indexOf("my") > -1;
    setText("q2count", "(" + Math.min(ups, 2) + "/2)");
    if (["q1", "q2", "q3"].some(function (q) { return questDone[q] && !before[q]; })) setTimeout(function () { Sound.ding(); }, 380);
    paintQuests();
  }
  function paintQuests() {
    var n = 0;
    Object.keys(questDone).forEach(function (q) {
      var li = document.querySelector('[data-quest="' + q + '"]');
      if (li) li.classList.toggle("is-done", questDone[q]);
      if (questDone[q]) n++;
    });
    setText("questDone", n);
    if (n === 4 && !allClearShown) {
      allClearShown = true;
      setTimeout(function () {
        Sound.fanfare();
        toast("🏆 MISSION COMPLETE! 오늘의 퀘스트를 모두 클리어했어요", true);
        confetti(120);
      }, 600);
    }
  }
  function initQuest4() {
    var btn = document.getElementById("q4btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      questDone.q4 = !questDone.q4;
      questDone.q4 ? Sound.ding() : Sound.click();
      btn.setAttribute("aria-pressed", questDone.q4 ? "true" : "false");
      paintQuests();
    });
  }

  /* ---------- 알림 · 색종이 ---------- */
  var toastTimer;
  function toast(msg, big) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("is-big", !!big);
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-show"); }, big ? 3200 : 2200);
  }
  function confetti(n) {
    if (reduceMotion) return;
    var colors = ["#8d6bff", "#3fe0ff", "#48f59a", "#ffcf5c", "#ff4fa3", "#ffffff"];
    for (var i = 0; i < n; i++) {
      var c = document.createElement("span");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 4200); })(c);
    }
  }

  /* ---------- 나만의 프롬프트 설계 ---------- */
  var IDEAS = [
    {
      name: "스트릿 브랜드 런칭 페이지", type: "웹앱",
      what: "내가 만든 가상 스트릿 패션 브랜드의 콘셉트와 신상품을 소개하는 원페이지 브랜드 사이트",
      who: "스트릿 패션을 좋아하는 10대와 20대",
      feat: "브랜드 로고(텍스트와 CSS 도형으로 직접 디자인)와 한 줄 슬로건이 있는 히어로 영역\n신상품 6개를 카드로 보여주고 클릭하면 상세 설명 팝업\n'출시까지 D-day' 카운트다운\n뉴스레터 신청 폼(이메일 형식 검사, 실제 전송은 하지 않고 완료 메시지만 표시)",
      mood: "블랙 배경에 형광 라임 포인트, 굵은 타이포그래피의 하이엔드 스트릿 무드"
    },
    {
      name: "수행평가 생존 게임", type: "게임",
      what: "떨어지는 과제 카드를 마감 순서대로 처리해서 학기를 버티는 시간 관리 게임",
      who: "수행평가가 몰려서 바쁜 고등학생",
      feat: "과목별 과제 카드가 위에서 떨어지고, 클릭하면 처리 완료\n마감을 놓치면 스트레스 게이지가 올라가고 가득 차면 게임 오버\n시간이 지날수록 과제가 빨라지는 난이도 상승\n최고 기록 저장",
      mood: "네온 퍼플과 시안의 사이버펑크 게임 화면"
    },
    {
      name: "급식 월드컵", type: "웹앱",
      what: "급식 메뉴 16개 중 두 개씩 골라 최애 메뉴를 뽑는 토너먼트 앱",
      who: "급식을 사랑하는 우리 반 친구들",
      feat: "16강부터 결승까지 두 메뉴 중 하나를 고르는 토너먼트 진행\n메뉴는 이모지와 이름으로 표시하고 내가 직접 메뉴를 바꿀 수 있는 편집 화면\n우승 메뉴를 축하 효과와 함께 결과 카드로 보여주기\n지금까지 우승한 메뉴 순위표",
      mood: "따뜻한 크림색과 주황색, 둥근 카드의 귀여운 매거진 느낌"
    },
    {
      name: "진로 탐색 RPG", type: "게임",
      what: "선택지를 고를 때마다 능력치가 올라가고 마지막에 어울리는 직업 엔딩이 나오는 텍스트 RPG",
      who: "진로를 고민하는 고등학생",
      feat: "10개의 상황 장면과 장면마다 선택지 3개\n선택에 따라 창의력·분석력·공감력·리더십 능력치가 오르는 상태창\n능력치 조합에 따라 6가지 직업 엔딩 중 하나 표시\n다시 하기와 지금까지 본 엔딩 모음",
      mood: "어두운 판타지 배경에 금색 테두리, 고급스러운 RPG 대화창"
    }
  ];
  var BLANK = {
    name: "[여기에 앱 또는 게임 이름]",
    what: "[여기에 무엇을 만들지 한 문장으로]",
    who: "[여기에 누가 쓰는 앱인지]",
    feat: "[여기에 핵심 기능을 한 줄씩]",
    mood: "[여기에 원하는 분위기]"
  };
  var TECH = [
    "[기술 조건 - 꼭 지켜줘]",
    "- HTML, CSS, JavaScript를 하나의 HTML 파일에 모두 넣어 완성하고, 코드를 생략하지 말고 끝까지 작성",
    "- 외부 이미지 파일, 인터넷 서버와 통신하는 외부 API, API 키, 로그인 기능은 사용하지 말 것(Web Audio처럼 브라우저에 내장된 기능은 사용 가능). 그림은 이모지, CSS 도형, SVG, Canvas로 직접 표현",
    "- 실제 브랜드 로고·상표, 유명 캐릭터, 연예인 사진은 사용하지 말고 모두 오리지널로 만들 것",
    "- 예시 데이터를 미리 넣어서 화면을 열자마자 바로 동작하게 할 것",
    "- 입력이 비었거나 잘못되면 알림창(alert) 대신 화면 안에 친절한 안내 문구 표시",
    "- 드래그·그리기·스와이프 기능이 있다면 마우스와 스마트폰 터치에서 모두 되도록 Pointer Events(pointerdown/move/up)를 사용하고, 해당 영역에 CSS touch-action: none 적용",
    "- 저장 기능이 필요하면 localStorage를 쓰되 try-catch로 감싸서, 저장이 안 되는 환경에서도 앱은 정상 동작하게 할 것"
  ].join("\n");

  function buildPrompt(v) {
    var pick = function (val, k) { val = (val || "").trim(); return val ? val : BLANK[k]; };
    var isGame = v.type === "게임";
    var name = pick(v.name, "name");
    var feats = (v.feat || "").split("\n").map(function (s) { return s.replace(/^\s*(\d+[.)]|[-•·*])\s*/, "").trim(); }).filter(Boolean);
    if (!feats.length) feats = [BLANK.feat];
    if (isGame) {
      feats.push("시작 화면(게임 제목, 방법 안내, 시작 버튼) → 게임 화면(점수·남은 시간 또는 생명 표시) → 결과 화면(최종 점수, 다시하기 버튼) 흐름");
      feats.push("키보드와 마우스, 스마트폰 터치를 모두 지원");
    }
    return [
      ROLE + " 아래 요구사항대로 '" + name + "' " + (isGame ? "웹 게임" : "웹앱") + "을 만들어줘.",
      "",
      "[만들 것]", pick(v.what, "what"),
      "",
      "[사용 대상]", pick(v.who, "who"),
      "",
      "[핵심 기능]", feats.map(function (f, i) { return (i + 1) + ". " + f; }).join("\n"),
      "",
      "[화면 디자인]",
      "- 분위기: " + pick(v.mood, "mood"),
      "- 맨 위에 '" + name + "' 제목과 한 줄 사용법 안내",
      "- 모든 글자와 버튼은 한국어, 버튼은 크고 누르기 쉽게, 누르면 색이 바뀌는 반응 효과",
      "- 스마트폰(가로 360px)부터 노트북까지 깨지지 않는 반응형 레이아웃",
      "",
      TECH,
      "",
      "[완성 전 스스로 점검]",
      "코드를 보여주기 전에 모든 버튼과 기능이 실제로 동작하는지, 콘솔 오류가 없는지 점검하고, 마지막에 사용 방법을 3줄로 요약해줘."
    ].join("\n");
  }

  function initBuilder() {
    var out = document.getElementById("builderPrompt");
    if (!out) return;
    var f = {
      name: document.getElementById("fName"),
      what: document.getElementById("fWhat"),
      who: document.getElementById("fWho"),
      feat: document.getElementById("fFeat"),
      mood: document.getElementById("fMood")
    };
    var radios = $$('input[name="fType"]');
    var btn = $('.copy-btn[data-copy="builderPrompt"]');
    function typeVal() { var r = radios.filter(function (x) { return x.checked; })[0]; return r ? r.value : "웹앱"; }
    function render() {
      out.innerHTML = highlight(buildPrompt({
        name: f.name.value, what: f.what.value, who: f.who.value, feat: f.feat.value, mood: f.mood.value, type: typeVal()
      }));
      if (btn) setCopied(btn, false);
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener("input", render); });
    radios.forEach(function (r) { r.addEventListener("change", function () { Sound.select(); render(); }); });
    $$("[data-idea]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var idea = IDEAS[+chip.getAttribute("data-idea")];
        if (!idea) return;
        Object.keys(f).forEach(function (k) { f[k].value = idea[k] || ""; });
        radios.forEach(function (r) { r.checked = r.value === idea.type; });
        render();
        toast("💡 예시를 불러왔어요! 내 아이디어로 고쳐 보세요");
      });
    });
    var reset = document.getElementById("builderReset");
    if (reset) reset.addEventListener("click", function () {
      Object.keys(f).forEach(function (k) { f[k].value = ""; });
      radios.forEach(function (r) { r.checked = r.value === "웹앱"; });
      render();
      f.name.focus();
    });
    render();
  }

  /* ---------- 상단 HUD 높이 · 메뉴 강조 ---------- */
  function syncHudHeight() {
    var hud = document.getElementById("hud");
    if (hud) document.documentElement.style.setProperty("--hud-h", hud.offsetHeight + 12 + "px");
  }
  function initScrollSpy() {
    var links = $$(".nav a"), nav = $(".nav");
    if (!("IntersectionObserver" in window) || !links.length) return;
    var setActive = function (id) {
      links.forEach(function (a) {
        var on = a.getAttribute("data-nav") === id;
        a.classList.toggle("is-active", on);
        if (on) {
          a.setAttribute("aria-current", "true");
          if (nav && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
        } else a.removeAttribute("aria-current");
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id === "home" ? "" : en.target.id); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["home", "howto", "blueprint", "missions", "bugfix", "builder"].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ---------- 맨위 버튼 ---------- */
  function initToTop() {
    var btn = document.getElementById("toTop");
    if (!btn) return;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        btn.classList.toggle("is-show", (window.pageYOffset || document.documentElement.scrollTop) > 480);
        ticking = false;
      });
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var logo = $(".logo");
      if (logo) setTimeout(function () { logo.focus({ preventScroll: true }); }, 400);
    });
  }

  /* ---------- 등장 효과 ---------- */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { document.documentElement.classList.add("no-io"); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 시작 ---------- */
  function init() {
    renderGroups();
    renderSubs();
    initSubs();
    renderCards();
    applyFilter();
    initToolbar();
    initModal();
    renderBugs();
    initSound();
    initCopy();
    initQuest4();
    initBuilder();
    initReveal();
    syncHudHeight();
    initScrollSpy();
    initToTop();
    window.addEventListener("resize", syncHudHeight);
    updateHUD();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
