"use client";

import { JSX } from "react";
import { FaChartLine, FaCalculator, FaHome } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";

type BottomNavbarProps = {
  currentPage: "portfolio" | "market" | "calculator" | "view";
  setCurrentPage: (
    page: "portfolio" | "market" | "calculator" | "view",
  ) => void;
  isFullyLoaded?: boolean;
};

const navItems: {
  label: string;
  icon: JSX.Element;
  page: BottomNavbarProps["currentPage"];
  requiresLoad?: boolean;
}[] = [
  {
    label: "ค้นหา",
    icon: <FaMagnifyingGlass className="text-lg" />,
    page: "view",
  },
  {
    label: "พอร์ต",
    icon: <FaHome className="text-lg" />,
    page: "portfolio",
  },
  {
    label: "วิเคราะห์",
    icon: <FaChartLine className="text-lg" />,
    page: "market",
    requiresLoad: true,
  },
  {
    label: "คำนวณ",
    icon: <FaCalculator className="text-lg" />,
    page: "calculator",
    requiresLoad: true,
  },
];

export default function BottomNavbar({
  currentPage,
  setCurrentPage,
  isFullyLoaded = true,
}: BottomNavbarProps) {
  return (
    <div className="fixed bottom-0 w-full bg-black border-t border-gray-600 flex justify-around py-4 z-50 sm:w-[450px]">
      {navItems.map((item) => {
        const isDisabled = item.requiresLoad && !isFullyLoaded;

        return (
          <button
            key={item.page}
            disabled={isDisabled}
            className={`flex flex-col items-center text-[12px] transition-opacity ${
              isDisabled
                ? "opacity-30 cursor-not-allowed"
                : currentPage === item.page
                  ? "text-accent-yellow"
                  : "text-gray-400"
            }`}
            onClick={() => !isDisabled && setCurrentPage(item.page)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
