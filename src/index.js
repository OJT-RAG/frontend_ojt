import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { LanguageProvider } from "./i18n/i18n.jsx";
import { AuthProvider } from "./component/Hook/useAuth.jsx";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
//console.log("ENV TEST:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
