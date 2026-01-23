import { useCallback } from "react";
import { useNumbersHidden } from "./useNumbersHidden";

export const useMaskNumber = () => {
  const { isNumbersHidden } = useNumbersHidden();

  return useCallback(
    (value: string | number) =>
      isNumbersHidden ? "*****" : value,
    [isNumbersHidden],
  );
};
