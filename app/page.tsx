import { Header } from "@/components/Header";
import { TryOnSection } from "@/components/TryOnSection";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-muted/20 select-none md:px-4 md:py-4">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[540px] flex-col overflow-hidden bg-background md:min-h-0 md:h-[calc(100dvh-2rem)] md:rounded-[32px] md:border md:shadow-2xl">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden bg-muted/10">
          {/* Subtle background glow for premium feel */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

          <div className="flex-1 overflow-y-auto no-scrollbar pb-env-safe">
            <TryOnSection />
          </div>
        </main>
      </div>
    </div>
  );
}
