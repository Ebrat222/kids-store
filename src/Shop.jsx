import {useState,useEffect} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ref,push,update,query,orderByChild,equalTo,onValue} from 'firebase/database';
import {db,useVal,list} from './firebase.js';
import {useApp,useLiveCart} from './store.jsx';
import {Icon,ProductCard,Help,CopyNumber} from './ui.jsx';
import {money,pct,feeFor,deliveryText,waLink,PHONE_RE} from './helpers.js';

export function Home(){
  const{wish}=useApp();
  const P=useVal('products'),C=useVal('categories'),S=useVal('settings');
  const[cat,setCat]=useState(''),[q,setQ]=useState(''),[sort,setSort]=useState('new'),[saved,setSaved]=useState(false);

  const by={
    new:(a,b)=>(b.createdAt||0)-(a.createdAt||0)||b.id.localeCompare(a.id),
    low:(a,b)=>a.price-b.price,
    high:(a,b)=>b.price-a.price,
    off:(a,b)=>pct(b)-pct(a)
  };
  const needle=q.trim().toLowerCase();
  const items=list(P)
    .filter(p=>(!cat||p.category===cat)&&(!saved||wish.includes(p.id))&&
      ((p.name||'')+' '+(p.desc||'')+' '+(p.category||'')).toLowerCase().includes(needle))
    .sort(by[sort]).sort((a,b)=>(b.stock>0)-(a.stock>0)); // sold-out items go last

  return <>
    <div className="hero"><h1>Everything for little ones.</h1><p>Toys, clothes and gifts, delivered to your door.</p></div>
    {S&&<div className="perks">
      <span><Icon n="truck" size={18}/>{+S.freeDeliveryAbove>0?'Free delivery over '+money(S.freeDeliveryAbove):'Delivered to your door'}</span>
      <span><Icon n="wallet" size={18}/>Cash on delivery, bKash, Nagad</span>
      {(S.phone||S.whatsapp)&&<span><Icon n="chat" size={18}/>Questions? We reply fast</span>}
    </div>}
    <div className="bar">
      <input type="search" aria-label="Search products" placeholder="Search products" value={q} onChange={e=>setQ(e.target.value)}/>
      <select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}>
        <option value="new">Newest</option><option value="low">Price: low to high</option>
        <option value="high">Price: high to low</option><option value="off">Biggest discount</option>
      </select>
    </div>
    <div className="chips">
      <button className={!cat?'on':''} onClick={()=>setCat('')}>All</button>
      {list(C).map(c=><button key={c.id} className={cat===c.name?'on':''} onClick={()=>setCat(c.name)}>{c.name}</button>)}
      <button className={saved?'on':''} aria-pressed={saved} onClick={()=>setSaved(!saved)}><Icon n="heart" size={14} fill={saved?'currentColor':'none'}/> Saved ({wish.length})</button>
    </div>

    {!P?<div className="grid">{[0,1,2,3,4,5].map(k=><div className="card sk" key={k}/>)}</div>
      :<div className="grid">{items.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
    {P&&!items.length&&<div className="c">
      {saved&&!wish.length?<p>Tap the heart on a product to save it here.</p>
        :q||cat||saved?<><p>No products match your search.</p><button onClick={()=>{setQ('');setCat('');setSaved(false)}}>Clear filters</button></>
        :<p>No products yet. Please check back soon.</p>}
    </div>}
  </>;
}

export function Cart(){
  const{cart,setQty,remove}=useApp();
  const{items}=useLiveCart();
  const S=useVal('settings')||{};
  if(!cart.length)return <div className="c"><p>Your cart is empty.</p><Link className="btn" to="/">Start shopping</Link></div>;
  const ok=items.filter(i=>i.ok),bad=items.length-ok.length;
  const sub=ok.reduce((a,i)=>a+i.price*i.qty,0),fee=feeFor(S,sub),thr=+S.freeDeliveryAbove||0;
  const more=thr>0&&+S.deliveryFee>0&&sub<thr?thr-sub:0;
  return <div className="box"><h2>Your cart</h2>
    {more>0&&ok.length>0&&<div className="ship"><span>Add <b>{money(more)}</b> more for free delivery</span>
      <div className="bar2" role="progressbar" aria-valuemin="0" aria-valuemax={thr} aria-valuenow={sub}><i style={{width:Math.min(100,sub/thr*100)+'%'}}/></div></div>}
    {items.map(i=><div className="line" key={i.key}>
      <Link to={'/product/'+i.id} className="thumb">{i.image?<img src={i.image} alt=""/>:'🧸'}</Link>
      <div className="lt">
        <Link to={'/product/'+i.id}><b>{i.name}</b></Link>
        <small>Color: {i.color} · {money(i.price)}</small>
        {i.ok?<div className="qty sm">
          <button type="button" aria-label="Fewer" onClick={()=>setQty(i.key,i.qty-1)}><Icon n="minus" size={14}/></button>
          <span>{i.qty}</span>
          <button type="button" aria-label="More" disabled={i.qty>=i.stock} onClick={()=>setQty(i.key,i.qty+1)}><Icon n="plus" size={14}/></button>
          {i.qty>=i.stock&&<small className="warn">Max available</small>}
        </div>:<small className="warn">Sold out. Please remove this item.</small>}
      </div>
      <div className="lr">{i.ok&&<b>{money(i.price*i.qty)}</b>}
        <button type="button" className="ghost" aria-label={'Remove '+i.name} onClick={()=>remove(i.key)}><Icon n="trash" size={18}/></button></div>
    </div>)}
    <div className="sum"><span>Subtotal</span><b>{money(sub)}</b></div>
    <div className="sum"><span>Delivery</span><b>{fee?money(fee):'Free'}</b></div>
    <div className="sum tot"><span>Total</span><b>{money(sub+fee)}</b></div>
    {bad>0?<button disabled className="full">Remove sold-out items to continue</button>
      :<Link className="btn full" to="/checkout">Go to checkout</Link>}
    <p className="c"><Link to="/">Continue shopping</Link></p>
  </div>;
}

export function Checkout(){
  const{user,cart}=useApp();
  const S=useVal('settings'),U=useVal(user?'users/'+user.uid:null),live=useLiveCart();
  if(user===undefined||!S)return <p className="c">Loading…</p>;
  if(!user)return <p className="c">Please <Link to="/login" state={{from:'/checkout'}}>log in</Link> to place your order.</p>;
  if(!cart.length)return <div className="c"><p>Your cart is empty.</p><Link className="btn" to="/">Start shopping</Link></div>;
  if(!U||live.loading)return <p className="c">Loading…</p>;
  return <CheckoutForm user={user} S={S} U={U} items={live.items}/>;
}

function CheckoutForm({user,S,U,items}){
  const{clear,toast}=useApp(),nav=useNavigate();
  // name, phone and address come from the customer's profile
  const[f,setF]=useState({name:U.name||user.displayName||'',phone:U.phone||'',address:U.address||'',note:'',method:'cod',trx:'',from:''});
  const[save,setSave]=useState(!U.name||!U.phone||!U.address);
  const[busy,setBusy]=useState(false),[err,setErr]=useState('');
  const on=k=>e=>setF({...f,[k]:e.target.value});

  const ok=items.filter(i=>i.ok);
  if(ok.length<items.length)return <p className="c">Some items in your cart are sold out. <Link to="/cart">Review your cart</Link></p>;
  const sub=ok.reduce((a,i)=>a+i.price*i.qty,0),fee=feeFor(S,sub),total=sub+fee,pay=f.method!=='cod';
  const label=f.method==='bkash'?'bKash':'Nagad';

  const submit=async e=>{
    e.preventDefault();setBusy(true);setErr('');
    try{
      const lines=ok.map(({id,name,price,image,color,qty})=>({id,name,price,image,color,qty}));
      const d={uid:user.uid,email:user.email,name:f.name.trim(),phone:f.phone.trim(),address:f.address.trim(),
        items:lines,subtotal:sub,delivery:fee,total,method:f.method,
        trx:pay?f.trx.trim():'',from:pay?f.from.trim():'',status:'Pending',createdAt:Date.now()};
      if(f.note.trim())d.note=f.note.trim();
      await push(ref(db,'orders'),d);
      if(save)update(ref(db,'users/'+user.uid),{name:d.name,phone:d.phone,address:d.address}).catch(()=>{});
      clear();toast('Order placed. Thank you!');nav('/orders');
    }catch(x){setErr(x.message);setBusy(false)}
  };

  return <form className="box" onSubmit={submit}>
    <h2>Checkout</h2>
    <div className="helpbox"><b>Need help placing your order?</b><Help S={S} text="Hi! I need help with my order."/></div>

    <h3>Delivery details</h3>
    <label>Full name<input required autoComplete="name" value={f.name} onChange={on('name')}/></label>
    <label>Phone<input required type="tel" autoComplete="tel" inputMode="tel" placeholder="01XXXXXXXXX" pattern={PHONE_RE} title="Enter a Bangladesh mobile number, like 01712345678" value={f.phone} onChange={on('phone')}/></label>
    <label>Full delivery address<textarea required autoComplete="street-address" rows={3} value={f.address} onChange={on('address')}/></label>
    <label>Note for us (optional)<input placeholder="Gift wrap, delivery time, etc." value={f.note} onChange={on('note')}/></label>
    <label className="opt"><input type="checkbox" checked={save} onChange={e=>setSave(e.target.checked)}/>Save these details to my profile</label>

    <h3>Payment method</h3>
    {[['cod','Cash on Delivery'],['bkash','bKash'],['nagad','Nagad']].map(([k,l])=>
      <label key={k} className="opt"><input type="radio" name="m" checked={f.method===k} onChange={()=>setF({...f,method:k})}/>{l}</label>)}
    {pay&&<div className="note">
      <p>1. Send <b>{money(total)}</b> with Send Money to this {label} number. Tap it to copy:</p>
      <p><CopyNumber label={label} num={S[f.method]}/></p>
      <p>2. Then fill in these two boxes:</p>
      <input required inputMode="tel" placeholder="Number you sent from" value={f.from} onChange={on('from')}/>
      <input required placeholder="Transaction ID (TrxID)" value={f.trx} onChange={on('trx')}/>
    </div>}

    <h3>Order summary</h3>
    {ok.map(i=><div className="line sm" key={i.key}>
      <span className="thumb">{i.image?<img src={i.image} alt=""/>:'🧸'}</span>
      <div className="lt"><b>{i.name}</b><small>{i.color} × {i.qty}</small></div>
      <b>{money(i.price*i.qty)}</b></div>)}
    <div className="sum"><span>Subtotal</span><b>{money(sub)}</b></div>
    <div className="sum"><span>Delivery</span><b>{fee?money(fee):'Free'}</b></div>
    <div className="sum tot"><span>Total</span><b>{money(total)}</b></div>
    {err&&<p className="err" role="alert">{err}</p>}
    <button className="full" disabled={busy}>{busy?'Placing order…':'Place order'}</button>
    <p className="c"><small>{deliveryText(S)}</small></p>
  </form>;
}

const FLOW=['Pending','Confirmed','Shipped','Delivered'];

export function Orders(){
  const{user}=useApp();
  const S=useVal('settings')||{};
  const[o,setO]=useState(null);
  useEffect(()=>{
    if(!user)return;
    return onValue(query(ref(db,'orders'),orderByChild('uid'),equalTo(user.uid)),s=>setO(list(s.val()).reverse()),()=>setO([]));
  },[user]);
  if(user===undefined)return <p className="c">Loading…</p>;
  if(!user)return <p className="c">Please <Link to="/login" state={{from:'/orders'}}>log in</Link> to see your orders.</p>;
  if(!o)return <p className="c">Loading…</p>;
  return <div className="box"><h2>My orders</h2>
    {!o.length&&<div className="c"><p>No orders yet.</p><Link className="btn" to="/">Start shopping</Link></div>}
    {o.map(x=>{
      const idx=FLOW.indexOf(x.status),code=x.id.slice(-6).toUpperCase();
      return <div className="ord" key={x.id}>
        <div className="oh"><b>Order #{code}</b><span className={'st '+x.status}>{x.status}</span></div>
        <small>{new Date(x.createdAt).toLocaleString()} · {String(x.method).toUpperCase()}</small>
        {x.status==='Cancelled'?<p className="warn">This order was cancelled.</p>
          :<ol className="steps" aria-label="Order progress">{FLOW.map((s,k)=><li key={s} className={k<=idx?'done':''}>{s}</li>)}</ol>}
        {Object.values(x.items||{}).map((i,k)=><div className="line sm" key={k}>
          <span className="thumb">{i.image?<img src={i.image} alt=""/>:'🧸'}</span>
          <div className="lt"><b>{i.name}</b><small>{i.color?i.color+' × ':'× '}{i.qty}</small></div>
          <b>{money(i.price*i.qty)}</b></div>)}
        <div className="sum tot"><span>Total</span><b>{money(x.total)}</b></div>
        {S.whatsapp&&<a className="btn wa sm" href={waLink(S.whatsapp,'Hi! I need help with order #'+code)} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>Ask about this order</a>}
      </div>;
    })}</div>;
}
