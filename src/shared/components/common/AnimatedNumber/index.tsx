import NumberFlow from "@number-flow/react";

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  masked?: boolean;
  className?: string;
}

export const numberFlowTiming = {
  transformTiming: { duration: 450, easing: "ease-out" },
  spinTiming: { duration: 450, easing: "ease-out" },
  opacityTiming: { duration: 200, easing: "ease-out" },
};

export function AnimatedNumber({
  value,
  decimals = 2,
  suffix = "",
  prefix = "",
  masked = false,
  className,
}: AnimatedNumberProps) {
  if (masked) {
    return <span className={className}>****</span>;
  }

  return (
    <NumberFlow
      value={value}
      format={{
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: true,
      }}
      prefix={prefix}
      suffix={suffix}
      className={className}
      transformTiming={{ duration: 450, easing: "ease-out" }}
      spinTiming={{ duration: 450, easing: "ease-out" }}
      opacityTiming={{ duration: 200, easing: "ease-out" }}
    />
  );
}
