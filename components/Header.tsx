"use client";

import { Moon, Sun, Scissors, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/35 bg-background/70 backdrop-blur-xl dark:border-white/8 dark:bg-background/55">
      <div className="relative overflow-hidden bg-[linear-gradient(90deg,rgba(190,24,93,0.95),rgba(236,72,153,0.82),rgba(251,113,133,0.9))] dark:bg-[linear-gradient(90deg,rgba(136,19,55,0.95),rgba(157,23,77,0.88),rgba(159,18,57,0.9))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_28%)] pointer-events-none" />

        <div className="relative mx-auto flex min-h-16 max-w-[480px] items-center justify-between gap-3 px-4 py-3 sm:px-5 md:min-h-[72px] md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm md:h-11 md:w-11">
              <Scissors className="h-4 w-4 text-white md:h-[18px] md:w-[18px]" />
            </div>
            <div>
              <span className="block text-lg leading-none font-bold tracking-tight text-white md:text-[1.15rem]">HairAI</span>
              <span className="block text-[10px] leading-none font-medium uppercase tracking-[0.24em] text-pink-100/78">Beauty Studio</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-pink-50/92 uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Sparkles className="h-3 w-3" />
            AI Virtual Try-On
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end text-right leading-none text-pink-50/90">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Mobile Ready</span>
              <span className="mt-1 text-[11px] text-pink-100/72">Portrait and tablet optimized</span>
            </div>
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/14 text-white transition-colors hover:bg-white/24 md:h-10 md:w-10"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent dark:via-amber-600/35" />
    </header>
  );
}
