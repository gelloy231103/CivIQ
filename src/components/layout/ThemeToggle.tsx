import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeCycleButton({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const current = themeOptions.find((option) => option.value === theme) ?? themeOptions[2];
  const Icon = current.icon;
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Theme is ${current.label}. Switch theme.`}
      title={`Theme: ${current.label} (${resolvedTheme})`}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

export function ThemeSegmentedControl({ className, id }: { className?: string; id?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      id={id}
      className={cn("grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-1", className)}
      role="radiogroup"
      aria-label="Theme"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors",
              active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
            onClick={() => setTheme(option.value)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
