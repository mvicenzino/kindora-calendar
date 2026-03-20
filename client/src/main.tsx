import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for push notifications (silently, no effect if unsupported)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
