import {useEffect} from 'react';
import {Routes,Route,Link,Outlet,useLocation} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import {auth,useVal} from './firebase.js';
import {Provider,useApp} from './store.jsx';
import {Icon} from './ui.jsx';
import {waLink} from './helpers.js';
import {Home,Cart,Checkout,Orders} from './Shop.jsx';
import {Login,Profile} from './Account.jsx';
import Product from './Product.jsx';
import Admin from './Admin.jsx';

function Layout(){
  const{cart,user,isAdmin,msg,toast}=useApp();
  const S=useVal('settings')||{},loc=useLocation();
  const n=cart.reduce((a,i)=>a+i.qty,0);
  useEffect(()=>{window.scrollTo(0,0)},[loc.pathname]);

  // top menu: icon on phones, icon + label on wide screens
  const item=(to,icon,label,badge)=>
    <Link to={to} className="ib" aria-label={label} title={label}>
      <Icon n={icon}/><span className="lb">{label}</span>{badge>0&&<b className="badge">{badge}</b>}</Link>;

  return <>
    <header><Link to="/" className="logo">Kids Store</Link>
      <nav aria-label="Main menu">
        {item('/cart','cart','Cart',n)}
        {user&&item('/orders','truck','My orders')}
        {user&&item('/profile','user','Profile')}
        {isAdmin&&item('/admin','dash','Admin')}
        {user
          ?<button className="ib" title="Log out" aria-label="Log out" onClick={()=>signOut(auth).then(()=>toast('Logged out'))}><Icon n="logout"/><span className="lb">Log out</span></button>
          :item('/login','login','Log in')}
      </nav></header>
    <main><Outlet/></main>
    {S.whatsapp&&!loc.pathname.startsWith('/admin')&&
      <a className="wafab" href={waLink(S.whatsapp,'Hi! I have a question.')} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"><Icon n="chat" size={26}/></a>}
    <footer>
      <span>Copyright © {new Date().getFullYear()} Kids Store</span>
      <span className="sep" aria-hidden="true">|</span>
      <span>Developed by <a href="https://ebrat222.github.io/portfolio/" target="_blank" rel="noreferrer">Ebrat Hossen</a></span>
    </footer>
    <div className={'toast'+(msg?' show':'')} role="status" aria-live="polite">{msg}</div>
  </>;
}

export default function App(){
  return <Provider><Routes><Route element={<Layout/>}>
    <Route index element={<Home/>}/>
    <Route path="product/:id" element={<Product/>}/>
    <Route path="cart" element={<Cart/>}/>
    <Route path="checkout" element={<Checkout/>}/>
    <Route path="orders" element={<Orders/>}/>
    <Route path="profile" element={<Profile/>}/>
    <Route path="login" element={<Login/>}/>
    <Route path="admin" element={<Admin/>}/>
    <Route path="*" element={<div className="c"><p>We couldn't find that page.</p><Link className="btn" to="/">Back to shop</Link></div>}/>
  </Route></Routes></Provider>;
}
