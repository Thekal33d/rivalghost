import {useEffect,useId,useRef,type ReactNode} from 'react';
export function GameDialog({title,eyebrow,children,onClose}:{title:string;eyebrow:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),id=useId(),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const d=ref.current!,previous=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();previous?.focus?.();};},[]);
 return <dialog ref={ref} className="game-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();close.current();}}>
  <button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{children}
 </dialog>;
}
