// src/Components/ThemeToggle/index.jsx
import React from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import "./ThemeToggle.scss";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle-section">
      <div className="theme-toggle-header">
        <h3>Theme Settings</h3>
        <div className="theme-toggle-badge">
          <span
            className={`theme-badge ${theme === "dark" ? "dark" : "light"}`}
          >
            {theme === "dark" ? " Dark Mode" : " Light Mode"}
          </span>
        </div>
      </div>

      <div className="theme-toggle-card">
        <div className="theme-preview">
          <div className={`theme-option ${theme === "light" ? "active" : ""}`}>
            <div className="theme-option__visual light-theme">
              <Sun className="sun-icon" size={32} strokeWidth={1.5} />
              <div className="theme-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="theme-option__label">
              <h4>Light Theme</h4>
              <p>Clean, bright interface</p>
            </div>
          </div>

          <div className={`theme-option ${theme === "dark" ? "active" : ""}`}>
            <div className="theme-option__visual dark-theme">
              <Moon className="moon-icon" size={32} strokeWidth={1.5} />
              <div className="theme-stars">
                <span>
                  <Sparkles size={14} strokeWidth={1.75} />
                </span>
                <span>
                  <Sparkles size={14} strokeWidth={1.75} />
                </span>
                <span>
                  <Sparkles size={14} strokeWidth={1.75} />
                </span>
              </div>
            </div>
            <div className="theme-option__label">
              <h4>Dark Theme</h4>
              <p>Easier on the eyes</p>
            </div>
          </div>
        </div>

        <div className="theme-toggle-control">
          <label className="theme-switch">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <span className="theme-switch__slider">
              <span className="theme-switch__icon sun"></span>
              <span className="theme-switch__icon moon"></span>
            </span>
          </label>
          <div className="theme-toggle-info">
            <span className="theme-toggle-label">Toggle Theme</span>
            <span className="theme-toggle-description">
              Switch between light and dark mode
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
