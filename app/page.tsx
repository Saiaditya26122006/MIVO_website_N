import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Navigation />

      {/* Main Content - Add pt-20 to account for fixed navigation */}
      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Hero Text */}
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-medium text-ink/60 uppercase tracking-wide mb-4">
                    Welcome to MIVO
                  </p>
                  <h1 className="font-handwritten text-5xl md:text-7xl font-bold text-ink leading-tight">
                    Your ideas.{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10">Designed.</span>
                      <span
                        className="absolute inset-0 bg-yellow opacity-60 -rotate-1 rounded"
                        style={{ top: "20%", height: "60%" }}
                      />
                    </span>{" "}
                    Made real.
                  </h1>
                </div>

                <p className="text-lg md:text-xl text-ink/80 max-w-xl">
                  Transform your concepts into physical objects with precision 3D printing
                  and expert CAD design. From prototypes to production parts.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/explore">
                    <Button variant="accent" size="lg" className="rounded-xl">
                      Explore Models
                    </Button>
                  </Link>
                  <Link href="/custom">
                    <Button variant="secondary" size="lg" className="rounded-xl">
                      Start a Custom Project
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column - Placeholder for Product Mosaic */}
              <div className="hidden lg:block">
                <div className="relative h-[600px] rounded-3xl bg-ink/5 border-2 border-ink/10 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-24 w-24 mx-auto text-lime opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    <p className="text-ink/40 font-medium">
                      Product Mosaic Component
                      <br />
                      <span className="text-sm">(Will be implemented in Milestone 2)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats / Features */}
        <section className="py-16 bg-white border-y border-ink/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-lime">24-48h</div>
                <p className="text-ink/70">Average Turnaround</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-lime">100+</div>
                <p className="text-ink/70">Materials Available</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-lime">Custom</div>
                <p className="text-ink/70">Every Project Unique</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <h2 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
              Ready to bring your idea to life?
            </h2>
            <p className="text-lg text-ink/70 max-w-2xl mx-auto">
              Get a free quote for your custom 3D printing project. Our team will review
              your requirements and provide a detailed proposal within 24 hours.
            </p>
            <Link href="/custom">
              <Button variant="accent" size="lg" className="rounded-xl">
                Get a Free Quote
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
