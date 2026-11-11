import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArenaPrototype } from "./ArenaPrototype";
import "./styles.css";

const GAME_TITLE = "RIVALGHOST";

function App() {
  const [screen, setScreen] = useState<"title" | "run" | "result">("title");
  const [result, setResult] = useState({ score: 0, health: 100, seconds: 0 });
  const finishRun = useCallback((stats: { score: number; health: number; seconds: number }) => {
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
        <p className="eyebrow">UNRANKED FIELD REPORT</p>
        <h1>{beatHound ? "YOU PASSED HOUND" : "HOUND HOLDS"}</h1>
        <div className="result-score">{result.score.toLocaleString()}</div>
        <p>{beatHound ? "The Crown is still testnet-locked. Replay settlement comes next." : "A sharper route can still take the Crown."}</p>
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
