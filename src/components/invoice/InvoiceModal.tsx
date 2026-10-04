"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { PrintControls, type InvoiceCopies } from "./parts";

export default function InvoiceModal({ title, loading, onClose, onDownload, children }: {
  title: string; loading: boolean; onClose: () => void; onDownload: (copies: InvoiceCopies) => void; children: (copies: InvoiceCopies) => React.ReactNode;
}) {
  const [copies, setCopies] = useState<InvoiceCopies>("single");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl my-4 space-y-4 rounded-2xl bg-card border border-border p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <PrintControls copies={copies} onCopiesChange={setCopies} onDownload={() => onDownload(copies)} />
            {children(copies)}
          </>
        )}
      </div>
    </div>
  );
}
