"use client";

import Image from "next/image";

const stages = [
  {
    number: "01",
    title: "Share Your Idea",
    description:
      "Upload sketches, CAD files, or just describe your vision — we take it from there.",
    image: "/images/hero/idea-sketch.webp",
    imageAlt: "Design sketch representing the initial concept stage",
    label: "INPUT",
    callout: ".STL · .STEP · .3MF",
  },
  {
    number: "02",
    title: "We Design",
    description:
      "Detailed CAD modelling, iteration, and preview until it’s exactly right.",
    image: "/images/services/cad-design.webp",
    imageAlt: "CAD workspace showing 3D model development",
    label: "DESIGN",
    callout: "PARAMETRIC · OPTIMISED",
  },
  {
    number: "03",
    title: "We Print",
    description:
      "Precision FDM printing with your chosen material. Typically 24–48 hrs.",
    image: "/images/hero/bambu-printing-gear.png",
    imageAlt: "Bambu Lab 3D printer producing a precision gear part",
    label: "PRINT",
    callout: "PLA · PETG · ABS",
  },
  {
    number: "04",
    title: "You Get It",
    description:
      "Quality-checked, carefully packaged, and delivered to your door.",
    image: "/images/services/custom-parts.webp",
    imageAlt: "Finished 3D printed custom parts ready for delivery",
    label: "DELIVER",
    callout: "QC VERIFIED · TRACKED",
  },
];

const PROCESS_PATH =
  "M 110 42 C 200 42, 290 58, 370 58 S 560 42, 630 42 S 800 58, 890 58";

function Crosshair() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none text-ink"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <line x1="0" y1="50" x2="16" y2="50" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <line x1="84" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <line x1="50" y1="0" x2="50" y2="16" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <line x1="50" y1="84" x2="50" y2="100" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <circle cx="50" cy="50" r="2" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
    </svg>
  );
}

function RegMark({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 text-ink/12 ${className ?? ""}`} viewBox="0 0 20 20" aria-hidden="true">
      <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="0.5" />
      <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section className="py-24 bg-cream relative overflow-hidden">
      {/* Corner registration marks */}
      <RegMark className="absolute top-6 left-6 hidden md:block" />
      <RegMark className="absolute top-6 right-6 hidden md:block" />
      <RegMark className="absolute bottom-6 left-6 hidden md:block" />
      <RegMark className="absolute bottom-6 right-6 hidden md:block" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16 md:mb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/30 mb-3">
            Process &middot; Rev 2.0
          </p>
          <h2 className="font-handwritten text-5xl md:text-6xl font-bold text-ink mb-4">
            How MIVO Works
            <span className="relative inline-block ml-2">
              <span className="relative z-10">?</span>
              <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
            </span>
          </h2>
          <p className="text-ink/50 text-lg max-w-lg">
            From concept to delivery &mdash; one streamlined engineering workflow.
          </p>
        </div>

        {/* ── Desktop: 4-across with SVG process path ── */}
        <div className="hidden md:block relative">
          {/* Connecting process path overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={PROCESS_PATH}
              stroke="#101010"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.08"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={PROCESS_PATH}
              stroke="#B7FF2A"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              className="bp-path-draw"
              opacity="0.45"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={PROCESS_PATH}
              stroke="#B7FF2A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 40"
              className="bp-flow"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="grid grid-cols-4 gap-x-10 relative">
            {stages.map((stage, idx) => (
              <div key={stage.number} className={`relative z-20 ${idx % 2 === 1 ? "pt-16" : ""}`}>
                {/* Number + label */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-mono text-[26px] font-bold text-lime/45 leading-none">
                    {stage.number}
                  </span>
                  <div className="flex-1 h-px bg-ink/6" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/25">
                    {stage.label}
                  </span>
                </div>

                {/* Image with blueprint overlays */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bp-float" style={{ animationDelay: `${idx * 1.8}s` }}>
                  <Image
                    src={stage.image}
                    alt={stage.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 24vw, 270px"
                  />
                  <Crosshair />
                  {idx === 2 && (
                    <div className="absolute left-0 right-0 h-px bg-lime/40 opacity-0 bp-scan pointer-events-none" aria-hidden="true" />
                  )}
                  {/* Dimension line */}
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center" aria-hidden="true">
                    <div className="w-px h-1.5 bg-ink/20" />
                    <div className="flex-1 h-px bg-ink/12" />
                    <div className="w-px h-1.5 bg-ink/20" />
                  </div>
                </div>

                {/* Cycling callout */}
                <p
                  className="font-mono text-[10px] tracking-wider text-lime/60 mb-2 h-4 bp-callout"
                  style={{ animationDelay: `${idx * 5}s` }}
                  aria-hidden="true"
                >
                  {stage.callout}
                </p>

                {/* Title + description */}
                <h3 className="font-handwritten text-[22px] font-bold text-ink mb-1">
                  {stage.title}
                </h3>
                <p className="text-sm text-ink/50 leading-relaxed">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile: vertical timeline ── */}
        <div className="md:hidden relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[26px] top-2 bottom-2 w-px overflow-hidden" aria-hidden="true">
            <div className="h-full bg-ink/8" />
            <div
              className="absolute top-0 left-0 w-full h-full bp-vert-line origin-top"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, rgba(183,255,42,0.35) 0px, rgba(183,255,42,0.35) 5px, transparent 5px, transparent 10px)",
              }}
            />
          </div>

          <div className="space-y-12">
            {stages.map((stage, idx) => (
              <div key={stage.number} className="relative pl-16">
                {/* Timeline node */}
                <div className="absolute left-0 top-0 w-[54px] h-[54px] rounded-full bg-cream border border-ink/8 flex items-center justify-center z-10">
                  <span className="font-mono text-sm font-bold text-lime/65">
                    {stage.number}
                  </span>
                </div>

                {/* Label */}
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/25 mb-1.5 block">
                  {stage.label}
                </span>

                {/* Image */}
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-3 bp-float" style={{ animationDelay: `${idx * 1.8}s` }}>
                  <Image
                    src={stage.image}
                    alt={stage.imageAlt}
                    fill
                    className="object-cover"
                    sizes="80vw"
                  />
                  <Crosshair />
                  {idx === 2 && (
                    <div className="absolute left-0 right-0 h-px bg-lime/40 opacity-0 bp-scan pointer-events-none" aria-hidden="true" />
                  )}
                </div>

                {/* Callout */}
                <p
                  className="font-mono text-[10px] tracking-wider text-lime/50 mb-1.5 bp-callout"
                  style={{ animationDelay: `${idx * 5}s` }}
                  aria-hidden="true"
                >
                  {stage.callout}
                </p>

                <h3 className="font-handwritten text-2xl font-bold text-ink mb-1">
                  {stage.title}
                </h3>
                <p className="text-sm text-ink/50 leading-relaxed">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
