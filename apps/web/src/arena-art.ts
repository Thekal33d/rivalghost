import type { ArenaSnapshot } from "@rivalghost/sim";
import { ENEMIES_V1, type EnemyKind } from "@rivalghost/game-data";

export type Burst = { x: number; y: number; tick: number; color: string; label?: string };
const ink = "#14282e";
const cream = "#fff0d0";
const coral = "#ff785b";
const mint = "#a1e7bf";

function shape(c: CanvasRenderingContext2D, points: number[][], fill: string, line = 2) {
  c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = line; c.stroke();
}

export function ship(c: CanvasRenderingContext2D, x: number, y: number, kind: EnemyKind | "player", tick: number) {
  c.save(); c.translate(x,y);
  const player = kind === "player";
  const color = player ? mint : kind === "warden" ? "#e6bb62" : kind === "bulwark" ? "#ab8fb0" : coral;
  const size = kind === "warden" ? 1.9 : kind === "bulwark" ? 1.35 : 1;
  c.scale(size,size);
  if (player) {
    shape(c, [[-7,15],[-4,27 + tick%4],[0,20],[4,27+tick%4],[7,15]], "#f3b464", 1);
    shape(c, [[0,-20],[9,-2],[23,10],[20,17],[6,12],[0,17],[-6,12],[-20,17],[-23,10],[-9,-2]], color);
    shape(c, [[0,-12],[5,2],[0,9],[-5,2]], ink, 1);
    c.fillStyle = cream; c.fillRect(-2,-6,4,8);
    c.fillStyle = coral; c.fillRect(-17,9,6,3); c.fillRect(11,9,6,3);
  } else {
    const wing = kind === "lance" ? 24 : 19;
    shape(c, [[-wing,-11],[-8,-4],[0,-15],[8,-4],[wing,-11],[wing-3,7],[8,13],[0,19],[-8,13],[-wing+3,7]], color);
    shape(c, [[-9,-3],[0,1],[9,-3],[6,6],[0,9],[-6,6]], ink, 1);
    c.fillStyle = cream; c.fillRect(-7,1,4,2); c.fillRect(3,1,4,2);
    if (kind === "warden") shape(c, [[-9,-17],[-12,-26],[0,-22],[12,-26],[9,-17]], cream, 1);
  }
  c.restore();
}

export function drawArena(c: CanvasRenderingContext2D, s: ArenaSnapshot, bursts: Burst[], reduced: boolean) {
  const t = s.tick;
  const sceneryTick = reduced ? 0 : t;
  c.fillStyle = "#17343b"; c.fillRect(0,0,360,640);
  // Scrolling foundry architecture gives speed and depth without obscuring attacks.
  for (let i=0;i<9;i++) {
    const y = (i*92+sceneryTick*.8)%790-80;
    c.fillStyle = i%2 ? "#24454b" : "#203f46";
    c.fillRect(0,y,36,65); c.fillRect(324,y,36,65);
    c.fillStyle = "#35585b"; c.fillRect(12,y+8,14,3); c.fillRect(334,y+8,14,3);
    c.fillStyle = "#b79c62"; c.fillRect(29,y+24,3,15); c.fillRect(328,y+24,3,15);
    c.strokeStyle = "#2a474c"; c.lineWidth = 1; c.beginPath(); c.moveTo(38,y); c.lineTo(322,y); c.stroke();
  }
  for(let i=0;i<40;i++) {
    c.fillStyle = i%5===0 ? "#638178" : "#315559";
    c.fillRect(40+(i*83)%280, (i*137+sceneryTick*(i%3+1)*.35)%640, 1, i%5===0 ? 8 : 2);
  }
  c.save();
  const recentDamage = bursts.find(b=>b.label==="HIT" && t-b.tick<12);
  if (recentDamage && !reduced) c.translate(Math.sin(t*3)*3,Math.cos(t*2)*3);
  for(const enemy of s.enemies) {
    ship(c,enemy.laneX,78,enemy.kind,t);
    if (ENEMIES_V1[enemy.kind].health>1) {
      c.fillStyle=ink; c.fillRect(enemy.laneX-16,104,32,3);
      c.fillStyle=coral; c.fillRect(enemy.laneX-16,104,32*enemy.health/ENEMIES_V1[enemy.kind].health,3);
    }
  }
  // These are the collision objects, not a second decorative projectile field.
  for(const p of s.projectiles) {
    c.fillStyle=p.grazed ? "#7d938322" : "#ff785b22"; c.beginPath(); c.arc(p.x,p.y,9,0,Math.PI*2); c.fill();
    c.fillStyle=p.grazed ? "#7d9383" : coral; c.beginPath(); c.ellipse(p.x,p.y,4,7,0,0,Math.PI*2); c.fill();
    c.fillStyle=cream; c.fillRect(p.x-1,p.y-3,2,4);
    c.fillStyle=p.grazed ? "#4d6c65" : "#a95f4f"; c.fillRect(p.x-1,p.y-17,2,8);
  }
  if(s.lastShot && t-s.lastShot.tick<4) {
    c.strokeStyle=s.surgeTicksRemaining>0 ? "#ffe18a" : "#a1e7bf";
    c.lineWidth=s.surgeTicksRemaining>0 ? 3 : 1.5;
    c.globalAlpha=.55; c.beginPath(); c.moveTo(s.lastShot.x,s.lastShot.y-18); c.lineTo(s.lastShot.targetX,78); c.stroke(); c.globalAlpha=1;
  }
  if(s.destroyedAtTick===null) {
    c.strokeStyle=s.surgeTicksRemaining ? "#ffe18a" : "#82bdad"; c.lineWidth=1;
    // The square matches the simulator's actual graze range; wings are cosmetic.
    c.setLineDash([3,5]); c.strokeRect(s.player.x-20,s.player.y-20,40,40); c.setLineDash([]);
    ship(c,s.player.x,s.player.y,"player",reduced ? 0 : t);
    c.strokeStyle=cream; c.lineWidth=1; c.strokeRect(s.player.x-10,s.player.y-10,20,20);
    c.fillStyle=cream; c.beginPath(); c.arc(s.player.x,s.player.y,2,0,Math.PI*2); c.fill();
  }
  for(const b of bursts) {
    const age=t-b.tick;
    if(age>42 || age<0) continue;
    c.globalAlpha=1-age/42;
    const count=reduced ? 3 : 9;
    for(let i=0;i<count;i++) {
      const a=i*Math.PI*2/count;
      c.fillStyle=b.color;
      c.fillRect(b.x+Math.cos(a)*age*.75,b.y+Math.sin(a)*age*.75,Math.max(1,4-age/15),Math.max(1,4-age/15));
    }
    if(b.label && b.label!=="HIT") {
      c.font="bold 12px 'Trebuchet MS',sans-serif"; c.textAlign="center";
      c.strokeStyle=ink; c.lineWidth=3; c.strokeText(b.label,b.x,b.y-20-age*.4); c.fillStyle=b.color; c.fillText(b.label,b.x,b.y-20-age*.4);
    }
    c.globalAlpha=1;
  }
  c.restore();
  c.textAlign="center";
  const sector=Math.min(3,Math.floor(t/900));
  const names=["01 / SIGNAL","02 / CROSSFIRE","03 / PRESSURE","04 / CROWNLINE"];
  if(t%900<105) {
    c.fillStyle="rgba(20,40,46,.85)"; c.fillRect(72,255,216,66);
    c.fillStyle=cream; c.font="italic bold 25px 'Trebuchet MS',sans-serif"; c.fillText(names[sector],180,282);
    c.font="11px 'Trebuchet MS',sans-serif"; c.fillStyle=mint; c.fillText(sector===0 ? "MOVE CLOSE. STAY ALIVE." : "KEEP YOUR LINE.",180,302);
  }
  if(s.surgeTicksRemaining>0) {
    c.strokeStyle="#f7cc64"; c.lineWidth=5; c.strokeRect(3,3,354,634);
    c.fillStyle="#f7cc64"; c.fillRect(94,16,172,30);
    c.fillStyle=ink; c.font="italic bold 19px 'Trebuchet MS',sans-serif"; c.fillText("SURGE / 2×",180,38);
  }
  c.textAlign="left";
}
