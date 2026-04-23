import { Header } from "@/components/Header";
import { TryOnSection } from "@/components/TryOnSection";

export default function Home() {
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background select-none">
      <Header />
      
      <main className="flex-1 relative overflow-hidden flex flex-col bg-muted/10">
        <div className="flex-1 w-full max-w-md sm:max-w-[480px] mx-auto bg-background relative overflow-hidden flex flex-col shadow-2xl">
          {/* Subtle background glow for premium feel */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-env-safe">
            <TryOnSection />
          </div>
        </div>
      </main>
    </div>
  );
}
