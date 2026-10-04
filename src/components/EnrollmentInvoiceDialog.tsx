"use client";

import type { Enrollment } from "@/lib/api";
import InvoiceDialog from "./invoice/InvoiceDialog";

export default function EnrollmentInvoiceDialog({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  return <InvoiceDialog kind="enrollment" id={enrollment.id} onClose={onClose} />;
}
