import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Visual settings are now loaded from Lovable Cloud via VisualSettingsPage and CompanySidebar.
// Default values applied here, overridden once the user session loads branding from DB.
(() => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary-hex', '#00D4FF');
  root.style.setProperty('--color-secondary-hex', '#7B2FF7');
  root.style.setProperty('--gradient-main', 'linear-gradient(135deg, #00D4FF 0%, #7B2FF7 100%)');
  root.style.setProperty('--company-accent-hex', '#00D4FF');
  root.style.setProperty('--sidebar-bg', '#1E293B');
})();

createRoot(document.getElementById("root")!).render(<App />);
