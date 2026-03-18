import NumberFlow from "@number-flow/react";

export function SessionBadge({
  session,
  ppChange,
}: {
  session: string;
  ppChange: number | null;
}) {
  const isUp = (ppChange ?? 0) > 0;
  const isDown = (ppChange ?? 0) < 0;

  const label =
    session === "pre" ? "ก่อน:" : session === "post" ? "หลัง:" : "ตลาดปิด";

  const color = isUp ? "#4ade80" : isDown ? "#f87171" : "#6b7280";

  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label}
      {session !== "closed" && ppChange != null && (
        <span className="ml-1" style={{ display: "inline-flex", alignItems: "center" }}>
          <NumberFlow
            value={ppChange}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" }}
            suffix="%"
            style={{ color }}
            transformTiming={{ duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            spinTiming={{ duration: 700, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}
            opacityTiming={{ duration: 400, easing: "ease-out" }}
          />
        </span>
      )}
    </div>
  );
}