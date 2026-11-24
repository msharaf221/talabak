(function () {
  var $app = document.getElementById("app");
  var C, slug, cart = [], cat = "all", q = "";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var safeUrl = function (u) { return /^(https?:\/\/|\.?\/?[\w\-./]+$)/.test(u || "") ? u : ""; };
  var money = function (n) { return n + " " + C.currency; };
  var key = function () { return "talabak:" + slug; };

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
      C = c; // admin preview override
      try { var o = JSON.parse(sessionStorage.getItem("talabak:preview") || "null"); if (o && new URLSearchParams(location.search).get("preview")) C = o; } catch (e) {}
      try { cart = JSON.parse(localStorage.getItem(key()) || "[]"); } catch (e) { cart = []; }
      init();
    }).catch(function () { $app.innerHTML = '<p class="err">المطعم غير موجود</p>'; });
  }
  function init() {
    document.title = C.name;
    document.documentElement.style.setProperty("--primary", C.theme.primary);
    document.documentElement.style.setProperty("--accent", C.theme.accent);
    document.documentElement.style.setProperty("--onp", lum(C.theme.primary) > 0.6 ? "#111" : "#fff");
    document.body.classList.toggle("dark", !!C.theme.dark);
    render();
  }
  function lum(h) { var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h || ""); if (!m) return 0; return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255; }
  function save() { localStorage.setItem(key(), JSON.stringify(cart)); }
  function sub() { return cart.reduce(function (s, l) { return s + l.price * l.qty; }, 0); }
  function count() { return cart.reduce(function (s, l) { return s + l.qty; }, 0); }

  function render() {
    var cover = safeUrl(C.cover);
    var logo = safeUrl(C.logo) && /[./]/.test(C.logo) ? '<img src="' + esc(C.logo) + '" alt="">' : esc(C.logo || "🍽️");
    var h = '<header class="hero' + (cover ? " cover" : "") + '"' + (cover ? ' style="background-image:url(' + esc(cover) + ')"' : "") + '><div class="blob b1"></div><div class="blob b2"></div><div class="hero-in"><div class="logo">' + logo + '</div><div class="ht"><h1>' + esc(C.name) + "</h1><p>" + esc(C.tagline) + "</p></div></div></header>";
    h += '<section class="info"><span class="chip st ' + (C.open ? "open" : "closed") + '"><i></i>' + (C.open ? "مفتوح الآن" : "مغلق حالياً") + "</span>";
    if (C.deliveryTime) h += '<span class="chip">🛵 ' + esc(C.deliveryTime) + "</span>";
    if (C.minOrder) h += '<span class="chip">أقل طلب ' + money(C.minOrder) + "</span>";
    if (C.deliveryFee) h += '<span class="chip">توصيل ' + money(C.deliveryFee) + "</span>";
    if (C.hours) h += '<span class="chip">🕒 ' + esc(C.hours) + "</span>";
    h += "</section>";
    if (!C.open) h += '<div class="closedbar">المطعم مقفول دلوقتي، تقدر تتفرج على المنيو بس.</div>';
    h += '<div class="stick"><div class="sbox"><span>🔍</span><input id="q" placeholder="ابحث في المنيو..." value="' + esc(q) + '"></div><nav class="tabs" id="tabs">' + C.categories.map(function (c) { return '<button data-c="' + esc(c.id) + '">' + esc(c.name) + "</button>"; }).join("") + "</nav></div>";
    h += '<main id="list"></main>';
    h += "<footer>" + (C.address ? "📍 " + esc(C.address) + "<br>" : "") + '<span class="pw">مدعوم بـ طلباتك</span></footer>';
    h += '<div class="bar" id="bar"></div><div class="toast" id="toast"></div>';
    $app.innerHTML = h;
    $app.querySelector("#tabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; var t = document.getElementById("cat-" + b.dataset.c); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 132, behavior: "smooth" }); };
    var qi = document.getElementById("q");
    qi.oninput = function () { q = qi.value; list(); };
    list(); bar(); spy();
  }
  function spy() {
    if (spy.on) return; spy.on = true;
    var tick = false;
    addEventListener("scroll", function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        tick = false; var cur = null;
        C.categories.forEach(function (c) { var e = document.getElementById("cat-" + c.id); if (e && e.getBoundingClientRect().top < 150) cur = c.id; });
        document.querySelectorAll("#tabs button").forEach(function (b) { var on = b.dataset.c === cur || (!cur && b === document.querySelector("#tabs button")); b.classList.toggle("on", on); if (on && !b._s) { b._s = 1; b.parentNode.scrollTo({ left: b.offsetLeft - b.parentNode.clientWidth / 2 + b.clientWidth / 2 - b.parentNode.offsetLeft, behavior: "smooth" }); } if (!on) b._s = 0; });
      });
    }, { passive: true });
  }
  function toast(t) { var e = document.getElementById("toast"); if (!e) return; e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on"); }, 1600); if (navigator.vibrate) navigator.vibrate(12); }
  function list() {
    var out = "", n = 0;
    C.categories.forEach(function (c) {
      var its = C.items.filter(function (i) { return i.cat === c.id && (!q || (i.name + " " + (i.desc || "")).indexOf(q) > -1); });
      if (!its.length) return;
      out += '<h2 class="cat" id="cat-' + esc(c.id) + '">' + esc(c.name) + ' <small>' + its.length + '</small></h2><div class="items">' + its.map(function (i) {
        var pic = safeUrl(i.image) ? '<img loading="lazy" src="' + esc(i.image) + '" alt="">' : '<span>' + esc(i.emoji || "🍽️") + "</span>";
        var inCart = cart.reduce(function (s, l) { return s + (l.id === i.id ? l.qty : 0); }, 0);
        return '<article class="item' + (i.soldOut ? " out" : "") + '" data-i="' + esc(i.id) + '" style="animation-delay:' + Math.min(n++ * 40, 400) + 'ms"><div class="body"><h3>' + esc(i.name) + "</h3>" + (i.desc ? '<p class="d">' + esc(i.desc) + "</p>" : "") + '<div class="price">' + money(i.price) + '</div></div><div class="pic">' + pic + (i.soldOut ? '<em>نفد</em>' : '<button class="plus" data-q="' + esc(i.id) + '" aria-label="أضف">' + (inCart ? inCart : "+") + "</button>") + "</div></article>";
      }).join("") + "</div>";
    });
    var el = document.getElementById("list");
    el.innerHTML = out || '<p class="err">مفيش نتائج 🤷</p>';
    el.onclick = function (e) {
      var p = e.target.closest(".plus"), a = e.target.closest(".item");
      if (p) { e.stopPropagation(); var it = byId(p.dataset.q); if (!C.open) return toast("المطعم مقفول"); if (groupsOf(it).length) return detail(it); addLine(it, [], 1, ""); toast("✓ اتضاف " + it.name); return; }
      if (a && !a.classList.contains("out")) detail(byId(a.dataset.i));
    };
  }
  function byId(id) { return C.items.filter(function (x) { return x.id === id; })[0]; }
  function bar() {
    var b = document.getElementById("bar");
    if (!b) return;
    if (!count()) { b.classList.remove("on"); return; }
    b.classList.add("on");
    b.innerHTML = '<button><span class="cnt">' + count() + "</span><span>شوف السلة</span><b>" + money(sub()) + "</b></button>";
    b.firstChild.onclick = cartView;
    b.firstChild.classList.remove("pop"); void b.firstChild.offsetWidth; b.firstChild.classList.add("pop");
    var l = document.getElementById("list"); if (l) { var cur = l.onclick; }
    document.querySelectorAll(".plus").forEach(function (p) { var n = cart.reduce(function (s, x) { return s + (x.id === p.dataset.q ? x.qty : 0); }, 0); p.textContent = n || "+"; p.classList.toggle("has", !!n); });
  }
  function sheet(html, onready) {
    var bg = document.createElement("div"); bg.className = "sheet-bg";
    bg.innerHTML = '<div class="sheet"><div class="grip"></div>' + html + "</div>";
    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
    document.body.appendChild(bg);
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
    var pic = safeUrl(it.image) ? '<img src="' + esc(it.image) + '" alt="">' : '<span>' + esc(it.emoji || "🍽️") + "</span>";
    function gHtml() {
      return G.map(function (g, gi) {
        var single = g.type === "single", req = single ? g.required !== false : !!g.required || (g.min > 0);
        var hint = single ? (req ? "اختار واحد" : "اختياري") : (g.max ? "لحد " + g.max : "اختياري") ;
        return '<div class="grp"><h4>' + esc(g.name) + ' <small class="' + (req ? "rq" : "") + '">' + (req ? "مطلوب" : "اختياري") + " • " + hint + "</small></h4>" + (g.choices || []).map(function (c, ci) {
          var on = sel[gi].indexOf(ci) > -1;
          return '<div class="opt' + (on ? " on" : "") + '" data-g="' + gi + '" data-c="' + ci + '"><span><b class="ck ' + (single ? "rd" : "") + '"></b> ' + esc(c.name) + "</span><span>" + (c.price ? (c.price > 0 ? "+" : "") + money(c.price) : "") + "</span></div>";
        }).join("") + "</div>";
      }).join("");
    }
    sheet('<div class="dpic">' + pic + '</div><h2>' + esc(it.name) + '</h2>' + (it.desc ? '<p class="dd">' + esc(it.desc) + "</p>" : "") + '<div id="gs"></div>' +
      '<label class="f">ملاحظات على الصنف (اختياري)</label><input class="in" id="inote" placeholder="مثلاً من غير بصل">' +
      '<div class="dfoot"><div class="qty big"><button id="mn">−</button><b id="qn">1</b><button id="pl">+</button></div><button class="btn p" id="ok"></button></div><div id="gerr" class="msg" style="display:none"></div>', function (bg) {
      function chosen() { var out = []; G.forEach(function (g, gi) { sel[gi].slice().sort().forEach(function (ci) { out.push({ g: g.name, name: g.choices[ci].name, price: g.choices[ci].price || 0 }); }); }); return out; }
      function tot() { var o = chosen(); return o.reduce(function (s, x) { return s + x.price; }, it.price) * qty; }
      function up() { bg.querySelector("#gs").innerHTML = gHtml(); bg.querySelector("#qn").textContent = qty; bg.querySelector("#ok").textContent = "أضف للسلة • " + money(tot()); }
      bg.querySelector("#gs").onclick = function (e) {
        var o = e.target.closest(".opt"); if (!o) return; var gi = +o.dataset.g, ci = +o.dataset.c, g = G[gi], s2 = sel[gi], at = s2.indexOf(ci);
        if (g.type === "single") { if (at > -1) { if (g.required === false) s2.length = 0; } else sel[gi] = [ci]; }
        else if (at > -1) s2.splice(at, 1); else { if (g.max && s2.length >= g.max) { toast("أقصى عدد " + g.max); return; } s2.push(ci); }
        up();
      };
      bg.querySelector("#mn").onclick = function () { if (qty > 1) qty--; up(); };
      bg.querySelector("#pl").onclick = function () { qty++; up(); };
      bg.querySelector("#ok").onclick = function () {
        for (var gi = 0; gi < G.length; gi++) { var g = G[gi], need = g.type === "single" ? (g.required !== false ? 1 : 0) : (g.min || (g.required ? 1 : 0)); if (sel[gi].length < need) { var er = bg.querySelector("#gerr"); er.style.display = "block"; er.textContent = "اختار من: " + g.name; return; } }
        addLine(it, chosen(), qty, bg.querySelector("#inote").value.trim()); toast("✓ اتضاف " + it.name); bg.remove();
      };
      up();
    });
  }
  function addLine(it, opts, qty, note) {
    var k = it.id + "|" + opts.map(function (o) { return o.g + ":" + o.name; }).join(",") + "|" + (note || "");
    var ex = cart.filter(function (l) { return l.k === k; })[0];
    if (ex) ex.qty += qty; else cart.push({ k: k, id: it.id, name: it.name, note: note || "", opts: opts.map(function (o) { return o.name; }), optsFull: opts.map(function (o) { return o.g + ": " + o.name; }), price: it.price + opts.reduce(function (s, o) { return s + o.price; }, 0), qty: qty });
    save(); bar();
  }
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
      var h = "<h2>سلتك</h2>";
      if (!cart.length) h += '<p class="err">السلة فاضية</p>';
      h += cart.map(function (l, i) { return '<div class="line"><div class="n">' + esc(l.name) + ((l.opts.length || l.note) ? "<small>" + esc(l.opts.join("، ") + (l.note ? (l.opts.length ? " • " : "") + "📝 " + l.note : "")) + "</small>" : "") + '</div><div class="qty"><button data-a="-" data-i="' + i + '">−</button><b>' + l.qty + '</b><button data-a="+" data-i="' + i + '">+</button></div><b>' + money(l.price * l.qty) + "</b></div>"; }).join("");
      if (cart.length) {
        h += '<div class="seg" style="margin-top:12px"><label><input type="radio" name="type" value="delivery"' + (type === "delivery" ? " checked" : "") + "><span>🛵 دليفري</span></label>" + (C.pickup === false ? "" : '<label><input type="radio" name="type" value="pickup"' + (type === "pickup" ? " checked" : "") + "><span>🏪 استلام من الفرع</span></label>") + "</div>";
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
    var L = ["🧾 طلب جديد #" + no + " - " + C.name, ""];
    cart.forEach(function (l) { L.push(l.qty + "× " + l.name + (l.opts.length ? " (" + (l.optsFull || l.opts).join("، ") + ")" : "") + " = " + l.price * l.qty + (l.note ? "\n   📝 " + l.note : "")); });
    L.push("", "الطلبات: " + t.s + " " + C.currency);
    if (type === "delivery") L.push("التوصيل: " + t.d + " " + C.currency);
    L.push("الإجمالي: " + t.t + " " + C.currency, "", type === "delivery" ? "🛵 دليفري" : "🏪 استلام من الفرع", "الاسم: " + name, "الموبايل: " + phone);
    if (type === "delivery") L.push("العنوان: " + addr);
    if (note) L.push("ملاحظات: " + note);
    var text = L.join("\n");
    var name0 = name; function done() { cart = []; save(); bar(); list(); bg.querySelector(".sheet").innerHTML = '<div class="ok"><div class="tick">✓</div><h2>طلبك جاهز يا ' + esc(name) + '!</h2><p>رقم الطلب #' + no + '<br>اضغط إرسال في واتساب عشان المطعم يستلمه. لو واتساب ما فتحش ابعت الرسالة بنفسك.</p><button class="btn alt" onclick="this.closest(\'.sheet-bg\').remove()">تمام</button></div>'; }
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
