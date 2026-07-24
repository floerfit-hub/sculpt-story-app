import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import OAuthConsent from "./pages/OAuthConsent";
import "./index.css";

// The OAuth consent route is served at a real path (not a hash route),
// so intercept it before mounting the HashRouter app.
const isConsent = window.location.pathname.endsWith("/.lovable/oauth/consent");

createRoot(document.getElementById("root")!).render(isConsent ? <OAuthConsent /> : <App />);
