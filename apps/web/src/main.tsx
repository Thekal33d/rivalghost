import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const GAME_TITLE = "RIVALGHOST";

function App() {
  return (
    <main className="launch-shell">
      <p className="eyebrow">NEAR TESTNET ARCADE</p>
      <h1>{GAME_TITLE}</h1>
      <p>Outplay the recording. Take the Crown.</p>
      <span className="status">Workspace online · Gameplay next</span>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
