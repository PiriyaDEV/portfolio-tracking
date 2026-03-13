/* =======================
   Skeleton Components
======================= */

export function SkeletonPulse({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "rgba(255,255,255,0.08)", ...style }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2">
      {/* LEFT skeleton */}
      <div className="flex items-center gap-2">
        <SkeletonPulse className="w-[30px] h-[30px] rounded-full" />
        <div className="flex flex-col gap-1.5">
          <SkeletonPulse className="h-[16px] w-[80px]" />
          <SkeletonPulse className="h-[12px] w-[60px]" />
        </div>
      </div>

      {/* GRAPH skeleton */}
      <SkeletonPulse className="w-full h-full min-h-[50px] rounded-md" />

      {/* PROFIT skeleton */}
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonPulse className="h-[30px] w-[70px] rounded-lg" />
        <SkeletonPulse className="h-[10px] w-[50px]" />
        <SkeletonPulse className="h-[12px] w-[65px]" />
      </div>
    </div>
  );
}

export function SkeletonMarketBar() {
  return (
    <div className="flex items-center gap-2.5 min-w-max">
      {[...Array(5)].map((_, i) => (
        <SkeletonPulse
          key={i}
          className="h-[44px] rounded-[10px]"
          style={{ width: `${80 + i * 10}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
