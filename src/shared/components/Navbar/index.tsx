"use client";

import { JSX } from "react";
import { FaChartLine, FaCalculator, FaHome } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";

type BottomNavbarProps = {
  currentPage: "portfolio" | "market" | "calculator" | "view";
  setCurrentPage: (
    page: "portfolio" | "market" | "calculator" | "view"
  ) => void;
};

const navItems: {
  label: string;
  icon: JSX.Element;
  page: BottomNavbarProps["currentPage"];
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
    label: "แนวรับ",
    icon: <FaChartLine className="text-lg" />,
    page: "market",
  },
  {
    label: "คำนวณ",
    icon: <FaCalculator className="text-lg" />,
    page: "calculator",
  },
];

export default function BottomNavbar({
  currentPage,
  setCurrentPage,
}: BottomNavbarProps) {
  return (
    <div className="fixed bottom-0 w-full bg-black border-t border-gray-600 flex justify-around py-2 z-50 sm:w-[450px]">
      {navItems.map((item) => (
        <button
          key={item.page}
          className={`flex flex-col items-center text-[12px] ${
            currentPage === item.page ? "text-accent-yellow" : "text-gray-400"
          }`}
          onClick={() => setCurrentPage(item.page)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
