import {useState,useEffect} from 'react';
import {Link,useParams,useNavigate} from 'react-router-dom';
import {useVal,list} from './firebase.js';
import {useApp} from './store.jsx';
import {Icon,Price,ProductCard,Help} from './ui.jsx';
import {money,pct,imgs,cols,COLORS,deliveryText,copyText} from './helpers.js';

export default function Product(){
  const{id}=useParams(),nav=useNavigate();
  const{add,wish,toggleWish,toast}=useApp();
  const P=useVal('products'),S=useVal('settings');
  const[pic,setPic]=useState(0),[color,setColor]=useState(null),[qty,setQty]=useState(1);
  const p=P&&P[id]?{id,...P[id]}:null;

  useEffect(()=>{setPic(0);setColor(null);setQty(1)},[id]);
  useEffect(()=>{
    document.title=p?p.name+' | Kids Store':'Kids Store';
    return()=>{document.title='Kids Store'};
  },[p?.name]);

  if(!P||!S)return <p className="c">Loading…</p>;
  if(!p)return <div className="c"><p>We couldn't find this product. It may have been removed.</p><Link className="btn" to="/">Back to shop</Link></div>;

  const im=imgs(p),cl=cols(p),cur=cl.includes(color)?color:cl[0];
  const d=pct(p),left=+p.stock||0,out=left<=0,has=wish.includes(p.id);
  const n=Math.min(Math.max(1,qty),Math.max(left,1));
  const code=p.id.slice(-6).toUpperCase();
  const rel=list(P).filter(x=>x.category===p.category&&x.id!==p.id&&x.stock>0).slice(0,4);

  const share=async()=>{
    const url=window.location.href;
    if(navigator.share){try{await navigator.share({title:p.name,url})}catch{}return}
    toast(await copyText(url)?'Link copied':'Could not copy the link');
  };

  return <>
    <Link className="crumb" to="/"><Icon n="back" size={18}/>All products</Link>
    <div className="pdp">
      <div className="gal">
        <div className="bigpic">{im.length?<img src={im[Math.min(pic,im.length-1)]} alt={p.name}/>:<div className="noimg">🧸</div>}</div>
        {im.length>1&&<div className="thumbs">{im.map((u,k)=>
          <button key={u+k} type="button" className={k===pic?'on':''} aria-label={'Show photo '+(k+1)} onClick={()=>setPic(k)}><img src={u} alt=""/></button>)}</div>}
      </div>

      <div className="info">
        <h1>{p.name}</h1>
        {p.category&&<span className="cat">{p.category}</span>}
        <Price p={p} big/>
        {d>0&&<p className="save">You save {money(p.oldPrice-p.price)}</p>}
        <p className={'stock '+(out?'out':left<=5?'low':'in')}>{out?'Sold out':left<=5?'Only '+left+' left. Order soon':left+' in stock'}</p>

        <div className="opt-h">Color: <b>{cur}</b></div>
        <div className="sws" role="radiogroup" aria-label="Color">{cl.map(c=>
          <button key={c} type="button" role="radio" aria-checked={c===cur} aria-label={c} title={c}
            className={'sw'+(c===cur?' on':'')} style={{background:COLORS[c]||'#ddd'}} onClick={()=>setColor(c)}/>)}</div>

        {!out&&<div className="opt-h">Quantity</div>}
        {!out&&<div className="qty">
          <button type="button" aria-label="Fewer" disabled={n<=1} onClick={()=>setQty(n-1)}><Icon n="minus" size={16}/></button>
          <span aria-live="polite">{n}</span>
          <button type="button" aria-label="More" disabled={n>=left} onClick={()=>setQty(n+1)}><Icon n="plus" size={16}/></button>
        </div>}

        <div className="acts">
          <button disabled={out} onClick={()=>add(p,cur,n)}><Icon n="cart" size={18}/>{out?'Sold out':'Add to cart'}</button>
          {!out&&<button className="sun" onClick={()=>{if(add(p,cur,n))nav('/checkout')}}>Buy now</button>}
          <button type="button" className={'icon'+(has?' on':'')} aria-pressed={has} aria-label={has?'Remove from saved':'Save for later'} onClick={()=>toggleWish(p.id)}>
            <Icon n="heart" fill={has?'currentColor':'none'}/></button>
          <button type="button" className="icon" aria-label="Share this product" onClick={share}><Icon n="share"/></button>
        </div>

        <div className="perk-list">
          <div><Icon n="truck" size={20}/>{deliveryText(S)}</div>
          <div><Icon n="wallet" size={20}/>Cash on delivery, bKash or Nagad</div>
        </div>
      </div>
    </div>

    <div className="box wide">
      <h2>Details</h2>
      <p className="desc">{p.desc||'No description yet.'}</p>
      <dl className="facts">
        {p.category&&<><dt>Category</dt><dd>{p.category}</dd></>}
        <dt>Colors</dt><dd>{cl.join(', ')}</dd>
        <dt>Availability</dt><dd>{out?'Sold out':left+' in stock'}</dd>
        <dt>Product code</dt><dd>{code}</dd>
      </dl>
    </div>

    {(S.phone||S.whatsapp)&&<div className="box wide"><h3>Have a question about this item?</h3>
      <Help S={S} text={'Hi! I have a question about '+p.name+' (code '+code+').'}/></div>}

    {rel.length>0&&<><h2>More like this</h2><div className="grid">{rel.map(x=><ProductCard key={x.id} p={x}/>)}</div></>}
  </>;
}
