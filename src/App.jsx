import {useState,useEffect} from 'react';
import {Routes,Route,Link,Outlet,useNavigate} from 'react-router-dom';
import {signOut,signInWithEmailAndPassword,createUserWithEmailAndPassword,updateProfile} from 'firebase/auth';
import {ref,push,set as dbSet,query,orderByChild,equalTo,onValue} from 'firebase/database';
import {auth,db,useVal,list} from './firebase.js';
import {Provider,useApp} from './store.jsx';
import Admin from './Admin.jsx';

function Layout(){
  const{cart,user,isAdmin}=useApp();
  const n=cart.reduce((a,i)=>a+i.qty,0);
  return <>
    <header><Link to="/" className="logo">Kids Store</Link>
      <nav>
        <Link to="/cart">Cart{n>0&&<b className="badge">{n}</b>}</Link>
        {user&&<Link to="/orders">My Orders</Link>}
        {isAdmin&&<Link to="/admin">Admin</Link>}
        {user?<a onClick={()=>signOut(auth)}>Logout</a>:<Link to="/login">Login</Link>}
      </nav></header>
    <main><Outlet/></main>
    <footer>© Kids Store</footer>
  </>;
}

function Home(){
  const{add}=useApp();
  const P=useVal('products'),C=useVal('categories');
  const[cat,setCat]=useState(''),[q,setQ]=useState('');
  if(!P)return <p className="c">Loading…</p>;
  const items=list(P).filter(p=>(!cat||p.category===cat)&&(p.name||'').toLowerCase().includes(q.toLowerCase())).reverse();
  return <>
    <div className="hero"><h1>Everything for little ones.</h1><p>Toys, clothes and gifts, delivered to your door.</p></div>
    <input placeholder="Search products" value={q} onChange={e=>setQ(e.target.value)}/>
    <div className="chips">
      <button className={!cat?'on':''} onClick={()=>setCat('')}>All</button>
      {list(C).map(c=><button key={c.id} className={cat===c.name?'on':''} onClick={()=>setCat(c.name)}>{c.name}</button>)}
    </div>
    <div className="grid">{items.map(p=>
      <div className="card" key={p.id}>
        {p.image?<img src={p.image} alt={p.name}/>:<div className="noimg">🧸</div>}
        <h3>{p.name}</h3><p className="d">{p.desc}</p>
        <div className="pr">৳{p.price}{p.oldPrice>0&&<s>৳{p.oldPrice}</s>}</div>
        <button disabled={!(p.stock>0)} onClick={()=>add(p)}>{p.stock>0?'Add to cart':'Out of stock'}</button>
      </div>)}</div>
    {!items.length&&<p className="c">No products yet.</p>}
  </>;
}

function Cart(){
  const{cart,setQty}=useApp();
  const t=cart.reduce((a,i)=>a+i.price*i.qty,0);
  if(!cart.length)return <p className="c">Your cart is empty. <Link to="/">Start shopping</Link></p>;
  return <div className="box"><h2>Your cart</h2>
    {cart.map(i=><div className="row" key={i.id}>
      <span>{i.name}<br/><small>৳{i.price}</small></span>
      <span><button onClick={()=>setQty(i.id,i.qty-1)}>−</button> {i.qty} <button onClick={()=>setQty(i.id,i.qty+1)}>+</button></span>
      <b>৳{i.price*i.qty}</b></div>)}
    <h3>Subtotal: ৳{t}</h3><Link className="btn" to="/checkout">Go to checkout</Link></div>;
}

function Checkout(){
  const{cart,user,clear}=useApp();
  const S=useVal('settings'),nav=useNavigate();
  const[f,setF]=useState({name:'',phone:'',address:'',method:'cod',trx:'',from:''});
  const[busy,setBusy]=useState(false);
  const on=k=>e=>setF({...f,[k]:e.target.value});
  if(user===undefined||!S)return <p className="c">Loading…</p>;
  if(!user)return <p className="c">Please <Link to="/login">log in</Link> to place your order.</p>;
  if(!cart.length)return <p className="c">Your cart is empty.</p>;
  const sub=cart.reduce((a,i)=>a+i.price*i.qty,0),fee=Number(S.deliveryFee||0),total=sub+fee,pay=f.method!=='cod';
  const submit=async e=>{
    e.preventDefault();setBusy(true);
    try{
      await push(ref(db,'orders'),{uid:user.uid,email:user.email,name:f.name,phone:f.phone,address:f.address,
        items:cart,subtotal:sub,delivery:fee,total,method:f.method,trx:pay?f.trx.trim():'',from:pay?f.from.trim():'',
        status:'Pending',createdAt:Date.now()});
      clear();alert('Order placed. Thank you!');nav('/orders');
    }catch(err){alert(err.message);setBusy(false)}
  };
  return <form className="box" onSubmit={submit}>
    <h2>Checkout</h2>
    <input required placeholder="Full name" value={f.name} onChange={on('name')}/>
    <input required type="tel" placeholder="Phone (01XXXXXXXXX)" value={f.phone} onChange={on('phone')}/>
    <textarea required placeholder="Full delivery address" value={f.address} onChange={on('address')}/>
    <h3>Payment method</h3>
    {[['cod','Cash on Delivery'],['bkash','bKash'],['nagad','Nagad']].map(([k,l])=>
      <label key={k} className="opt"><input type="radio" name="m" checked={f.method===k} onChange={()=>setF({...f,method:k})}/>{l}</label>)}
    {pay&&<div className="note">
      Send <b>৳{total}</b> by Send Money to {f.method==='bkash'?'bKash':'Nagad'} number <b>{S[f.method]||'(not set yet)'}</b>, then fill in:
      <input required placeholder="Number you sent from" value={f.from} onChange={on('from')}/>
      <input required placeholder="Transaction ID (TrxID)" value={f.trx} onChange={on('trx')}/>
    </div>}
    <p>Subtotal ৳{sub} + Delivery ৳{fee}</p><h3>Total: ৳{total}</h3>
    <button disabled={busy}>{busy?'Placing order…':'Place order'}</button>
  </form>;
}

function Orders(){
  const{user}=useApp();
  const[o,setO]=useState(null);
  useEffect(()=>{
    if(!user)return;
    return onValue(query(ref(db,'orders'),orderByChild('uid'),equalTo(user.uid)),s=>setO(list(s.val()).reverse()),()=>setO([]));
  },[user]);
  if(user===undefined)return <p className="c">Loading…</p>;
  if(!user)return <p className="c">Please <Link to="/login">log in</Link> to see your orders.</p>;
  if(!o)return <p className="c">Loading…</p>;
  return <div className="box"><h2>My orders</h2>{!o.length&&<p>No orders yet.</p>}
    {o.map(x=><div className="ord" key={x.id}>
      <b>#{x.id.slice(-6)}</b> <span className={'st '+x.status}>{x.status}</span><br/>
      <small>{new Date(x.createdAt).toLocaleString()} · {x.method.toUpperCase()}</small>
      <div>{Object.values(x.items).map(i=>i.name+' ×'+i.qty).join(', ')}</div><b>৳{x.total}</b>
    </div>)}</div>;
}

function Login(){
  const nav=useNavigate();
  const[reg,setReg]=useState(false),[err,setErr]=useState('');
  const[f,setF]=useState({name:'',email:'',password:''});
  const on=k=>e=>setF({...f,[k]:e.target.value});
  const go=async e=>{
    e.preventDefault();setErr('');
    try{
      if(reg){
        const c=await createUserWithEmailAndPassword(auth,f.email,f.password);
        await updateProfile(c.user,{displayName:f.name});
        await dbSet(ref(db,'users/'+c.user.uid),{name:f.name,email:f.email,createdAt:Date.now()});
      }else await signInWithEmailAndPassword(auth,f.email,f.password);
      nav('/');
    }catch(x){setErr(x.message.replace('Firebase: ',''))}
  };
  return <form className="box" onSubmit={go}>
    <h2>{reg?'Create account':'Log in'}</h2>
    {reg&&<input required placeholder="Your name" value={f.name} onChange={on('name')}/>}
    <input required type="email" placeholder="Email" value={f.email} onChange={on('email')}/>
    <input required type="password" minLength={6} placeholder="Password (6+ characters)" value={f.password} onChange={on('password')}/>
    {err&&<p style={{color:'#e5484d'}}>{err}</p>}
    <button>{reg?'Sign up':'Log in'}</button>
    <p className="link" onClick={()=>setReg(!reg)}>{reg?'Have an account? Log in':'New here? Create an account'}</p>
  </form>;
}

export default function App(){
  return <Provider><Routes><Route element={<Layout/>}>
    <Route index element={<Home/>}/><Route path="cart" element={<Cart/>}/>
    <Route path="checkout" element={<Checkout/>}/><Route path="orders" element={<Orders/>}/>
    <Route path="login" element={<Login/>}/><Route path="admin" element={<Admin/>}/>
  </Route></Routes></Provider>;
}
