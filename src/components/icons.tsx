"use client";

import { useState, type ReactNode } from "react";

function Svg({
  children,
  size = 22,
  className,
}: {
  children: ReactNode;
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconGlobe({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </Svg>
  );
}

export function IconPencil({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Svg>
  );
}

export function IconFile({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </Svg>
  );
}

export function IconFolder({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </Svg>
  );
}

export function IconPalette({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3a9 9 0 100 18c1 0 2-.8 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1 .8-1.8 1.8-1.8H16a5 5 0 005-5c0-3.9-4-6.4-9-6.4z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="15" cy="8" r="1" />
    </Svg>
  );
}

export function IconMic({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" />
    </Svg>
  );
}

export function IconImage({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </Svg>
  );
}

export function IconMusic({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function IconPaperclip({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 11.5l-8.8 8.8a5 5 0 01-7-7l8.8-8.8a3.5 3.5 0 015 5l-8.7 8.7a2 2 0 01-2.8-2.8l8.2-8.2" />
    </Svg>
  );
}

export function IconCheck({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function IconX({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export function IconPlay({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 4l13 8-13 8V4z" />
    </Svg>
  );
}

export function IconRefresh({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 12a8 8 0 10-2.3 5.7M20 7v5h-5" />
    </Svg>
  );
}

export function IconSpark({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </Svg>
  );
}

export function IconPlug({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 01-5 5 5 5 0 01-5-5V8zM12 16v6" />
    </Svg>
  );
}

export function IconServer({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </Svg>
  );
}

export function IconTarget({ size, className }: { size?: number | string; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </Svg>
  );
}

/** Template card artwork: `/public/templates/<id>.png`, SVG fallback on load error. */
export function TemplateIcon({ id, className }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex h-full w-full items-center justify-center ${className ?? ""}`} style={{ color: "var(--accent-bright)" }}>
        <IconImage size={28} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/templates/${id}.png?v=2`}
      alt=""
      className={`h-full w-full object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}

/** Goal artwork: `/public/goals/<id>.png`, SVG fallback on load error. */
export function GoalIcon({ id, className }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex h-full w-full items-center justify-center ${className ?? ""}`} style={{ color: "var(--accent-bright)" }}>
        <IconTarget size={28} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/goals/${id}.png?v=2`}
      alt=""
      className={`h-full w-full object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}
