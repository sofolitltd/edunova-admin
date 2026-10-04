"use client";

import { createPortal } from "react-dom";
import { Download, Printer } from "lucide-react";
import type { Invoice } from "@/lib/api";

export type InvoiceCopies = "single" | "double";

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black">
      <span className="inline-block w-1 h-3 rounded-sm bg-current" />
      {children}
    </p>
  );
}

export function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className="text-[11px] font-medium text-black break-words">{value}</p>
    </div>
  );
}

export function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-sm bg-gray-100 border border-gray-400 p-3">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

export function InvoiceFrame({ invoice, copyLabel, children }: { invoice: Invoice; copyLabel: string; children: React.ReactNode }) {
  const date = new Date(invoice.issued_at);
  const contact = [invoice.issuer.address, invoice.issuer.phone].filter(Boolean).join(" · ");
  return (
    <section className="invoice-copy bg-white text-black rounded-sm overflow-hidden border border-black">
      <header className="flex items-start justify-between border-b-4 border-black px-6 py-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{invoice.issuer.name}</h2>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-700 mt-0.5">{invoice.title}</p>
          {contact && <p className="text-[10px] text-gray-700">{contact}</p>}
        </div>
        <div className="text-right text-[11px] leading-5">
          <p className="inline-block border border-black rounded-sm px-2 py-0.5 font-bold tracking-wider">{invoice.number}</p>
          <p className="text-gray-700">{formatDate(date)} · {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-[9px] uppercase tracking-widest text-gray-700 font-semibold">{copyLabel}</p>
        </div>
      </header>

      <div className="px-6 py-4 space-y-4">
        {children}
        <div className="flex items-end justify-between pt-5 text-[10px] text-gray-700">
          <div className="w-40 border-t border-black pt-1 text-center">Guardian / Student</div>
          <div className={`rotate-[-8deg] border-2 rounded-sm px-4 py-0.5 text-base font-extrabold tracking-[0.3em] ${invoice.paid ? "border-green-700 text-green-700" : "border-red-700 text-red-700"}`}>
            {invoice.paid ? "PAID" : "UNPAID"}
          </div>
          <div className="w-40 border-t border-black pt-1 text-center">
            Authorized Signature
            {invoice.issued_by && <span className="block text-[9px] text-gray-600">{invoice.issued_by}</span>}
          </div>
        </div>
      </div>

      <footer className="bg-gray-100 border-t border-black px-6 py-2 text-center text-[9px] text-gray-700">
        Fees once paid are non-refundable. This is a computer-generated invoice. Thank you for choosing {invoice.issuer.name}.
      </footer>
    </section>
  );
}

export function TotalsBlock({ rows, paid, label = "Total Paid" }: { rows: { label: string; value: string }[]; paid: number; label?: string }) {
  return (
    <div className="w-56 text-[11px] space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-gray-700"><span>{r.label}</span><span>{r.value}</span></div>
      ))}
      <div className="flex justify-between items-center bg-black text-white rounded-sm px-3 py-2 text-sm font-bold">
        <span>{label}</span><span>৳{paid.toLocaleString()}</span>
      </div>
    </div>
  );
}

// The print copy lives directly under <body> so every other page element can be
// display:none'd for print without leaving blank pages behind.
export function InvoiceSheet({ copies, render }: { copies: InvoiceCopies; render: (copyLabel: string) => React.ReactNode }) {
  const sheet = (
    <>
      {render(copies === "double" ? "Student Copy" : "Original")}
      {copies === "double" && (
        <>
          <div className="border-t-2 border-dashed border-gray-500 my-4 print:my-5" />
          {render("Office Copy")}
        </>
      )}
    </>
  );

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        #invoice-print-root { display: none; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block; padding: 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-copy { break-inside: avoid; box-shadow: none; }
        }
      `}</style>
      <div className="space-y-4">{sheet}</div>
      {createPortal(<div id="invoice-print-root">{sheet}</div>, document.body)}
    </>
  );
}

export function PrintControls({ copies, onCopiesChange, onDownload }: { copies: InvoiceCopies; onCopiesChange: (c: InvoiceCopies) => void; onDownload: () => void }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span className="text-muted-foreground">Print:</span>
      {(["single", "double"] as const).map((opt) => (
        <button
          key={opt}
          onClick={() => onCopiesChange(opt)}
          className={`px-3 py-1.5 rounded-lg transition-colors ${copies === opt ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
        >
          {opt === "single" ? "Single copy" : "Student + Office copy"}
        </button>
      ))}
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-dark transition-all"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
      <button
        onClick={onDownload}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-all"
      >
        <Download className="w-4 h-4" />
        PDF
      </button>
    </div>
  );
}
