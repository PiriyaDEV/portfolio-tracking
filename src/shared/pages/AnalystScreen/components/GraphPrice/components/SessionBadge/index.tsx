export function SessionBadge({
  session,
  ppChange,
}: {
  session: "pre" | "post" | "closed";
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
      }}
    >
      {label}
      {session !== "closed" && ppChange != null && (
        <span className="ml-1">
          {isUp ? "+" : ""}
          {ppChange.toFixed(2)}%
        </span>
      )}
    </div>
  );
}
