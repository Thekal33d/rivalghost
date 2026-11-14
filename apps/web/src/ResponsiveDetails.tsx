import {useEffect,useState,type ReactNode} from 'react';
import {GameDialog} from './GameDialog';
/** Desktop detail stays in place; on phones it is an explicit, dismissible sheet. */
export function ResponsiveDetails({title,label,children}:{title:string;label:string;children:ReactNode}){
 const [mobile,setMobile]=useState(()=>matchMedia('(max-width: 760px)').matches),[open,setOpen]=useState(false);
 useEffect(()=>{const m=matchMedia('(max-width: 760px)'),change=()=>setMobile(m.matches);m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
 if(!mobile)return <>{children}</>;
 return <><button type="button" className="mobile-details-trigger" onClick={()=>setOpen(true)}>{label}<span aria-hidden="true">↗</span></button><GameDialog open={open} className="mobile-sheet" title={title} eyebrow="RIVALGHOST / FLIGHT DECK" onClose={()=>setOpen(false)}>{children}</GameDialog></>;
}
