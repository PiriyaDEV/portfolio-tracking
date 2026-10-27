// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BackgroundLayout from "@/shared/components/common/BackgroundLayout";


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
  themeColor: "#100f0c",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased font-sans">
        <BackgroundLayout>{children}</BackgroundLayout>
      </body>
    </html>
  );
}
