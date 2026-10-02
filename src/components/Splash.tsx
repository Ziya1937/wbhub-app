import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

const HOLD_MS = 650;
const EXIT_MS = 300;

export function Splash({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const doneTimer = setTimeout(onDone, HOLD_MS + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-sidebar",
        exiting && "splash-overlay-exit"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="splash-logo flex size-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
          WB
        </div>
        <span className="splash-text text-2xl font-semibold text-white">Hub</span>
      </div>
    </div>
  );
}
