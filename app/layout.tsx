import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "MIVO - Making Ideas Into Visible Objects",
  description: "Custom 3D printing and design services in India. Transform your ideas into reality with precision 3D printing, CAD design, and rapid prototyping.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${caveat.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
