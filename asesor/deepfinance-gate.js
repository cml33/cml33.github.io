/* 💎 ADD-ON GATE — DeepFinance es un agregado premium (misma mecánica que Planifica, lista propia).
   Verifica el plan contra check-finance (lista VIP de DeepFinance, gestionada en Selene). Cache 24h. */
(function(){
  var KEY='gm-deepfinance-plan', TS='gm-deepfinance-plan-ts', TTL=24*60*60*1000;
  function user(){ try{ return (localStorage.getItem('gm-auth-user')||'').trim(); }catch(e){ return ''; } }
  function cached(){ try{ var p=localStorage.getItem(KEY), t=parseInt(localStorage.getItem(TS)||'0',10); if(p&&(Date.now()-t)<TTL) return p; }catch(e){} return null; }
  function setPlan(p){ try{ localStorage.setItem(KEY,p); localStorage.setItem(TS,String(Date.now())); }catch(e){} }
  function paywall(){
    if(document.getElementById('df-paywall')) return;
    var d=document.createElement('div'); d.id='df-paywall';
    d.innerHTML='<div style="position:fixed;inset:0;z-index:999999;background:rgba(15,20,25,.74);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;">'
      +'<div style="max-width:430px;width:100%;background:#1a212b;border:2px solid #d9b860;border-radius:22px;padding:30px 26px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.55);">'
      +'<div style="font-size:42px;line-height:1;">💸✨</div>'
      +'<div style="font-size:25px;color:#e7edf3;font-weight:600;margin:10px 0 3px;">DeepFinance</div>'
      +'<div style="font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:#9fb0c0;margin-bottom:16px;">tu asesor financiero</div>'
      +'<div style="font-size:14px;color:#c8d3df;line-height:1.65;margin-bottom:22px;">Esta app es un <strong style="color:#e7edf3;">agregado premium</strong> de Deicy 🐝<br>Pedísela a tu vendedora y se activa en minutos 💜</div>'
      +'<a href="https://wa.me/5491125943342?text=Hola!%20Quiero%20activar%20DeepFinance%20%E2%9C%A8" style="display:block;background:#25D366;color:#fff;border-radius:14px;padding:13px;font-size:14.5px;font-weight:600;text-decoration:none;margin-bottom:10px;">💬 Activar por WhatsApp</a>'
      +'<a href="/" style="display:block;background:transparent;border:1.5px solid #3a4757;color:#9fb0c0;border-radius:14px;padding:12px;font-size:14px;text-decoration:none;">🐝 Volver a Deicy</a>'
      +'</div></div>';
    document.body.appendChild(d);
  }
  function quitar(){ var d=document.getElementById('df-paywall'); if(d) d.remove(); }
  function verificar(){
    /* EDICIÓN PERSONAL: DeepFinance siempre desbloqueado */ setPlan('full'); quitar(); return;
    var c=cached();
    if(c==='full'){ quitar(); return; }
    var u=user();
    if(!u){ paywall(); return; }
    fetch('/.netlify/functions/check-finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u})})
      .then(function(r){ return r.json(); })
      .then(function(r){ var p=(r&&r.plan)||'tracker'; setPlan(p); if(p==='full') quitar(); else paywall(); })
      .catch(function(){ if(c&&c!=='full') paywall(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(verificar,400); });
  else setTimeout(verificar,400);
  setInterval(verificar, 10*60000);
})();
