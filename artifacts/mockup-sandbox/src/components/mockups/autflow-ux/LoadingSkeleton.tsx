import "./_shimmer.css";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      style={{ background: "hsl(215 20% 91%)" }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Shimmer className="w-24 h-3.5" />
        <Shimmer className="w-8 h-8 rounded-xl" />
      </div>
      <Shimmer className="w-20 h-7" />
      <div className="flex items-center gap-2">
        <Shimmer className="w-14 h-3" />
        <Shimmer className="w-20 h-3" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[hsl(215_20%_94%)]">
      <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
      {widths.map((w, i) => (
        <Shimmer key={i} className={`h-3.5 ${w}`} />
      ))}
    </div>
  );
}

function RiskCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[hsl(215_20%_97%)]">
      <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="w-32 h-3.5" />
        <Shimmer className="w-48 h-3" />
      </div>
      <Shimmer className="w-16 h-6 rounded-full" />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div
      className="min-h-screen bg-[hsl(210_40%_98%)] p-6"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Shimmer className="w-44 h-6" />
          <Shimmer className="w-32 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="w-28 h-9 rounded-xl" />
          <Shimmer className="w-9 h-9 rounded-xl" />
        </div>
      </div>

      {/* Health score + KPI row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Health ring */}
        <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-5 flex flex-col items-center gap-3 col-span-1">
          <Shimmer className="w-24 h-3.5" />
          <Shimmer className="w-20 h-20 rounded-full" />
          <Shimmer className="w-16 h-3" />
        </div>
        {/* Stat cards */}
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Table area – 2/3 width */}
        <div className="col-span-2 bg-white rounded-2xl border border-[hsl(215_20%_92%)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(215_20%_93%)]">
            <Shimmer className="w-28 h-4" />
            <div className="flex gap-2">
              <Shimmer className="w-20 h-7 rounded-lg" />
              <Shimmer className="w-20 h-7 rounded-lg" />
            </div>
          </div>
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 bg-[hsl(215_20%_97%)]">
            {["w-28", "w-16", "w-20", "w-24", "w-14"].map((w, i) => (
              <Shimmer key={i} className={`${w} h-3`} />
            ))}
          </div>
          {/* Rows */}
          {[
            ["flex-1", "w-16", "w-24", "w-20", "w-14"],
            ["w-36", "w-16", "w-20", "w-28", "w-14"],
            ["flex-1", "w-16", "w-20", "w-16", "w-14"],
            ["w-40", "w-16", "w-24", "w-20", "w-14"],
            ["w-32", "w-16", "w-20", "w-24", "w-14"],
          ].map((widths, i) => (
            <TableRowSkeleton key={i} widths={widths} />
          ))}
        </div>

        {/* Side panel – 1/3 width */}
        <div className="col-span-1 space-y-4">
          {/* AI briefing skeleton */}
          <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shimmer className="w-7 h-7 rounded-lg" />
              <Shimmer className="w-24 h-3.5" />
            </div>
            <div className="space-y-2">
              <Shimmer className="w-full h-3" />
              <Shimmer className="w-5/6 h-3" />
              <Shimmer className="w-4/5 h-3" />
            </div>
          </div>
          {/* Risk alerts skeleton */}
          <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-5">
            <div className="flex items-center justify-between mb-4">
              <Shimmer className="w-24 h-3.5" />
              <Shimmer className="w-14 h-3" />
            </div>
            <div className="space-y-3">
              <RiskCardSkeleton />
              <RiskCardSkeleton />
              <RiskCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
