(function () {
  var $app = document.getElementById("app");
  var C, slug, cart = [], q = "", view = localStorage.getItem("talabak:view") || "list";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var safeUrl = function (u) { return /^(https?:\/\/|\.?\/?[\w\-./]+$)/.test(u || "") ? u : ""; };
  var isImg = function (u) { return !!safeUrl(u) && /[./]/.test(u); };
  var money = function (n) { return n + " " + C.currency; };
  var key = function () { return "talabak:" + slug; };
  var ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h3l-3.5 8H9l-3.5 3M9 14l3-8h3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.6 7.2.8-5.4 4.8 1.5 7.1L12 17.6 5.7 21.3l1.5-7.1L1.8 9.4 9 8.6z"/></svg>'
  };

  function getSlug(list) {
    var p = new URLSearchParams(location.search).get("r") || location.hash.replace("#", "");
    if (p && /^[\w-]+$/.test(p)) return p;
    return list[0];
  }
  function load() {
    fetch("restaurants/index.json?v=" + Date.now()).then(function (r) { return r.json(); }).then(function (list) {
      slug = getSlug(list);
      return fetch("restaurants/" + slug + "/config.json?v=" + Date.now());
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (c) {
      C = c;
      try { var o = JSON.parse(sessionStorage.getItem("talabak:preview") || "null"); if (o && new URLSearchParams(location.search).get("preview")) C = o; } catch (e) {}
      try { cart = JSON.parse(localStorage.getItem(key()) || "[]"); } catch (e) { cart = []; }
      init();
    }).catch(function () { $app.innerHTML = '<p class="err">المطعم غير موجود</p>'; });
  }
  function init() {
    document.title = C.name;
    var th = document.querySelector('meta[name=theme-color]'); if (th) th.content = C.theme.dark !== false ? "#0b0b0e" : "#faf6f1";
    var r = document.documentElement.style;
    r.setProperty("--primary", C.theme.primary); r.setProperty("--accent", C.theme.accent);
    r.setProperty("--onp", lum(C.theme.primary) > 0.62 ? "#111" : "#fff");
    document.body.classList.toggle("light", C.theme.dark === false);
    render();
  }
  function lum(h) { var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h || ""); if (!m) return 0; return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255; }
  function save() { localStorage.setItem(key(), JSON.stringify(cart)); }
  function sub() { return cart.reduce(function (s, l) { return s + l.price * l.qty; }, 0); }
  function count() { return cart.reduce(function (s, l) { return s + l.qty; }, 0); }
  function byId(id) { return C.items.filter(function (x) { return x.id === id; })[0]; }
  function img(it, cls) {
    if (isImg(it.image)) return '<div class="ph ' + (cls || "") + '"><img loading="lazy" decoding="async" src="' + esc(it.image) + '" alt="' + esc(it.name) + '" onload="this.classList.add(\'in\')"></div>';
    return '<div class="ph noimg ' + (cls || "") + '"><span>' + esc((it.emoji || it.name || "•").toString().charAt(0)) + "</span></div>";
  }
  function mono() { return esc((C.name || "?").trim().charAt(0)); }

  function render() {
    var cover = isImg(C.cover);
    var logo = isImg(C.logo) ? '<img src="' + esc(C.logo) + '" alt="">' : '<b>' + mono() + "</b>";
    var h = '<div class="mini" id="mini"><div class="mlogo">' + logo + '</div><b class="mname">' + esc(C.name) + '</b><button class="ic" id="mcart" aria-label="السلة">' + ICON.bag + '<i id="mcnt"></i></button></div>';
    h += '<header class="hero" id="hero">' + (cover ? '<div class="hbg" id="hbg" style="background-image:url(' + esc(C.cover) + ')"></div>' : '<div class="hbg grad" id="hbg"></div>') + '<div class="hfade"></div>';
    h += '<div class="htop"><button class="ic glass" id="share" aria-label="مشاركة">' + ICON.share + "</button>" + (C.whatsapp ? '<a class="ic glass" href="tel:+' + esc(String(C.whatsapp).replace(/\D/g, "")) + '" aria-label="اتصال">' + ICON.phone + "</a>" : "") + "</div>";
    h += '<div class="hbody"><div class="logo">' + logo + '</div><h1>' + esc(C.name) + "</h1><p>" + esc(C.tagline) + '</p><div class="chips"><span class="chip st ' + (C.open ? "open" : "closed") + '"><i></i>' + (C.open ? "مفتوح الآن" : "مغلق حالياً") + "</span>";
    if (C.deliveryTime) h += '<span class="chip">' + ICON.bike + esc(C.deliveryTime) + "</span>";
    if (C.hours) h += '<span class="chip">' + ICON.clock + esc(C.hours) + "</span>";
    if (C.address) h += '<span class="chip">' + ICON.pin + esc(C.address) + "</span>";
    h += "</div></div></header>";
    h += '<section class="fees"><div><small>أقل طلب</small><b>' + (C.minOrder ? money(C.minOrder) : "بدون") + '</b></div><div><small>التوصيل</small><b>' + (C.deliveryFee ? money(C.deliveryFee) : "مجاني") + '</b></div><div><small>الوقت</small><b>' + esc(C.deliveryTime || "-") + "</b></div></section>";
    if (!C.open) h += '<div class="closedbar">المطعم مقفول دلوقتي، تقدر تتفرج على المنيو بس</div>';
    h += '<div class="searchrow"><div class="sbox">' + ICON.search + '<input id="q" placeholder="ابحث عن صنف..." value="' + esc(q) + '"></div><div class="vt"><button data-v="list" class="' + (view === "list" ? "on" : "") + '" aria-label="قائمة">' + ICON.list + '</button><button data-v="grid" class="' + (view === "grid" ? "on" : "") + '" aria-label="شبكة">' + ICON.grid + "</button></div></div>";
    h += '<nav class="rail" id="rail"><div class="rail-in" id="tabs">' + C.categories.map(function (c) {
      var f = C.items.filter(function (i) { return i.cat === c.id && isImg(i.image); })[0];
      return '<button data-c="' + esc(c.id) + '"><span class="cth">' + (f ? '<img src="' + esc(f.image) + '" alt="">' : "<b>" + esc(c.name.charAt(0)) + "</b>") + "</span><em>" + esc(c.name) + "</em></button>";
    }).join("") + "</div></nav>";
    var feat = C.items.filter(function (i) { return i.featured && !i.soldOut; });
    if (feat.length) h += '<section class="feat"><h2 class="sec">' + ICON.star + ' الأكثر طلباً</h2><div class="fscroll">' + feat.map(function (i) { return '<article class="fc" data-i="' + esc(i.id) + '">' + img(i) + '<div class="fg"></div><div class="fi"><h3>' + esc(i.name) + '</h3><div class="fp"><b>' + money(i.price) + '</b><button class="plus" data-q="' + esc(i.id) + '" aria-label="أضف">' + ICON.plus + "</button></div></div></article>"; }).join("") + "</div></section>";
    h += '<main id="list"></main>';
    h += '<footer><div class="fl">' + logo + "</div>" + esc(C.name) + '<br><span class="pw">مدعوم بـ طلباتك</span></footer>';
    h += '<div class="bar" id="bar"></div><div class="toast" id="toast"></div>';
    $app.innerHTML = h;
    document.getElementById("tabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; var t = document.getElementById("cat-" + b.dataset.c); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 150, behavior: "smooth" }); };
    var qi = document.getElementById("q"); qi.oninput = function () { q = qi.value; list(); };
    document.querySelector(".vt").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; view = b.dataset.v; localStorage.setItem("talabak:view", view); document.querySelectorAll(".vt button").forEach(function (x) { x.classList.toggle("on", x === b); }); list(); };
    document.getElementById("share").onclick = function () { var u = location.href.split("#")[0]; if (navigator.share) navigator.share({ title: C.name, url: u }).catch(function () {}); else if (navigator.clipboard) { navigator.clipboard.writeText(u); toast("اتنسخ اللينك"); } };
    document.getElementById("mcart").onclick = function () { if (count()) cartView(); else toast("السلة فاضية"); };
    document.querySelector(".fscroll") && (document.querySelector(".fscroll").onclick = clickHandler);
    list(); bar(); fx();
  }
  function clickHandler(e) {
    var p = e.target.closest(".plus"), a = e.target.closest("[data-i]");
    if (p) { e.stopPropagation(); var it = byId(p.dataset.q); if (!C.open) return toast("المطعم مقفول"); if (groupsOf(it).length) return detail(it); addLine(it, [], 1, ""); toast("اتضاف: " + it.name); pulse(p); return; }
    if (a && !a.classList.contains("out")) detail(byId(a.dataset.i));
  }
  function pulse(el) { el.classList.remove("ping"); void el.offsetWidth; el.classList.add("ping"); }
  var fxOn = false;
  function fx() {
    if (fxOn) return; fxOn = true;
    var tick = false;
    function onS() {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        tick = false; var y = scrollY, hb = document.getElementById("hbg"), hero = document.getElementById("hero");
        if (hb && y < 900) { hb.style.transform = "translate3d(0," + (y * 0.35) + "px,0) scale(" + (1 + y / 2200) + ")"; }
        var hh = hero ? hero.offsetHeight : 400;
        document.getElementById("mini").classList.toggle("on", y > hh - 90);
        var cur = null;
        C.categories.forEach(function (c) { var e = document.getElementById("cat-" + c.id); if (e && e.getBoundingClientRect().top < 190) cur = c.id; });
        document.querySelectorAll("#tabs button").forEach(function (b) { var on = b.dataset.c === cur; b.classList.toggle("on", on); if (on && b._s !== 1) { b._s = 1; var p = b.parentNode; p.scrollTo({ left: b.offsetLeft - p.clientWidth / 2 + b.clientWidth / 2, behavior: "smooth" }); } if (!on) b._s = 0; });
      });
    }
    addEventListener("scroll", onS, { passive: true }); onS();
  }
  function toast(t) { var e = document.getElementById("toast"); if (!e) return; e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on"); }, 1700); if (navigator.vibrate) navigator.vibrate(12); }
  function list() {
    var out = "", n = 0;
    C.categories.forEach(function (c) {
      var its = C.items.filter(function (i) { return i.cat === c.id && (!q || (i.name + " " + (i.desc || "")).indexOf(q) > -1); });
      if (!its.length) return;
      out += '<h2 class="cat" id="cat-' + esc(c.id) + '"><span>' + esc(c.name) + "</span><small>" + its.length + '</small></h2><div class="items ' + view + '">' + its.map(function (i) {
        var inCart = cart.reduce(function (s, l) { return s + (l.id === i.id ? l.qty : 0); }, 0);
        return '<article class="item rv' + (i.soldOut ? " out" : "") + '" data-i="' + esc(i.id) + '" style="--d:' + Math.min(n++ % 6, 5) * 60 + 'ms">' + img(i) + '<div class="body"><h3>' + esc(i.name) + "</h3>" + (i.desc ? '<p class="d">' + esc(i.desc) + "</p>" : "") + '<div class="pr"><span class="price">' + money(i.price) + (groupsOf(i).length ? "<small> وأكتر</small>" : "") + "</span>" + (i.soldOut ? '<em class="so">نفد</em>' : '<button class="plus' + (inCart ? " has" : "") + '" data-q="' + esc(i.id) + '" aria-label="أضف">' + (inCart ? inCart : ICON.plus) + "</button>") + "</div></div></article>";
      }).join("") + "</div>";
    });
    var el = document.getElementById("list");
    el.innerHTML = out || '<p class="err">مفيش نتائج</p>';
    el.onclick = clickHandler;
    if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" }); el.querySelectorAll(".rv").forEach(function (x) { io.observe(x); }); } else el.querySelectorAll(".rv").forEach(function (x) { x.classList.add("vis"); });
  }
  function bar() {
    var b = document.getElementById("bar"); if (!b) return;
    var mc = document.getElementById("mcnt"); if (mc) { mc.textContent = count() || ""; mc.style.display = count() ? "flex" : "none"; }
    if (!count()) { b.classList.remove("on"); }
    else {
      b.classList.add("on");
      var th = cart.slice(0, 3).map(function (l) { var it = byId(l.id); return it && isImg(it.image) ? '<img src="' + esc(it.image) + '" alt="">' : "<u></u>"; }).join("");
      b.innerHTML = '<button><span class="stack">' + th + '</span><span class="bl"><b>شوف السلة</b><small>' + count() + " صنف</small></span><span class=\"bt\">" + money(sub()) + "</span></button>";
      b.firstChild.onclick = cartView;
      b.firstChild.classList.remove("pop"); void b.firstChild.offsetWidth; b.firstChild.classList.add("pop");
    }
    document.querySelectorAll("#list .plus").forEach(function (p) { var n = cart.reduce(function (s, x) { return s + (x.id === p.dataset.q ? x.qty : 0); }, 0); p.innerHTML = n ? n : ICON.plus; p.classList.toggle("has", !!n); });
  }
  function sheet(html, onready, cls) {
    var bg = document.createElement("div"); bg.className = "sheet-bg";
    bg.innerHTML = '<div class="sheet ' + (cls || "") + '"><div class="grip"></div>' + html + "</div>";
    bg.onclick = function (e) { if (e.target === bg) close(); };
    function close() { bg.classList.add("bye"); setTimeout(function () { bg.remove(); document.body.classList.remove("lock"); }, 220); }
    bg.close = close;
    document.body.classList.add("lock"); document.body.appendChild(bg);
    var cb = bg.querySelector(".xb"); if (cb) cb.onclick = close;
    onready && onready(bg);
    return bg;
  }
  function groupsOf(it) {
    var g = (it.groups || []).slice();
    (it.groupRefs || []).forEach(function (id) { (C.sharedGroups || []).forEach(function (x) { if (x.id === id) g.push(x); }); });
    if (it.options && it.options.length) g.push({ name: "إضافات", type: "multi", choices: it.options });
    return g;
  }
  function detail(it) {
    var qty = 1, G = groupsOf(it), sel = G.map(function (g) { return g.type === "single" && g.required !== false ? [0] : []; });
    function gHtml() {
      return G.map(function (g, gi) {
        var single = g.type === "single", req = single ? g.required !== false : !!g.required || (g.min > 0);
        var hint = single ? "اختار واحد" : (g.max ? "لحد " + g.max : "اختياري");
        return '<div class="grp"><h4>' + esc(g.name) + ' <small class="' + (req ? "rq" : "") + '">' + (req ? "مطلوب" : "اختياري") + " • " + hint + "</small></h4>" + (g.choices || []).map(function (c, ci) {
          var on = sel[gi].indexOf(ci) > -1;
          return '<div class="opt' + (on ? " on" : "") + '" data-g="' + gi + '" data-c="' + ci + '"><span><b class="ck ' + (single ? "rd" : "") + '"></b>' + esc(c.name) + "</span><span class=\"op\">" + (c.price ? (c.price > 0 ? "+" : "") + money(c.price) : "") + "</span></div>";
        }).join("") + "</div>";
      }).join("");
    }
    sheet('<button class="xb ic glass" aria-label="إغلاق">' + ICON.close + "</button>" + img(it, "dph") + '<div class="dbody"><div class="dt"><h2>' + esc(it.name) + '</h2><span class="dprice">' + money(it.price) + "</span></div>" + (it.desc ? '<p class="dd">' + esc(it.desc) + "</p>" : "") + '<div id="gs"></div><label class="f">ملاحظات على الصنف</label><input class="in" id="inote" placeholder="مثلاً: من غير بصل"><div id="gerr" class="msg" style="display:none"></div></div>' +
      '<div class="dfoot"><div class="qty big"><button id="mn">−</button><b id="qn">1</b><button id="pl">+</button></div><button class="btn p" id="ok"></button></div>', function (bg) {
      function chosen() { var out = []; G.forEach(function (g, gi) { sel[gi].slice().sort().forEach(function (ci) { out.push({ g: g.name, name: g.choices[ci].name, price: g.choices[ci].price || 0 }); }); }); return out; }
      function tot() { return chosen().reduce(function (s, x) { return s + x.price; }, it.price) * qty; }
      function up() { bg.querySelector("#gs").innerHTML = gHtml(); bg.querySelector("#qn").textContent = qty; bg.querySelector("#ok").innerHTML = "<span>أضف للسلة</span><b>" + money(tot()) + "</b>"; }
      bg.querySelector("#gs").onclick = function (e) {
        var o = e.target.closest(".opt"); if (!o) return; var gi = +o.dataset.g, ci = +o.dataset.c, g = G[gi], s2 = sel[gi], at = s2.indexOf(ci);
        if (g.type === "single") { if (at > -1) { if (g.required === false) s2.length = 0; } else sel[gi] = [ci]; }
        else if (at > -1) s2.splice(at, 1); else { if (g.max && s2.length >= g.max) { toast("أقصى عدد " + g.max); return; } s2.push(ci); }
        up();
      };
      bg.querySelector("#mn").onclick = function () { if (qty > 1) qty--; up(); };
      bg.querySelector("#pl").onclick = function () { qty++; up(); };
      bg.querySelector("#ok").onclick = function () {
        if (!C.open) { toast("المطعم مقفول"); return; }
        for (var gi = 0; gi < G.length; gi++) { var g = G[gi], need = g.type === "single" ? (g.required !== false ? 1 : 0) : (g.min || (g.required ? 1 : 0)); if (sel[gi].length < need) { var er = bg.querySelector("#gerr"); er.style.display = "block"; er.textContent = "اختار من: " + g.name; return; } }
        addLine(it, chosen(), qty, bg.querySelector("#inote").value.trim()); toast("اتضاف: " + it.name); bg.close();
      };
      up();
    }, "full");
  }
  function addLine(it, opts, qty, note) {
    var k = it.id + "|" + opts.map(function (o) { return o.g + ":" + o.name; }).join(",") + "|" + (note || "");
    var ex = cart.filter(function (l) { return l.k === k; })[0];
    if (ex) ex.qty += qty; else cart.push({ k: k, id: it.id, name: it.name, note: note || "", opts: opts.map(function (o) { return o.name; }), optsFull: opts.map(function (o) { return o.g + ": " + o.name; }), price: it.price + opts.reduce(function (s, o) { return s + o.price; }, 0), qty: qty });
    save(); bar();
  }
  function thumb(l) { var it = byId(l.id); return it && isImg(it.image) ? '<img class="lt" src="' + esc(it.image) + '" alt="">' : '<span class="lt"></span>'; }
  function conf() { var s = "", cs = ["#ffb020", "#e11d2e", "#22c55e", "#38bdf8", "#fff"]; for (var i = 0; i < 28; i++) s += '<i style="left:' + (Math.random() * 100) + '%;background:' + cs[i % 5] + ';animation-delay:' + (Math.random() * 0.4) + 's;--x:' + (Math.random() * 120 - 60) + 'px"></i>'; return s; }
  function totals(type) {
    var s = sub(), d = type === "delivery" ? (C.deliveryFee || 0) : 0;
    return { s: s, d: d, t: s + d };
  }
  function cartView() {
    var saved = {}; try { saved = JSON.parse(localStorage.getItem("talabak:cust") || "{}"); } catch (e) {}
    var bg = sheet("", function (bg) { draw(bg); });
    function draw(bg) {
      var type = (bg.querySelector("input[name=type]:checked") || {}).value || (C.pickup === false ? "delivery" : "delivery");
      var f = {}; ["name", "phone", "addr", "note"].forEach(function (n) { var e = bg.querySelector("[name=" + n + "]"); f[n] = e ? e.value : (saved[n] || ""); });
      var t = totals(type);
      var h = "<h2 class=\"ct\">سلتك</h2>";
      if (!cart.length) h += '<p class="err">السلة فاضية</p>';
      h += cart.map(function (l, i) { return '<div class="line">' + thumb(l) + '<div class="n">' + esc(l.name) + ((l.opts.length || l.note) ? "<small>" + esc(l.opts.join("، ") + (l.note ? (l.opts.length ? " • " : "") + l.note : "")) + "</small>" : "") + '</div><div class="qty"><button data-a="-" data-i="' + i + '">−</button><b>' + l.qty + '</b><button data-a="+" data-i="' + i + '">+</button></div><b>' + money(l.price * l.qty) + "</b></div>"; }).join("");
      if (cart.length) {
        h += '<div class="seg" style="margin-top:12px"><label><input type="radio" name="type" value="delivery"' + (type === "delivery" ? " checked" : "") + "><span>دليفري</span></label>" + (C.pickup === false ? "" : '<label><input type="radio" name="type" value="pickup"' + (type === "pickup" ? " checked" : "") + "><span>استلام من الفرع</span></label>") + "</div>";
        h += '<div style="margin-top:10px"><div class="sum"><span>الطلبات</span><span>' + money(t.s) + '</span></div><div class="sum"><span>التوصيل</span><span>' + (type === "delivery" ? money(t.d) : "-") + '</span></div><div class="sum t"><span>الإجمالي</span><span>' + money(t.t) + "</span></div></div>";
        h += '<label class="f">الاسم</label><input class="in" name="name" value="' + esc(f.name || saved.name) + '">';
        h += '<label class="f">رقم الموبايل</label><input class="in" name="phone" inputmode="tel" value="' + esc(f.phone || saved.phone) + '">';
        if (type === "delivery") h += '<label class="f">العنوان بالتفصيل</label><textarea class="in" name="addr" rows="2">' + esc(f.addr || saved.addr) + "</textarea>";
        h += '<label class="f">ملاحظات (اختياري)</label><textarea class="in" name="note" rows="2">' + esc(f.note) + "</textarea>";
        h += '<div id="err" class="msg" style="display:none"></div>';
        h += '<button class="btn" id="wa">إرسال الطلب على واتساب</button>';
        if (C.email) h += '<button class="btn alt" id="em">إرسال الطلب بالإيميل</button>';
      }
      bg.querySelector(".sheet").innerHTML = h;
      bg.querySelectorAll(".qty button").forEach(function (b) { b.onclick = function () { var l = cart[+b.dataset.i]; l.qty += b.dataset.a === "+" ? 1 : -1; if (l.qty < 1) cart.splice(+b.dataset.i, 1); save(); bar(); draw(bg); }; });
      bg.querySelectorAll("input[name=type]").forEach(function (r) { r.onchange = function () { draw(bg); }; });
      var wa = bg.querySelector("#wa"), em = bg.querySelector("#em");
      if (wa) wa.onclick = function () { submit(bg, "wa"); };
      if (em) em.onclick = function () { submit(bg, "em"); };
    }
  }
  function val(bg, n) { var e = bg.querySelector("[name=" + n + "]"); return e ? e.value.trim() : ""; }
  function submit(bg, via) {
    var type = bg.querySelector("input[name=type]:checked").value, t = totals(type);
    var name = val(bg, "name"), phone = val(bg, "phone"), addr = val(bg, "addr"), note = val(bg, "note");
    var err = bg.querySelector("#err"), bad = "";
    if (!name) bad = "اكتب اسمك"; else if (!/^[\d+\s-]{8,}$/.test(phone)) bad = "اكتب رقم موبايل صحيح"; else if (type === "delivery" && addr.length < 5) bad = "اكتب العنوان"; else if (C.minOrder && t.s < C.minOrder) bad = "أقل قيمة للطلب " + money(C.minOrder);
    if (bad) { err.style.display = "block"; err.textContent = bad; err.style.animation = "none"; void err.offsetWidth; err.style.animation = ""; return; }
    localStorage.setItem("talabak:cust", JSON.stringify({ name: name, phone: phone, addr: addr }));
    var no = String(Date.now()).slice(-6);
    var L = ["طلب جديد #" + no + " - " + C.name, ""];
    cart.forEach(function (l) { L.push(l.qty + "× " + l.name + (l.opts.length ? " (" + (l.optsFull || l.opts).join("، ") + ")" : "") + " = " + l.price * l.qty + (l.note ? "\n   ملاحظة: " + l.note : "")); });
    L.push("", "الطلبات: " + t.s + " " + C.currency);
    if (type === "delivery") L.push("التوصيل: " + t.d + " " + C.currency);
    L.push("الإجمالي: " + t.t + " " + C.currency, "", type === "delivery" ? "دليفري" : "استلام من الفرع", "الاسم: " + name, "الموبايل: " + phone);
    if (type === "delivery") L.push("العنوان: " + addr);
    if (note) L.push("ملاحظات: " + note);
    var text = L.join("\n");
    var name0 = name; function done() { cart = []; save(); bar(); list(); bg.querySelector(".sheet").innerHTML = '<div class="ok"><div class="confetti">' + conf() + '</div><div class="tick"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2>طلبك جاهز يا ' + esc(name) + '!</h2><p>رقم الطلب #' + no + '<br>اضغط إرسال في واتساب عشان المطعم يستلمه. لو واتساب ما فتحش ابعت الرسالة بنفسك.</p><button class="btn alt" onclick="document.querySelector(\'.sheet-bg\').close()">تمام</button></div>'; }
    if (via === "wa") {
      var num = String(C.whatsapp || "").replace(/\D/g, "");
      window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(text), "_blank");
      done();
    } else {
      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(C.email), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ _subject: "طلب جديد #" + no + " - " + C.name, message: text, name: name, phone: phone }) })
        .then(function (r) { if (!r.ok) throw 0; done(); })
        .catch(function () { location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent("طلب جديد #" + no) + "&body=" + encodeURIComponent(text); done(); });
    }
  }
  load();
})();
