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
    fetch("restaurants/index.json").then(function (r) { return r.json(); }).then(function (list) {
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
    var h = '<div class="hero' + (cover ? " cover" : "") + '"' + (cover ? ' style="background-image:url(' + esc(cover) + ')"' : "") + '><div class="logo">' + logo + "</div><h1>" + esc(C.name) + "</h1><p>" + esc(C.tagline) + "</p></div>";
    h += '<div class="info"><span class="chip' + (C.open ? "" : " closed") + '">' + (C.open ? "مفتوح" : "مغلق حالياً") + "</span>";
    if (C.hours) h += '<span class="chip">🕒 ' + esc(C.hours) + "</span>";
    if (C.deliveryTime) h += '<span class="chip">🛵 ' + esc(C.deliveryTime) + "</span>";
    if (C.minOrder) h += '<span class="chip">أقل طلب ' + money(C.minOrder) + "</span>";
    h += "</div>";
    h += '<div class="tabs"><button data-c="all" class="' + (cat === "all" ? "on" : "") + '">الكل</button>' + C.categories.map(function (c) { return '<button data-c="' + esc(c.id) + '" class="' + (cat === c.id ? "on" : "") + '">' + esc(c.name) + "</button>"; }).join("") + "</div>";
    h += '<input class="search" id="q" placeholder="ابحث في المنيو..." value="' + esc(q) + '">';
    h += '<div id="list"></div>';
    if (C.address) h += "<footer>📍 " + esc(C.address) + "</footer>";
    h += '<div class="bar" id="bar"></div>';
    $app.innerHTML = h;
    $app.querySelector(".tabs").onclick = function (e) { var b = e.target.closest("button"); if (b) { cat = b.dataset.c; render(); } };
    var qi = document.getElementById("q");
    qi.oninput = function () { q = qi.value; list(); };
    list(); bar();
  }
  function list() {
    var out = "";
    C.categories.forEach(function (c) {
      if (cat !== "all" && cat !== c.id) return;
      var its = C.items.filter(function (i) { return i.cat === c.id && (!q || (i.name + " " + (i.desc || "")).indexOf(q) > -1); });
      if (!its.length) return;
      out += '<h2 class="cat">' + esc(c.name) + '</h2><div class="items">' + its.map(function (i) {
        var pic = safeUrl(i.image) ? '<img loading="lazy" src="' + esc(i.image) + '" alt="">' : esc(i.emoji || "🍽️");
        return '<div class="item"><div class="pic">' + pic + '</div><div class="body"><h3>' + esc(i.name) + "</h3>" + (i.desc ? '<p class="d">' + esc(i.desc) + "</p>" : "") + '<div class="row"><span class="price">' + money(i.price) + '</span><button class="add" data-i="' + esc(i.id) + '"' + (i.soldOut || !C.open ? " disabled" : "") + ">" + (i.soldOut ? "نفد" : "أضف") + "</button></div></div></div>";
      }).join("") + "</div>";
    });
    var el = document.getElementById("list");
    el.innerHTML = out || '<p class="err">مفيش نتائج</p>';
    el.onclick = function (e) { var b = e.target.closest(".add"); if (b && !b.disabled) pick(b.dataset.i); };
  }
  function bar() {
    var b = document.getElementById("bar");
    if (!count()) { b.style.display = "none"; return; }
    b.style.display = "block";
    b.innerHTML = "<button><span>🛒 السلة (" + count() + ")</span><span>" + money(sub()) + "</span></button>";
    b.firstChild.onclick = cartView;
  }
  function sheet(html, onready) {
    var bg = document.createElement("div"); bg.className = "sheet-bg";
    bg.innerHTML = '<div class="sheet">' + html + "</div>";
    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
    document.body.appendChild(bg);
    onready && onready(bg);
    return bg;
  }
  function pick(id) {
    var it = C.items.filter(function (x) { return x.id === id; })[0];
    if (!it.options || !it.options.length) return addLine(it, []);
    sheet("<h2>" + esc(it.name) + "</h2>" + it.options.map(function (o, n) { return '<label class="opt"><span><input type="checkbox" data-n="' + n + '"> ' + esc(o.name) + "</span><span>+" + money(o.price) + "</span></label>"; }).join("") + '<button class="btn" style="background:var(--primary)" id="ok">أضف للسلة</button>', function (bg) {
      bg.querySelector("#ok").onclick = function () {
        var sel = [].slice.call(bg.querySelectorAll("input:checked")).map(function (c) { return it.options[+c.dataset.n]; });
        addLine(it, sel); bg.remove();
      };
    });
  }
  function addLine(it, opts) {
    var k = it.id + "|" + opts.map(function (o) { return o.name; }).join(",");
    var ex = cart.filter(function (l) { return l.k === k; })[0];
    if (ex) ex.qty++; else cart.push({ k: k, name: it.name, opts: opts.map(function (o) { return o.name; }), price: it.price + opts.reduce(function (s, o) { return s + o.price; }, 0), qty: 1 });
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
      h += cart.map(function (l, i) { return '<div class="line"><div class="n">' + esc(l.name) + (l.opts.length ? "<small>" + esc(l.opts.join("، ")) + "</small>" : "") + '</div><div class="qty"><button data-a="-" data-i="' + i + '">−</button><b>' + l.qty + '</b><button data-a="+" data-i="' + i + '">+</button></div><b>' + money(l.price * l.qty) + "</b></div>"; }).join("");
      if (cart.length) {
        h += '<div class="seg" style="margin-top:12px"><label><input type="radio" name="type" value="delivery"' + (type === "delivery" ? " checked" : "") + "><span>🛵 دليفري</span></label>" + (C.pickup === false ? "" : '<label><input type="radio" name="type" value="pickup"' + (type === "pickup" ? " checked" : "") + "><span>🏪 استلام من الفرع</span></label>") + "</div>";
        h += '<div style="margin-top:10px"><div class="sum"><span>الطلبات</span><span>' + money(t.s) + '</span></div><div class="sum"><span>التوصيل</span><span>' + (type === "delivery" ? money(t.d) : "-") + '</span></div><div class="sum t"><span>الإجمالي</span><span>' + money(t.t) + "</span></div></div>";
        h += '<label class="f">الاسم</label><input class="in" name="name" value="' + esc(f.name || saved.name) + '">';
        h += '<label class="f">رقم الموبايل</label><input class="in" name="phone" inputmode="tel" value="' + esc(f.phone || saved.phone) + '">';
        if (type === "delivery") h += '<label class="f">العنوان بالتفصيل</label><textarea class="in" name="addr" rows="2">' + esc(f.addr || saved.addr) + "</textarea>";
        h += '<label class="f">ملاحظات (اختياري)</label><textarea class="in" name="note" rows="2">' + esc(f.note) + "</textarea>";
        h += '<div id="err" class="msg" style="display:none;color:#b71c1c"></div>';
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
    if (bad) { err.style.display = "block"; err.textContent = bad; return; }
    localStorage.setItem("talabak:cust", JSON.stringify({ name: name, phone: phone, addr: addr }));
    var no = String(Date.now()).slice(-6);
    var L = ["🧾 طلب جديد #" + no + " - " + C.name, ""];
    cart.forEach(function (l) { L.push(l.qty + "× " + l.name + (l.opts.length ? " (" + l.opts.join("، ") + ")" : "") + " = " + l.price * l.qty); });
    L.push("", "الطلبات: " + t.s + " " + C.currency);
    if (type === "delivery") L.push("التوصيل: " + t.d + " " + C.currency);
    L.push("الإجمالي: " + t.t + " " + C.currency, "", type === "delivery" ? "🛵 دليفري" : "🏪 استلام من الفرع", "الاسم: " + name, "الموبايل: " + phone);
    if (type === "delivery") L.push("العنوان: " + addr);
    if (note) L.push("ملاحظات: " + note);
    var text = L.join("\n");
    function done() { cart = []; save(); bar(); bg.querySelector(".sheet").innerHTML = '<h2>✅ تم تجهيز طلبك #' + no + '</h2><p>لو واتساب ما فتحش، ابعت الطلب يدوي للمطعم.</p><button class="btn alt" onclick="this.closest(\'.sheet-bg\').remove()">تمام</button>'; }
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
