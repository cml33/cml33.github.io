/* Vademécum Hermético: acceso con código.
   El contenido protegido está cifrado (AES-GCM); la clave sale del código con PBKDF2.
   Este archivo se copia a la web con src/proteger_web.py. */
(function () {
  'use strict';
  var BASE = new URL('.', document.currentScript.src).href;   // …/herbario/
  var LS = 'vh-llave', key = null, metaP = null, pidiendo = null, cache = {};

  function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function a64(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function norm(c) { return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function meta() { return metaP || (metaP = fetch(BASE + 'llave.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })); }
  function guardar(v) { window.__vh = v || null; try { v ? localStorage.setItem(LS, v) : localStorage.removeItem(LS); } catch (e) { } }
  function guardada() { try { return localStorage.getItem(LS) || window.__vh || null; } catch (e) { return window.__vh || null; } }

  async function probar(raw) {   // ¿esta clave abre el candado?
    var m = await meta(), c = b64(m.check);
    var k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: c.slice(0, 12) }, k, c.slice(12)); } catch (e) { return false; }
    key = k; guardar(a64(raw)); return true;
  }
  async function conCodigo(code) {
    var m = await meta();
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(code)), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64(m.salt), iterations: m.iter, hash: 'SHA-256' }, base, 256);
    return probar(new Uint8Array(bits));
  }

  function pedir() {   // cartel que pide el código; se resuelve cuando el código es correcto
    if (pidiendo) return pidiendo;
    pidiendo = new Promise(function (ok) {
      var d = document.createElement('div');
      d.setAttribute('style', 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,14,30,.94);font-family:"EB Garamond",Georgia,serif');
      d.innerHTML = '<form style="width:100%;max-width:380px;background:#f6efdc;color:#2a2418;border:1px solid #c9a45c;border-radius:3px;padding:28px 24px;box-shadow:0 18px 50px rgba(0,0,0,.6);text-align:center">' +
        '<p style="margin:0 0 6px;font-family:Cinzel,Georgia,serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a6a1f">Vademécum Hermético Tradicional</p>' +
        '<h2 style="margin:0 0 10px;font-family:Cinzel,Georgia,serif;font-weight:600;font-size:22px;line-height:1.25">Esta sección se abre con un código</h2>' +
        '<p style="margin:0 0 18px;font-size:17px;line-height:1.45">Escribí el código que recibiste. Se guarda en este dispositivo, así que lo ponés una sola vez.</p>' +
        '<label for="vh-cod" style="display:block;text-align:left;font-size:14px;margin-bottom:4px">Código de acceso</label>' +
        '<input id="vh-cod" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" style="box-sizing:border-box;width:100%;padding:11px 12px;font:inherit;font-size:18px;border:1px solid #9a7a35;border-radius:2px;background:#fffaf0;color:#2a2418">' +
        '<p class="vh-msg" role="alert" style="min-height:22px;margin:8px 0 10px;font-size:15px;color:#8c2330"></p>' +
        '<button type="submit" style="width:100%;padding:12px;font-family:Cinzel,Georgia,serif;font-size:13px;letter-spacing:.16em;text-transform:uppercase;border:1px solid #c9a45c;border-radius:2px;background:#c9a45c;color:#1b1608;cursor:pointer">Entrar</button>' +
        '<p style="margin:14px 0 0;font-size:15px"><a href="' + BASE + '" style="color:#5a4312">← Volver a la biblioteca</a></p></form>';
      (document.body || document.documentElement).appendChild(d);
      var f = d.querySelector('form'), inp = d.querySelector('input'), msg = d.querySelector('.vh-msg'), btn = d.querySelector('button');
      setTimeout(function () { inp.focus(); }, 50);
      f.addEventListener('submit', async function (e) {
        e.preventDefault(); if (!inp.value.trim()) { msg.textContent = 'Escribí el código para entrar.'; return; }
        btn.disabled = true; btn.textContent = 'Comprobando…'; msg.textContent = '';
        var bien = false; try { bien = await conCodigo(inp.value); } catch (er) { msg.textContent = 'No pude comprobar el código. Revisá tu conexión y probá de nuevo.'; }
        btn.disabled = false; btn.textContent = 'Entrar';
        if (bien) { d.remove(); pidiendo = null; ok(); } else if (!msg.textContent) { msg.textContent = 'Ese código no es correcto. Fijate si está bien escrito.'; inp.select(); }
      });
    });
    return pidiendo;
  }

  async function asegurar() {
    if (key) return;
    if (!window.crypto || !crypto.subtle) throw new Error('Este navegador no puede abrir el contenido protegido.');
    var g = guardada();
    if (g) { try { if (await probar(b64(g))) return; } catch (e) { } guardar(null); }
    await pedir();
  }
  async function traer(url) {   // baja url+'.enc' y lo descifra
    await asegurar();
    var u = new URL(url, document.baseURI); var v = u.search; u.search = '';
    var r = await fetch(u.href + '.enc' + v); if (!r.ok) throw new Error('No encontré ' + u.pathname);
    var buf = await r.arrayBuffer();
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
  }
  var TIPOS = { jpg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
  function blobUrl(url) {
    var k = new URL(url, document.baseURI).pathname;
    return cache[k] || (cache[k] = traer(url).then(function (b) { return URL.createObjectURL(new Blob([b], { type: TIPOS[k.split('.').pop()] || 'application/octet-stream' })); }));
  }
  function aviso(t) {
    var a = document.getElementById('vh-aviso');
    if (!t) { if (a) a.remove(); return; }
    if (!a) { a = document.createElement('div'); a.id = 'vh-aviso'; a.setAttribute('role', 'status'); a.setAttribute('style', 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99998;max-width:calc(100% - 32px);padding:11px 18px;background:#0d1a33;color:#f6efdc;border:1px solid #c9a45c;border-radius:3px;font-family:"EB Garamond",Georgia,serif;font-size:17px;box-shadow:0 8px 24px rgba(0,0,0,.5)'); (document.body || document.documentElement).appendChild(a); }
    a.textContent = t;
  }

  var VH = window.VH = {
    // página-puerta: descifra index.enc (gzip) y lo escribe en el lugar
    abrir: async function (ver) {
      var est = document.getElementById('vh-estado');
      try {
        await asegurar(); if (est) est.textContent = 'Abriendo… puede tardar unos segundos.';
        var r = await fetch('index.enc?v=' + ver); if (!r.ok) throw new Error('No encontré el contenido.');
        var buf = await r.arrayBuffer();
        var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
        if (!window.DecompressionStream) throw new Error('Tu navegador es muy antiguo para abrir esta página. Actualizalo y probá de nuevo.');
        var html = await new Response(new Blob([dec]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
        document.open(); document.write(html); document.close();
      } catch (e) { if (est) est.textContent = e.message || 'No se pudo abrir.'; }
    },
    img: function (el, url) { blobUrl(url).then(function (u) { el.src = u; }).catch(function () { }); },
    link: function (a, url) { a.removeAttribute('href'); blobUrl(url).then(function (u) { a.href = u; }).catch(function () { }); },
    salir: function () { guardar(null); key = null; location.href = BASE; }
  };

  function iniciar() {
    // imágenes cifradas: se descifran al acercarse a la pantalla
    var ims = [].slice.call(document.querySelectorAll('img[data-e]'));
    if (ims.length) {
      var ver = function (im) { var u = im.getAttribute('data-e'); im.removeAttribute('data-e'); VH.img(im, u); };
      if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); ver(e.target); } }); }, { rootMargin: '600px' }); ims.forEach(function (im) { io.observe(im); }); }
      else ims.forEach(ver);
    }
    // enlaces a PDF protegidos: se descifran al tocarlos
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var h = a.getAttribute('href'); if (!/\.pdf(\?|$)/i.test(h) || /^blob:/.test(h)) return;
      var u = new URL(h, document.baseURI); if (u.href.indexOf(BASE) !== 0) return;
      e.preventDefault(); if (a.dataset.vh) return; a.dataset.vh = '1'; aviso('Preparando el PDF… puede tardar un momento.');
      blobUrl(h).then(function (b) {
        var t = document.createElement('a'); t.href = b; t.download = a.getAttribute('download') || u.pathname.split('/').pop(); document.body.appendChild(t); t.click(); t.remove(); aviso('');
      }).catch(function (er) { aviso(er.message || 'No se pudo abrir el PDF.'); setTimeout(aviso, 5000); }).then(function () { delete a.dataset.vh; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
