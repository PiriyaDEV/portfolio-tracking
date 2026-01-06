"use client";

import { JSX } from "react";
import { FaChartLine, FaCalculator, FaHome } from "react-icons/fa";

type BottomNavbarProps = {
  currentPage: "portfolio" | "market" | "calculator";
  setCurrentPage: (page: "portfolio" | "market" | "calculator") => void;
};

const navItems: {
  label: string;
  icon: JSX.Element;
  page: BottomNavbarProps["currentPage"];
}[] = [
  // {
  //   label: "ข้อมูล",
  //   icon: <FaChartLine className="text-lg" />,
  //   page: "market",
  // },
  {
    label: "พอร์ต",
    icon: <FaHome className="text-lg" />,
    page: "portfolio",
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
