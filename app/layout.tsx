import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/context/CartContext";

// Fonts are loaded via CSS in globals.css
// Inter and Caveat from Google Fonts

export const metadata: Metadata = {
  title: "MIVO - Making Ideas Into Visible Objects",
  description: "Custom 3D printing and design services in India. Transform your ideas into reality with precision 3D printing, CAD design, and rapid prototyping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
    >
      <body className="min-h-screen flex flex-col bg-cream text-ink antialiased">
        <CartProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
