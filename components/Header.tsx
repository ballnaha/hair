"use client";

import { Moon, Sun, Scissors, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* gradient bar */}
      <div className="relative bg-gradient-to-r from-rose-700 via-pink-600 to-rose-500 dark:from-rose-900 dark:via-pink-800 dark:to-rose-700">
        {/* subtle shimmer overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />

        <div className="relative flex h-14 items-center justify-between px-4 max-w-screen-sm mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white leading-none block">HairAI</span>
              <span className="text-[10px] font-medium text-pink-100/80 tracking-widest uppercase leading-none block">Beauty Studio</span>
            </div>
          </div>

          {/* Tagline center (hidden on very small) */}
          <div className="hidden sm:flex items-center gap-1.5 text-pink-100/80 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            AI Virtual Try-On
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {/* thin gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
    </header>
  );
}
