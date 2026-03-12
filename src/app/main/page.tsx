"use client";

import { Suspense } from "react";
import MainApp from "../main-page";
import CommonLoading from "@/shared/components/common/CommonLoading";

export default function MainPage() {
  return (
    <Suspense fallback={<CommonLoading />}>
      <MainApp />
    </Suspense>
  );
}