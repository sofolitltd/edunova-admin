"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRExam, type OMRStudent, type OMRTemplate } from "@/lib/api";
import { OmrSheet } from "../../../_lib/OmrSheet";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

export default function PrintOmrPage() {
  const params = useParams();
  const examId = Number(params.examId);
  const token = getToken() || "";

  const [exam, setExam] = useState<OMRExam | null>(null);
  const [students, setStudents] = useState<OMRStudent[]>([]);
  const [template, setTemplate] = useState<OMRTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [detail, tpl] = await Promise.all([omrApi.getExam(token, examId), omrApi.getTemplate(token, examId)]);
        setExam(detail.exam);
        setStudents(detail.students);
        setTemplate(tpl.template);
      } catch {
        toast.error("Failed to load sheet");
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, token]);

  return (
    <div>
      <style>{`
        @media print {
          /* Browsers drop background-color/background-image by default when
             printing unless told otherwise — but every structural line,
             corner marker, zebra stripe and filled bubble on the sheet is
             drawn as a filled div, not a border (see OmrSheet.tsx), so
             without this the printed sheet comes out looking blank/hollow
             even though the same page renders correctly on screen. */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          aside, header, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          /* The on-screen preview bounds this to its own scrollport (see
             #omr-preview-scroll below) — printed, it must expand back out so
             every sheet actually reaches the page instead of being clipped
             to whatever fit inside that on-screen scrollbox. */
          #omr-preview-scroll { max-height: none !important; overflow: visible !important; }
          /* A trailing break after the *last* sheet would print one extra
             blank page — only break between sheets. */
          .omr-sheet:not(:last-child) { page-break-after: always; break-after: page; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Print OMR Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {students.length > 0 ? `${students.length} sheet(s), one per student.` : "No roster added — printing one blank sheet."}
          </p>
        </div>
        {template && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
      </div>

      {loading || !exam || !template ? (
        <div className="no-print flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        // Bounded to its own scrollport (rather than growing the page and
        // relying on AdminLayout's page-level scroll) so the title/Print
        // button row above stays put while a roster's full stack of 297mm
        // sheets — one per student — scrolls in its own contained area. Not
        // .no-print — the sheets themselves must still print; the max-height/
        // overflow that make this scroll on screen are reset below so they
        // don't clip the printed output the same way.
        <div id="omr-preview-scroll" className="overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <div>
            {students.length > 0 ? students.map((s) => <OmrSheet key={s.id} exam={exam} template={template} student={s} />) : <OmrSheet exam={exam} template={template} />}
          </div>
        </div>
      )}
    </div>
  );
}
