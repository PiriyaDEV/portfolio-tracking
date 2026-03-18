import NumberFlow from "@number-flow/react";

export function ProfitBadge({ percentChange }: { percentChange: number }) {
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.02em",
    padding: "5px 10px",
    borderRadius: "10px",
    fontVariantNumeric: "tabular-nums",
  };

  if (isUp) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(34,197,94,0.15)",
          border: "1px solid rgba(34,197,94,0.3)",
          color: "#4ade80",
        }}
      >
        <span style={{ fontSize: "9px" }}>▲</span>
        <NumberFlow
          value={percentChange}
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: "always",
          }}
          suffix="%"
          style={{ color: "#4ade80" }}
          transformTiming={{
            duration: 900,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          spinTiming={{
            duration: 700,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}
          opacityTiming={{ duration: 400, easing: "ease-out" }}
        />
      </div>
    );
  }

  if (isDown) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171",
        }}
      >
        <span style={{ fontSize: "9px" }}>▼</span>
        <NumberFlow
          value={percentChange}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          suffix="%"
          style={{ color: "#f87171" }}
          transformTiming={{
            duration: 900,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          spinTiming={{
            duration: 700,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}
          opacityTiming={{ duration: 400, easing: "ease-out" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: "rgba(156,163,175,0.15)",
        border: "1px solid rgba(156,163,175,0.2)",
        color: "#9ca3af",
      }}
    >
      <span style={{ fontSize: "9px" }}>—</span>
      <NumberFlow
        value={percentChange}
        format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        suffix="%"
        style={{ color: "#9ca3af" }}
        transformTiming={{
          duration: 900,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        spinTiming={{ duration: 700, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}
        opacityTiming={{ duration: 400, easing: "ease-out" }}
      />
    </div>
  );
}
