import Link from "next/link";
import Image from "next/image";

interface Service {
  title: string;
  description: string;
  image: string;
  altText: string;
  href: string;
  featured?: boolean;
}

const services: Service[] = [
  {
    title: "3D Printing",
    description: "High-precision additive manufacturing with a wide range of materials and finishes. Perfect for prototypes and production parts.",
    image: "/images/services/3d-printing.webp",
    altText: "3D printer creating a precision part with green PLA filament",
    href: "/explore?category=functional-parts",
  },
  {
    title: "CAD Design",
    description: "Professional 3D modeling and engineering design services. We transform your ideas into production-ready CAD files.",
    image: "/images/services/cad-design.webp",
    altText: "CAD design workspace showing 3D model on laptop with technical drawings",
    href: "/custom",
  },
  {
    title: "Prototyping",
    description: "Rapid prototyping services to validate your concepts quickly. Iterate faster and bring products to market with confidence.",
    image: "/images/services/prototyping.webp",
    altText: "3D printed electronics prototype enclosure with ventilation and mounting points",
    href: "/explore?category=prototypes",
  },
  {
    title: "Custom Parts",
    description: "One-off custom parts made to your exact specifications. From replacement parts to unique designs, we make it happen.",
    image: "/images/services/custom-parts.webp",
    altText: "Custom 3D printed parts including gears, brackets, and enclosures",
    href: "/custom",
    featured: true,
  },
];

export function ServiceCards() {
  return (
    <section className="py-24 bg-cream border-t border-ink/10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-16">
          <p className="text-sm font-medium text-ink/60 uppercase tracking-wide mb-4">
            Solutions for Real Problems
          </p>
          <h2 className="font-handwritten text-5xl md:text-6xl font-bold text-ink mb-6">
            What We Make
            <span className="relative inline-block ml-2">
              <span className="relative z-10">.</span>
              <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
            </span>
          </h2>
          <div className="inline-block border-2 border-lime rounded-2xl px-6 py-4 bg-white">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Functional Parts</span>
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Rapid Prototypes</span>
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Custom Solutions</span>
              <span className="text-xs font-medium text-ink/60 px-3 py-1 bg-lime/10 rounded-full">Design Services</span>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group block bg-white border-2 border-ink/10 rounded-2xl overflow-hidden hover:border-lime hover:shadow-xl transition-all duration-300"
            >
              {/* Image Container */}
              <div className="aspect-square bg-cream/50 relative overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.altText}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />

                {service.featured && (
                  <div className="absolute top-3 right-3 bg-lime text-ink text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Popular
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-handwritten text-3xl font-bold text-ink mb-3">
                  {service.title}
                </h3>
                <p className="text-ink/70 mb-4 leading-relaxed">
                  {service.description}
                </p>

                <div className="flex items-center gap-2 text-lime font-medium">
                  <span>Learn More</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
