"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import { batchApi, teacherApi } from "@/lib/api";

export interface BatchOption {
  id: number;
  label: string;
  course_id: number;
}

// Shared batch-filter dropdown state for pages rendered under both
// /admin/* and /teacher/*. On the teacher portal, the option list is
// restricted to the teacher's own assigned batches (and the backend
// independently enforces that restriction on every request regardless of
// what's sent here) — on the admin side, every batch is offered.
export function useBatchFilter() {
  const pathname = usePathname();
  const isTeacherPortal = pathname.startsWith("/teacher");
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const toOption = (b: { id: number; name: string; class_level: string; shift?: string; course_id: number }): BatchOption => ({
      id: b.id,
      label: `${b.name} (${b.class_level}${b.shift ? ` · ${b.shift}` : ""})`,
      course_id: b.course_id,
    });

    if (isTeacherPortal) {
      teacherApi.getMyBatches(token)
        .then((data) => setBatches(data.map(toOption)))
        .catch(() => {});
    } else {
      batchApi.getBatches(token)
        .then((data) => setBatches(data.map(toOption)))
        .catch(() => {});
    }
  }, [isTeacherPortal]);

  return {
    isTeacherPortal,
    batches,
    selectedBatchId,
    setSelectedBatchId,
    batchIdNum: selectedBatchId ? Number(selectedBatchId) : undefined,
  };
}
