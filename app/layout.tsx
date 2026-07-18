import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SammyStore - Virtual Numbers, SMM & Accounts",
  description: "One wallet for virtual numbers, social media growth, and verified accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="pb-16 md:pb-0 flex flex-col min-h-full">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <BottomNav />
        <WhatsAppWidget />
      </body>
    </html>
  );
}
