/** Expedition rules are isolated from the immutable Crown v1 competition. */
export const EXPEDITION_VERSION = 2 as const;
export const EXPEDITION_TICKS = 3600;
export const RIGS = [
  { id: "needle", name: "NEEDLE", title: "Precision pilot", description: "A tight, fast cannon. Line up your shot.", cadence: 9, damage: 2 },
  { id: "fan", name: "FAN", title: "Crowd breaker", description: "Three-way spread. Catch whole formations.", cadence: 14, damage: 1 },
  { id: "guard", name: "GUARD", title: "Second chances", description: "A shield absorbs one hit. Rescues restore it.", cadence: 11, damage: 2 },
] as const;
export type Rig = typeof RIGS[number]["id"];
export const CHAPTERS = [
  { id: 0, name: "DEAD AIR", district: "The Relay Yard", boss: "SWITCHBOARD", color: "#a1e7bf", seed: 313,
    briefing: "A distress signal is repeating your call sign. Three couriers are trapped in the relay yard. Bring them home. Find who is calling.",
    transmission: "MOTH: That voice on the channel? It’s yours. From a run you haven’t flown yet.",
    ending: "Inside Switchboard’s wreck is a damaged flight recorder. Its last entry is tomorrow. HOUND has the other half.",
    objective: "Defeat Switchboard and survive the extraction.", medalRescues: 2 },
  { id: 1, name: "GLASS MILE", district: "The Interceptor Trench", boss: "PRISM", color: "#efb775", seed: 729,
    briefing: "HOUND’s trail cuts through the laser trench. Watch the warning lanes. The couriers know a route the patrols don’t.",
    transmission: "HOUND: You keep chasing my ghost. Ever wonder who taught it to fly?",
    ending: "The recorder shows your own craft leading the patrols. Someone is using your best flight to hunt the couriers. Trace it to Crownline.",
    objective: "Break Prism’s blockade and reach Crownline.", medalRescues: 2 },
  { id: 2, name: "CROWNLINE", district: "The Ghost Engine", boss: "HOUND / ECHO", color: "#f7cc64", seed: 1021,
    briefing: "The Ghost Engine steals a pilot’s best run and turns it into a weapon. HOUND stayed behind to jam it. Cut the signal before it copies you.",
    transmission: "HOUND: That thing wears my face. Make it regret it.",
    ending: "The echo falls silent. Then seven distant relays answer in your voice. HOUND: “We broke a transmitter. The thing making the ghosts is still out there.”",
    objective: "Destroy HOUND’s echo. Bring your ghost home.", medalRescues: 2 },
  {"id": 3, "name": "BLACK TIDE", "district": "The Flooded Docks", "boss": "UNDERTOW", "color": "#8ecbc6", "seed": 1459, "briefing": "The couriers have a route beneath the relay net. Crossfire guards the flooded docks. Follow the rescue pods through the gaps.", "transmission": "MOTH: Those pods carry the last people who remember flying without a ghost.", "ending": "A rescued engineer gives you a stolen routing key. Every copied flight passes through the Switchyard. You finally have an address.", "objective": "Slip through Undertow’s crossing fire.", "medalRescues": 2},
  {"id": 4, "name": "SWITCHYARD", "district": "The Freight Spine", "boss": "RAILJACK", "color": "#dfb080", "seed": 1877, "briefing": "Patrols arrive in narrow columns along the freight spine. Railjack aims its volleys at your position. Bait a line, then move.", "transmission": "HOUND: Make the next shot miss before it leaves the barrel.", "ending": "The routing key opens a manifest: thousands of pilots, filed as ammunition. Your flight is only the prototype. Find the originals in Mirror Lake.", "objective": "Outmaneuver Railjack’s aimed volleys.", "medalRescues": 2},
  {"id": 5, "name": "MIRROR LAKE", "district": "The Reflection Array", "boss": "DOUBLET", "color": "#b9b9df", "seed": 2269, "briefing": "Twin patrols pinch the reflection array from both edges. Doublet swings its fire across the water. Read the sweep and keep a way out.", "transmission": "MOTH: I found your original recording. You turned back for someone. They cut that part out.", "ending": "Your ghost was edited to forget its rescues. The original flight contains a shutdown phrase. Carry it through the ash to the broadcast tower.", "objective": "Break Doublet’s sweeping blockade.", "medalRescues": 2},
  {"id": 6, "name": "ASHFALL", "district": "The Burnt Antenna Fields", "boss": "CINDER", "color": "#e49d87", "seed": 2683, "briefing": "Dense patrols and warned beams cut across the antenna fields. Rescue crews can repair your hull on the way through.", "transmission": "HOUND: They’re burning their own relays to stop us. That means they’re scared.", "ending": "You reach the tower, but the shutdown phrase needs a live voice. MOTH opens her channel. The network immediately starts hunting her signal.", "objective": "Carry the shutdown phrase past Cinder.", "medalRescues": 2},
  {"id": 7, "name": "NULL CHOIR", "district": "The Silent Receiver", "boss": "CANTOR", "color": "#bdd09d", "seed": 3089, "briefing": "MOTH is transmitting from the silent receiver. Cantor fires at your position while laser warnings force you to change lanes. Keep her channel open.", "transmission": "MOTH: I’m staying on the air. Keep giving them something else to shoot at.", "ending": "The phrase reaches every stolen ghost. For one second they stop firing. Then the network’s central voice speaks: “Return my pilots.”", "objective": "Silence Cantor and protect the broadcast.", "medalRescues": 2},
  {"id": 8, "name": "LAST LIGHT", "district": "The Broadcast Crown", "boss": "REGENT", "color": "#e9c275", "seed": 3527, "briefing": "Regent is the last relay before the source. Crossfire and laser lanes guard the broadcast crown. HOUND is holding the escape route for the couriers.", "transmission": "HOUND: They called you predictable. Show them the part they couldn’t copy.", "ending": "Regent breaks. The freed ghosts open a path into the source. One signal remains: your first flight, still trying to bring everyone home.", "objective": "Bring down Regent. Open the path home.", "medalRescues": 2},
  {"id": 9, "name": "GHOST DAWN", "district": "The First Flight", "boss": "ORIGIN", "color": "#f4d49d", "seed": 4001, "briefing": "Origin has learned the network’s volleys, sweeps, and aimed fire. Your first flight is trapped inside it. Break the final signal and bring your ghost home.", "transmission": "MOTH: A recording can repeat a flight. It can’t decide who to save. That part is still yours.", "ending": "The stolen flights return to their pilots. Dawn reaches the relay yard. HOUND clears his channel: “No more copies. Next time, we race.” Your ghost belongs to you.", "objective": "Defeat Origin. Give every pilot their ghost back.", "medalRescues": 2},
] as const;
export type ChapterId = typeof CHAPTERS[number]["id"];

/** UTC date is a repeatable local challenge identifier, never a source of trusted chain time. */
export function dailySignal(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return { key, seed, chapter: 2 as const };
}

export const CAMPAIGN_ACTS = [
  { name: "THE STOLEN FLIGHT", start: 0, end: 3 },
  { name: "FOLLOW THE ORIGINAL", start: 3, end: 6 },
  { name: "BRING THEM HOME", start: 6, end: 10 },
] as const;

// Append-only tuning: chapters 01–03 retain their original v2 physics.
// New chapters vary patterns instead of scaling bullet speed with chapter index.
export const ENCOUNTERS = [
  { waves:210, formation:"line", attack:"fan", hazardEvery:0, hp:105, damage:10, speed:0 },
  { waves:180, formation:"line", attack:"fan", hazardEvery:420, hp:130, damage:12, speed:1 },
  { waves:160, formation:"line", attack:"fan", hazardEvery:420, hp:155, damage:14, speed:2 },
  { waves:180, formation:"pincer", attack:"crossfire", hazardEvery:480, hp:155, damage:14, speed:2 },
  { waves:170, formation:"column", attack:"aimed", hazardEvery:420, hp:160, damage:14, speed:2 },
  { waves:180, formation:"pincer", attack:"sweep", hazardEvery:480, hp:165, damage:14, speed:2 },
  { waves:150, formation:"line", attack:"fan", hazardEvery:360, hp:170, damage:16, speed:2 },
  { waves:165, formation:"column", attack:"aimed", hazardEvery:300, hp:175, damage:16, speed:2 },
  { waves:150, formation:"pincer", attack:"crossfire", hazardEvery:300, hp:180, damage:16, speed:2 },
  { waves:150, formation:"pincer", attack:"remix", hazardEvery:300, hp:185, damage:16, speed:2 },
] as const;
