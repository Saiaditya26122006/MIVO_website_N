"use client";

import { motion } from "framer-motion";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Share Your Idea",
    description: "Tell us what you need. Upload sketches, CAD files, or just describe your vision. We'll work with you to understand the requirements.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "We Design",
    description: "Our team creates detailed CAD models based on your specifications. You'll receive previews and can request revisions until it's perfect.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "We Print",
    description: "Using high-quality materials and precision 3D printing technology, we bring your design to life. Production typically takes 24-48 hours.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "You Get It",
    description: "Your finished part is carefully packaged and shipped to your doorstep. We provide tracking and quality guarantees on every order.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

export function HowItWorks() {
  return (
    <section className="py-24 bg-cream border-t border-ink/10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-16">
          <p className="text-sm font-medium text-ink/60 uppercase tracking-wide mb-4">
            A Simple Process...
          </p>
          <h2 className="font-handwritten text-5xl md:text-6xl font-bold text-ink mb-6">
            How MIVO Works
            <span className="relative inline-block ml-2">
              <span className="relative z-10">?</span>
              <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
            </span>
          </h2>
          <div className="inline-block border-2 border-lime rounded-2xl px-6 py-4 bg-white">
            <p className="text-ink/70 max-w-2xl">
              From concept to delivery, we handle every step of the process. Our streamlined workflow ensures quality results and fast turnaround times.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Fast</span>
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Reliable</span>
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Quality Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Steps Grid with Zigzag Layout */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className={`relative ${
                idx === 1 ? "md:mt-24" : idx === 3 ? "md:mt-12" : ""
              }`}
            >
              <div className="bg-white border-2 border-ink/10 rounded-3xl p-8 hover:border-lime transition-colors group">
                {/* Number Badge */}
                <div className="absolute -top-8 left-8 w-16 h-16 bg-lime rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-ink">{step.number}</span>
                </div>

                {/* Icon Container */}
                <div className="mb-6 mt-8 flex items-center justify-center h-48 bg-cream/50 rounded-2xl border-2 border-ink/10 text-ink/70 group-hover:text-lime transition-colors">
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="font-handwritten text-3xl font-bold text-ink mb-3">
                  {step.title}
                </h3>
                <p className="text-ink/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
