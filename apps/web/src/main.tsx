import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./theme.css";
import "./screens.css";
import "./journey.css";
import "./reference-design.css";
import "./wallet-welcome.css";
import "./walkthrough.css";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

import "./mobile-actions.css";
