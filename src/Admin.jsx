import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ref,push,set,update,remove,runTransaction} from 'firebase/database';
import {db,useVal,list} from './firebase.js';
import {useApp} from './store.jsx';
import {Icon} from './ui.jsx';
import {money,pct,imgs,cols,COLORS,waLink,telLink} from './helpers.js';

const TABS=['Overview','Products','Categories','Orders','Customers','Settings'];
const STATUS=['Pending','Confirmed','Shipped','Delivered','Cancelled'];

export default function Admin(){
  const{user,isAdmin}=useApp();
  const[tab,setTab]=useState('Overview');
  if(user===undefined)return <p className="c">Loading…</p>;
  if(!isAdmin)return <p className="c">Admin only. <Link to="/login" state={{from:'/admin'}}>Log in as admin</Link></p>;
  const T={Overview,Products,Categories,OrdersTab,Customers,Settings}[tab==='Orders'?'OrdersTab':tab];
  return <div><h2>Admin dashboard</h2>
    <div className="chips">{TABS.map(t=><button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
    <T/></div>;
}

function Overview(){
  const O=list(useVal('orders')),P=list(useVal('products')),U=list(useVal('users'));
  const rev=O.filter(o=>o.status!=='Cancelled').reduce((a,o)=>a+o.total,0);
  return <div className="stats">{[
    ['Orders',O.length],['Pending',O.filter(o=>o.status==='Pending').length],
    ['Revenue',money(rev)],['Products',P.length],['Low stock (5 or less)',P.filter(p=>p.stock<=5).length],['Customers',U.length]
  ].map(([k,v])=><div key={k}><b>{v}</b>{k}</div>)}</div>;
}

// shrink big phone photos before upload (faster on mobile data)
const shrink=file=>new Promise(res=>{
  const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{
    const s=Math.min(1,1200/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(u);c.toBlob(b=>res(b||file),'image/jpeg',0.85);
  };
  img.onerror=()=>{URL.revokeObjectURL(u);res(file)};
  img.src=u;
});

const empty={name:'',price:'',oldPrice:'',stock:'',category:'',images:[],colors:['White'],desc:''};
function Products(){
  const{toast}=useApp();
  const P=list(useVal('products')).reverse(),C=list(useVal('categories'));
  const[f,setF]=useState(empty),[id,setId]=useState(null),[busy,setBusy]=useState(''),[link,setLink]=useState('');
  const on=k=>e=>setF({...f,[k]:e.target.value});
  const off=pct({price:+f.price,oldPrice:+f.oldPrice});

  const upload=async e=>{
    const files=[...e.target.files];e.target.value='';
    if(!files.length)return;
    const added=[];
    for(let k=0;k<files.length;k++){
      setBusy('Uploading photo '+(k+1)+' of '+files.length+'…');
      try{
        const fd=new FormData();fd.append('image',await shrink(files[k]),'photo.jpg');
        const r=await fetch('https://api.imgbb.com/1/upload?key='+import.meta.env.VITE_IMGBB_KEY,{method:'POST',body:fd});
        const j=await r.json();
        if(!j.success)throw new Error('upload');
        added.push(j.data.url);
      }catch{toast('Photo '+(k+1)+' did not upload. Check your imgbb key, or paste an image link instead.')}
    }
    setF(x=>({...x,images:[...x.images,...added]}));setBusy('');
  };
  const addLink=()=>{if(link.trim()){setF({...f,images:[...f.images,link.trim()]});setLink('')}};
  const toggleColor=c=>setF({...f,colors:f.colors.includes(c)?f.colors.filter(x=>x!==c):[...f.colors,c]});

  const save=async e=>{
    e.preventDefault();
    const price=+f.price,old=+f.oldPrice||0;
    if(old&&old<=price){toast('Old price must be higher than the price (or leave it empty).');return}
    const d={name:f.name.trim(),price,oldPrice:old,stock:+f.stock,category:f.category,desc:f.desc.trim(),
      images:f.images,image:f.images[0]||'',colors:f.colors.length?f.colors:['White']};
    try{
      if(id)await update(ref(db,'products/'+id),d);else await push(ref(db,'products'),{...d,createdAt:Date.now()});
      toast(id?'Product updated':'Product added');setF(empty);setId(null);
    }catch(x){toast(x.message)}
  };
  const edit=p=>{
    const{id:i,createdAt,image,images,colors,...r}=p;
    setId(i);setF({...empty,...r,oldPrice:r.oldPrice||'',images:imgs(p),colors:cols(p)});window.scrollTo(0,0);
  };

  return <>
    <form className="box" onSubmit={save}><h3>{id?'Edit product':'Add product'}</h3>
      <input required placeholder="Product name" value={f.name} onChange={on('name')}/>
      <div className="two"><input required type="number" min="0" placeholder="Price ৳" value={f.price} onChange={on('price')}/>
        <input type="number" min="0" placeholder="Old price ৳ (optional)" value={f.oldPrice} onChange={on('oldPrice')}/></div>
      {off>0&&<p className="save">Customers will see {off}% off.</p>}
      <div className="two"><input required type="number" min="0" placeholder="Stock" value={f.stock} onChange={on('stock')}/>
        <select required value={f.category} onChange={on('category')}><option value="">Category</option>{C.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
      <textarea placeholder="Description" rows={4} value={f.desc} onChange={on('desc')}/>

      <h4>Colors</h4>
      <div className="colors" role="group" aria-label="Product colors">{Object.keys(COLORS).map(c=>{
        const sel=f.colors.includes(c);
        return <button type="button" key={c} className={'cc'+(sel?' on':'')} aria-pressed={sel} onClick={()=>toggleColor(c)}>
          <i style={{background:COLORS[c]}}/>{c}</button>;})}</div>

      <h4>Photos <small>(the first one is the main photo)</small></h4>
      {f.images.length>0&&<div className="photos">{f.images.map((u,k)=><div key={u+k} className="ph2">
        <img src={u} alt={'Photo '+(k+1)}/>
        {k===0?<span className="main">Main</span>
          :<button type="button" className="mk" onClick={()=>setF({...f,images:[u,...f.images.filter((_,j)=>j!==k)]})}>Make main</button>}
        <button type="button" className="x" aria-label={'Remove photo '+(k+1)} onClick={()=>setF({...f,images:f.images.filter((_,j)=>j!==k)})}><Icon n="x" size={14}/></button>
      </div>)}</div>}
      <input type="file" accept="image/*" multiple onChange={upload} disabled={!!busy}/>
      <div className="addlink"><input placeholder="Or paste an image link" value={link} onChange={e=>setLink(e.target.value)}/>
        <button type="button" onClick={addLink}>Add</button></div>
      <button disabled={!!busy}>{busy||'Save product'}</button>
      {id&&<button type="button" className="gray" onClick={()=>{setId(null);setF(empty)}}>Cancel edit</button>}
    </form>

    <div className="box">{!P.length&&<p>No products yet.</p>}{P.map(p=><div className="row" key={p.id}>
      <span className="pl">{imgs(p)[0]?<img src={imgs(p)[0]} alt=""/>:<i className="noimg sm">🧸</i>}
        <span>{p.name}<br/><small>{money(p.price)}{pct(p)>0&&' (-'+pct(p)+'%)'} · <span className={p.stock<=5?'warn':''}>stock {p.stock}</span> · {p.category}</small></span></span>
      <span><button onClick={()=>edit(p)}>Edit</button> <button className="red" onClick={()=>confirm('Delete this product?')&&remove(ref(db,'products/'+p.id))}>Delete</button></span>
    </div>)}</div></>;
}

function Categories(){
  const C=list(useVal('categories'));const[n,setN]=useState('');
  return <div className="box">
    <form className="row" onSubmit={e=>{e.preventDefault();if(n.trim())push(ref(db,'categories'),{name:n.trim()});setN('')}}>
      <input value={n} onChange={e=>setN(e.target.value)} placeholder="New category name"/><button>Add</button></form>
    {C.map(c=><div className="row" key={c.id}>{c.name}<button className="red" onClick={()=>remove(ref(db,'categories/'+c.id))}>Delete</button></div>)}</div>;
}

function OrdersTab(){
  const{toast}=useApp();
  const O=list(useVal('orders')).reverse();

  // Stock goes down when you move an order past "Pending", and comes back if you cancel it.
  const setStatus=async(o,s)=>{
    const lines=Object.values(o.items||{});
    const take=s!=='Pending'&&s!=='Cancelled'&&!o.stockTaken,give=s==='Cancelled'&&!!o.stockTaken;
    try{
      if(take||give)await Promise.all(lines.map(i=>runTransaction(ref(db,'products/'+i.id+'/stock'),c=>c===null?c:Math.max(0,c+(give?1:-1)*i.qty))));
      await update(ref(db,'orders/'+o.id),{status:s,...(take&&{stockTaken:true}),...(give&&{stockTaken:false})});
      if(take)toast('Stock updated');
      if(give)toast('Order cancelled and stock restored');
    }catch(x){toast(x.message)}
  };

  return <div className="box">{!O.length&&<p>No orders yet.</p>}{O.map(o=><div className="ord" key={o.id}>
    <b>#{o.id.slice(-6).toUpperCase()}</b> · {o.name} · {o.phone}<br/><small>{new Date(o.createdAt).toLocaleString()}</small>
    <div>{o.address}</div>
    {o.note&&<div className="note">Note: {o.note}</div>}
    <div>{Object.values(o.items||{}).map(i=>i.name+(i.color?' ('+i.color+')':'')+' ×'+i.qty).join(', ')}</div>
    <div><b>{money(o.total)}</b> ({String(o.method).toUpperCase()}){o.trx&&<> · from {o.from} · TrxID <b>{o.trx}</b></>}</div>
    <div className="oact">
      <select value={o.status} onChange={e=>setStatus(o,e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      {o.phone&&<a className="btn call sm" href={telLink(o.phone)}><Icon n="phone" size={16}/>Call</a>}
      {o.phone&&<a className="btn wa sm" href={waLink(o.phone,'Hi '+o.name+', this is Kids Store about your order #'+o.id.slice(-6).toUpperCase())} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>WhatsApp</a>}
      <button className="red" onClick={()=>confirm('Delete this order?')&&remove(ref(db,'orders/'+o.id))}>Delete</button>
    </div>
  </div>)}</div>;
}

function Customers(){
  const U=list(useVal('users'));
  return <div className="box">{!U.length&&<p>No customers yet.</p>}{U.map(u=><div className="row" key={u.id}>
    <span>{u.name}<br/><small>{u.email}{u.phone&&' · '+u.phone}</small></span><small>{u.createdAt&&new Date(u.createdAt).toLocaleDateString()}</small></div>)}</div>;
}

const FIELDS=[['phone','Contact number (helpline)','tel'],['whatsapp','WhatsApp number','tel'],
  ['bkash','bKash number','tel'],['nagad','Nagad number','tel'],
  ['deliveryFee','Delivery fee ৳','numeric'],['freeDeliveryAbove','Free delivery above ৳ (0 = off)','numeric']];
function Settings(){const S=useVal('settings');return S?<SettingsForm init={S}/>:<p className="c">Loading…</p>}
function SettingsForm({init}){
  const{toast}=useApp();
  const[f,setF]=useState({phone:'',whatsapp:'',bkash:'',nagad:'',deliveryFee:'',freeDeliveryAbove:'',...init});
  const save=async e=>{
    e.preventDefault();
    try{
      await set(ref(db,'settings'),{...f,phone:String(f.phone).trim(),whatsapp:String(f.whatsapp).trim(),
        bkash:String(f.bkash).trim(),nagad:String(f.nagad).trim(),
        deliveryFee:+f.deliveryFee||0,freeDeliveryAbove:+f.freeDeliveryAbove||0});
      toast('Settings saved');
    }catch(x){toast(x.message)}
  };
  return <form className="box" onSubmit={save}><h3>Store settings</h3>
    {FIELDS.map(([k,l,m])=><label key={k}>{l}<input inputMode={m} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}
    <p><small>Use full numbers like 01XXXXXXXXX. Customers see the contact and WhatsApp numbers on product pages, at checkout and in the footer.</small></p>
    <button>Save settings</button></form>;
}
