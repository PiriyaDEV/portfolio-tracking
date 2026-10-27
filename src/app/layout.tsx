// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import BackgroundLayout from "@/shared/components/common/BackgroundLayout";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-plex-sans-thai",
  display: "swap",
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
  themeColor: "#11100e",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={ibmPlexSansThai.variable}>
      <body className="antialiased font-sans">
        <BackgroundLayout>{children}</BackgroundLayout>
      </body>
    </html>
  );
}
