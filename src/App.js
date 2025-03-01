import React, { useEffect, useState } from "react";
import GitHubBrowser from "./components/GitHubBrowser";
import "./styles/GitHubBrowser.css";

const SESSION_TIMEOUT = 300 * 60 * 1000;

function App() {
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem("auth") === "true"
  );

  const correctPassword = process.env.REACT_APP_PASSWORD;

  useEffect(() => {
    if (!authenticated) {
      const userPassword = window.prompt("Enter password:");
      if (userPassword === correctPassword) {
        setAuthenticated(true);
        localStorage.setItem("auth", "true");
      } else {
        alert("Incorrect password. Please refresh and try again.");
      }
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      const timeout = setTimeout(() => {
        setAuthenticated(false);
        localStorage.removeItem("auth");
        alert("Session expired. Please log in again.");
      }, SESSION_TIMEOUT);

      return () => clearTimeout(timeout);
    }
  }, [authenticated]);

  return (
    <div className="container">{authenticated ? <GitHubBrowser /> : null}</div>
  );
}

export default App;
