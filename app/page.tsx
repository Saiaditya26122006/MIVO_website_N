import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { ProductMosaic } from "@/components/hero/ProductMosaic";
import { HowItWorks } from "@/components/hero/HowItWorks";
import { ServiceCards } from "@/components/hero/ServiceCards";
import { ProductCard } from "@/components/products/ProductCard";
import { getProducts } from "@/services/products.service";
import Link from "next/link";

export default async function HomePage() {
  const allProducts = await getProducts();
  const featuredProducts = allProducts.filter((p) => p.featured).slice(0, 3);

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
                    Ideas, Sketches, Projects, Problems
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

              {/* Right Column - Product Mosaic */}
              <div className="hidden lg:block">
                <ProductMosaic />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <HowItWorks />

        {/* What We Make Section */}
        <ServiceCards />

        {/* Featured Models Section */}
        {featuredProducts.length > 0 && (
          <section className="py-24 bg-ink">
            <div className="max-w-7xl mx-auto px-6">
              {/* Section Header */}
              <div className="mb-16 text-center">
                <h2 className="font-handwritten text-5xl md:text-6xl font-bold text-cream mb-6">
                  Featured Models
                  <span className="relative inline-block ml-2">
                    <span className="relative z-10">.</span>
                    <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                  </span>
                </h2>
                <p className="text-cream/70 text-lg max-w-2xl mx-auto mb-8">
                  Popular ready-to-order models designed for real-world applications. Each model can be customized with different materials and sizes.
                </p>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-xl">
                    View All Models
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
            </div>
          </section>
        )}

        {/* Contact CTA Section */}
        <section className="py-24 bg-cream">
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
