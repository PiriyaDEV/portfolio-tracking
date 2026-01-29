import type { Metadata } from "next";

import "./globals.css";
import BackgroundLayout from "@/shared/components/common/BackgroundLayout";

export const metadata: Metadata = {
  title: "P'tracker",
  description: "Portfolio Tracking",
  themeColor: '#171616ff',
  openGraph: {
    images: `https://ptracker.netlify.app/images/metaImg.png`,
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <BackgroundLayout>{children}</BackgroundLayout>;
}
