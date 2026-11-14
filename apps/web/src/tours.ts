import type { Feature } from "./player-journey";

/** One walkthrough step. `target` is a CSS selector to spotlight; without one (or if it is absent) the card is centered. */
export interface TourStep { target?: string; title: string; body: string }
export interface Tour { id: string; label: string; steps: TourStep[] }

export const TOURS: Record<string, Tour> = {
  deck: { id: "deck", label: "FLIGHT DECK", steps: [
    { target: ".top-tabs", title: "YOUR HANGAR", body: "Every part of RivalGhost lives up here. Locked tabs open as you keep flying, and each one walks you through itself the first time." },
    { target: ".deck-mission", title: "YOUR NEXT MISSION", body: "This is the chapter you’ll fly, what it takes to clear it, and the three medals it holds: clear it, rescue two couriers, and finish without hull damage." },
    { target: ".deck-loadout", title: "PICK A RIG", body: "Your ship. Fan’s spread is free from the start. Needle and Guard unlock as you clear chapters. All rigs are free, with no paid upgrades." },
    { target: ".deck-launch", title: "LAUNCH", body: "Each flight lasts up to 60 seconds. Press this or hit Enter. Your best run is saved as a ghost you can race next time." },
    { target: ".journey-panel", title: "WHAT OPENS NEXT", body: "Your pilot journey shows the next unlock and the full roadmap. Replay Flight School from here any time." },
  ] },
  result: { id: "result", label: "RESULTS", steps: [
    { target: ".final-score", title: "YOUR SCORE", body: "Points come from kills, chains, Surge and rescues. Beat it next time and your ghost gets faster." },
    { target: ".medal-results", title: "MEDALS", body: "Each chapter has three. Clearing a chapter opens the next one. Medals raise your pilot rank." },
    { target: ".share-flight", title: "YOUR SCORE GOES PUBLIC", body: "With a username, finished flights post to the Rivals board automatically, and you get a link that challenges a friend to beat your ghost." },
    { target: ".result-detail .primary-button", title: "GO AGAIN", body: "Race your best ghost on the same route, or head back to the hangar to change rig or chapter." },
  ] },
  map: { id: "map", label: "SIGNAL MAP", steps: [
    { target: ".map-board", title: "TEN CHAPTERS, THREE ACTS", body: "Clear a chapter to unlock the next. The diamonds under each node are its medals." },
    { target: ".map-objectives", title: "THE BRIEF", body: "What to do in this chapter. Each line here is one of its medals." },
    { target: ".map-twist", title: "CHAPTER TWIST", body: "Every district plays differently. Read this before you launch." },
    { target: ".map-launch", title: "LAUNCH FROM HERE", body: "Fly the selected chapter with your current rig." },
  ] },
  board: { id: "board", label: "RIVALS", steps: [
    { target: ".rivals-filters", title: "PICK A LEADERBOARD", body: "Each chapter and rig has its own board. Story boards cover 30 days; the daily board resets at UTC midnight." },
    { target: ".podium", title: "THE TOP THREE", body: "Every score here was re-simulated by the server from its recorded inputs. Empty slots are yours to take." },
    { target: ".rivals-main", title: "CHASE A GHOST", body: "Race any pilot’s exact recorded flight, then add them as a rival to keep their scores in view." },
  ] },
  profile: { id: "profile", label: "PILOT", steps: [
    { target: ".pilot-pass", title: "YOUR PILOT LICENSE", body: "This is how other pilots see you on the board and on challenge links. Every style is free." },
    { target: ".pilot-field", title: "CHOOSE A CALLSIGN", body: "Your username. Once it’s saved, your finished flights post to the Rivals board automatically." },
    { target: ".pilot-account", title: "KEEP YOUR PILOT", body: "Save this pilot in your browser, or sign in so your pilot and on-chain CR follow you." },
  ] },
  workshop: { id: "workshop", label: "WORKSHOP", steps: [
    { target: ".workshop-balance", title: "WHAT YOU OWN", body: "CR is the game’s credit. Salvage is scrap you bring back from jobs. Your equipped trail shows here too." },
    { target: ".workshop-side .arcade-button", title: "OPEN YOUR WORKSHOP", body: "Claim a one-time 100 CR starter grant. CR has no cash value, and story flights always stay free." },
    { target: ".job-board", title: "RECOVERY JOBS", body: "Pick a job, fly it, hit its goal. The server replays your flight before it pays salvage. One reward per job each UTC day; retries are free." },
    { target: ".salvage-counter", title: "TRADE WITH MOTH", body: "MOTH buys and sells salvage for CR. Her prices fall as her stock fills, and she has a daily budget, so timing matters." },
    { target: ".workshop-tabs", title: "MORE TO UNLOCK", body: "Crafting, the pilot market, city repairs and the NPC reactor open as you clear more chapters." },
  ] },
  "workshop:bench": { id: "workshop:bench", label: "CRAFT & EQUIP", steps: [
    { target: ".blueprint-row", title: "CRAFT A TRAIL", body: "Spend salvage plus a CR fee to craft a cosmetic trail, then equip it. Trails change your look, never your speed, damage or hitbox." },
  ] },
  "workshop:market": { id: "workshop:market", label: "PILOT MARKET", steps: [
    { target: ".market-listing", title: "SELL TO PILOTS", body: "Set a price and list a trail you crafted. It’s held until it sells or you cancel. The 5% fee returns to the reserve; nobody prints new CR." },
  ] },
  "workshop:city": { id: "workshop:city", label: "REBUILD THE CITY", steps: [
    { target: ".district-repairs", title: "RELIGHT THE DISTRICTS", body: "Donate salvage to a district. Everyone shares the repairs, and the lights come back at 10, 30 and 60 pieces, which you’ll see in your next flight." },
  ] },
  "workshop:compute": { id: "workshop:compute", label: "NPC REACTOR", steps: [
    { target: ".reactor-panel", title: "HOW NPCS DECIDE", body: "This shows how HOUND and MOTH make decisions between flights and how that compute is funded. Gameplay never waits on it." },
  ] },
  pit: { id: "pit", label: "CROWN PIT", steps: [
    { target: ".pit-wallets", title: "TWO WALLETS", body: "Yours and HOUND’s. HOUND is a rival with its own CR, a 20 CR reserve and a 60 CR daily attack budget." },
    { target: ".pit-targets", title: "PICK A CROWN", body: "Each crown is held by a recorded ghost with a CR bounty on it. Beat its score on the same route to take the whole bounty." },
    { target: ".pit-rules", title: "THE STAKES", body: "Entry is 10 CR. Win: you get your entry back plus the bounty. Lose, tie or run out of time: 8 CR grows the bounty and 2 CR goes to the holder." },
    { target: ".hound-dossier", title: "HOUND FIGHTS BACK", body: "Take a crown and HOUND may fund a defense and come for it with a real replayed flight." },
  ] },
  commission: { id: "commission", label: "HOUND COMMISSIONS", steps: [
    { target: '.job-board [data-job="commission"]', title: "SELL YOUR GHOST TO HOUND", body: "Fly this job: 12,000 points without using Pulse. If the server confirms it, HOUND pays salvage plus CR for a non-exclusive copy of your ghost, and other pilots can race it here. HOUND only buys while its budget allows." },
  ] },
  daily: { id: "daily", label: "DAILY SIGNAL", steps: [
    { target: ".deck-mission", title: "TODAY’S SIGNAL", body: "Expert difficulty, and the same seed for every pilot today. Daily bests live on their own board and reset at UTC midnight." },
  ] },
};

/** Where an unlock sends the player when they choose to try it now. */
export const UNLOCK_DESTINATION: Partial<Record<Feature, "board" | "workshop" | "pit" | "lobby">> = {
  rivals: "board", workshop: "workshop", craft: "workshop", market: "workshop", city: "workshop", commission: "workshop", compute: "workshop",
  pit: "pit", needle: "lobby", guard: "lobby", daily: "lobby",
};
