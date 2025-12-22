import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const storedTheme = localStorage.getItem("vb-theme");
const initialTheme =
  storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
    ? storedTheme
    : "system";
document.documentElement.setAttribute("data-theme", initialTheme);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
