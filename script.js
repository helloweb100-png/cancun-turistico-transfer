/* ==========================================================================
   Cancún Turístico Transfer — comportamiento de la landing
   Sin dependencias externas: todo el movimiento es JS + CSS propios.
   Principio: el contenido es visible por defecto; aquí solo se mejora.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración (único lugar donde vive el número) ---------- */
  // WhatsApp en formato internacional sin "+" (52 + 10 dígitos). Si queda vacío,
  // los botones de WhatsApp y el envío del formulario se ocultan.
  const WHATSAPP = '529843118039';

  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const safe = (fn) => { try { return fn(); } catch (err) { console.warn('[landing]', err); } };
  const waUrl = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

  const hooks = []; // funciones que corren en cada fotograma de scroll/resize

  /* ======================================================================
     1. WhatsApp: enlaces, botón flotante y respaldo si no hay número
     ====================================================================== */
  safe(() => {
    $$('[data-wa]').forEach((a) => {
      if (!WHATSAPP) { a.hidden = true; return; }
      a.href = waUrl(a.dataset.msg || 'Hola, quiero cotizar un traslado.');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    if (!WHATSAPP) {
      const submit = $('#quote-submit');
      if (submit) submit.hidden = true;
      const note = $('#quote-status');
      if (note) note.textContent = 'Por ahora escríbenos al correo o llámanos: los datos están debajo.';
    }
    const fl = $('.wa-float');
    if (fl && WHATSAPP) {
      setTimeout(() => { fl.classList.add('is-hint'); setTimeout(() => fl.classList.remove('is-hint'), 3800); }, 7000);
    }
  });

  /* ======================================================================
     2. Titulares por palabras (envuelve cada palabra para animarla)
     ====================================================================== */
  safe(() => {
    $$('[data-split]').forEach((el) => {
      const label = el.textContent.replace(/\s+/g, ' ').trim();
      const frag = document.createDocumentFragment();
      let cur = null;
      let i = 0;
      const push = (text, cls) => {
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { cur = null; frag.appendChild(document.createTextNode(' ')); return; }
          if (!cur) { cur = document.createElement('span'); cur.className = 'w'; frag.appendChild(cur); }
          const wi = document.createElement('span');
          wi.className = 'wi' + (cls ? ' ' + cls : '');
          wi.style.setProperty('--i', i++);
          wi.textContent = part;
          cur.appendChild(wi);
        });
      };
      el.childNodes.forEach((n) => {
        if (n.nodeName === 'BR') { cur = null; frag.appendChild(document.createElement('br')); return; }
        if (n.nodeType === 3) push(n.textContent, '');
        else if (n.nodeType === 1) push(n.textContent, n.className);
      });
      el.setAttribute('aria-label', label);
      el.textContent = '';
      el.appendChild(frag);
    });
  });

  /* ======================================================================
     3. Revelado al hacer scroll — IntersectionObserver + respaldo geométrico
     ====================================================================== */
  const pending = new Set();
  let io = null;

  const countUp = (el) => {
    const to = parseFloat(el.dataset.to);
    if (!isFinite(to)) return;
    if (reduce) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const dur = 1500;
    el.textContent = '0';
    const tick = (now) => {
      const k = clamp((now - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick); else el.textContent = String(to);
    };
    requestAnimationFrame(tick);
  };

  const show = (el) => {
    if (!pending.has(el)) return;
    pending.delete(el);
    if (io) io.unobserve(el);
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(countUp);
  };

  const sweep = () => {
    const vh = window.innerHeight;
    pending.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) show(el);
    });
  };

  safe(() => {
    // Hijos de [data-stagger] entran en cascada
    $$('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        child.setAttribute('data-reveal', '');
        child.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
      });
    });
    const els = $$('[data-reveal], [data-split]:not(.hero__title)');
    els.forEach((el) => pending.add(el));
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  });
  hooks.push(sweep);

  /* ======================================================================
     4. Cargador
     ====================================================================== */
  safe(() => {
    const loader = $('#loader');
    const pct = $('.loader__pct');
    const MIN = reduce ? 500 : 1600;
    const CAP = 2200;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      html.classList.add('is-ready');
      const h1 = $('.hero__title');
      if (h1) h1.classList.add('is-in');
      if (loader) {
        loader.classList.add('is-done');
        setTimeout(() => loader.remove(), 900);
      }
      sweep();
    };
    window.addEventListener('load', () => { loaded = true; });
    const tick = (now) => {
      const el = now - t0;
      const k = clamp(el / MIN);
      if (pct) pct.textContent = String(Math.round(100 * (1 - Math.pow(1 - k, 3))));
      if ((loaded && el >= MIN) || el >= CAP) { if (pct) pct.textContent = '100'; finish(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, CAP + 100); // respaldo si requestAnimationFrame se pausa
  });

  /* ======================================================================
     5. Encabezado, menú móvil y barra de progreso
     ====================================================================== */
  safe(() => {
    const header = $('.site-header');
    const burger = $('.burger');
    const nav = $('#nav');
    const bar = $('.progress');
    const setMenu = (open) => {
      header.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      html.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 960px)').addEventListener('change', () => setMenu(false));

    hooks.push(() => {
      const y = window.scrollY;
      header.classList.toggle('is-solid', y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? clamp(y / max).toFixed(4) : '0');
    });
  });

  /* ======================================================================
     6. Hero: spotlight, inclinación 3D, partículas y parallax
     ====================================================================== */
  const fields = [];

  const makeField = (canvas, o) => {
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return null;
    let w = 0, h = 0, dpr = 1, ps = [];
    const mouse = { x: -999, y: -999 };
    const f = { on: !('IntersectionObserver' in window), mouse, draw: null, resize: null };

    const seed = () => {
      const n = Math.round(clamp((w * h) / o.density, o.min, o.max));
      ps = [];
      for (let i = 0; i < n; i++) {
        ps.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.7 + 0.5,
          vx: (Math.random() - 0.5) * o.drift,
          vy: o.rise ? -(Math.random() * 0.5 + 0.18) * o.rise : (Math.random() - 0.5) * o.drift,
          ph: Math.random() * 6.28,
          c: o.colors[i % o.colors.length],
        });
      }
    };
    f.resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      f.draw(0);
    };
    f.draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (t) {
          p.x += p.vx + Math.sin(t / 1900 + p.ph) * 0.12;
          p.y += p.vy;
          if (o.mouse) {
            const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < 16000) { const d = Math.sqrt(d2) || 1, k = (1 - d2 / 16000) * 2.2; p.x += (dx / d) * k; p.y += (dy / d) * k; }
          }
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }
        const a = 0.28 + 0.62 * Math.pow(Math.sin(t / 1100 + p.ph), 2);
        ctx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      if (o.link) {
        ctx.lineWidth = 1;
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y, d = dx * dx + dy * dy;
            if (d < o.link * o.link) {
              ctx.strokeStyle = `rgba(110,215,230,${((1 - Math.sqrt(d) / o.link) * 0.26).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y); ctx.stroke();
            }
          }
        }
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => { f.on = e.isIntersecting; }), { rootMargin: '80px' })
        .observe(canvas.parentElement);
    }
    f.resize();
    fields.push(f);
    return f;
  };

  safe(() => {
    const hero = $('.hero');
    const stage = $('[data-stage]');
    const heroField = makeField($('.hero__canvas'), {
      density: 9000, min: 28, max: 90, drift: 0.28, rise: 0,
      colors: ['255,255,255', '125,232,228', '255,200,120', '120,180,255'], link: 120, mouse: true,
    });

    if (hero && finePointer && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        hero.style.setProperty('--px', (x * 100).toFixed(1));
        hero.style.setProperty('--py', (y * 100).toFixed(1));
        if (stage) {
          stage.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg');
          stage.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
        }
        if (heroField) { heroField.mouse.x = e.clientX - r.left; heroField.mouse.y = e.clientY - r.top; }
      });
      hero.addEventListener('pointerleave', () => {
        if (stage) { stage.style.setProperty('--rx', '0deg'); stage.style.setProperty('--ry', '0deg'); }
        if (heroField) { heroField.mouse.x = -999; heroField.mouse.y = -999; }
      });
    }

    // Parallax del contenido del hero con el scroll
    hooks.push(() => {
      if (!hero || reduce) return;
      const h = hero.offsetHeight || 1;
      hero.style.setProperty('--hs', clamp(window.scrollY / h).toFixed(3));
    });

    // Balanceo suave en pantallas táctiles (sin puntero)
    if (stage && !finePointer && !reduce) {
      fields.push({
        on: true, resize: null,
        draw: (t) => {
          if (!t) return;
          stage.style.setProperty('--rx', (Math.sin(t / 2600) * 3).toFixed(2) + 'deg');
          stage.style.setProperty('--ry', (Math.cos(t / 3100) * 6).toFixed(2) + 'deg');
        },
      });
    }
  });

  safe(() => {
    makeField($('.cierre__canvas'), {
      density: 14000, min: 22, max: 56, drift: 0.2, rise: 1.1,
      colors: ['255,236,170', '255,200,120', '255,255,255'], link: 0, mouse: false,
    });
  });

  // Un solo bucle de animación para todos los canvas
  safe(() => {
    if (reduce) return; // en movimiento reducido quedan dibujados una sola vez
    const loop = (t) => {
      for (let i = 0; i < fields.length; i++) if (fields[i].on) fields[i].draw(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  /* ======================================================================
     7. Inclinación 3D y brillo en tarjetas (solo ratón)
     ====================================================================== */
  safe(() => {
    if (!finePointer || reduce) return;
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  });

  /* ======================================================================
     8. La ruta: línea que se dibuja con el scroll y camioneta que avanza
     ====================================================================== */
  safe(() => {
    const sec = $('[data-route]');
    const path = $('#route-path');
    if (!sec || !path || reduce || !path.getTotalLength) return;
    const stops = $$('[data-stop]', sec);
    const n = stops.length;
    if (n < 2) return;

    const L = path.getTotalLength();
    const glow = $('.route-glow', sec);
    const van = $('.route-van', sec);
    const group = $('.route-stops', sec);
    const idx = $('.ruta__idx', sec);
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (name, attrs) => {
      const el = document.createElementNS(NS, name);
      Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
      return el;
    };

    const marks = stops.map((li, i) => {
      const pt = path.getPointAtLength((L * i) / (n - 1));
      const right = pt.x < 180;
      const g = mk('g', { class: 'route-stop' });
      g.appendChild(mk('circle', { class: 'r', cx: pt.x, cy: pt.y, r: 14 }));
      g.appendChild(mk('circle', { class: 'd', cx: pt.x, cy: pt.y, r: 7 }));
      const txt = mk('text', { x: right ? pt.x + 18 : pt.x - 18, y: pt.y + 4, 'text-anchor': right ? 'start' : 'end' });
      txt.textContent = li.dataset.short || '';
      g.appendChild(txt);
      group.appendChild(g);
      return g;
    });

    [path, glow].forEach((p) => { if (p) { p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(L); } });
    sec.classList.add('route-live');
    sec.style.setProperty('--n', String(n));

    let last = -1;
    const update = () => {
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      const off = String(L * (1 - p));
      path.style.strokeDashoffset = off;
      if (glow) glow.style.strokeDashoffset = off;
      const pt = path.getPointAtLength(L * p);
      van.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      const active = Math.round(p * (n - 1));
      marks.forEach((g, i) => {
        g.classList.toggle('is-passed', i / (n - 1) <= p + 0.001);
        g.classList.toggle('is-current', i === active);
      });
      if (active !== last) {
        last = active;
        stops.forEach((li, i) => li.classList.toggle('is-active', i === active));
        if (idx) idx.textContent = String(active + 1).padStart(2, '0');
      }
    };
    update();
    hooks.push(update);
  });

  /* ======================================================================
     9. Imagen que se expande al hacer scroll
     ====================================================================== */
  safe(() => {
    const sec = $('[data-expand]');
    if (!sec || reduce) return;
    sec.classList.add('expand-live');
    const update = () => {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = vh + Math.max(1, r.height - vh) * 0.55;
      sec.style.setProperty('--p', clamp((vh - r.top) / total).toFixed(4));
    };
    update();
    hooks.push(update);
  });

  /* ======================================================================
     10. Galería de bienvenida: scroll vertical que mueve la fila en horizontal
     ====================================================================== */
  safe(() => {
    const sec = $('[data-hs]');
    if (!sec || reduce) return;
    const track = $('.hs__track', sec);
    const vp = $('.hs__viewport', sec);
    let D = 0;
    let live = false;

    const measure = () => {
      sec.classList.add('hs-live');
      sec.style.height = '';
      const padL = parseFloat(getComputedStyle(vp).paddingLeft) || 0;
      D = track.offsetWidth + padL * 2 - window.innerWidth;
      if (window.innerHeight < 540 || D < 60) {
        sec.classList.remove('hs-live');
        sec.style.height = '';
        live = false;
        return;
      }
      live = true;
      sec.style.height = Math.round(window.innerHeight + D * 1.2) + 'px';
    };
    const update = () => {
      if (!live) return;
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      sec.style.setProperty('--hx', (-p * D).toFixed(1) + 'px');
      sec.style.setProperty('--hp', p.toFixed(4));
    };
    measure();
    update();
    hooks.push(update);
    window.addEventListener('resize', () => { measure(); update(); });
    window.addEventListener('load', () => { measure(); update(); });
  });

  /* ======================================================================
     11. Línea de tiempo y parallax de imágenes
     ====================================================================== */
  safe(() => {
    const tl = $('[data-timeline]');
    if (!tl) return;
    const items = $$('.tl', tl);
    if (reduce) { items.forEach((it) => it.classList.add('is-on')); return; }
    tl.style.setProperty('--tp', '0');
    const update = () => {
      const vh = window.innerHeight;
      const line = vh * 0.62;
      const r = tl.getBoundingClientRect();
      tl.style.setProperty('--tp', clamp((line - r.top) / Math.max(1, r.height)).toFixed(3));
      items.forEach((it) => it.classList.toggle('is-on', it.getBoundingClientRect().top < line));
    };
    update();
    hooks.push(update);
  });

  safe(() => {
    if (reduce) return;
    const items = $$('[data-parallax]').map((img) => ({
      img, box: img.parentElement, f: parseFloat(img.dataset.parallax) || 0.1,
    }));
    if (!items.length) return;
    hooks.push(() => {
      const vh = window.innerHeight;
      items.forEach(({ img, box, f }) => {
        const r = box.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        const prog = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        img.style.setProperty('--py', (prog * -f * r.height * 0.6).toFixed(1) + 'px');
      });
    });
  });

  /* ======================================================================
     12. Visor de fotos
     ====================================================================== */
  safe(() => {
    const box = $('#lightbox');
    if (!box) return;
    const img = $('img', box);
    const cap = $('figcaption', box);
    const close = $('.lightbox__close', box);
    let opener = null;
    const open = (btn) => {
      const src = $('img', btn);
      if (!src) return;
      opener = btn;
      img.src = src.currentSrc || src.src;
      img.alt = btn.dataset.zoom || src.alt || '';
      cap.textContent = btn.dataset.zoom || '';
      box.hidden = false;
      html.style.overflow = 'hidden';
      close.focus();
    };
    const shut = () => {
      if (box.hidden) return;
      box.hidden = true;
      html.style.overflow = '';
      img.removeAttribute('src');
      if (opener) opener.focus();
    };
    $$('[data-zoom]').forEach((b) => b.addEventListener('click', () => open(b)));
    close.addEventListener('click', shut);
    box.addEventListener('click', (e) => { if (e.target === box) shut(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
  });

  /* ======================================================================
     13. Formulario "pase de abordar" → WhatsApp
     ====================================================================== */
  safe(() => {
    const form = $('#quote-form');
    if (!form) return;
    const nombre = $('#f-nombre');
    const destino = $('#f-destino');
    const hotel = $('#f-hotel');
    const fecha = $('#f-fecha');
    const vuelo = $('#f-vuelo');
    const notas = $('#f-notas');
    const paxOut = $('#pax-out');
    const stubPax = $('#stub-pax');
    const stubZone = $('#stub-zone');
    const stubTrip = $('#stub-trip');
    const passDest = $('#pass-dest');
    const passSub = passDest ? passDest.nextElementSibling : null;
    const status = $('#quote-status');
    let pax = 2;

    if (fecha) {
      const d = new Date();
      fecha.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const radio = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';

    const flip = (el, text) => {
      if (!el || el.textContent === text) return;
      el.textContent = text;
      el.classList.remove('flip');
      void el.offsetWidth;
      el.classList.add('flip');
    };
    const refresh = () => {
      paxOut.textContent = String(pax);
      stubPax.textContent = String(pax);
      stubZone.textContent = destino.value || '—';
      stubTrip.textContent = radio('viaje') || 'Solo llegada';
      flip(passDest, destino.value || 'Tu hotel');
      if (passSub) passSub.textContent = hotel.value.trim() || 'Riviera Maya';
      $$('.stepper button', form).forEach((b) => {
        b.disabled = (Number(b.dataset.step) < 0 && pax <= 1) || (Number(b.dataset.step) > 0 && pax >= 20);
      });
    };

    $$('.stepper button', form).forEach((b) => b.addEventListener('click', () => {
      pax = clamp(pax + Number(b.dataset.step), 1, 20);
      refresh();
    }));
    form.addEventListener('input', (e) => {
      const f = e.target.closest('.field');
      if (f) f.classList.remove('is-error');
      if (status) { status.textContent = ''; status.classList.remove('is-ok'); }
      refresh();
    });
    form.addEventListener('change', refresh);

    // Botones de zona del bento → llenan el cotizador
    $$('[data-dest]').forEach((b) => b.addEventListener('click', () => {
      destino.value = b.dataset.dest;
      refresh();
      const target = $('#cotizar');
      if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => nombre.focus({ preventScroll: true }), reduce ? 0 : 700);
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      [nombre, destino].forEach((inp) => {
        const bad = !inp.value.trim();
        inp.closest('.field').classList.toggle('is-error', bad);
        if (bad) ok = false;
      });
      if (!ok) {
        status.classList.remove('is-ok');
        status.textContent = 'Escribe el nombre del viajero y elige tu zona de destino para armar tu pase.';
        (nombre.value.trim() ? destino : nombre).focus();
        return;
      }
      if (!WHATSAPP) return;
      const lines = ['Hola, quiero cotizar un traslado desde el Aeropuerto de Cancún.'];
      lines.push(`• Nombre del viajero: ${nombre.value.trim()}`);
      lines.push(`• Destino: ${destino.value}`);
      if (hotel.value.trim()) lines.push(`• Hotel o dirección: ${hotel.value.trim()}`);
      if (fecha.value) { const [y, m, d] = fecha.value.split('-'); lines.push(`• Fecha de llegada: ${d}/${m}/${y}`); }
      if (vuelo.value.trim()) lines.push(`• Vuelo: ${vuelo.value.trim()}`);
      lines.push(`• Pasajeros: ${pax}`);
      lines.push(`• Tipo de viaje: ${radio('viaje')}`);
      lines.push(`• Vehículo: ${radio('vehiculo')}`);
      if (notas.value.trim()) lines.push(`• Notas: ${notas.value.trim()}`);

      const a = document.createElement('a');
      a.href = waUrl(lines.join('\n'));
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      status.classList.add('is-ok');
      status.textContent = 'Abriendo WhatsApp con tu pase listo. Solo presiona enviar.';
    });
    refresh();
  });

  /* ======================================================================
     14. Año del pie
     ====================================================================== */
  safe(() => { $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); }); });

  /* ======================================================================
     15. Orquestación de scroll/resize + respaldos de revelado
     ====================================================================== */
  let ticking = false;
  const run = () => { ticking = false; hooks.forEach((fn) => safe(fn)); };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => { fields.forEach((f) => f.resize && f.resize()); queue(); });
  window.addEventListener('load', () => { queue(); setTimeout(sweep, 2000); setTimeout(sweep, 4000); });
  window.addEventListener('pageshow', queue);
  setTimeout(sweep, 2000);
  queue();
})();
