import Link from "next/link";

const layers = [
  {
    step: "01",
    title: "Research",
    desc: "Search X, Reddit, YouTube, and Google Trends for what to write about.",
    href: "/research",
  },
  {
    step: "02",
    title: "Insights",
    desc: "Analyze findings — what's trending, dying, emerging, and what angles work.",
    href: "/insights",
  },
  {
    step: "03",
    title: "Generate",
    desc: "Create content based on insights. Tuned for tone, platform, and format.",
    href: "/content",
  },
  {
    step: "04",
    title: "Review",
    desc: "Run a checklist to catch AI-sounding language and weak angles before posting.",
    href: "/review",
  },
  {
    step: "05",
    title: "Schedule",
    desc: "Post immediately or schedule for a specific time. Manage your queue.",
    href: "/schedule",
  },
];

export default function Home() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Content Manager</h1>
      <p className="text-zinc-500 text-sm mb-10">
        Five steps from research to post.
      </p>

      {/* Pipeline flow */}
      <div className="flex items-center mb-10">
        {layers.map(({ step, title, href }, i) => (
          <div key={step} className="flex items-center">
            <Link href={href} className="flex flex-col items-center gap-1.5 group">
              <span className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs font-mono text-zinc-500 group-hover:border-zinc-400 group-hover:text-zinc-200 transition-colors">
                {step.slice(1)}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors whitespace-nowrap">
                {title}
              </span>
            </Link>
            {i < layers.length - 1 && (
              <div className="w-6 h-px bg-zinc-800 mb-4 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="flex flex-col gap-1.5">
        {layers.map(({ step, title, desc, href }) => (
          <Link
            key={step}
            href={href}
            className="flex gap-4 items-start p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all group"
          >
            <span className="font-mono text-[11px] text-zinc-600 mt-0.5 w-5 text-right shrink-0 group-hover:text-zinc-400 transition-colors">
              {step}
            </span>
            <div>
              <p className="font-medium text-sm text-zinc-100">{title}</p>
              <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
