import {useState,useEffect} from 'react';
import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getDatabase,ref,onValue} from 'firebase/database';

const app=initializeApp({
  apiKey:import.meta.env.VITE_API_KEY,
  authDomain:'my-test-390d7.firebaseapp.com',
  databaseURL:'https://my-test-390d7-default-rtdb.firebaseio.com',
  projectId:'my-test-390d7',
  storageBucket:'my-test-390d7.firebasestorage.app',
  messagingSenderId:'218319290498',
  appId:import.meta.env.VITE_APP_ID
});
export const auth=getAuth(app),db=getDatabase(app);
export const ADMIN_EMAIL='ebrathossen720@gmail.com';

// live data from Realtime Database (null while loading, or when path is empty)
export function useVal(path){
  const[v,setV]=useState(null);
  useEffect(()=>{
    setV(null);
    if(!path)return;
    return onValue(ref(db,path),s=>setV(s.val()||{}),()=>setV({}));
  },[path]);
  return v;
}
export const list=o=>Object.entries(o||{}).map(([id,x])=>({id,...x}));
