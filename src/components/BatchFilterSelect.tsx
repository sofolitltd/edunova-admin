"use client";

import { Layers } from "lucide-react";
import type { BatchOption } from "@/hooks/useBatchFilter";

export function BatchFilterSelect({
  batches,
  value,
  onChange,
  isTeacherPortal,
}: {
  batches: BatchOption[];
  value: string;
  onChange: (value: string) => void;
  isTeacherPortal: boolean;
}) {
  if (isTeacherPortal && batches.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 pr-8 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.6rem_center]"
      >
        <option value="">{isTeacherPortal ? "All My Batches" : "All Batches"}</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>{b.label}</option>
        ))}
      </select>
    </div>
  );
}
