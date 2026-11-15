import {Link,useNavigate} from 'react-router-dom';
import {useApp} from './store.jsx';
import {money,pct,imgs,cols,telLink,waLink,copyText} from './helpers.js';

// SVG icons (stroke style, take the text colour)
const I={
  cart:<><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>,
  truck:<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></>,
  user:<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  login:<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></>,
  logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
  dash:<><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></>,
  phone:<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
  chat:<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>,
  heart:<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>,
  copy:<><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
  trash:<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
  back:<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>,
  share:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></>,
  plus:<><path d="M5 12h14"/><path d="M12 5v14"/></>,
  minus:<path d="M5 12h14"/>,
  x:<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  wallet:<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></>
};
export const Icon=({n,size=22,...r})=>
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>{I[n]}</svg>;

// current price + struck-through old price + discount %
export function Price({p,big}){
  const d=pct(p);
  return <div className={'pr'+(big?' big':'')}>
    <b>{money(p.price)}</b>
    {d>0&&<><s>{money(p.oldPrice)}</s><span className="off">-{d}%</span></>}
  </div>;
}

export function ProductCard({p}){
  const{add,wish,toggleWish}=useApp(),nav=useNavigate();
  const to='/product/'+p.id,im=imgs(p)[0],has=wish.includes(p.id);
  const out=!(p.stock>0),multi=cols(p).length>1;
  return <div className="card">
    <div className="ph">
      <Link to={to} tabIndex={-1} aria-hidden="true">{im?<img src={im} alt="" loading="lazy"/>:<div className="noimg">🧸</div>}</Link>
      <button type="button" className="fav" aria-pressed={has} aria-label={has?'Remove from saved':'Save for later'} onClick={()=>toggleWish(p.id)}>
        <Icon n="heart" size={18} fill={has?'currentColor':'none'}/></button>
      {out?<span className="tag out">Sold out</span>:p.stock<=5&&<span className="tag">Only {p.stock} left</span>}
    </div>
    <Link to={to} className="meta"><h3>{p.name}</h3><p className="d">{p.desc||'\u00a0'}</p></Link>
    <Price p={p}/>
    <button disabled={out} onClick={()=>multi?nav(to):add(p,cols(p)[0])}>{out?'Sold out':multi?'Choose color':'Add to cart'}</button>
  </div>;
}

// Call + WhatsApp buttons, filled from the admin Settings
export function Help({S,text}){
  if(!S||(!S.phone&&!S.whatsapp))return null;
  return <div className="help">
    {S.phone&&<a className="btn call" href={telLink(S.phone)}><Icon n="phone" size={18}/>Call {S.phone}</a>}
    {S.whatsapp&&<a className="btn wa" href={waLink(S.whatsapp,text)} target="_blank" rel="noreferrer"><Icon n="chat" size={18}/>WhatsApp</a>}
  </div>;
}

// payment number: tap to copy
export function CopyNumber({label,num}){
  const{toast}=useApp();
  if(!num)return <b>(not set yet)</b>;
  return <button type="button" className="copy" aria-label={'Copy '+label+' number '+num}
    onClick={async()=>toast(await copyText(num)?'Number copied':'Could not copy. Please select the number.')}>
    {num}<Icon n="copy" size={16}/></button>;
}
