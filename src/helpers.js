// Small shared helpers (no React, no Firebase)

export const money=n=>'৳'+Number(n||0).toLocaleString('en-IN');

// discount % calculated from old price -> current price
export const pct=p=>{
  const o=+p?.oldPrice,c=+p?.price;
  return o>c&&c>0?Math.round((o-c)/o*100):0;
};

// Firebase may return arrays as objects, so always normalise
export const arr=v=>(Array.isArray(v)?v:Object.values(v||{})).filter(Boolean);
export const imgs=p=>{const a=arr(p?.images);return a.length?a:(p?.image?[p.image]:[])};
export const cols=p=>{const a=arr(p?.colors);return a.length?a:['White']};

export const COLORS={
  White:'#ffffff',Black:'#222222',Pink:'#ff8fb8',Red:'#e5484d',Orange:'#ff9142',Yellow:'#ffd23d',
  Green:'#4fbf6b',Blue:'#2f6fed','Sky Blue':'#7cc4ff',Navy:'#1c2d5a',Purple:'#9b6bff',Brown:'#8b5e3c',
  Beige:'#e8d5b5',Grey:'#9aa3b2',
  Multicolor:'conic-gradient(#e5484d,#ffd23d,#4fbf6b,#2f6fed,#9b6bff,#e5484d)'
};

// delivery: free when subtotal reaches "freeDeliveryAbove" (0 = feature off)
export const feeFor=(S,sub)=>{const f=+S?.deliveryFee||0,t=+S?.freeDeliveryAbove||0;return t>0&&sub>=t?0:f};
export const deliveryText=S=>{
  const f=+S?.deliveryFee||0,t=+S?.freeDeliveryAbove||0;
  if(!f)return 'Free delivery';
  return 'Delivery '+money(f)+(t>0?' · free over '+money(t):'');
};

// phone / WhatsApp
export const PHONE_RE='(\\+?88)?01[3-9][0-9]{8}';
export const telLink=n=>'tel:'+String(n||'').replace(/[^\d+]/g,'');
export const waLink=(n,text)=>{
  let d=String(n||'').replace(/\D/g,'');
  if(!d)return '';
  if(d.startsWith('0'))d='88'+d; // 01XXXXXXXXX -> 8801XXXXXXXXX
  return 'https://wa.me/'+d+(text?'?text='+encodeURIComponent(text):'');
};

export const copyText=async t=>{
  try{await navigator.clipboard.writeText(t);return true}
  catch{
    try{
      const a=document.createElement('textarea');
      a.value=t;a.style.cssText='position:fixed;opacity:0';
      document.body.appendChild(a);a.select();
      const ok=document.execCommand('copy');a.remove();return ok;
    }catch{return false}
  }
};
