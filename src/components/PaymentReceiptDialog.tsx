"use client";

import type { Payment } from "@/lib/api";
import InvoiceDialog from "./invoice/InvoiceDialog";

export default function PaymentReceiptDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return <InvoiceDialog kind="payment" id={payment.id} onClose={onClose} />;
}
