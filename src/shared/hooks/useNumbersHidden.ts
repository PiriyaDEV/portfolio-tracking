"use client";

import { useEffect, useState } from "react";

const KEY = "isNumbersHidden";

export function useNumbersHidden() {
  const [isNumbersHidden, setIsNumbersHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });

  // write → localStorage
  useEffect(() => {
    localStorage.setItem(KEY, String(isNumbersHidden));
    // 🔔 แจ้ง component อื่นใน tab เดียวกัน
    window.dispatchEvent(new Event("numbers-hidden-change"));
  }, [isNumbersHidden]);

  // listen ← จาก component อื่น
  useEffect(() => {
    const sync = () => {
      setIsNumbersHidden(localStorage.getItem(KEY) === "true");
    };

    window.addEventListener("storage", sync); // cross-tab
    window.addEventListener("numbers-hidden-change", sync); // same-tab

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("numbers-hidden-change", sync);
    };
  }, []);

  return { isNumbersHidden, setIsNumbersHidden };
}
