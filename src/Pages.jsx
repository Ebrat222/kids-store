import {useEffect} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useVal} from './firebase.js';
import {Help} from './ui.jsx';
import {PAGES} from './pages.js';

// Turns the admin's plain text into headings, bullets, numbered steps and paragraphs.
// It builds normal React elements (never raw HTML), so whatever is typed is safe.
export function Rich({text}){
  const out=[];let list=null;
  const flush=()=>{
    if(!list)return;
    const L=list.type==='ol'?'ol':'ul';
    out.push(<L key={out.length}>{list.items.map((x,k)=><li key={k}>{x}</li>)}</L>);
    list=null;
  };
  const item=(type,t)=>{if(list&&list.type!==type)flush();if(!list)list={type,items:[]};list.items.push(t)};
  String(text||'').split('\n').forEach(raw=>{
    const l=raw.trim();let m;
    if(!l){flush();return}
    if(l.startsWith('# ')){flush();out.push(<h3 key={out.length}>{l.slice(2)}</h3>);return}
    if((m=l.match(/^[-*•]\s+(.+)/))){item('ul',m[1]);return}
    if((m=l.match(/^\d+[.)]\s+(.+)/))){item('ol',m[1]);return}
    flush();out.push(<p key={out.length}>{l}</p>);
  });
  flush();
  return <>{out}</>;
}

export function InfoPage(){
  const{slug}=useParams(),meta=PAGES.find(p=>p.slug===slug);
  const D=useVal(meta?'pages/'+meta.slug:null),S=useVal('settings');
  useEffect(()=>{
    if(!meta)return;
    const old=document.title;document.title=meta.title+' · Kids Store';
    return()=>{document.title=old};
  },[meta]);
  if(!meta)return <div className="c"><p>We couldn't find that page.</p><Link className="btn" to="/">Back to shop</Link></div>;
  if(!D)return <p className="c">Loading…</p>;
  return <div className="box info">
    <h2>{meta.title}</h2>
    {meta.slug==='contact'&&<Help S={S} text="Hi! I have a question."/>}
    <Rich text={D.content||meta.text}/>
    <p className="c"><Link to="/">Back to shop</Link></p>
  </div>;
}

// links shown at the bottom of every page
export const FooterLinks=()=>
  <nav className="flinks" aria-label="Store information">
    {PAGES.map(p=><Link key={p.slug} to={'/page/'+p.slug}>{p.title}</Link>)}
  </nav>;
