import type { OMRExam, OMRStudent, OMRTemplate } from "@/lib/api";
import { solaimanLipi } from "./fonts";

export const BN_OPTIONS = ["ক", "খ", "গ", "ঘ"];
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_CLASSES = ["৩", "৪", "৫", "৬", "৭", "৮"];
const BN_SETS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ"];
// The institute this sheet is printed for, shown at the top of every sheet.
const INSTITUTE_NAME = "Edu Nova";
const INSTITUTE_ADDRESS = "বগুড়া সদর, বগুড়া";
// Grid/table lines and the zebra-row tint — a red accent + light pink,
// matching the reference sheet's theme. The Bubble component's own outline
// and the corner fiducial markers stay solid black regardless (kept out of
// this theme deliberately): the scorer's grayscale threshold reads bubble
// fills and marker blobs directly, and a lighter red risks sitting too
// close to that threshold, while structural table lines are never sampled.
const LINE_COLOR = "#c0392b";
const ZEBRA_TINT = "#fbe4e4";

function toBnNumber(n: number): string {
  return String(n)
    .split("")
    .map((d) => BN_DIGITS[Number(d)] ?? d)
    .join("");
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/** Midpoints between consecutive sorted values — used to place a divider
 * line exactly between two rows/columns of bubbles. */
function midpoints(values: number[]): number[] {
  const sorted = uniqueSorted(values);
  const mids: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) mids.push((sorted[i] + sorted[i + 1]) / 2);
  return mids;
}

/** The row pitch of a bubble grid, measured off the bubbles themselves.
 *
 * Row spacing is owned by the Go template (services/omr/template.go). Reading
 * it back out of the coordinates the backend actually sent — instead of
 * mirroring the constant over here — is what keeps the frames, dividers and
 * zebra stripes locked to the real bubble positions. A hardcoded copy silently
 * drifts a fraction of a millimetre per row whenever the two sides disagree
 * (e.g. the API server hasn't been restarted yet), which walks the grid lines
 * straight through the bubbles further down the column. */
function rowPitch(values: number[], fallback: number): number {
  const sorted = uniqueSorted(values);
  return sorted.length > 1 ? sorted[1] - sorted[0] : fallback;
}

// Drawn as a filled rectangle, not a CSS border: the html2canvas/jsPDF
// export pipeline that captures this page reliably preserves background-color
// fills (verified against the actual downloaded PDF) but desaturates thin
// border strokes to gray, so every structural/decorative line on this sheet
// must be a fill, never a `border`.
function VLine({ x, top, height, thickness = 0.2 }: { x: number; top: number; height: number; thickness?: number }) {
  return <div style={{ position: "absolute", left: `${x - thickness / 2}mm`, top: `${top}mm`, width: `${thickness}mm`, height: `${height}mm`, background: LINE_COLOR }} />;
}

function HLine({ x, y, width, thickness = 0.2 }: { x: number; y: number; width: number; thickness?: number }) {
  return <div style={{ position: "absolute", left: `${x}mm`, top: `${y - thickness / 2}mm`, width: `${width}mm`, height: `${thickness}mm`, background: LINE_COLOR }} />;
}

/** A rectangular outline built from four filled line strips instead of a
 * CSS `border` — see the VLine/HLine note above for why. */
function Frame({ x, width, top, height, thickness = 0.25 }: { x: number; width: number; top: number; height: number; thickness?: number }) {
  return (
    <>
      <HLine x={x} y={top} width={width} thickness={thickness} />
      <HLine x={x} y={top + height} width={width} thickness={thickness} />
      <VLine x={x} top={top} height={height} thickness={thickness} />
      <VLine x={x + width} top={top} height={height} thickness={thickness} />
    </>
  );
}

/** Alternating pink row backgrounds behind a set of row centers — must be
 * rendered before (i.e. visually behind, via DOM paint order) the grid
 * lines and bubbles it sits under. */
function RowStripes({ x, width, rowYs, rowHeight }: { x: number; width: number; rowYs: number[]; rowHeight: number }) {
  return (
    <>
      {rowYs.map((y, i) =>
        i % 2 === 0 ? (
          <div key={i} style={{ position: "absolute", left: `${x}mm`, top: `${y - rowHeight / 2}mm`, width: `${width}mm`, height: `${rowHeight}mm`, background: ZEBRA_TINT }} />
        ) : null
      )}
    </>
  );
}

/** Alternating pink column backgrounds behind a set of column centers (1st,
 * 3rd, 5th... tinted, 2nd/4th/... left plain) — must be rendered before
 * (i.e. visually behind, via DOM paint order) the grid lines and bubbles it
 * sits under. */
function ColumnStripes({ y, height, colXs, colWidth }: { y: number; height: number; colXs: number[]; colWidth: number }) {
  return (
    <>
      {colXs.map((x, i) =>
        i % 2 === 0 ? (
          <div key={i} style={{ position: "absolute", left: `${x - colWidth / 2}mm`, top: `${y}mm`, width: `${colWidth}mm`, height: `${height}mm`, background: ZEBRA_TINT }} />
        ) : null
      )}
    </>
  );
}

/** Table-style grid lines for a digit box (Roll/Subject Code): one vertical
 * divider between each digit column, one horizontal divider between each
 * value row — derived from the bubbles' own coordinates, so it always lines
 * up with the real (CV-critical) bubble positions instead of guessing.
 * Tinting runs by column (1st, 3rd, 5th digit column...) rather than by
 * row. */
function DigitGridLines({ bubbles, boxLeft, boxWidth, boxTop, boxBottom }: { bubbles: { center: { x_mm: number; y_mm: number } }[]; boxLeft: number; boxWidth: number; boxTop: number; boxBottom: number }) {
  const colXs = uniqueSorted(bubbles.map((b) => b.center.x_mm));
  const colPitch = colXs.length > 1 ? colXs[1] - colXs[0] : boxWidth;
  const ys = uniqueSorted(bubbles.map((b) => b.center.y_mm));
  return (
    <>
      <ColumnStripes y={boxTop} height={boxBottom - boxTop} colXs={colXs} colWidth={colPitch} />
      {midpoints(colXs).map((x, i) => (
        <VLine key={`v${i}`} x={x} top={boxTop} height={boxBottom - boxTop} />
      ))}
      {midpoints(ys).map((y, i) => (
        <HLine key={`h${i}`} x={boxLeft} y={y} width={boxWidth} />
      ))}
    </>
  );
}

function Bubble({
  x,
  y,
  diameter,
  filled,
  label,
  outline = "#000",
}: {
  x: number;
  y: number;
  diameter: number;
  filled?: boolean;
  label?: string;
  outline?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x - diameter / 2}mm`,
        top: `${y - diameter / 2}mm`,
        width: `${diameter}mm`,
        height: `${diameter}mm`,
        borderRadius: "50%",
        border: `0.3mm solid ${outline}`,
        background: filled ? "#000" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.3mm",
        color: filled ? "#fff" : "#000",
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  );
}

/** A stack of solid squares in the left/right margins beside the question
 * grid, matching the reference sheet's side registration marks. Purely
 * decorative: unlike the 4 corner fiducials, these aren't in the Go template
 * and the scanner never looks for them (findMarkers only searches quadrants
 * near the 4 corners — see services/omr/detect.go), so they carry no
 * detection risk and don't need backend coordinates. */
function MiddleMarkers({ x, top }: { x: number; top: number }) {
  const width = 6;
  const blockHeight = 3.2;
  const pitch = 4.0;
  const count = 5;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x - width / 2}mm`,
            top: `${top + i * pitch}mm`,
            width: `${width}mm`,
            height: `${blockHeight}mm`,
            background: "#000",
          }}
        />
      ))}
    </>
  );
}

/** A bordered box framing one of the 4 info-row fields (Class, Roll,
 * Subject Code, Set), with a divider under its label — drawn as a plain
 * background rectangle (not a positioning container), since the bubbles
 * inside are separately absolutely-positioned relative to the sheet root
 * using the Go-computed page coordinates and must not be re-parented.
 *
 * The label strip is split into two rows: the label name on top, and a
 * blank cell below it (above the bubble grid) for the student to hand-write
 * the value before bubbling it in. Splitting the existing label strip
 * (rather than adding height below it) keeps every bubble at the exact
 * Go-computed position — those are CV-critical and can't shift.
 *
 * When `columnXs` is given (the digit grids), the hand-write row is further
 * divided with a vertical line at each midpoint between columns, so it has
 * one cell per digit to match the bubble columns below it. */
function InfoBoxFrame({ x, width, top, height, labelBottom, label, columnXs }: { x: number; width: number; top: number; height: number; labelBottom: number; label: string; columnXs?: number[] }) {
  const writeRowTop = (top + labelBottom) / 2;
  return (
    <>
      <Frame x={x} width={width} top={top} height={height} thickness={0.3} />
      <HLine x={x} y={writeRowTop} width={width} thickness={0.2} />
      <HLine x={x} y={labelBottom} width={width} thickness={0.3} />
      {columnXs?.length
        ? midpoints(columnXs).map((cx, i) => <VLine key={`w${i}`} x={cx} top={writeRowTop} height={labelBottom - writeRowTop} thickness={0.2} />)
        : null}
      <div
        style={{
          position: "absolute",
          left: `${x}mm`,
          top: `${top}mm`,
          width: `${width}mm`,
          height: `${writeRowTop - top}mm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.4mm",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </>
  );
}

/** A cosmetic single-choice bubble list (Class / Set boxes) — not part of the
 * Go template, not decoded; purely a visual match to the reference sheet.
 * Draws its own frame, fitted to its value count, so a 7-class or 6-set box
 * ends just below its last bubble rather than running the full info-row
 * height like the 10-row digit grids. Its rows start at the same Y and use the
 * same pitch as the real digit grids beside it, so all four boxes line up. */
function ChoiceBox({
  x,
  width,
  top,
  labelBottom,
  rowSpacing,
  label,
  values,
  bubbleDiameter,
}: {
  x: number;
  width: number;
  top: number;
  labelBottom: number;
  rowSpacing: number;
  label: string;
  values: string[];
  bubbleDiameter: number;
}) {
  const rowYs = values.map((_, i) => labelBottom + (i + 0.5) * rowSpacing);
  const height = labelBottom - top + values.length * rowSpacing;
  return (
    <>
      <RowStripes x={x} width={width} rowYs={rowYs} rowHeight={rowSpacing} />
      <InfoBoxFrame x={x} width={width} top={top} height={height} labelBottom={labelBottom} label={label} />
      {rowYs.slice(0, -1).map((y, i) => (
        <HLine key={`hl${i}`} x={x} y={y + rowSpacing / 2} width={width} />
      ))}
      {values.map((v, i) => (
        <Bubble key={i} x={x + width / 2} y={rowYs[i]} diameter={bubbleDiameter} label={v} />
      ))}
    </>
  );
}

const INSTRUCTIONS = [
  "১। বৃত্তাকার ঘরগুলো এমন ভাবে ভরাট করতে হবে যাতে ভেতরের লেখাটি দেখা না যায়।",
  "২। উত্তরপত্রে অবাঞ্ছিত দাগ দেয়া যাবেনা।",
  "৩। উত্তরপত্র ভাঁজ করা যাবেনা।",
  "৪। সেট কোডবিহীন উত্তরপত্র বাতিল হবে।",
];

/**
 * Renders one A4 bubble sheet page using the exact mm-coordinates the Go
 * backend computed (services/omr/template.go) for the Roll Number and
 * Subject Code grids — every functional bubble is absolutely positioned in
 * `mm` so on-screen preview, browser print, and the downloadable PDF (which
 * captures this same DOM via jsPDF's html2canvas-backed renderer) all agree
 * on where every bubble is. The Class/Set Code boxes, instructions box,
 * signature box, and warning/timing-mark bar are decorative — styled to
 * match a reference sheet — and are not read by the scorer.
 */
export function OmrSheet({ exam, template, student }: { exam: OMRExam; template: OMRTemplate; student?: OMRStudent }) {
  const markerSize = template.marker_size_mm;
  const d = template.bubble_diameter_mm;
  const contentLeft = template.content_left_mm;
  const contentRight = template.content_right_mm;
  const contentTop = template.content_top_mm;

  const questionCount = template.question_bubbles.length / 4;
  const rowsPerColumn = Math.ceil(questionCount / template.columns);
  // Fallback only — real column boundaries below are derived from each
  // column's own bubble positions, not this uniform-stride guess, since the
  // backend reserves its column gap only *between* columns (not after the
  // last one), so columns aren't actually evenly spaced by this formula.
  const columnWidth = (contentRight - contentLeft) / template.columns;
  // Row pitches are read back off the bubbles the backend sent, never
  // hardcoded here — see rowPitch(). The info-row label strip likewise ends
  // half a row above the first digit bubble, so every box's label divider and
  // its first row of bubbles agree no matter what spacing the template uses.
  const questionRowSpacing = rowPitch(
    template.question_bubbles.map((b) => b.center.y_mm),
    6
  );
  const headerHeight = 5;
  // The first question row's own cell starts at questions_top_mm minus half
  // a row (see the per-row Frame below) — the header must end exactly there,
  // not at questions_top_mm itself, or its bottom border/label cuts across
  // the first row's bubbles instead of sitting above them.
  const headerBottom = template.questions_top_mm - questionRowSpacing / 2;
  const headerTop = headerBottom - headerHeight;
  const infoRowSpacing = rowPitch(
    template.roll_bubbles.map((b) => b.center.y_mm),
    5.5
  );
  const infoRowYs = uniqueSorted(template.roll_bubbles.map((b) => b.center.y_mm));
  const infoLabelBottom = infoRowYs[0] - infoRowSpacing / 2;
  // Sized to hold the label strip plus every digit-value row the template
  // actually sent, so the frame can't cut off (or float above) its own bubbles.
  const digitBoxHeight = infoLabelBottom - template.info_row_top_mm + infoRowYs.length * infoRowSpacing;

  // A digit grid's frame is measured off its own bubbles — half a column pitch
  // out on each side — rather than taken from the template's *_box_left_mm.
  // Those box fields describe where the backend *thinks* the frame goes; the
  // bubbles are where it actually has to go, and older backends report the
  // first bubble's centre as the box's left edge, which puts the border
  // straight through the leftmost column of bubbles.
  const digitBox = (bubbles: { center: { x_mm: number } }[], fallbackLeft: number, fallbackWidth: number) => {
    const xs = uniqueSorted(bubbles.map((b) => b.center.x_mm));
    if (xs.length === 0) return { left: fallbackLeft, width: fallbackWidth };
    const pitch = xs.length > 1 ? xs[1] - xs[0] : fallbackWidth;
    return { left: xs[0] - pitch / 2, width: xs.length * pitch };
  };
  const rollBox = digitBox(template.roll_bubbles, template.roll_box_left_mm, template.roll_box_width_mm);
  const subjectBox = digitBox(template.exam_code_bubbles, template.subject_code_box_left_mm, template.subject_code_box_width_mm);

  // One table per question column, sized from the real bubble coordinates:
  // the frame stops just past the last option bubble (rather than filling the
  // full column pitch, which left a dead strip on the right) and the
  // প্রশ্ন/উত্তর divider sits in the gap before the first option bubble, so
  // the question number has a column of its own to be centered in instead of
  // spilling over the frame's left edge.
  const columns = Array.from({ length: template.columns }, (_, col) => {
    const colRows = Math.min(rowsPerColumn, questionCount - col * rowsPerColumn);
    const fallbackColLeft = contentLeft + col * columnWidth;
    const firstQNumber = col * rowsPerColumn + 1;
    const optionXs = [1, 2, 3, 4].map(
      (opt) => template.question_bubbles.find((b) => b.question_number === firstQNumber && b.option === opt)?.center.x_mm
    );
    const firstOptionX = optionXs[0] ?? fallbackColLeft + 8;
    const lastOptionX = optionXs[3] ?? fallbackColLeft + columnWidth - 4;
    // The bubbles are equally spaced (the backend lays out the question-number
    // label and all 4 options as 5 equal-width cells — see
    // questionLabelAndOptionSpacing in template.go), so the pitch between any
    // two consecutive option bubbles is also each cell's width. Using that
    // pitch (rather than a fixed offset) for the first/last cell edges keeps
    // every option cell — and the question-number cell beside them — the same
    // width, regardless of how wide the column is (fewer columns => wider
    // pitch => a fixed-offset edge drifted further from true cell width).
    const pitch = optionXs[0] != null && optionXs[1] != null ? optionXs[1] - optionXs[0] : d + 2.4;
    // The column's left edge is the question-number cell's own left edge —
    // one label-width-and-a-half back from the first option bubble (the
    // label cell is the same width as an option cell). Deriving it from the
    // real bubble position, rather than a uniform column-index * width guess,
    // keeps every column's table flush with its own bubbles regardless of how
    // the backend spaces columns apart (e.g. it only gaps *between* columns,
    // not after the last one, so columns aren't evenly strided).
    const colLeft = optionXs[0] != null ? firstOptionX - 1.5 * pitch : fallbackColLeft;
    // Dividers between ক/খ/গ/ঘ, placed at the midpoint between each pair of
    // consecutive option bubbles — same bubbles every row shares, so one set
    // of x-positions per column covers every row in it.
    const optionDividerXs = midpoints(optionXs.filter((x): x is number => x != null));
    const colWidth = lastOptionX + pitch / 2 - colLeft;
    const dividerX = firstOptionX - pitch / 2;
    // Boundaries of the 4 option cells (ক/খ/গ/ঘ), for tinting the 1st/3rd
    // cell — [dividerX, ...dividers between options, right edge of column].
    const optionCellBoundaries = [dividerX, ...optionDividerXs, colLeft + colWidth];
    return {
      col,
      colRows,
      colLeft,
      colWidth,
      dividerX,
      optionDividerXs,
      optionCellBoundaries,
      bodyBottom: template.questions_top_mm + (colRows - 1) * questionRowSpacing + questionRowSpacing / 2,
    };
  }).filter((c) => c.colRows > 0);

  const setBoxGap = template.set_box_left_mm - (template.subject_code_box_left_mm + template.subject_code_box_width_mm);
  const setBoxLeft = subjectBox.left + subjectBox.width + setBoxGap;
  const instructionsX = setBoxLeft + template.set_box_width_mm + 2;
  const instructionsWidth = contentRight - instructionsX;
  const instructionsTop = template.info_row_top_mm;
  // The instructions/signature stack fills the same band as the digit grids
  // beside it, so the whole info row shares one bottom edge.
  const infoRowBottom = template.info_row_top_mm + digitBoxHeight;
  const signatureTop = instructionsTop + (infoRowBottom - instructionsTop) * 0.62;

  return (
    <div
      className="omr-sheet"
      style={{
        position: "relative",
        width: `${template.page_width_mm}mm`,
        height: `${template.page_height_mm}mm`,
        background: "#fff",
        color: "#000",
        fontFamily: `${solaimanLipi.style.fontFamily}, Arial, sans-serif`,
        overflow: "hidden",
      }}
    >
      {/* Corner fiducial markers */}
      {template.markers.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${m.x_mm - markerSize / 2}mm`,
            top: `${m.y_mm - markerSize / 2}mm`,
            width: `${markerSize}mm`,
            height: `${markerSize}mm`,
            background: "#000",
          }}
        />
      ))}

      {/* Warning bar + timing marks */}
      <div
        style={{
          position: "absolute",
          left: `${contentLeft}mm`,
          top: `${contentTop}mm`,
          width: `${contentRight - contentLeft}mm`,
          height: `${template.warning_bar_height_mm}mm`,
          background: "#fdecec",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1mm",
        }}
      >
        <div style={{ color: "#c0392b", fontWeight: 700, fontSize: "2.6mm" }}>এই বক্সে কোনো দাগ দেয়া যাবে না।</div>
        <div style={{ display: "flex", gap: "1.4mm" }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{ width: "2mm", height: "2mm", background: i % 2 === 0 ? "#000" : "transparent", border: i % 2 === 0 ? "none" : "0.2mm solid #000" }} />
          ))}
        </div>
      </div>

      {/* Institute name + address, with the exam it identifies underneath.
          Line heights are pinned so all three lines stay inside the
          title_height_mm band and never overlap the info row below. */}
      <div
        style={{
          position: "absolute",
          left: `${contentLeft}mm`,
          top: `${contentTop + template.warning_bar_height_mm}mm`,
          width: `${contentRight - contentLeft}mm`,
          height: `${template.title_height_mm}mm`,
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: "5mm", fontWeight: 800, lineHeight: 1.15 }}>{INSTITUTE_NAME}</div>
        <div style={{ fontSize: "2.8mm", fontWeight: 700, lineHeight: 1.3 }}>{INSTITUTE_ADDRESS}</div>
        {(exam.title || exam.class_level || exam.subject) && (
          <div style={{ fontSize: "2.2mm", lineHeight: 1.3 }}>
            {[exam.title, exam.class_level && `Class: ${exam.class_level}`, exam.subject].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </div>

      {/* Info row: Class | Roll | Subject Code | Set Code | Instructions+Signature */}
      <ChoiceBox
        x={template.class_box_left_mm}
        width={template.class_box_width_mm}
        top={template.info_row_top_mm}
        labelBottom={infoLabelBottom}
        rowSpacing={infoRowSpacing}
        label="শ্রেণি"
        values={BN_CLASSES}
        bubbleDiameter={d}
      />

      <DigitGridLines
        bubbles={template.roll_bubbles}
        boxLeft={rollBox.left}
        boxWidth={rollBox.width}
        boxTop={infoLabelBottom}
        boxBottom={template.info_row_top_mm + digitBoxHeight}
      />
      <InfoBoxFrame
        x={rollBox.left}
        width={rollBox.width}
        top={template.info_row_top_mm}
        height={digitBoxHeight}
        labelBottom={infoLabelBottom}
        label={`রোল নম্বর${student ? ` : ${toBnNumber(Number(student.roll_number))}` : ""}`}
        columnXs={uniqueSorted(template.roll_bubbles.map((b) => b.center.x_mm))}
      />
      {template.roll_bubbles.map((b, i) => (
        <Bubble key={`r-${i}`} x={b.center.x_mm} y={b.center.y_mm} diameter={d} label={BN_DIGITS[b.value]} />
      ))}

      <DigitGridLines
        bubbles={template.exam_code_bubbles}
        boxLeft={subjectBox.left}
        boxWidth={subjectBox.width}
        boxTop={infoLabelBottom}
        boxBottom={template.info_row_top_mm + digitBoxHeight}
      />
      <InfoBoxFrame
        x={subjectBox.left}
        width={subjectBox.width}
        top={template.info_row_top_mm}
        height={digitBoxHeight}
        labelBottom={infoLabelBottom}
        label="বিষয় কোড"
        columnXs={uniqueSorted(template.exam_code_bubbles.map((b) => b.center.x_mm))}
      />
      {/* Printed blank, matching the reference sheet, rather than pre-filled
          with exam.exam_code — the invigilator/student bubbles it in by hand,
          same as every other digit grid on this sheet. Note this means the
          scanner can no longer auto-identify which exam a photo belongs to
          from the subject-code bubbles alone (services/omr/detect.go reads
          darkness off these exact positions); picking the exam before
          scanning becomes required. */}
      {template.exam_code_bubbles.map((b, i) => (
        <Bubble key={`ec-${i}`} x={b.center.x_mm} y={b.center.y_mm} diameter={d} label={BN_DIGITS[b.value]} />
      ))}

      <ChoiceBox
        x={setBoxLeft}
        width={template.set_box_width_mm}
        top={template.info_row_top_mm}
        labelBottom={infoLabelBottom}
        rowSpacing={infoRowSpacing}
        label="সেট কোড"
        values={BN_SETS}
        bubbleDiameter={d}
      />

      {/* Instructions box */}
      <Frame x={instructionsX} width={instructionsWidth} top={instructionsTop} height={signatureTop - instructionsTop} thickness={0.25} />
      <div style={{ position: "absolute", left: `${instructionsX}mm`, top: `${instructionsTop}mm`, width: `${instructionsWidth}mm` }}>
        <div style={{ background: "#c0392b", color: "#fff", fontSize: "2mm", fontWeight: 700, textAlign: "center", padding: "0.5mm 0" }}>নিয়মাবলী</div>
        <div style={{ fontSize: "1.5mm", lineHeight: 1.5, padding: "1mm" }}>
          {INSTRUCTIONS.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {/* Signature box */}
      <Frame
        x={instructionsX}
        width={instructionsWidth}
        top={signatureTop}
        height={infoRowBottom - signatureTop}
        thickness={0.25}
      />
      <div
        style={{
          position: "absolute",
          left: `${instructionsX}mm`,
          top: `${signatureTop}mm`,
          width: `${instructionsWidth}mm`,
          height: `${infoRowBottom - signatureTop}mm`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "1mm",
        }}
      >
        <div style={{ fontSize: "1.5mm", textAlign: "center" }}>কক্ষ পরিদর্শকের স্বাক্ষর তারিখসহ</div>
      </div>

      {/* Section title — centered in the space between the signature box
          above and the question grid's own header below (not the full
          reserved band, which extends under the header — see headerTop),
          so it gets even padding on both sides instead of touching either. */}
      <div
        style={{
          position: "absolute",
          left: `${contentLeft}mm`,
          top: `${template.questions_top_mm - template.section_title_height_mm}mm`,
          width: `${contentRight - contentLeft}mm`,
          height: `${headerTop - (template.questions_top_mm - template.section_title_height_mm)}mm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontWeight: 800,
          fontSize: "3.2mm",
          lineHeight: 1.8,
        }}
      >
        বহুনির্বাচনি অভিক্ষার উত্তরপত্র
      </div>

      {/* Side registration marks, level with the question grid's header and
          first few rows — see MiddleMarkers for why these are safe to add
          without any Go template involvement. */}
      <MiddleMarkers x={template.markers[0].x_mm} top={headerTop} />
      <MiddleMarkers x={template.markers[1].x_mm} top={headerTop} />

      {/* Question grid header: one bordered cell per column for the
          প্রশ্ন/উত্তর labels. The number/answer split is derived from the
          real option-1 bubble position per column, not a guessed width, so
          the divider lines up with where the label text actually sits.
          The row cells below are drawn separately, per row, off each row's
          own bubble position — see the "each cell has its own border" note
          in the question_bubbles loop below for why. */}
      {columns.map(({ col, colLeft, colWidth, dividerX }) => (
        <div key={`colhead-${col}`}>
          <Frame x={colLeft} width={dividerX - colLeft} top={headerTop} height={headerHeight} thickness={0.3} />
          <Frame x={dividerX} width={colLeft + colWidth - dividerX} top={headerTop} height={headerHeight} thickness={0.3} />
          <div
            style={{
              position: "absolute",
              left: `${colLeft}mm`,
              top: `${headerTop}mm`,
              width: `${dividerX - colLeft}mm`,
              height: `${headerHeight}mm`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2mm",
              fontWeight: 700,
            }}
          >
            প্রশ্ন
          </div>
          <div
            style={{
              position: "absolute",
              left: `${dividerX}mm`,
              top: `${headerTop}mm`,
              width: `${colLeft + colWidth - dividerX}mm`,
              height: `${headerHeight}mm`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2mm",
              fontWeight: 700,
            }}
          >
            উত্তর
          </div>
        </div>
      ))}

      {/* Question bubbles, with zebra-striped rows, on the pitch measured
          off the bubbles themselves. Each row draws its own bordered
          number-cell and answer-cell — rather than one shared outer frame
          and a set of dividers computed from the column's row *count* —
          so a row's border always sits exactly where that row's own
          bubbles are, even if the column ends up with a different number
          of rows than rowsPerColumn assumed (last column, filtered/short
          columns, etc). Adjacent rows' borders land on the same line and
          overlap, which is fine — same as adjoining table cells. */}
      {template.question_bubbles.map((b, i) => {
        const isFirstOption = b.option === 1;
        const column = columns[Math.floor((b.question_number - 1) / rowsPerColumn)];
        const rowSpacing = questionRowSpacing;
        return (
          <div key={`q-${i}`}>
            {isFirstOption && column && (
              <>
                {column.optionCellBoundaries.slice(0, -1).map((left, oi) =>
                  oi % 2 === 0 ? (
                    <div
                      key={`tint${oi}`}
                      style={{
                        position: "absolute",
                        left: `${left}mm`,
                        top: `${b.center.y_mm - rowSpacing / 2}mm`,
                        width: `${column.optionCellBoundaries[oi + 1] - left}mm`,
                        height: `${rowSpacing}mm`,
                        background: ZEBRA_TINT,
                      }}
                    />
                  ) : null
                )}
                <Frame
                  x={column.colLeft}
                  width={column.dividerX - column.colLeft}
                  top={b.center.y_mm - rowSpacing / 2}
                  height={rowSpacing}
                  thickness={0.25}
                />
                <Frame
                  x={column.dividerX}
                  width={column.colLeft + column.colWidth - column.dividerX}
                  top={b.center.y_mm - rowSpacing / 2}
                  height={rowSpacing}
                  thickness={0.25}
                />
                {column.optionDividerXs.map((x, oi) => (
                  <VLine key={`od${oi}`} x={x} top={b.center.y_mm - rowSpacing / 2} height={rowSpacing} thickness={0.2} />
                ))}
                <div
                  style={{
                    position: "absolute",
                    left: `${column.colLeft}mm`,
                    top: `${b.center.y_mm - rowSpacing / 2}mm`,
                    width: `${column.dividerX - column.colLeft}mm`,
                    height: `${rowSpacing}mm`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.3mm",
                  }}
                >
                  {toBnNumber(b.question_number)}
                </div>
              </>
            )}
            <Bubble x={b.center.x_mm} y={b.center.y_mm} diameter={d} label={BN_OPTIONS[b.option - 1]} />
          </div>
        );
      })}
    </div>
  );
}
