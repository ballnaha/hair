import { Header } from "@/components/Header";
import { TryOnSection } from "@/components/TryOnSection";

export default function Home() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.14),_transparent_38%),linear-gradient(180deg,rgba(255,241,242,0.9),rgba(255,255,255,0.96)_30%,rgba(255,255,255,1))] select-none dark:bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_34%),linear-gradient(180deg,rgba(34,10,18,0.98),rgba(19,18,24,1)_34%,rgba(15,15,20,1))] md:px-5 md:py-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.2),_transparent_55%)] blur-3xl dark:bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.18),_transparent_50%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background/92 backdrop-blur md:min-h-0 md:h-[calc(100dvh-2.5rem)] md:rounded-[36px] md:border md:border-white/55 md:shadow-[0_30px_90px_rgba(15,23,42,0.16)] dark:md:border-white/10 dark:bg-background/88">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(249,250,251,0.88))] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.68),rgba(15,15,20,0.92))]">
          <div className="absolute left-1/2 top-0 -z-10 h-[420px] w-full -translate-x-1/2 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent dark:via-rose-700/55" />

          <div className="flex-1 overflow-y-auto no-scrollbar pb-env-safe">
            <TryOnSection />
          </div>
        </main>
      </div>
    </div>
  );
}
