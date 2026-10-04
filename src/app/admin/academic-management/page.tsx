"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken } from "@/lib/auth";
import { academicManagementApi, type ClassItem, type Subject, type Book, type Chapter, type Topic } from "@/lib/api";
import { Plus, ChevronRight, Edit, Trash2, X, Save, Upload, Home, Copy } from "lucide-react";
import { toast } from "sonner";

type Level = "classes" | "subjects" | "books" | "chapters" | "topics";
type AcademicItem = ClassItem | Subject | Book | Chapter | Topic;

interface Breadcrumb {
  level: Level;
  label: string;
  id?: number;
}

export default function AcademicManagementPage() {
  const token = getToken() || "";

  // Navigation state
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ level: "classes", label: "All Classes" }]);
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameBn, setFormNameBn] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formPublisher, setFormPublisher] = useState("");
  const [formYear, setFormYear] = useState(0);
  const [formCode, setFormCode] = useState("");

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const currentLevel = breadcrumbs[breadcrumbs.length - 1].level;

  // Fetch items based on current navigation level
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const level = breadcrumbs[breadcrumbs.length - 1];
      let data: AcademicItem[] = [];

      switch (level.level) {
        case "classes":
          data = await academicManagementApi.getClasses(token);
          break;
        case "subjects": {
          const classId = breadcrumbs.find(b => b.level === "classes")?.id;
          if (classId) {
            const allBooks = await academicManagementApi.getBooks(token, undefined, classId);
            const subjectIds = new Set(allBooks.map((b: Book) => b.subject_id));
            const allSubjects = await academicManagementApi.getSubjects(token);
            data = allSubjects.filter((s: Subject) => subjectIds.has(s.id));
          } else {
            data = await academicManagementApi.getSubjects(token);
          }
          break;
        }
        case "books": {
          const classId = breadcrumbs.find(b => b.level === "classes")?.id;
          const subjectId = level.id;
          data = await academicManagementApi.getBooks(token, subjectId, classId);
          break;
        }
        case "chapters":
          data = await academicManagementApi.getChapters(token, level.id!);
          break;
        case "topics":
          data = await academicManagementApi.getTopics(token, level.id!);
          break;
      }
      setItems(data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token, breadcrumbs]);

  useEffect(() => {
    if (token) fetchItems();
  }, [fetchItems, token]);

  // Drill down into an item
  const drillDown = (item: AcademicItem) => {
    const nextLevelMap: Record<Level, Level> = {
      classes: "subjects",
      subjects: "books",
      books: "chapters",
      chapters: "topics",
      topics: "topics",
    };
    const levelNames: Record<Level, string> = {
      classes: "Class",
      subjects: "Subject",
      books: "Book",
      chapters: "Chapter",
      topics: "Topic",
    };

    const childLevel = nextLevelMap[currentLevel];
    if (childLevel === currentLevel) return; // already at deepest

    setBreadcrumbs([...breadcrumbs, { level: childLevel, label: item.name, id: item.id }]);
  };

  // Navigate via breadcrumb
  const navigateTo = (index: number) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  // Form helpers
  const resetForm = () => {
    setFormName(""); setFormNameBn(""); setFormOrder(0); setFormPublisher(""); setFormYear(0); setFormCode("");
    setEditingId(null); setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: AcademicItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormNameBn(item.name_bn || "");
    if ("order_index" in item) setFormOrder(item.order_index);
    if ("publisher" in item) {
      setFormPublisher((item as Book).publisher || "");
      setFormYear((item as Book).academic_year || 0);
    }
    if ("code" in item) setFormCode((item as ClassItem).code || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const classId = breadcrumbs.find(b => b.level === "classes")?.id;
      const subjectId = breadcrumbs.find(b => b.level === "subjects")?.id;
      const bookId = breadcrumbs.find(b => b.level === "books")?.id;
      const chapterId = breadcrumbs.find(b => b.level === "chapters")?.id;

      if (currentLevel === "classes") {
        if (editingId) {
          await academicManagementApi.updateClass(token, editingId, { name: formName, name_bn: formNameBn, order_index: formOrder, code: formCode });
        } else {
          await academicManagementApi.createClass(token, { name: formName, name_bn: formNameBn, order_index: formOrder, code: formCode });
        }
      } else if (currentLevel === "subjects") {
        if (editingId) {
          await academicManagementApi.updateSubject(token, editingId, { name: formName, name_bn: formNameBn });
        } else {
          await academicManagementApi.createSubject(token, { name: formName, name_bn: formNameBn });
        }
      } else if (currentLevel === "books") {
        const data = { subject_id: subjectId!, class_id: classId!, name: formName, name_bn: formNameBn, publisher: formPublisher, academic_year: formYear };
        if (editingId) {
          await academicManagementApi.updateBook(token, editingId, data);
        } else {
          await academicManagementApi.createBook(token, data);
        }
      } else if (currentLevel === "chapters") {
        const data = { book_id: bookId!, name: formName, name_bn: formNameBn, order_index: formOrder };
        if (editingId) {
          await academicManagementApi.updateChapter(token, editingId, data);
        } else {
          await academicManagementApi.createChapter(token, data);
        }
      } else if (currentLevel === "topics") {
        const data = { chapter_id: chapterId!, name: formName, name_bn: formNameBn, order_index: formOrder };
        if (editingId) {
          await academicManagementApi.updateTopic(token, editingId, data);
        } else {
          await academicManagementApi.createTopic(token, data);
        }
      }
      toast.success(editingId ? "Updated!" : "Created!");
      resetForm();
      fetchItems();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleCloneBook = async (book: Book) => {
    const input = prompt(
      `New edition of "${book.name}". Academic year (e.g. ${(book.academic_year || new Date().getFullYear()) + 1})?\n\nChapters and topics are copied and this edition is archived. Past lessons keep pointing at it.`,
    );
    const year = Number(input);
    if (!input || !Number.isInteger(year) || year < 2000) return;
    try {
      await academicManagementApi.cloneBook(token, book.id, { academic_year: year });
      toast.success("New edition created");
      fetchItems();
    } catch {
      toast.error("Failed to create new edition");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    try {
      if (currentLevel === "classes") await academicManagementApi.deleteClass(token, id);
      else if (currentLevel === "subjects") await academicManagementApi.deleteSubject(token, id);
      else if (currentLevel === "books") await academicManagementApi.deleteBook(token, id);
      else if (currentLevel === "chapters") await academicManagementApi.deleteChapter(token, id);
      else if (currentLevel === "topics") await academicManagementApi.deleteTopic(token, id);
      toast.success("Deleted!");
      fetchItems();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    try {
      const result = await academicManagementApi.bulkImport(token, bulkFile);
      toast.success(`Imported ${result.created} items`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors`);
      }
      setShowBulkImport(false);
      setBulkFile(null);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = "class,class_bn,subject,subject_bn,book,book_bn,publisher,chapter,chapter_bn,topic,topic_bn";
    const rows = [
      "Class 10,দশম শ্রেণি,Mathematics,গণিত,Mathematics,গণিত,NCTB,Algebra,বীজগণিত,Polynomials,বহুপদী",
      "Class 10,দশম শ্রেণি,Mathematics,গণিত,Mathematics,গণিত,NCTB,Algebra,বীজগণিত,Equations,সমীকরণ",
      "Class 10,দশম শ্রেণি,Physics,পদার্থবিজ্ঞান,Physics,পদার্থবিজ্ঞান,NCTB,Physical World,ভৌত জগৎ,Units & Dimensions,একক ও মাত্রা",
    ];
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "academic_management_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const addLabel = () => {
    const labels: Record<Level, string> = {
      classes: "Class",
      subjects: "Subject",
      books: "Book",
      chapters: "Chapter",
      topics: "Topic",
    };
    return labels[currentLevel];
  };

  const getItemSubtitle = (item: AcademicItem) => {
    if ("book_name" in item) return (item as Chapter).book_name;
    if ("chapter_name" in item) return (item as Topic).chapter_name;
    if ("subject_name" in item) return `${(item as Book).subject_name} · ${(item as Book).class_name}`;
    return item.name_bn || "";
  };

  const canDrillDown = currentLevel !== "topics";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse classes, subjects, books, chapters, and topics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
          >
            <Plus className="w-4 h-4" />
            Add {addLabel()}
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <button
              onClick={() => navigateTo(i)}
              className={`px-2 py-1 rounded-lg transition-colors ${
                i === breadcrumbs.length - 1
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {i === 0 && <Home className="w-3.5 h-3.5 inline mr-1" />}
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {breadcrumbs[breadcrumbs.length - 1].label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({items.length})</span>
            </h2>
          </div>

          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm mb-3">No items yet</p>
                <button onClick={openCreate} className="text-sm text-primary font-medium hover:underline">
                  Create first {addLabel().toLowerCase()}
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-6 py-4 transition-colors ${
                    canDrillDown ? "hover:bg-primary/5 cursor-pointer" : "hover:bg-secondary/30"
                  }`}
                  onClick={() => canDrillDown && drillDown(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {item.name}
                        {currentLevel === "books" && (item as Book).academic_year > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{(item as Book).academic_year}</span>
                        )}
                        {currentLevel === "books" && (item as Book).is_active === false && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Archived</span>
                        )}
                        {currentLevel === "classes" && (item as ClassItem).code && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{(item as ClassItem).code}</span>
                        )}
                      </div>
                      {getItemSubtitle(item) && item.name !== getItemSubtitle(item) && (
                        <div className="text-xs text-muted-foreground">{getItemSubtitle(item)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canDrillDown && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground mr-2" />
                    )}
                    {currentLevel === "books" && (item as Book).is_active !== false && (
                      <button
                        onClick={() => handleCloneBook(item as Book)}
                        title="New edition"
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create/Edit Form — Desktop inline */}
        {showForm && (
          <div className="hidden lg:block bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Edit" : "Create"} {addLabel()}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`e.g. ${addLabel() === "Class" ? "Class 10" : addLabel() === "Subject" ? "Mathematics" : addLabel() === "Book" ? "Math Book" : addLabel() === "Chapter" ? "Algebra" : "Polynomials"}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name (Bengali)</label>
                <input
                  type="text"
                  value={formNameBn}
                  onChange={(e) => setFormNameBn(e.target.value)}
                  placeholder="e.g. গণিত"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {currentLevel === "books" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Publisher</label>
                  <input
                    type="text"
                    value={formPublisher}
                    onChange={(e) => setFormPublisher(e.target.value)}
                    placeholder="e.g. NCTB"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {currentLevel === "books" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Academic Year</label>
                  <input
                    type="number"
                    value={formYear || ""}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    placeholder="e.g. 2026"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {(currentLevel === "classes" || currentLevel === "chapters" || currentLevel === "topics") && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Order Index</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {currentLevel === "classes" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Code</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="e.g. 04"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">2-digit numeric code used to generate batch codes for this class.</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update" : "Create"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Form — Mobile/Tablet dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 lg:hidden" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Edit" : "Create"} {addLabel()}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`e.g. ${addLabel() === "Class" ? "Class 10" : addLabel() === "Subject" ? "Mathematics" : addLabel() === "Book" ? "Math Book" : addLabel() === "Chapter" ? "Algebra" : "Polynomials"}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name (Bengali)</label>
                <input
                  type="text"
                  value={formNameBn}
                  onChange={(e) => setFormNameBn(e.target.value)}
                  placeholder="e.g. গণিত"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {currentLevel === "books" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Publisher</label>
                  <input
                    type="text"
                    value={formPublisher}
                    onChange={(e) => setFormPublisher(e.target.value)}
                    placeholder="e.g. NCTB"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {currentLevel === "books" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Academic Year</label>
                  <input
                    type="number"
                    value={formYear || ""}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    placeholder="e.g. 2026"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {(currentLevel === "classes" || currentLevel === "chapters" || currentLevel === "topics") && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Order Index</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {currentLevel === "classes" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Code</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="e.g. 04"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">2-digit numeric code used to generate batch codes for this class.</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update" : "Create"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBulkImport(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Bulk Import Academic Management</h3>
              <button onClick={() => setShowBulkImport(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with columns: <code className="bg-secondary px-1 rounded">class, class_bn, subject, subject_bn, book, book_bn, publisher, chapter, chapter_bn, topic, topic_bn</code>
              </p>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {bulkFile ? bulkFile.name : "Drop CSV file here or click to browse"}
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 cursor-pointer transition-all">
                  {bulkFile ? "Change File" : "Choose File"}
                  <input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
              <button
                onClick={downloadTemplate}
                className="text-sm text-primary font-medium hover:underline"
              >
                Download CSV template
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => { setShowBulkImport(false); setBulkFile(null); }}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkFile || bulkUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {bulkUploading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
