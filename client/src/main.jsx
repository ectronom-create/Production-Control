import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { LineProvider } from "./context/LineContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PwaPrompt from "./components/PwaPrompt";
import "./hooks/usePwaInstall"; // start listening for the install offer early
import "./styles/index.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <LineProvider>
              <App />
              <PwaPrompt />
            </LineProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
