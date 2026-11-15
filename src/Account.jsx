import {useState} from 'react';
import {Link,useNavigate,useLocation} from 'react-router-dom';
import {signOut,signInWithEmailAndPassword,createUserWithEmailAndPassword,updateProfile,sendPasswordResetEmail} from 'firebase/auth';
import {ref,set as dbSet,update} from 'firebase/database';
import {auth,db,useVal} from './firebase.js';
import {useApp} from './store.jsx';
import {Icon} from './ui.jsx';
import {PHONE_RE} from './helpers.js';

const AUTH={
  'auth/invalid-credential':'Wrong email or password.',
  'auth/wrong-password':'Wrong email or password.',
  'auth/user-not-found':'No account found with this email.',
  'auth/email-already-in-use':'This email already has an account. Try logging in.',
  'auth/weak-password':'Password must be at least 6 characters.',
  'auth/invalid-email':'Please enter a valid email address.',
  'auth/too-many-requests':'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed':'No internet connection. Please try again.'
};
const authMsg=x=>AUTH[x.code]||String(x.message||'Something went wrong').replace('Firebase: ','');

export function Login(){
  const nav=useNavigate(),loc=useLocation(),{toast}=useApp();
  const[reg,setReg]=useState(false),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const[f,setF]=useState({name:'',email:'',phone:'',address:'',password:''});
  const on=k=>e=>setF({...f,[k]:e.target.value});

  const go=async e=>{
    e.preventDefault();setErr('');setBusy(true);
    try{
      const email=f.email.trim();
      if(reg){
        const c=await createUserWithEmailAndPassword(auth,email,f.password);
        await updateProfile(c.user,{displayName:f.name.trim()});
        try{
          await dbSet(ref(db,'users/'+c.user.uid),{name:f.name.trim(),email,phone:f.phone.trim(),address:f.address.trim(),createdAt:Date.now()});
        }catch{toast('Account created, but we could not save your details. Add them on your Profile page.')}
      }else await signInWithEmailAndPassword(auth,email,f.password);
      nav(loc.state?.from||'/',{replace:true}); // go back to where they were (e.g. checkout)
    }catch(x){setErr(authMsg(x));setBusy(false)}
  };

  const reset=async()=>{
    if(!f.email.trim()){setErr('Type your email above, then tap "Forgot password?"');return}
    try{await sendPasswordResetEmail(auth,f.email.trim());setErr('');toast('Password reset email sent. Check your inbox and spam folder.')}
    catch(x){setErr(authMsg(x))}
  };

  return <form className="box" onSubmit={go}>
    <h2>{reg?'Create account':'Log in'}</h2>
    {reg&&<label>Full name<input required autoComplete="name" value={f.name} onChange={on('name')}/></label>}
    <label>Email<input required type="email" autoComplete="email" value={f.email} onChange={on('email')}/></label>
    {reg&&<label>Phone number (optional)<input type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" pattern={PHONE_RE} title="Enter a Bangladesh mobile number, like 01712345678" value={f.phone} onChange={on('phone')}/></label>}
    {reg&&<label>Address (optional)<textarea rows={2} autoComplete="street-address" value={f.address} onChange={on('address')}/></label>}
    <label>Password<input required type="password" minLength={6} autoComplete={reg?'new-password':'current-password'} placeholder="6+ characters" value={f.password} onChange={on('password')}/></label>
    {err&&<p className="err" role="alert">{err}</p>}
    <button className="full" disabled={busy}>{busy?'Please wait…':reg?'Sign up':'Log in'}</button>
    {!reg&&<p className="link" role="button" tabIndex={0} onClick={reset} onKeyDown={e=>e.key==='Enter'&&reset()}>Forgot password?</p>}
    <p className="link" role="button" tabIndex={0} onClick={()=>{setReg(!reg);setErr('')}} onKeyDown={e=>e.key==='Enter'&&setReg(!reg)}>
      {reg?'Have an account? Log in':'New here? Create an account'}</p>
  </form>;
}

export function Profile(){
  const{user}=useApp();
  const U=useVal(user?'users/'+user.uid:null);
  if(user===undefined)return <p className="c">Loading…</p>;
  if(!user)return <p className="c">Please <Link to="/login" state={{from:'/profile'}}>log in</Link> to see your profile.</p>;
  if(!U)return <p className="c">Loading…</p>;
  return <ProfileForm key={user.uid} user={user} init={U}/>;
}

function ProfileForm({user,init}){
  const{toast}=useApp(),nav=useNavigate();
  const[f,setF]=useState({name:init.name||user.displayName||'',phone:init.phone||'',address:init.address||''});
  const[busy,setBusy]=useState(false);
  const on=k=>e=>setF({...f,[k]:e.target.value});

  const save=async e=>{
    e.preventDefault();setBusy(true);
    try{
      const d={name:f.name.trim(),phone:f.phone.trim(),address:f.address.trim()};
      await update(ref(db,'users/'+user.uid),{...d,email:user.email});
      await updateProfile(user,{displayName:d.name});
      toast('Profile saved');
    }catch(x){toast(x.message)}
    setBusy(false);
  };

  return <div className="box">
    <div className="who"><span className="av" aria-hidden="true">{((f.name||user.email||'').trim()||'?')[0].toUpperCase()}</span>
      <div><h2>{init.name||user.displayName||'My profile'}</h2><small>{user.email}</small></div></div>
    <form onSubmit={save}>
      <label>Full name<input required autoComplete="name" value={f.name} onChange={on('name')}/></label>
      <label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" pattern={PHONE_RE} title="Enter a Bangladesh mobile number, like 01712345678" value={f.phone} onChange={on('phone')}/></label>
      <label>Delivery address<textarea rows={3} autoComplete="street-address" value={f.address} onChange={on('address')}/></label>
      <p><small>We fill these in for you at checkout.</small></p>
      <button className="full" disabled={busy}>{busy?'Saving…':'Save changes'}</button>
    </form>
    <div className="qlinks">
      <Link className="btn gray" to="/orders"><Icon n="truck" size={18}/>My orders</Link>
      <button className="gray" onClick={()=>signOut(auth).then(()=>{toast('Logged out');nav('/')})}><Icon n="logout" size={18}/>Log out</button>
    </div>
  </div>;
}
