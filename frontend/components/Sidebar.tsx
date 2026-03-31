"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pipeline = [
  { href: "/research", label: "Research", step: "01" },
  { href: "/insights", label: "Insights", step: "02" },
  { href: "/content",  label: "Generate", step: "03" },
  { href: "/review",   label: "Review",   step: "04" },
  { href: "/schedule", label: "Schedule", step: "05" },
];

const utility = [
  { href: "/",         label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/history",  label: "History"  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-48 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col py-5 px-3">
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4 px-2">
        CMS
      </p>

      {/* Pipeline section */}
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5 px-2">
        Pipeline
      </p>
      <div className="flex flex-col gap-0.5 mb-5">
        {pipeline.map(({ href, label, step }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <span
                className={`text-[10px] font-mono w-4 shrink-0 ${
                  active ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                {step}
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 mb-4 mx-1" />

      {/* Utility section */}
      <div className="flex flex-col gap-0.5">
        {utility.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-2 py-2 rounded text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
