import { SortOrder } from "../..";

export function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: SortOrder | null;
}) {
  if (!active) {
    return (
      <span
        style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: "9px",
          lineHeight: 1,
        }}
      >
        ▲▼
      </span>
    );
  }
  return (
    <span style={{ color: "#a78bfa", fontSize: "10px", lineHeight: 1 }}>
      {order === "asc" ? "▲" : "▼"}
    </span>
  );
}