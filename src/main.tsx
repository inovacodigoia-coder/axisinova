import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved visual settings on load
(() => {
  const root = document.documentElement;
  const primary = localStorage.getItem('axis_visual_primary') || '#00D4FF';
  const secondary = localStorage.getItem('axis_visual_secondary') || '#7B2FF7';
  const sidebar = localStorage.getItem('axis_visual_sidebar') || '#1E293B';
  root.style.setProperty('--color-primary-hex', primary);
  root.style.setProperty('--color-secondary-hex', secondary);
  root.style.setProperty('--gradient-main', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
  root.style.setProperty('--company-accent-hex', primary);
  root.style.setProperty('--sidebar-bg', sidebar);
})();

createRoot(document.getElementById("root")!).render(<App />);
