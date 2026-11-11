import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArenaPrototype, type ArenaStats } from "./ArenaPrototype";
import "./styles.css";

const GAME_TITLE = "RIVALGHOST";

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
      <main className="game-page">
        <ArenaPrototype onFinish={finishRun} />
        <button className="exit-run" type="button" onClick={() => setScreen("title")}>Exit prototype</button>
      </main>
    );
  }

  if (screen === "result") {
    const beatHound = result.score > 14_000;
    return (
      <main className="result-page">
        <p className="eyebrow">LOCAL REPLAY READY</p>
        <h1>{beatHound ? "YOU PASSED HOUND" : "HOUND HOLDS"}</h1>
        <div className="result-score">{result.score.toLocaleString()}</div>
        <p>{beatHound ? "You cleared HOUND locally. This replay is ready for the verifier; Crown settlement remains testnet-locked." : "HOUND still holds. Thread the projectiles to build a Surge, then take another run."}</p>
        <dl className="run-breakdown">
          <div><dt>GRAZES</dt><dd>{result.grazes}</dd></div>
          <div><dt>SURGES</dt><dd>{result.surgeActivations}</dd></div>
          <div><dt>HOSTILES</dt><dd>{result.enemiesDestroyed}</dd></div>
        </dl>
        <p className="replay-id">REPLAY {result.replayHash.slice(0, 12).toUpperCase()}</p>
        <button className="play-button" type="button" onClick={() => setScreen("run")}>Run it again</button>
        <button className="quiet-button" type="button" onClick={() => setScreen("title")}>Back to title</button>
      </main>
    );
  }

  return (
    <main className="title-page">
      <section className="title-copy">
        <p className="eyebrow">NEAR TESTNET ARCADE · SEASON ZERO</p>
        <h1>{GAME_TITLE}</h1>
        <p className="title-pitch">HOUND left a Ghost in the signal lane. Outscore it in sixty seconds and take the Crown.</p>
        <button className="play-button" type="button" onClick={() => setScreen("run")}>Play the prototype <span>↗</span></button>
        <p className="microcopy">No wallet. No CR. Just the first 60 seconds.</p>
      </section>
      <section className="title-art" aria-hidden="true">
        <div className="crown-mark">✦</div>
        <div className="ghost-mark">HOUND<br />14,000</div>
        <div className="sentinel-mark"><i /><i /><i /></div>
        <span className="title-grid" />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
