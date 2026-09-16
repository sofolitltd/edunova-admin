"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { api, questionsApi, academicManagementApi, type Question, type QuestionBankStats, type ClassItem, type Subject, type SheetPreview } from "@/lib/api";
import { Search, Plus, Upload, Trash2, Eye, Edit, Check, X, ChevronLeft, ChevronRight, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const questionTypes = [
  { value: "mcq", label: "MCQ" },
  { value: "short_answer", label: "Short Answer" },
  { value: "very_short_answer", label: "Very Short Answer" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "true_false", label: "True/False" },
  { value: "matching", label: "Matching" },
  { value: "descriptive", label: "Descriptive" },
  { value: "creative", label: "Creative Question" },
  { value: "problem_solving", label: "Problem Solving" },
];

const difficulties = [
  { value: "easy", label: "Easy", color: "bg-success/10 text-success" },
  { value: "medium", label: "Medium", color: "bg-warning/10 text-warning" },
  { value: "hard", label: "Hard", color: "bg-destructive/10 text-destructive" },
];

const statuses = [
  { value: "draft", label: "Draft", color: "bg-secondary text-muted-foreground" },
  { value: "published", label: "Published", color: "bg-success/10 text-success" },
  { value: "archived", label: "Archived", color: "bg-destructive/10 text-destructive" },
];

export default function QuestionBankPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionBankStats | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Bulk upload modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    imported: number;
    duplicates: number;
    errors: number;
    error_rows: { row: number; errors: string[] }[];
  } | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [sheetPreview, setSheetPreview] = useState<{ header: string[]; rows: string[][] } | null>(null);
  const [editingRows, setEditingRows] = useState<string[][]>([]);

  // View question modal
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);

  const token = getToken() || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes, cRes, subRes] = await Promise.all([
        questionsApi.getQuestions(token, {
          page,
          per_page: 20,
          class_id: filterClass ? Number(filterClass) : undefined,
          subject_id: filterSubject ? Number(filterSubject) : undefined,
          question_type: filterType || undefined,
          difficulty: filterDifficulty || undefined,
          status: filterStatus || undefined,
          search: search || undefined,
        }),
        questionsApi.getStats(token),
        academicManagementApi.getClasses(token),
        academicManagementApi.getSubjects(token),
      ]);
      setQuestions(qRes.questions);
      setTotal(qRes.total);
      setTotalPages(qRes.total_pages);
      setStats(sRes);
      setClasses(cRes);
      setSubjects(subRes);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  }, [token, page, filterClass, filterSubject, filterType, filterDifficulty, filterStatus, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await questionsApi.updateStatus(token, id, newStatus);
      toast.success(`Question ${newStatus}`);
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this question?")) return;
    try {
      await questionsApi.deleteQuestion(token, id);
      toast.success("Question deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const result = await questionsApi.bulkUpload(token, bulkFile);
      setBulkResult(result);
      toast.success(`Imported ${result.imported} questions`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) return;
    setFetchingSheet(true);
    setBulkResult(null);
    setSheetPreview(null);
    try {
      const result = await questionsApi.fetchSheet(token, sheetUrl.trim());
      setSheetPreview({ header: result.header, rows: result.rows });
      setEditingRows(result.rows.map(r => [...r]));
      toast.success(`Fetched ${result.total} rows from Google Sheets`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch Google Sheet");
    } finally {
      setFetchingSheet(false);
    }
  };

  const handlePreviewCellEdit = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...editingRows];
    newRows[rowIdx] = [...newRows[rowIdx]];
    newRows[rowIdx][colIdx] = value;
    setEditingRows(newRows);
  };

  const handlePreviewDeleteRow = (rowIdx: number) => {
    setEditingRows(editingRows.filter((_, i) => i !== rowIdx));
  };

  const handleImportPreview = async () => {
    if (!sheetPreview || editingRows.length === 0) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const csvContent = [sheetPreview.header.join(","), ...editingRows.map(row =>
        row.map(cell => {
          const escaped = cell.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        }).join(",")
      )].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const file = new File([blob], "preview.csv", { type: "text/csv" });
      const result = await questionsApi.bulkUpload(token, file);
      setBulkResult(result);
      setSheetPreview(null);
      setEditingRows([]);
      setSheetUrl("");
      toast.success(`Imported ${result.imported} questions`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `class,subject,book,chapter,topic,question_type,question,option_a,option_b,option_c,option_d,answer,explanation,marks,difficulty,tags
Class 5,Mathematics,NCTB Math,Chapter 1,Fractions,mcq,"What is 1/2 + 1/4?","1/4","3/4","1/2","2/3","B","Add fractions with common denominator",1,easy,"fraction,addition"
Class 5,Mathematics,NCTB Math,Chapter 1,Fractions,short_answer,"Explain what a fraction is.","","","","","A fraction represents a part of a whole.",2,medium,"fraction,definition"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDifficultyColor = (d: string) => difficulties.find(x => x.value === d)?.color || "";
  const getStatusColor = (s: string) => statuses.find(x => x.value === s)?.color || "";
  const getTypeLabel = (t: string) => questionTypes.find(x => x.value === t)?.label || t;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your question database</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => router.push("/admin/question-bank/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-success">{stats.by_status?.published || 0}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-warning">{stats.by_status?.draft || 0}</div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-muted-foreground">{stats.by_status?.archived || 0}</div>
            <div className="text-sm text-muted-foreground">Archived</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterSubject}
            onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Status</option>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No questions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Question</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Marks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground line-clamp-2 max-w-md">{q.question_text}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {q.class_name} {q.subject_name && `· ${q.subject_name}`} {q.chapter_name && `· ${q.chapter_name}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(q.question_type)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{q.marks}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewQuestion(q)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/question-bank/${q.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {q.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "published")}
                            className="p-1.5 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success transition-all"
                            title="Publish"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {q.status === "published" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "archived")}
                            className="p-1.5 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-all"
                            title="Archive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {total} questions · Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl border border-border w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {sheetPreview ? `Preview (${editingRows.length} rows)` : bulkResult ? "Import Results" : "Bulk Import Questions"}
              </h2>
              <button onClick={() => { setShowBulkModal(false); setBulkResult(null); setBulkFile(null); setSheetUrl(""); setSheetPreview(null); setEditingRows([]); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Step 1: CSV Upload + Google Sheets URL (no preview yet) */}
              {!sheetPreview && !bulkResult && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-sm text-secondary-foreground hover:bg-secondary/80 transition-all">
                      <Download className="w-4 h-4" />
                      Download CSV Template
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">Drop your CSV file here or click to browse</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary-dark cursor-pointer"
                    />
                  </div>

                  {bulkFile && (
                    <div className="text-sm text-foreground">
                      Selected: <span className="font-medium">{bulkFile.name}</span>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">or import from Google Sheets</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste Google Sheets URL..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleFetchSheet}
                      disabled={!sheetUrl.trim() || fetchingSheet}
                      className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {fetchingSheet ? "Fetching..." : "Fetch & Preview"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sheet must be shared with &quot;Anyone with the link&quot; — you can review and edit before importing
                  </p>
                </>
              )}

              {/* Step 2: Editable preview table */}
              {sheetPreview && !bulkResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Review and edit questions before importing. Click a cell to edit.
                    </p>
                    <button
                      onClick={() => { setSheetPreview(null); setEditingRows([]); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto border border-border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/50 sticky top-0">
                          <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                          {sheetPreview.header.map((h, i) => (
                            <th key={i} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                          <th className="px-2 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t border-border hover:bg-secondary/30">
                            <td className="px-2 py-1 text-muted-foreground">{rowIdx + 1}</td>
                            {sheetPreview.header.map((_, colIdx) => (
                              <td key={colIdx} className="px-1 py-1">
                                <input
                                  type="text"
                                  value={row[colIdx] || ""}
                                  onChange={(e) => handlePreviewCellEdit(rowIdx, colIdx, e.target.value)}
                                  className="w-full px-1.5 py-1 rounded bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-secondary text-foreground text-xs focus:outline-none"
                                />
                              </td>
                            ))}
                            <td className="px-1 py-1">
                              <button onClick={() => handlePreviewDeleteRow(rowIdx)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Import result */}
              {bulkResult && (
                <div className="bg-secondary rounded-xl p-4 space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-success">{bulkResult.imported}</div>
                      <div className="text-xs text-muted-foreground">Imported</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-warning">{bulkResult.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicates</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-destructive">{bulkResult.errors}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>
                  {bulkResult.error_rows && bulkResult.error_rows.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      {bulkResult.error_rows.map((err, i) => (
                        <div key={i} className="text-xs text-destructive">
                          Row {err.row}: {err.errors.join(", ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => { setShowBulkModal(false); setBulkResult(null); setBulkFile(null); setSheetUrl(""); setSheetPreview(null); setEditingRows([]); }}
                className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
              >
                {bulkResult ? "Close" : "Cancel"}
              </button>
              {sheetPreview && !bulkResult && (
                <button
                  onClick={handleImportPreview}
                  disabled={editingRows.length === 0 || bulkUploading}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {bulkUploading ? "Importing..." : `Import ${editingRows.length} Questions`}
                </button>
              )}
              {!sheetPreview && !bulkResult && (
                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || bulkUploading}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {bulkUploading ? "Uploading..." : "Upload & Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Question Modal */}
      {viewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Question Detail</h2>
              <button onClick={() => setViewQuestion(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewQuestion.status)}`}>
                  {viewQuestion.status}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(viewQuestion.difficulty)}`}>
                  {viewQuestion.difficulty}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {getTypeLabel(viewQuestion.question_type)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {viewQuestion.marks} marks
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                {viewQuestion.class_name} {viewQuestion.subject_name && `· ${viewQuestion.subject_name}`} {viewQuestion.book_name && `· ${viewQuestion.book_name}`} {viewQuestion.chapter_name && `· ${viewQuestion.chapter_name}`}
              </div>

              <div className="text-foreground font-medium">{viewQuestion.question_text}</div>

              {viewQuestion.options && (() => {
                try {
                  const opts = JSON.parse(viewQuestion.options) as { label: string; text: string }[];
                  return (
                    <div className="space-y-2">
                      {opts.map((opt) => (
                        <div key={opt.label} className={`flex items-start gap-3 p-3 rounded-xl border ${opt.text === viewQuestion.answer ? "border-success bg-success/5" : "border-border"}`}>
                          <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                            {opt.label}
                          </span>
                          <span className="text-sm text-foreground">{opt.text}</span>
                          {opt.text === viewQuestion.answer && (
                            <Check className="w-4 h-4 text-success ml-auto flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}

              {!viewQuestion.options && (
                <div className="p-3 rounded-xl border border-success bg-success/5">
                  <div className="text-xs text-success font-medium mb-1">Answer</div>
                  <div className="text-sm text-foreground">{viewQuestion.answer}</div>
                </div>
              )}

              {viewQuestion.explanation && (
                <div className="p-3 rounded-xl bg-secondary">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Explanation</div>
                  <div className="text-sm text-foreground">{viewQuestion.explanation}</div>
                </div>
              )}

              {viewQuestion.tags && viewQuestion.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {viewQuestion.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-border">
              <button
                onClick={() => setViewQuestion(null)}
                className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
