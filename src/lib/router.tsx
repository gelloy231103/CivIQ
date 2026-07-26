import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode
} from "react";
import { cn } from "@/lib/utils";

type RouterContextValue = {
  path: string;
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePop = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = normalizePath(to);
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const value = useMemo(() => ({ path, navigate }), [navigate, path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within RouterProvider");
  }
  return context;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };

type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean }) => string);
};

export function Link({ to, className, onClick, ...props }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    />
  );
}

export function NavLink({
  to,
  className,
  ...props
}: NavLinkProps) {
  const { path } = useRouter();
  const target = normalizePath(to);
  const isActive = target === "/" ? path === target : path === target || path.startsWith(`${target}/`);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
  return (
    <Link
      to={to}
      className={cn(resolvedClassName)}
      {...props}
    />
  );
}

function normalizePath(path: string) {
  if (!path || path === "/index.html") return "/";
  const [clean] = path.split(/[?#]/);
  return clean.endsWith("/") && clean.length > 1 ? clean.slice(0, -1) : clean;
}
