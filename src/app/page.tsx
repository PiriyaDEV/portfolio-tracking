"use client";

import { useEffect, useState } from "react";
import { FaCog, FaShareAlt } from "react-icons/fa";
import CommonBtn from "@/shared/components/CommonBtn";
import CommonLoading from "@/shared/components/CommonLoading";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) return <CommonLoading />;

  return (
    <div className="flex flex-col gap-5">
      <>This is body</>
    </div>
  );
}
