import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CircularProgress } from "@/components/ui/circular-progress";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface KickoffProgressModalProps {
  open: boolean;
  /** Set to true to snap to 100% and trigger onDone after a short pause */
  complete: boolean;
  /** Called after the modal has visually reached 100% */
  onDone: () => void;
  title?: string;
  caption?: string;
  /** Duration of the 0 -> 90% animation in ms */
  buildUpMs?: number;
}

export function KickoffProgressModal({
  open,
  complete,
  onDone,
  title = "Setting up Project Kick-Off",
  caption = "Generating Epic, Feature, Story and Tasks…",
  buildUpMs = 10000,
}: KickoffProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setProgress(0);
      startedAtRef.current = null;
      completedRef.current = false;
    }
  }, [open]);

  // Animate 0 → 90 over buildUpMs while not complete
  useEffect(() => {
    if (!open) return;

    const tick = (ts: number) => {
      if (startedAtRef.current === null) startedAtRef.current = ts;
      const elapsed = ts - startedAtRef.current;
      const t = Math.min(1, elapsed / buildUpMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const target = eased * 90;
      setProgress((prev) => (completedRef.current ? prev : Math.max(prev, target)));
      if (!completedRef.current && t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, buildUpMs]);

  // Handle completion: snap to 100, then call onDone
  useEffect(() => {
    if (!open || !complete || completedRef.current) return;
    completedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(100);
    const t = setTimeout(() => onDone(), 500);
    return () => clearTimeout(t);
  }, [complete, open, onDone]);

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[400px] [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{caption}</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center justify-center gap-5 py-6">
          <CircularProgress value={progress} size={180} strokeWidth={8} />
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{caption}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
