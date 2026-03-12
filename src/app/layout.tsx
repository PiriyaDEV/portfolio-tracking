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
  maximumScale: 1, // prevents iOS zoom on input focus
  userScalable: false,
  themeColor: "#171616ff",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BackgroundLayout>{children}</BackgroundLayout>
      </body>
    </html>
  );
}
