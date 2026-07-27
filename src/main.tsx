import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { RouterProvider } from "@/lib/router";
import { initializeTheme, ThemeProvider } from "@/lib/theme";
import "@/index.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </ThemeProvider>
  </React.StrictMode>
);
