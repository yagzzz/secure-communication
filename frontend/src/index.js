import "./utils/resizeObserverFix";

// Suppress ResizeObserver errors aggressively
const originalError = console.error;
console.error = function(...args) {
  if (
    args[0]?.toString?.().includes('ResizeObserver') ||
    args[0]?.toString?.().includes('undelivered notifications') ||
    args[0]?.message?.includes('ResizeObserver')
  ) {
    return;
  }
  originalError.apply(console, args);
};

window.addEventListener('error', (e) => {
  if (e.message?.includes('ResizeObserver')) {
    e.preventDefault();
  }
});

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
