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
    ending: "The channel goes quiet. Then HOUND laughs: “Good flying, rookie. Next time, we race.” The couriers are free. Your ghost belongs to you.",
    objective: "Destroy HOUND’s echo. Bring your ghost home.", medalRescues: 2 },
] as const;
export type ChapterId = 0 | 1 | 2;

/** UTC date is a repeatable local challenge identifier, never a source of trusted chain time. */
export function dailySignal(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return { key, seed, chapter: 2 as const };
}
