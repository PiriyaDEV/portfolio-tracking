// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sarabun } from "next/font/google";
import BackgroundLayout from "@/shared/components/common/BackgroundLayout";

const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "P'Tracker",
  description: "Portfolio Tracking",
  openGraph: {
    images: `https://ptracker.netlify.app/images/metaImg.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#171616ff",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sarabun.variable}>
      <body className="antialiased font-sarabun">
        <BackgroundLayout>{children}</BackgroundLayout>
      </body>
    </html>
  );
}
