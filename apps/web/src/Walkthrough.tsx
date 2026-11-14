import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArcadeButton, Icon } from "./Brand";
import { FEATURES, type Feature } from "./player-journey";
import type { Tour } from "./tours";

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8, GAP = 16, CARD_W = 360;

/** Finds the step's target, waiting briefly for screens that load their content. */
function useTargetRect(selector: string | undefined, step: number) {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    setRect(null);
    if (!selector) return;
    let frame = 0, tries = 0, el: Element | null = null, scrolled = false;
    const measure = () => {
      el = el?.isConnected ? el : document.querySelector(selector);
      if (!el) { if (tries++ < 90) frame = requestAnimationFrame(measure); return; }
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) { if (tries++ < 90) frame = requestAnimationFrame(measure); return; }
      if (!scrolled) {
        scrolled = true;
        const inView = r.top >= 80 && r.bottom <= innerHeight - 40;
        if (!inView) { el.scrollIntoView({ block: r.height > innerHeight * .6 ? "start" : "center", behavior: "auto" }); frame = requestAnimationFrame(measure); return; }
      }
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    const update = () => { cancelAnimationFrame(frame); scrolled = true; tries = 0; measure(); };
    addEventListener("resize", update); addEventListener("scroll", update, true);
    return () => { cancelAnimationFrame(frame); removeEventListener("resize", update); removeEventListener("scroll", update, true); };
  }, [selector, step]);
  return rect;
}

/** Places the card beside the spotlight where it fits, otherwise centered. */
function cardPosition(rect: Rect | null, card: { w: number; h: number }) {
  const vw = innerWidth, vh = innerHeight, w = Math.min(CARD_W, vw - 32);
  if (!rect || vw < 640) return rect && vw < 640
    ? { left: 16, top: rect.top + rect.height + GAP + card.h < vh ? rect.top + rect.height + GAP : Math.max(16, rect.top - GAP - card.h), width: vw - 32 }
    : { left: (vw - w) / 2, top: Math.max(16, (vh - card.h) / 2), width: w };
  const clampX = (x: number) => Math.min(Math.max(16, x), vw - w - 16), clampY = (y: number) => Math.min(Math.max(16, y), vh - card.h - 16);
  if (rect.top + rect.height + GAP + card.h <= vh - 16) return { left: clampX(rect.left), top: rect.top + rect.height + GAP, width: w };
  if (rect.top - GAP - card.h >= 16) return { left: clampX(rect.left), top: rect.top - GAP - card.h, width: w };
  if (rect.left + rect.width + GAP + w <= vw - 16) return { left: rect.left + rect.width + GAP, top: clampY(rect.top), width: w };
  if (rect.left - GAP - w >= 16) return { left: rect.left - GAP - w, top: clampY(rect.top), width: w };
  return { left: (vw - w) / 2, top: clampY(vh - card.h - 24), width: w };
}

export function Walkthrough({ tour, onDone, onTipsOff }: { tour: Tour; onDone: () => void; onTipsOff: () => void }) {
  const [step, setStep] = useState(0), s = tour.steps[step], last = step === tour.steps.length - 1;
  const rect = useTargetRect(s.target, step), cardRef = useRef<HTMLDivElement>(null), nextRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: CARD_W, h: 220 }), titleId = useId(), bodyId = useId();
  useLayoutEffect(() => { const el = cardRef.current; if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight }); }, [step, rect]);
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, [step]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onDone(); }
      else if (e.key === "ArrowRight" && !last) setStep(n => n + 1);
      else if (e.key === "ArrowLeft" && step > 0) setStep(n => n - 1);
      else if (e.key === "Tab") { // Keep focus inside the card while the page behind is dimmed.
        const items = cardRef.current?.querySelectorAll<HTMLElement>("button");
        if (!items?.length) return;
        const first = items[0], end = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    };
    addEventListener("keydown", key, true); return () => removeEventListener("keydown", key, true);
  }, [last, step, onDone]);
  const pos = cardPosition(rect, size);
  return <div className="walkthrough" role="presentation">
    {rect ? <div className="walkthrough-spot" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true"/> : <div className="walkthrough-dim" aria-hidden="true"/>}
    <div className="walkthrough-block" aria-hidden="true" onClick={e => e.stopPropagation()}/>
    <div ref={cardRef} className="walkthrough-card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} style={{ top: pos.top, left: pos.left, width: pos.width }}>
      <div className="walkthrough-top"><span>{tour.label} · {step + 1} OF {tour.steps.length}</span><button className="walkthrough-x" aria-label="Close walkthrough" onClick={onDone}><Icon name="close" size={16}/></button></div>
      <h2 id={titleId}>{s.title}</h2>
      <p id={bodyId}>{s.body}</p>
      <div className="walkthrough-dots" aria-hidden="true">{tour.steps.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""}/>)}</div>
      <div className="walkthrough-actions">
        {step > 0 ? <button className="walkthrough-back" onClick={() => setStep(n => n - 1)}><Icon name="chevronLeft" size={16}/>BACK</button> : <button className="walkthrough-back" onClick={onTipsOff}>TURN OFF TIPS</button>}
        <button ref={nextRef} className="walkthrough-next" onClick={() => last ? onDone() : setStep(n => n + 1)}>{last ? "GOT IT" : "NEXT"}{!last && <Icon name="chevronRight" size={16}/>}</button>
      </div>
    </div>
  </div>;
}

const ECONOMY_SLIDES = [
  { icon: "gear" as const, title: "THE CITY RUNS ON SALVAGE.", body: "MOTH posts recovery jobs: destroy 12 enemies, rescue 2 couriers. Hit the goal and the server replays your flight, then pays you salvage. One reward per job each day, and retries are free." },
  { icon: "coin" as const, title: "CR KEEPS IT MOVING.", body: "CR is the game’s credit. Claim a one-time 100 CR starter grant, then buy and sell salvage with MOTH. Her prices fall as her stock fills. CR has no cash value." },
  { icon: "shield" as const, title: "A FINITE ECONOMY.", body: "There are only 100,100 CR in total, and nobody can mint more. Crafting, repairs and entry fees move CR between players and the reserve. Nothing you buy gives combat power." },
];

/** Announces newly earned features. When the Workshop is among them, first explains the economy. */
export function UnlockCelebration({ features, onGo, onClose }: { features: Feature[]; onGo: (f: Feature) => void; onClose: () => void }) {
  const economy = features.includes("workshop");
  const [slide, setSlide] = useState(economy ? 0 : ECONOMY_SLIDES.length);
  const ref = useRef<HTMLDialogElement>(null), titleId = useId(), list = FEATURES.filter(f => features.includes(f.id));
  useEffect(() => { const d = ref.current!, prev = document.activeElement as HTMLElement | null; d.showModal(); return () => { d.close(); prev?.focus?.(); }; }, []);
  const primary = economy ? "workshop" : list[0]?.id;
  const onSlides = slide < ECONOMY_SLIDES.length, cur = ECONOMY_SLIDES[slide];
  return <dialog ref={ref} className="game-dialog unlock-celebration" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }}>
    <button className="dialog-close" aria-label="Close" onClick={onClose}>×</button>
    {onSlides ? <>
      <p className="eyebrow">NEW · THE ECONOMY · {slide + 1} OF {ECONOMY_SLIDES.length}</p>
      <span className="unlock-burst" aria-hidden="true"><Icon name={cur.icon} size={40}/></span>
      <h2 id={titleId}>{cur.title}</h2>
      <p>{cur.body}</p>
      <div className="walkthrough-dots" aria-hidden="true">{ECONOMY_SLIDES.map((_, i) => <i key={i} className={i === slide ? "on" : i < slide ? "done" : ""}/>)}</div>
      <div className="unlock-actions"><ArcadeButton size="sm" onClick={() => setSlide(n => n + 1)}>NEXT<Icon name="chevronRight" size={18}/></ArcadeButton></div>
    </> : <>
      <p className="eyebrow">UNLOCKED</p>
      <span className="unlock-burst" aria-hidden="true"><Icon name="sparkle" size={40}/></span>
      <h2 id={titleId}>{list.length === 1 ? list[0].name.toUpperCase() : "NEW DOORS OPEN."}</h2>
      <ul className="unlock-list">{list.map(f => <li key={f.id}><Icon name="check" size={16}/><span><b>{f.name}</b>{f.description}</span></li>)}</ul>
      <div className="unlock-actions">
        {primary && <ArcadeButton size="sm" onClick={() => onGo(primary)}><Icon name="play" size={18}/>{economy ? "OPEN THE WORKSHOP" : "TRY IT NOW"}</ArcadeButton>}
        <button className="text-button" onClick={onClose}>KEEP FLYING</button>
      </div>
    </>}
  </dialog>;
}
