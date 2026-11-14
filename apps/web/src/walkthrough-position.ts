export interface SpotlightRect {top:number;left:number;width:number;height:number}
/** A walkthrough must remain dismissible even when its target is off screen. */
export function walkthroughPosition(rect:SpotlightRect|null,card:{w:number;h:number},vw:number,vh:number){
 const gap=16,w=Math.min(360,vw-32),h=Math.min(card.h,vh-32);
 const x=(n:number)=>Math.max(16,Math.min(n,vw-w-16));
 const y=(n:number)=>Math.max(16,Math.min(n,vh-h-16));
 // Phones use a stable bottom sheet. Never position it relative to off-screen content.
 if(vw<640)return {left:16,top:y(vh-h-16),width:vw-32};
 if(!rect)return {left:x((vw-w)/2),top:y((vh-h)/2),width:w};
 if(rect.top+rect.height+gap+h<=vh-16)return {left:x(rect.left),top:y(rect.top+rect.height+gap),width:w};
 if(rect.top-gap-h>=16)return {left:x(rect.left),top:y(rect.top-gap-h),width:w};
 if(rect.left+rect.width+gap+w<=vw-16)return {left:x(rect.left+rect.width+gap),top:y(rect.top),width:w};
 if(rect.left-gap-w>=16)return {left:x(rect.left-gap-w),top:y(rect.top),width:w};
 return {left:x((vw-w)/2),top:y(vh-h-24),width:w};
}
