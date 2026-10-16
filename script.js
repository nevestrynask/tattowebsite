// Script do site Duda Neves Tatto
// Tudo está dentro de uma função para não vazar variáveis para a página.

(function () {
    var $ = function (s, r) {
        return (r || document).querySelector(s);
    };
    var $$ = function (s, r) {
        return Array.prototype.slice.call((r || document).querySelectorAll(s));
    };
    var root = document.documentElement;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduce;
    function sym(id) {
        return '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#s-' + id + '"/></svg>';
    }

    // ----------------------------------------------
    // TEMA CLARO / ESCURO
    // ----------------------------------------------
    try {
        var saved = localStorage.getItem("dn-theme");
        if (saved) root.setAttribute("data-theme", saved);
    } catch (e) {}
    $("#themeBtn").addEventListener("click", function () {
        var cur =
            root.getAttribute("data-theme") ||
            (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        var next = cur === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try {
            localStorage.setItem("dn-theme", next);
        } catch (e) {}
    });

    // ----------------------------------------------
    // MENU NO CELULAR
    // ----------------------------------------------
    var menuBtn = $("#menuBtn"),
        links = $("#navLinks");
    menuBtn.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });
    $$("#navLinks a").forEach(function (a) {
        a.addEventListener("click", function () {
            links.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
        });
    });

    // ----------------------------------------------
    // FAIXA COM OS ESTILOS
    // ----------------------------------------------
    var words = [
        "Fine line",
        "Blackwork",
        "Old school",
        "Cobertura",
        "Lettering",
        "Realismo",
        "Flash day",
    ];
    var strip = "";
    for (var k = 0; k < 2; k++) {
        words.forEach(function (w) {
            strip += "<span>" + w + "</span><i>✦</i>";
        });
    }
    $("#marquee").innerHTML = strip + strip;

    // ----------------------------------------------
    // TRABALHOS (GALERIA E FILTROS)
    // ----------------------------------------------
    // COMO COLOCAR AS FOTOS DAS TATUAGENS
    // 1. Salve as fotos na pasta "assets" (ex.: assets/jasmim.jpg).
    // 2. Na tatuagem desejada, adicione  foto: "assets/jasmim.jpg"
    //    Sem "foto", o site mostra o desenho de exemplo.
    // Campos: t = título, s = estilo, y = desenho de exemplo,
    //         z = tamanho, p = local do corpo, foto = caminho da imagem
    var works = [
            {
                t: "Jesus Cristo",
                s: "Realismo",
                y: "religioso",
                z: "25 cm",
                p: "Braço",
                foto: "assets/img1.jpg",
            },

        { 
            t: "Leoa e Filhotes", 
            s: "Fine line", 
            y: "animal", 
            z: "20 cm", 
            p: "Braço",
            foto: "assets/img2.jpg",
        },

        { 
            t: "São Miguel Arcanjo", 
            s: "Realismo", 
            y: "religioso", 
            z: "22 cm", 
            p: "Panturrilha",
            foto: "assets/img3.jpg",
        },

        { 
            t: "Flores e Borboletas", 
            s: "Fine Line", 
            y: "botânico", 
            z: "35 cm", 
            p: "Braço",
            foto: "assets/img4.jpg",
        },
        { 
            t: "Naruto e Kurama", 
            s: "Anime", 
            y: "anime", 
            z: "22 cm", 
            p: "Braço",
            foto: "assets/img5.jpg",
        },

        { 
            t: "Floral", 
            s: "Fine Line", 
            y: "Botânico", 
            z: "25 cm", 
            p: "Costela",
            foto: "assets/img6.jpg",
        },

        {
		t: "Kanji Amor (Ai)",
		s: "Caligrafia Oriental",
		y: "oriental",
		z: "8 cm",
		p: "Cintura",
		foto: "assets/img7.jpg",
		},

        {
		t: "Raízes Orgânicas",
		s: "Blackwork",
		y: "ornamental",
		z: "20 cm",
		p: "Pescoço",
		foto: "assets/img8.jpg",
		},
    ];
    // Devolve a foto (se existir) ou o desenho de exemplo
    function arte(w) {
        if (w.foto) {
            return '<img src="' + w.foto + '" alt="' + w.t + ', tatuagem ' + w.s + '" loading="lazy" />';
        }
        return sym(w.y);
    }

    var grid = $("#grid");
    grid.innerHTML = works
        .map(function (w, i) {
            return (
                '<button class="tile' +
                (w.foto ? " tem-foto" : "") +
                '" type="button" data-i="' +
                i +
                '" data-s="' +
                w.s +
                '" aria-label="' +
                w.t +
                ", " +
                w.s +
                '">' +
                '<span class="ph mono">[ foto ]</span><span class="art">' +
                arte(w) +
                "</span>" +
                '<span class="cap"><b>' +
                w.t +
                "</b><span>" +
                w.s +
                " · " +
                w.z +
                "</span></span></button>"
            );
        })
        .join("");
    var styles = ["Todos", "Realismo","Fine line", "Blackwork", "Caligrafia Oriental", "Anime"];
    var filters = $("#filters");
    filters.innerHTML = styles
        .map(function (s, i) {
            return (
                '<button class="chip" type="button" aria-pressed="' +
                (i === 0) +
                '" data-f="' +
                s +
                '">' +
                s +
                "</button>"
            );
        })
        .join("");
    filters.addEventListener("click", function (e) {
        var b = e.target.closest(".chip");
        if (!b) return;
        $$(".chip", filters).forEach(function (c) {
            c.setAttribute("aria-pressed", String(c === b));
        });
        var f = b.getAttribute("data-f"),
            shown = [];
        $$(".tile").forEach(function (t) {
            var ok = f === "Todos" || t.getAttribute("data-s") === f;
            t.hidden = !ok;
            if (ok) shown.push(t);
        });
        if (window.gsap && !reduce) {
            gsap.fromTo(
                shown,
                { scale: 0.88, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.45, stagger: 0.05, ease: "back.out(1.5)" },
            );
        }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    // ----------------------------------------------
    // JANELA DE DETALHE DO TRABALHO
    // ----------------------------------------------
    var lb = $("#lb"),
        lastFocus = null,
        current = null;
    function openLb(i) {
        var w = works[i];
        current = w;
        lastFocus = document.activeElement;
        $("#lbArt").innerHTML = arte(w);
        $("#lbArt").classList.toggle("tem-foto", !!w.foto);
        $("#lbStyle").textContent = w.s;
        $("#lbTitle").textContent = w.t;
        $("#lbText").textContent =
            "Aqui entram a foto real, a história da peça e o que a cliente pediu. Texto de exemplo.";
        $("#lbMeta").textContent = w.z + " · " + w.p;
        lb.classList.add("open");
        lb.setAttribute("aria-hidden", "false");
        $("#lbClose").focus();
    }
    function closeLb() {
        lb.classList.remove("open");
        lb.setAttribute("aria-hidden", "true");
        if (lastFocus) lastFocus.focus();
    }
    grid.addEventListener("click", function (e) {
        var t = e.target.closest(".tile");
        if (t) openLb(+t.getAttribute("data-i"));
    });
    $("#lbClose").addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) {
        if (e.target === lb) closeLb();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && lb.classList.contains("open")) closeLb();
    });
    $("#lbBook").addEventListener("click", function () {
        if (current) setStyle(current.s);
        lb.classList.remove("open");
        lb.setAttribute("aria-hidden", "true");
    });

    // ----------------------------------------------
    // CARTÕES QUE INCLINAM COM O MOUSE
    // ----------------------------------------------
    if (window.matchMedia("(pointer:fine)").matches && !reduce) {
        $$(".tile").forEach(function (t) {
            t.addEventListener("pointermove", function (e) {
                var r = t.getBoundingClientRect(),
                    x = (e.clientX - r.left) / r.width - 0.5,
                    y = (e.clientY - r.top) / r.height - 0.5;
                t.style.transform =
                    "perspective(700px) rotateY(" + x * 10 + "deg) rotateX(" + -y * 10 + "deg)";
            });
            t.addEventListener("pointerleave", function () {
                t.style.transform = "";
            });
        });
    }

    // ----------------------------------------------
    // AGENDAMENTO (CALENDÁRIO, HORÁRIOS E FICHA)
    // ----------------------------------------------
    var STYLES = [
        "Fine line",
        "Blackwork",
        "Old school",
        "Realismo",
        "Lettering",
        "Cobertura",
        "Ainda não sei",
    ];
    var PARTS = [
        "Braço",
        "Antebraço",
        "Perna",
        "Costas",
        "Costelas",
        "Mão ou pé",
        "Pescoço",
        "Outro",
    ];
    var SLOTS = ["10:00", "13:30", "16:00"];
    var st = { style: "Fine line", size: 10, part: "Antebraço", date: null, time: null };
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);

    function chips(el, list, key) {
        el.innerHTML = list
            .map(function (v) {
                return (
                    '<button type="button" class="chip" data-v="' +
                    v +
                    '" aria-pressed="' +
                    (st[key] === v) +
                    '">' +
                    v +
                    "</button>"
                );
            })
            .join("");
        el.addEventListener("click", function (e) {
            var b = e.target.closest(".chip");
            if (!b) return;
            st[key] = b.getAttribute("data-v");
            mark(el, key);
            renderTicket();
        });
    }
    function mark(el, key) {
        $$(".chip", el).forEach(function (c) {
            c.setAttribute("aria-pressed", String(c.getAttribute("data-v") === st[key]));
        });
    }
    function setStyle(v) {
        st.style = v;
        mark($("#styleChips"), "style");
        renderTicket();
    }
    chips($("#styleChips"), STYLES, "style");
    chips($("#partChips"), PARTS, "part");

    function renderSize() {
        var h = Math.max(1, Math.round(st.size / 4));
        $("#sizeOut").textContent = st.size + " cm";
        $("#sizeHint").textContent =
            "Sessão estimada: cerca de " +
            h +
            (h === 1 ? " hora." : " horas.") +
            (st.size > 24 ? " Peças grandes podem pedir mais de uma sessão." : "");
    }
    $("#size").addEventListener("input", function (e) {
        st.size = +e.target.value;
        renderSize();
        renderTicket();
    });

    function closed(d) {
        var w = d.getDay();
        return w === 0 || w === 1;
    }
    function full(d) {
        return !closed(d) && (d.getDate() * 7 + d.getMonth()) % 5 === 0;
    }
    function renderCal() {
        $("#monthLabel").textContent = view.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
        });
        var g = $("#calGrid"),
            html = ["D", "S", "T", "Q", "Q", "S", "S"]
                .map(function (d) {
                    return '<span class="dow mono">' + d + "</span>";
                })
                .join("");
        for (var b = 0; b < view.getDay(); b++) html += "<span></span>";
        var n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        for (var d = 1; d <= n; d++) {
            var dt = new Date(view.getFullYear(), view.getMonth(), d);
            var off = dt < today || closed(dt) || full(dt);
            var sel = st.date && st.date.getTime() === dt.getTime();
            html +=
                '<button type="button" class="day' +
                (full(dt) && dt >= today ? " full" : "") +
                '" data-d="' +
                d +
                '"' +
                (off ? " disabled" : "") +
                ' aria-pressed="' +
                !!sel +
                '" aria-label="' +
                dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) +
                (full(dt) && dt >= today ? ", lotado" : "") +
                '">' +
                d +
                "</button>";
        }
        g.innerHTML = html;
        var cur = new Date(today.getFullYear(), today.getMonth(), 1);
        $("#prevM").disabled = view <= cur;
        $("#prevM").style.opacity = view <= cur ? 0.35 : 1;
    }
    $("#prevM").addEventListener("click", function () {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        renderCal();
    });
    $("#nextM").addEventListener("click", function () {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        renderCal();
    });
    $("#calGrid").addEventListener("click", function (e) {
        var b = e.target.closest(".day");
        if (!b || b.disabled) return;
        st.date = new Date(view.getFullYear(), view.getMonth(), +b.getAttribute("data-d"));
        if (st.time && slotBusy(st.time)) st.time = null;
        renderCal();
        renderSlots();
        renderTicket();
    });
    function slotBusy(t) {
        return st.date ? (st.date.getDate() + SLOTS.indexOf(t)) % 4 === 0 : false;
    }
    function renderSlots() {
        $("#slots").innerHTML =
            SLOTS.map(function (t) {
                var off = !st.date || slotBusy(t);
                return (
                    '<button type="button" class="chip" data-t="' +
                    t +
                    '"' +
                    (off ? ' disabled style="opacity:.4;cursor:not-allowed"' : "") +
                    ' aria-pressed="' +
                    (st.time === t) +
                    '">' +
                    t +
                    "</button>"
                );
            }).join("") +
            (st.date
                ? ""
                : '<span class="hint" style="align-self:center">Escolha um dia para ver os horários.</span>');
    }
    $("#slots").addEventListener("click", function (e) {
        var b = e.target.closest(".chip");
        if (!b || b.disabled) return;
        st.time = b.getAttribute("data-t");
        renderSlots();
        renderTicket();
    });

    function put(id, v) {
        var el = $(id);
        el.textContent = v || "—";
        el.className = v ? "" : "empty";
    }
    function dateText() {
        return st.date
            ? st.date.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
              })
            : "";
    }
    function renderTicket() {
        put("#tStyle", st.style);
        put("#tSize", st.size + " cm");
        put("#tPart", st.part);
        put("#tTime", st.time);
        put("#tDate", dateText());
        put("#tName", $("#fName").value.trim());
    }
    $("#fName").addEventListener("input", renderTicket);

    $("#bookForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("#fName").value.trim(),
            phone = $("#fPhone").value.replace(/\D/g, ""),
            idea = $("#fIdea").value.trim(),
            err = $("#err");
        var done = $("#done");
        done.classList.remove("show");
        if (!st.date) {
            err.textContent = "Escolha um dia no calendário.";
            return;
        }
        if (!st.time) {
            err.textContent = "Escolha um horário para o dia selecionado.";
            return;
        }
        if (!name) {
            err.textContent = "Diga seu nome para a Duda saber com quem fala.";
            $("#fName").focus();
            return;
        }
        if (phone.length < 10) {
            err.textContent = "Informe seu WhatsApp com DDD.";
            $("#fPhone").focus();
            return;
        }
        err.textContent = "";
        var msg =
            "Olá, Duda! Quero agendar uma tatuagem.\n\nNome: " +
            name +
            "\nWhatsApp: " +
            $("#fPhone").value.trim() +
            "\nEstilo: " +
            st.style +
            "\nTamanho: cerca de " +
            st.size +
            " cm\nLocal: " +
            st.part +
            "\nData: " +
            dateText() +
            ", às " +
            st.time +
            (idea ? "\n\nIdeia: " + idea : "");
        $("#msg").textContent = msg;
        $("#wa").href = "https://wa.me/5500900000000?text=" + encodeURIComponent(msg);
        done.classList.add("show");
        if (window.gsap && !reduce) gsap.from(done, { y: 16, opacity: 0, duration: 0.5 });
    });
    renderSize();
    renderCal();
    renderSlots();
    renderTicket();

    // ----------------------------------------------
    // BOTÕES DE COPIAR CONTATO
    // ----------------------------------------------
    $$(".copy").forEach(function (b) {
        b.addEventListener("click", function () {
            var v = b.getAttribute("data-copy"),
                old = b.textContent;
            function ok() {
                b.textContent = "Copiado";
                setTimeout(function () {
                    b.textContent = old;
                }, 1400);
            }
            function fallback() {
                var r = document.createRange(),
                    span = b.previousElementSibling;
                r.selectNodeContents(span);
                var s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
                b.textContent = "Selecionado";
                setTimeout(function () {
                    b.textContent = old;
                }, 1400);
            }
            try {
                navigator.clipboard.writeText(v).then(ok, fallback);
            } catch (e) {
                fallback();
            }
        });
    });

    // ----------------------------------------------
    // CURSOR PERSONALIZADO
    // ----------------------------------------------
    if (window.matchMedia("(pointer:fine)").matches && !reduce) {
        var cur = $("#cur"),
            cx = 0,
            cy = 0,
            tx = 0,
            ty = 0;
        window.addEventListener("pointermove", function (e) {
            tx = e.clientX;
            ty = e.clientY;
            cur.classList.add("on");
        });
        (function loop() {
            cx += (tx - cx) * 0.2;
            cy += (ty - cy) * 0.2;
            cur.style.left = cx + "px";
            cur.style.top = cy + "px";
            requestAnimationFrame(loop);
        })();
        document.addEventListener("pointerover", function (e) {
            cur.classList.toggle("big", !!e.target.closest("a,button,.tile,summary,.day"));
        });
    }

    // ----------------------------------------------
    // NÚMEROS SEM ANIMAÇÃO (quando não há GSAP)
    // ----------------------------------------------
    function finalCounts() {
        $$("[data-count]").forEach(function (el) {
            el.textContent = (+el.getAttribute("data-count")).toLocaleString("pt-BR");
        });
    }
    if (!hasGsap) {
        finalCounts();
        return;
    }

    // ----------------------------------------------
    // ANIMAÇÕES COM GSAP E SCROLLTRIGGER
    // ----------------------------------------------
    gsap.registerPlugin(ScrollTrigger);
    // Evita pulos na rolagem do celular quando a barra do navegador some e aparece
    ScrollTrigger.config({ ignoreMobileResize: true });

    gsap.from(".hero-name .ln", {
        yPercent: 115,
        duration: 1.1,
        stagger: 0.15,
        ease: "power4.out",
    });
    gsap.from(".hero-name .tat", {
        scale: 0,
        rotate: -40,
        delay: 0.8,
        duration: 0.7,
        ease: "back.out(2)",
    });
    var draws = $$(".draw");
    draws.forEach(function (p) {
        var l = p.getTotalLength();
        p.style.strokeDasharray = l;
        p.style.strokeDashoffset = l;
    });
    gsap.to(draws, { strokeDashoffset: 0, duration: 1.8, stagger: 0.12, ease: "power2.inOut" });
    gsap.from(".float", {
        scale: 0,
        rotate: function () {
            return gsap.utils.random(-140, 140);
        },
        stagger: 0.12,
        duration: 1,
        delay: 0.4,
        ease: "back.out(1.6)",
    });
    gsap.from(".hero-bottom > *, .hero-meta", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        delay: 0.6,
        stagger: 0.12,
        ease: "power3.out",
    });

    // ----------------------------------------------
    // TÍTULO QUE SOME AOS POUCOS AO ROLAR
    // ----------------------------------------------
    gsap.to(".hero-name", {
        opacity: 0, // vai ficando transparente
        y: -60, // e sobe um pouco
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-name",
            start: 0, // começa assim que a página rola
            end: "bottom 15%", // termina quando o título quase saiu da tela
            scrub: true, // o efeito acompanha o dedo / a roda do mouse
        },
    });

    // ----------------------------------------------
    // PEÇAS QUE VOAM AO ROLAR (mesma ideia do site da Fanta)
    // ----------------------------------------------
    $$(".float").forEach(function (el) {
        var sp = parseFloat(el.getAttribute("data-speed"));
        gsap.to(el, {
            y: sp * 280,
            x: sp * -60,
            rotate: sp * 120,
            ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
    });
    gsap.to(".hero-art", {
        y: 140,
        rotate: 8,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    // ----------------------------------------------
    // HISTÓRIA: O TEXTO ACENDE PALAVRA POR PALAVRA
    // ----------------------------------------------
    (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
                var f = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(function (p) {
                    if (!p) return;
                    if (!p.trim()) {
                        f.appendChild(document.createTextNode(" "));
                        return;
                    }
                    var s = document.createElement("span");
                    s.className = "w";
                    s.textContent = p;
                    f.appendChild(s);
                });
                n.parentNode.replaceChild(f, n);
            } else if (n.nodeType === 1) {
                wrap(n);
            }
        });
    })($("#storyText"));
    gsap.fromTo(
        "#storyText .w",
        { opacity: 0.16 },
        {
            opacity: 1,
            stagger: 0.12,
            ease: "none",
            scrollTrigger: {
                trigger: "#storyText",
                start: "top 85%",
                end: "bottom 55%",
                scrub: true,
            },
        },
    );
    gsap.fromTo(
        "#frame",
        { rotate: -5 },
        {
            rotate: 3,
            ease: "none",
            scrollTrigger: {
                trigger: "#sobre",
                start: "top bottom",
                end: "bottom top",
                scrub: true,
            },
        },
    );
    gsap.to(".frame .sym", {
        rotate: 200,
        ease: "none",
        scrollTrigger: { trigger: "#sobre", start: "top bottom", end: "bottom top", scrub: true },
    });
    gsap.from(".tl", {
        x: -30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        scrollTrigger: { trigger: ".timeline", start: "top 85%" },
    });
    ScrollTrigger.create({
        trigger: ".stats",
        start: "top 90%",
        once: true,
        onEnter: function () {
            $$("[data-count]").forEach(function (el) {
                var o = { v: 0 },
                    to = +el.getAttribute("data-count");
                gsap.to(o, {
                    v: to,
                    duration: 2,
                    ease: "power2.out",
                    onUpdate: function () {
                        el.textContent = Math.round(o.v).toLocaleString("pt-BR");
                    },
                });
            });
        },
    });

    gsap.utils.toArray("h2.display").forEach(function (h) {
        gsap.from(h, {
            y: 60,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: h, start: "top 90%" },
        });
    });
    gsap.from(".tile", {
        y: 70,
        opacity: 0,
        rotate: function () {
            return gsap.utils.random(-5, 5);
        },
        stagger: 0.07,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: "#grid", start: "top 85%" },
    });
    gsap.from(".faq details", {
        y: 24,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        scrollTrigger: { trigger: ".faq", start: "top 88%" },
    });
    gsap.from(".crow", {
        x: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: { trigger: ".clist", start: "top 88%" },
    });
    gsap.fromTo(
        ".foot-big",
        { yPercent: 40 },
        {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
                trigger: "footer",
                start: "top bottom",
                end: "bottom bottom",
                scrub: true,
            },
        },
    );

    // ----------------------------------------------
    // PROCESSO: ROLAGEM HORIZONTAL FIXA (computador e celular)
    // A seção fica parada na tela enquanto os passos andam para o lado.
    // ----------------------------------------------
    var pin = $("#procPin"),
        track = $("#procTrack");
    pin.style.overflow = "hidden";
    // quanto a fila de cartões precisa andar para mostrar o último
    var dist = function () {
        return Math.max(0, track.scrollWidth - pin.clientWidth);
    };
    gsap.to(track, {
        x: function () {
            return -dist();
        },
        ease: "none",
        scrollTrigger: {
            trigger: "#processo",
            start: "top 64px", // fixa logo abaixo da barra de navegação
            end: function () {
                return "+=" + dist();
            },
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
        },
    });
    window.addEventListener("load", function () {
        ScrollTrigger.refresh();
    });
})();
