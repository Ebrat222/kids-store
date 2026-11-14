import {createContext,useContext,useEffect,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth,ADMIN_EMAIL} from './firebase.js';

const Ctx=createContext();
export const useApp=()=>useContext(Ctx);

export function Provider({children}){
  const[user,setUser]=useState(undefined);
  const[cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('cart')||'[]')}catch{return []}});
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  useEffect(()=>{localStorage.setItem('cart',JSON.stringify(cart))},[cart]);
  const add=p=>setCart(c=>c.find(i=>i.id===p.id)
    ?c.map(i=>i.id===p.id?{...i,qty:Math.min(i.qty+1,p.stock||99)}:i)
    :[...c,{id:p.id,name:p.name,price:p.price,image:p.image||'',qty:1}]);
  const setQty=(id,q)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:q}:i).filter(i=>i.qty>0));
  return <Ctx.Provider value={{user,isAdmin:user?.email===ADMIN_EMAIL,cart,add,setQty,clear:()=>setCart([])}}>{children}</Ctx.Provider>;
}
