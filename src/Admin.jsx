import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ref,push,set,update,remove} from 'firebase/database';
import {db,useVal,list} from './firebase.js';
import {useApp} from './store.jsx';

const TABS=['Overview','Products','Categories','Orders','Customers','Settings'];
const STATUS=['Pending','Confirmed','Shipped','Delivered','Cancelled'];

export default function Admin(){
  const{user,isAdmin}=useApp();
  const[tab,setTab]=useState('Overview');
  if(user===undefined)return <p className="c">Loading…</p>;
  if(!isAdmin)return <p className="c">Admin only. <Link to="/login">Log in as admin</Link></p>;
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
    ['Revenue','৳'+rev],['Products',P.length],['Customers',U.length]
  ].map(([k,v])=><div key={k}><b>{v}</b>{k}</div>)}</div>;
}

const empty={name:'',price:'',oldPrice:'',stock:'',category:'',image:'',desc:''};
function Products(){
  const P=list(useVal('products')),C=list(useVal('categories'));
  const[f,setF]=useState(empty),[id,setId]=useState(null),[busy,setBusy]=useState(false);
  const on=k=>e=>setF({...f,[k]:e.target.value});
  const upload=async e=>{
    const file=e.target.files[0];if(!file)return;setBusy(true);
    try{
      const fd=new FormData();fd.append('image',file);
      const r=await fetch('https://api.imgbb.com/1/upload?key='+import.meta.env.VITE_IMGBB_KEY,{method:'POST',body:fd});
      const j=await r.json();
      if(!j.success)throw new Error('upload');
      setF(x=>({...x,image:j.data.url}));
    }catch{alert('Upload failed. Check your imgbb key, or paste an image link instead.')}
    setBusy(false);
  };
  const save=async e=>{
    e.preventDefault();
    const d={...f,price:+f.price,oldPrice:+f.oldPrice||0,stock:+f.stock};
    try{
      if(id)await update(ref(db,'products/'+id),d);else await push(ref(db,'products'),{...d,createdAt:Date.now()});
      setF(empty);setId(null);
    }catch(x){alert(x.message)}
  };
  const edit=p=>{const{id:i,createdAt,...r}=p;setId(i);setF({...empty,...r});window.scrollTo(0,0)};
  return <>
    <form className="box" onSubmit={save}><h3>{id?'Edit product':'Add product'}</h3>
      <input required placeholder="Product name" value={f.name} onChange={on('name')}/>
      <div className="two"><input required type="number" placeholder="Price ৳" value={f.price} onChange={on('price')}/>
        <input type="number" placeholder="Old price ৳ (optional)" value={f.oldPrice} onChange={on('oldPrice')}/></div>
      <div className="two"><input required type="number" placeholder="Stock" value={f.stock} onChange={on('stock')}/>
        <select required value={f.category} onChange={on('category')}><option value="">Category</option>{C.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
      <textarea placeholder="Description" value={f.desc} onChange={on('desc')}/>
      <input placeholder="Image link (or upload a photo below)" value={f.image} onChange={on('image')}/>
      <input type="file" accept="image/*" onChange={upload}/>
      {f.image&&<img className="prev" src={f.image} alt=""/>}
      <button disabled={busy}>{busy?'Uploading…':'Save product'}</button>
      {id&&<button type="button" className="gray" onClick={()=>{setId(null);setF(empty)}}>Cancel edit</button>}
    </form>
    <div className="box">{!P.length&&<p>No products yet.</p>}{P.map(p=><div className="row" key={p.id}>
      <span>{p.name}<br/><small>৳{p.price} · stock {p.stock} · {p.category}</small></span>
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
  const O=list(useVal('orders')).reverse();
  return <div className="box">{!O.length&&<p>No orders yet.</p>}{O.map(o=><div className="ord" key={o.id}>
    <b>#{o.id.slice(-6)}</b> · {o.name} · {o.phone}<br/><small>{new Date(o.createdAt).toLocaleString()}</small>
    <div>{o.address}</div>
    <div>{Object.values(o.items).map(i=>i.name+' ×'+i.qty).join(', ')}</div>
    <div><b>৳{o.total}</b> ({o.method.toUpperCase()}){o.trx&&<> · from {o.from} · TrxID <b>{o.trx}</b></>}</div>
    <select value={o.status} onChange={e=>update(ref(db,'orders/'+o.id),{status:e.target.value})}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
    <button className="red" onClick={()=>confirm('Delete this order?')&&remove(ref(db,'orders/'+o.id))}>Delete</button>
  </div>)}</div>;
}

function Customers(){
  const U=list(useVal('users'));
  return <div className="box">{!U.length&&<p>No customers yet.</p>}{U.map(u=><div className="row" key={u.id}>
    <span>{u.name}<br/><small>{u.email}</small></span><small>{u.createdAt&&new Date(u.createdAt).toLocaleDateString()}</small></div>)}</div>;
}

function Settings(){const S=useVal('settings');return S?<SettingsForm init={S}/>:<p className="c">Loading…</p>}
function SettingsForm({init}){
  const[f,setF]=useState({bkash:'',nagad:'',deliveryFee:'',phone:'',...init});
  const save=async e=>{e.preventDefault();await set(ref(db,'settings'),{...f,deliveryFee:+f.deliveryFee||0});alert('Settings saved')};
  return <form className="box" onSubmit={save}><h3>Store settings</h3>
    {[['bkash','bKash number'],['nagad','Nagad number'],['deliveryFee','Delivery fee ৳'],['phone','Store phone']].map(([k,l])=>
      <label key={k}>{l}<input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}
    <button>Save settings</button></form>;
}
