import { useId, type SVGProps } from "react";

type CivIQLogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function CivIQLogo({ title, ...props }: CivIQLogoProps) {
  const titleId = useId();

  return (
    <svg
      viewBox="0 0 128 128"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <rect width="128" height="128" rx="28" fill="#2563EB" />
      <path
        d="M64 17 97 30v29c0 24.7-13.7 42.7-33 52-19.3-9.3-33-27.3-33-52V30l33-13Z"
        fill="#1D4ED8"
      />
      <path
        d="M78.5 43.5A24.5 24.5 0 1 0 78.5 84.5"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="m54 64.5 9.3 9.3L84 53"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="84.5" r="4.5" fill="#F8FAFC" />
    </svg>
  );
}
