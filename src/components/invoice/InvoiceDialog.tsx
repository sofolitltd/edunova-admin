"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { invoiceApi, type Invoice } from "@/lib/api";
import { getToken } from "@/lib/auth";
import InvoiceModal from "./InvoiceModal";
import InvoiceView from "./InvoiceView";

export default function InvoiceDialog({ kind, id, onClose }: { kind: "enrollment" | "payment"; id: number; onClose: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const request = kind === "enrollment" ? invoiceApi.forEnrollment(token, id) : invoiceApi.forPayment(token, id);
    request.then(setInvoice).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice");
      onClose();
    });
  }, [kind, id, onClose]);

  const download = (copies: "single" | "double") => {
    const token = getToken();
    if (!token || !invoice) return;
    invoiceApi.openPdf(token, invoice.id, copies).catch((err) => toast.error(err instanceof Error ? err.message : "Failed to generate PDF"));
  };

  return (
    <InvoiceModal title={invoice?.title ?? (kind === "payment" ? "Payment Receipt" : "Admission Invoice")} loading={!invoice} onClose={onClose} onDownload={download}>
      {(copies) => invoice && <InvoiceView invoice={invoice} copies={copies} />}
    </InvoiceModal>
  );
}
