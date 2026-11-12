/** One simulation, two camera orientations. Controls always follow screen direction. */
export function flightView(width:number,height:number){
  const landscape=width>height,worldWidth=landscape?640:360,worldHeight=landscape?360:640;
  const scale=Math.min(width/worldWidth,height/worldHeight);
  return {landscape,scale,x:(width-worldWidth*scale)/2,y:(height-worldHeight*scale)/2,width,height};
}
export type FlightView=ReturnType<typeof flightView>;
export function worldPoint(view:FlightView,x:number,y:number){
  const u=(x-view.x)/view.scale,v=(y-view.y)/view.scale;
  return view.landscape?{x:v,y:640-u}:{x:u,y:v};
}
export function screenDirection(direction:number,landscape:boolean){return landscape&&direction?((direction+5)%8)+1:direction;}
export function applyFlightView(c:CanvasRenderingContext2D,view:FlightView){
  c.translate(view.x,view.y);c.scale(view.scale,view.scale);
  if(view.landscape){c.translate(640,0);c.rotate(Math.PI/2);}
}
