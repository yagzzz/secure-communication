import "./utils/resizeObserverFix";

const resizeObserverLoopErr = () => {
  const resizeObserverErr = window.console.error;
  window.console.error = (...args) => {
    if (args[0]?.toString().includes('ResizeObserver loop')) {
      return;
    }
    resizeObserverErr(...args);
  };
};

resizeObserverLoopErr();

import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
