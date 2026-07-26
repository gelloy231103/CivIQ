import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatQuestionDuration, QUESTION_TARGET_SECONDS } from "@/lib/exam-timing";
import { cn, clamp } from "@/lib/utils";

type TimerTone = "steady" | "warning" | "urgent" | "expired";

type QuestionTimerProps = {
  resetKey: string | number;
  paused?: boolean;
  durationSeconds?: number;
  className?: string;
  onExpire?: () => void;
};

export function QuestionTimer({
  resetKey,
  paused = false,
  durationSeconds = QUESTION_TARGET_SECONDS,
  className,
  onExpire
}: QuestionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    setElapsedSeconds(0);
    expiredRef.current = false;
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (paused) return;
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [paused, resetKey]);

  const remainingSeconds = Math.max(durationSeconds - elapsedSeconds, 0);
  const overtimeSeconds = Math.max(elapsedSeconds - durationSeconds, 0);
  const progress = clamp((remainingSeconds / durationSeconds) * 100, 0, 100);
  const tone: TimerTone =
    remainingSeconds === 0 ? "expired" : remainingSeconds <= 10 ? "urgent" : remainingSeconds <= 20 ? "warning" : "steady";

  useEffect(() => {
    if (remainingSeconds > 0 || expiredRef.current) return;
    expiredRef.current = true;
    onExpire?.();
  }, [onExpire, remainingSeconds]);

  const statusText = useMemo(() => {
    if (paused && remainingSeconds === 0) return "Answered over target";
    if (paused) return "Pace paused";
    if (remainingSeconds === 0) return "Over pace - guess and move on";
    if (remainingSeconds <= 10) return "Answer or guess now";
    if (remainingSeconds <= 20) return "Wrap up soon";
    return `${durationSeconds}s target pace`;
  }, [durationSeconds, paused, remainingSeconds]);

  const timerText = remainingSeconds > 0 ? formatQuestionDuration(remainingSeconds) : `+${formatQuestionDuration(overtimeSeconds)}`;

  return (
    <div
      className={cn(
        "rounded-md border bg-muted/40 p-3",
        tone === "warning" && "border-warning/70 bg-warning/10",
        tone === "urgent" && "border-destructive/70 bg-destructive/10",
        tone === "expired" && "border-destructive bg-destructive/10",
        className
      )}
      aria-label="Question pace timer"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3
            className={cn(
              "h-4 w-4 shrink-0 text-primary",
              tone === "warning" && "text-warning",
              (tone === "urgent" || tone === "expired") && "text-destructive"
            )}
            aria-hidden="true"
          />
          <span className="truncate text-sm font-bold">Question pace</span>
        </div>
        <span
          className={cn(
            "font-mono text-base font-extrabold tabular-nums text-primary",
            tone === "warning" && "text-warning",
            (tone === "urgent" || tone === "expired") && "text-destructive"
          )}
        >
          {timerText}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-300",
            tone === "warning" && "bg-warning",
            (tone === "urgent" || tone === "expired") && "bg-destructive"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
