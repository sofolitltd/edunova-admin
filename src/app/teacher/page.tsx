"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isTeacherAuthenticated } from "@/lib/auth";

export default function TeacherRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isTeacherAuthenticated()) {
      router.replace("/teacher/dashboard");
    } else {
      router.replace("/teacher/login");
    }
  }, [router]);

  return null;
}
