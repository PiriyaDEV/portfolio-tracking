export function Toggle({
  enabled,
  onToggle,
  accent = false,
  small = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative rounded-full transition-colors duration-200 shrink-0 ${
        small ? "w-8 h-4" : "w-11 h-6"
      } ${enabled ? (accent ? "bg-accent-yellow" : "bg-accent-yellow/80") : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 rounded-full transition-all duration-200 ${
          small ? "w-3 h-3" : "w-5 h-5"
        } ${
          enabled
            ? small
              ? "left-[18px] bg-black"
              : "left-[22px] bg-black"
            : "left-0.5 bg-gray-400"
        }`}
      />
    </button>
  );
}
