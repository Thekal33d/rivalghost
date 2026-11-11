import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArenaPrototype, type ArenaStats } from "./ArenaPrototype";
import "./styles.css";

function PixelHound({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`pixel-hound${compact ? " pixel-hound--compact" : ""}`} aria-hidden="true">
      <i className="hound-crown" />
      <i className="hound-hood" />
      <i className="hound-face" />
      <i className="hound-eye hound-eye--left" />
      <i className="hound-eye hound-eye--right" />
      <i className="hound-trail" />
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<"title" | "run" | "result">("title");
  const [result, setResult] = useState<ArenaStats>({
    score: 0,
    health: 100,
    seconds: 0,
    grazes: 0,
    surgeActivations: 0,
    enemiesDestroyed: 0,
    replayHash: "",
  });
  const finishRun = useCallback((stats: ArenaStats) => {
    setResult(stats);
    setScreen("result");
  }, []);

  if (screen === "run") {
    return (
      <main className="game-page game-page--run">
        <ArenaPrototype onFinish={finishRun} />
        <button className="exit-run" type="button" onClick={() => setScreen("title")}>Back to lobby</button>
      </main>
    );
  }

  if (screen === "result") {
    const beatHound = result.score > 14_000;
    return (
      <main className="result-page">
        <div className="result-orbit result-orbit--one" /><div className="result-orbit result-orbit--two" />
        <p className="eyebrow">RUN LOGGED · LOCAL REPLAY READY</p>
        <h1>{beatHound ? "YOU PASSED HOUND" : "HOUND HOLDS"}</h1>
        <div className="result-score">{result.score.toLocaleString()}</div>
        <p>{beatHound ? "A clean line. This replay is ready for the verifier when the testnet challenge opens." : "Close. Four grazes trigger Surge—then every takedown hits twice as hard."}</p>
        <dl className="run-breakdown">
          <div><dt>GRAZES</dt><dd>{result.grazes}</dd></div>
          <div><dt>SURGES</dt><dd>{result.surgeActivations}</dd></div>
          <div><dt>HOSTILES</dt><dd>{result.enemiesDestroyed}</dd></div>
        </dl>
        <p className="replay-id">REPLAY {result.replayHash.slice(0, 12).toUpperCase()}</p>
        <button className="play-button" type="button" onClick={() => setScreen("run")}>Try one more run <span>→</span></button>
        <button className="quiet-button" type="button" onClick={() => setScreen("title")}>Return to lobby</button>
      </main>
    );
  }

  return (
    <main className="lobby-page">
      <section className="arcade-shell">
        <header className="lobby-header">
          <div className="wordmark"><span>RIVAL</span><strong>GHOST</strong></div>
          <div className="season-chip"><i />SEASON ZERO</div>
        </header>

        <section className="lobby-intro">
          <p className="eyebrow">THE CROWN IS CALLING</p>
          <h1>BEAT THE <em>GHOST.</em></h1>
          <p>Survive 60 seconds. Graze fire. Trigger Surge. Leave HOUND in your rearview.</p>
        </section>

        <section className="rival-card" aria-label="Challenge HOUND for 10 CR on NEAR testnet">
          <div className="rival-card__topline"><span className="pulse-dot" /> LIVE GHOST · RUNG 02 <span>01:38 LEFT</span></div>
          <div className="rival-card__body">
            <PixelHound />
            <div className="rival-card__identity">
              <p>RIVAL TO BEAT</p>
              <h2>HOUND</h2>
              <div className="rival-score"><strong>14,000</strong><span>BEST RUN</span></div>
            </div>
            <div className="bounty-pill"><span>✦</span><b>40</b><small>CR</small></div>
          </div>
          <button className="challenge-button" type="button" onClick={() => setScreen("run")}>
            <span>CHALLENGE HOUND</span><strong>10 CR</strong><i>→</i>
          </button>
          <p className="rival-card__note">Testnet practice is open—your first run is free.</p>
        </section>

        <section className="lobby-bottom">
          <button className="practice-card" type="button" onClick={() => setScreen("run")}>
            <span className="practice-icon">✧</span><span><b>FREE PRACTICE</b><small>Learn the lane</small></span><i>›</i>
          </button>
          <aside className="surge-tip"><span>4</span><p><b>GRAZES = SURGE</b><br />Double your takedown score for 3 seconds.</p></aside>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
