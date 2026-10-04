"use client";

import type { Invoice } from "@/lib/api";
import { Field, InfoBox, InvoiceFrame, InvoiceSheet, TotalsBlock, formatDate, type InvoiceCopies } from "./parts";

const taka = (n: number) => `৳${n.toLocaleString()}`;

function AdmissionBody({ invoice: inv }: { invoice: Invoice }) {
  const { student: st, batch: b } = inv;
  const guardian = [
    st.father_name && `${st.father_name}${st.father_mobile ? ` (${st.father_mobile})` : ""}`,
    st.mother_name && `${st.mother_name}${st.mother_mobile ? ` (${st.mother_mobile})` : ""}`,
  ].filter(Boolean).join(" / ");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <InfoBox title="Student Information">
          <Field label="Name" value={st.name} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Student ID" value={st.student_id} />
            <Field label="Mobile" value={st.mobile} />
            <Field label="Class" value={st.class} />
            <Field label="Gender" value={st.gender} />
          </div>
          <Field label="School" value={[st.school, st.shift].filter(Boolean).join(" · ")} />
          <Field label="Guardian" value={guardian} />
          <Field label="Address" value={st.address} />
        </InfoBox>
        <InfoBox title="Batch Information">
          <Field label="Batch Name" value={b?.name} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Batch Code" value={b?.code} />
            <Field label="Admission Date" value={formatDate(new Date(inv.issued_at))} />
            <Field label="Course" value={b?.course} />
            <Field label="Shift" value={b?.shift} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Class Days" value={b?.class_days?.join(", ")} />
            <Field label="Class Time" value={b?.class_time} />
          </div>
          <Field label="SMS Notification No." value={st.notification_mobile} />
        </InfoBox>
      </div>

      <table className="w-full text-[11px] border border-black">
        <thead>
          <tr className="bg-black text-white text-left uppercase tracking-wider text-[9px]">
            <th className="px-3 py-1.5 font-semibold">Description</th>
            <th className="px-3 py-1.5 font-semibold text-right">Fee</th>
            <th className="px-3 py-1.5 font-semibold text-right">Discount</th>
            <th className="px-3 py-1.5 font-semibold text-right">Payable</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((r, i) => (
            <tr key={r.label} className={i % 2 ? "bg-gray-100" : "bg-white"}>
              <td className="px-3 py-1.5 font-medium">{r.label}{r.note && <span className="block text-[9px] font-normal text-gray-600">{r.note}</span>}</td>
              <td className="px-3 py-1.5 text-right">{r.amount > 0 ? taka(r.amount) : "—"}</td>
              <td className="px-3 py-1.5 text-right">
                {inv.per_line_discount && r.discount > 0 ? <>−{taka(r.discount)}<span className="block text-[9px]">{r.discount_label}</span></> : "—"}
              </td>
              <td className="px-3 py-1.5 text-right font-semibold">{inv.per_line_discount && r.amount > 0 ? taka(r.total) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {inv.discount > 0 && (
        <div className="flex items-center justify-between rounded-sm bg-gray-100 border border-gray-400 px-3 py-1.5 text-[11px]">
          <span className="font-semibold">Discount Applied</span>
          <span>
            {inv.per_line_discount && <>{inv.lines.filter((r) => r.discount > 0).map((r) => `${r.label.replace(" Fee", "")} ${r.discount_label}`).join(" · ")} — </>}
            <b>Total saved {taka(inv.discount)} ({inv.discount_percent}% off)</b>
          </span>
        </div>
      )}
    </>
  );
}

function PaymentBody({ invoice: inv }: { invoice: Invoice }) {
  return (
    <>
      <InfoBox title="Student & Batch">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Student" value={inv.student.name} />
          <Field label="Mobile" value={inv.student.mobile} />
          <Field label="Billing Month" value={inv.payment.billing_month} />
          <Field label="Batch" value={inv.batch?.name} />
          <Field label="Method" value={inv.payment.method} />
          <Field label="Transaction ID" value={inv.payment.reference} />
        </div>
      </InfoBox>
      <table className="w-full text-[11px] border border-black">
        <thead>
          <tr className="bg-black text-white text-left uppercase tracking-wider text-[9px]">
            <th className="px-3 py-1.5 font-semibold">Description</th>
            <th className="px-3 py-1.5 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((r) => (
            <tr key={r.label}>
              <td className="px-3 py-1.5 font-medium">{r.label}</td>
              <td className="px-3 py-1.5 text-right font-semibold">{taka(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function InvoiceView({ invoice: inv, copies }: { invoice: Invoice; copies: InvoiceCopies }) {
  const admission = inv.kind === "admission";
  return (
    <InvoiceSheet
      copies={copies}
      render={(copyLabel) => (
        <InvoiceFrame invoice={inv} copyLabel={copyLabel}>
          {admission ? <AdmissionBody invoice={inv} /> : <PaymentBody invoice={inv} />}
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-1.5 flex-1">
              {admission && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Payment Method" value={inv.payment.method} />
                  <Field label="Reference" value={inv.payment.reference} />
                </div>
              )}
              <p className="text-[10px] italic text-gray-700">In words: {inv.amount_in_words}</p>
            </div>
            <TotalsBlock
              paid={inv.total}
              label={inv.paid ? "Total Paid" : "Total Due"}
              rows={admission ? [{ label: "Total Fees", value: taka(inv.subtotal) }, ...(inv.discount > 0 ? [{ label: "Discount", value: `−${taka(inv.discount)}` }] : [])] : []}
            />
          </div>
        </InvoiceFrame>
      )}
    />
  );
}
