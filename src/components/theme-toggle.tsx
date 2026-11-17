"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeScope = "public" | "admin";

export default function ThemeToggle({ scope }: { scope: ThemeScope }) {
  const [dark, setDark] = useState(false);
  const themeKey = `whereisit-theme-${scope}-v1`;

  useEffect(() => {
    let useDark = false;
    try {
      const saved = localStorage.getItem(themeKey);
      useDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch { /* Use the current light theme if browser storage is unavailable. */ }
    document.documentElement.classList.toggle("dark", useDark);
    setDark(useDark);
  }, [themeKey]);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    try { localStorage.setItem(themeKey, nextDark ? "dark" : "light"); } catch { /* Theme still applies for this visit. */ }
    setDark(nextDark);
  }

  return <button type="button" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600">
    {dark ? <Sun size={18}/> : <Moon size={18}/>}
  </button>;
}
