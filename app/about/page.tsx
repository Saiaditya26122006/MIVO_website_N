import { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About MIVO | Custom 3D Printing & Design Services",
  description: "Learn how MIVO transforms ideas into physical objects through precision 3D printing, custom parts, prototyping, and CAD design services.",
};

export default function AboutPage() {
  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 bg-gradient-to-br from-cream via-cream to-lime/5 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-yellow/5 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <div>
                <h1 className="font-handwritten text-5xl md:text-7xl font-bold text-ink mb-6 leading-tight">
                  Ideas take shape here
                  <span className="relative inline-block ml-2">
                    <span className="relative z-10">.</span>
                    <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                  </span>
                </h1>

                <p className="text-xl text-ink/80 mb-4 leading-relaxed">
                  MIVO helps you turn concepts into physical objects through precision 3D printing and expert design services.
                </p>

                <p className="text-lg text-ink/70 mb-8 leading-relaxed">
                  Whether you need a functional prototype, custom parts for a project, or personalized products, we combine technical expertise with creative problem-solving to bring your vision to life.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/explore">
                    <Button variant="accent" size="lg">
                      Explore Products
                    </Button>
                  </Link>
                  <Link href="/custom">
                    <Button variant="secondary" size="lg">
                      Have a custom idea?
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right: Image Collage */}
              <div className="hidden md:grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-ink/5">
                    <Image
                      src="/images/services/3d-printing-bambu.jpg"
                      alt="Bambu Lab 3D printer in action"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-ink/5">
                    <Image
                      src="/images/services/custom-parts-real.webp"
                      alt="Custom 3D printed parts"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-ink">
                    <Image
                      src="/images/services/cad-design-fusion.png"
                      alt="CAD design workspace"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-cream/50">
                    <Image
                      src="/images/services/prototyping-robot.jpg"
                      alt="Prototype robotic arm"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What MIVO Does */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-handwritten text-4xl md:text-6xl font-bold text-ink mb-4">
                What we make
              </h2>
              <p className="text-lg text-ink/70 max-w-2xl mx-auto">
                From functional parts to complete prototypes, we handle diverse 3D printing and design projects
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Functional Parts */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">Functional Parts</h3>
                <p className="text-ink/70">
                  Durable components designed for real-world use, from replacement parts to custom mechanical assemblies
                </p>
              </div>

              {/* Electronics Enclosures */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">Electronics Enclosures</h3>
                <p className="text-ink/70">
                  Custom housings and protective cases for circuit boards, sensors, and electronic projects
                </p>
              </div>

              {/* Prototyping */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">Rapid Prototyping</h3>
                <p className="text-ink/70">
                  Quick iteration and validation of product concepts before moving to full production
                </p>
              </div>

              {/* CAD Design */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">CAD Design Services</h3>
                <p className="text-ink/70">
                  Professional 3D modeling and engineering design to transform your sketches into production-ready files
                </p>
              </div>

              {/* Custom Projects */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">Custom Solutions</h3>
                <p className="text-ink/70">
                  One-off parts and unique designs tailored to your specific requirements and applications
                </p>
              </div>

              {/* Personalized Products */}
              <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="font-handwritten text-2xl font-bold text-ink mb-3">Personalized Products</h3>
                <p className="text-ink/70">
                  Custom accessories, organizers, and practical items designed to match your style and needs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="py-20 bg-ink text-cream">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-handwritten text-4xl md:text-6xl font-bold mb-4">
                How we work
              </h2>
              <p className="text-lg text-cream/70 max-w-2xl mx-auto">
                Practical solutions built on clear communication and technical precision
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Function First</h3>
                  <p className="text-cream/80">
                    We prioritize practical solutions that work in the real world, not just objects that look good in renders
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Customization Options</h3>
                  <p className="text-cream/80">
                    Choose from different materials, colors, and sizes to match your specific project requirements
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Clear Path Forward</h3>
                  <p className="text-cream/80">
                    Browse catalogue products or request a custom quote — both paths are straightforward and transparent
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Quality Focus</h3>
                  <p className="text-cream/80">
                    Each part is checked before delivery to ensure it meets the specified requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-cream">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-handwritten text-4xl md:text-6xl font-bold text-ink mb-4">
                How it works
              </h2>
              <p className="text-lg text-ink/70">
                Four simple steps from idea to finished product
              </p>
            </div>

            <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-lime rounded-full flex items-center justify-center">
                  <span className="font-bold text-xl text-ink">1</span>
                </div>
                <div>
                  <h3 className="font-handwritten text-2xl font-bold text-ink mb-2">
                    Explore or share your idea
                  </h3>
                  <p className="text-ink/70">
                    Browse our catalogue of ready-to-order models or submit a custom quotation request describing your project
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-lime rounded-full flex items-center justify-center">
                  <span className="font-bold text-xl text-ink">2</span>
                </div>
                <div>
                  <h3 className="font-handwritten text-2xl font-bold text-ink mb-2">
                    Choose specifications
                  </h3>
                  <p className="text-ink/70">
                    Select material, color, and size options for catalogue products, or work with us to finalize custom requirements
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-lime rounded-full flex items-center justify-center">
                  <span className="font-bold text-xl text-ink">3</span>
                </div>
                <div>
                  <h3 className="font-handwritten text-2xl font-bold text-ink mb-2">
                    We handle production
                  </h3>
                  <p className="text-ink/70">
                    Your order goes through 3D printing, quality checks, and careful packaging
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-lime rounded-full flex items-center justify-center">
                  <span className="font-bold text-xl text-ink">4</span>
                </div>
                <div>
                  <h3 className="font-handwritten text-2xl font-bold text-ink mb-2">
                    Delivery to your door
                  </h3>
                  <p className="text-ink/70">
                    Track your shipment and receive your finished product ready to use
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-lime via-lime to-yellow">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="font-handwritten text-4xl md:text-6xl font-bold text-ink mb-6">
              Find your next solution
            </h2>
            <p className="text-xl text-ink/80 mb-8 max-w-2xl mx-auto">
              Ready to bring your idea to life? Browse our catalogue or tell us about your custom project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/explore">
                <Button variant="primary" size="lg">
                  Explore Products
                </Button>
              </Link>
              <Link href="/custom">
                <Button variant="secondary" size="lg">
                  Request a Quote
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
