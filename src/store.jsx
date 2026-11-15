import {createContext,useContext,useEffect,useState,useRef,useCallback,useMemo} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth,ADMIN_EMAIL,useVal} from './firebase.js';
import {imgs} from './helpers.js';

const Ctx=createContext();
export const useApp=()=>useContext(Ctx);
const load=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return []}};

export function Provider({children}){
  const[user,setUser]=useState(undefined);
  // cart line = one product in one color; "key" is id|color
  const[cart,setCart]=useState(()=>load('cart').map(i=>({...i,color:i.color||'White',key:i.key||i.id+'|'+(i.color||'White')})));
  const[wish,setWish]=useState(()=>load('wish'));
  const[msg,setMsg]=useState('');
  const timer=useRef();

  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  useEffect(()=>{localStorage.setItem('cart',JSON.stringify(cart))},[cart]);
  useEffect(()=>{localStorage.setItem('wish',JSON.stringify(wish))},[wish]);

  const toast=useCallback(m=>{
    setMsg(m);clearTimeout(timer.current);
    timer.current=setTimeout(()=>setMsg(''),2200);
  },[]);

  const add=(p,color='White',qty=1)=>{
    const key=p.id+'|'+color,max=+p.stock>0?+p.stock:0;
    const have=cart.find(i=>i.key===key)?.qty||0;
    if(max<=0){toast('Sorry, this item is sold out');return false}
    if(have>=max){toast('Only '+max+' available');return false}
    const n=Math.min(have+qty,max);
    setCart(c=>c.some(i=>i.key===key)
      ?c.map(i=>i.key===key?{...i,qty:n,stock:max}:i)
      :[...c,{key,id:p.id,name:p.name,price:p.price,image:imgs(p)[0]||'',color,qty:n,stock:max}]);
    toast(n<have+qty?'Added. Only '+max+' available':'Added to cart');
    return true;
  };
  const setQty=(key,q)=>setCart(c=>c.map(i=>i.key===key?{...i,qty:Math.min(q,i.stock||99)}:i).filter(i=>i.qty>0));
  const remove=key=>setCart(c=>c.filter(i=>i.key!==key));
  const toggleWish=id=>setWish(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);

  return <Ctx.Provider value={{user,isAdmin:user?.email===ADMIN_EMAIL,cart,add,setQty,remove,clear:()=>setCart([]),
    wish,toggleWish,toast,msg}}>{children}</Ctx.Provider>;
}

// Cart lines checked against the live product list:
// current price, current stock, and "ok:false" if sold out or deleted.
export function useLiveCart(){
  const{cart}=useApp();
  const P=useVal('products');
  return useMemo(()=>({
    loading:!P,
    items:cart.map(i=>{
      if(!P)return {...i,ok:true};
      const p=P[i.id];
      if(!p||!(p.stock>0))return {...i,ok:false};
      return {...i,name:p.name,price:p.price,image:imgs(p)[0]||i.image,stock:p.stock,qty:Math.min(i.qty,p.stock),ok:true};
    })
  }),[cart,P]);
}
