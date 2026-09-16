"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { academicManagementApi, questionsApi, type ClassItem, type Subject, type Book, type Chapter, type Topic } from "@/lib/api";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
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

export default function NewQuestionPage() {
  const router = useRouter();
  const token = getToken() || "";

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);

  const [questionType, setQuestionType] = useState("mcq");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState([
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ]);
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState("bn");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    academicManagementApi.getClasses(token).then(setClasses).catch(() => {});
    academicManagementApi.getSubjects(token).then(setSubjects).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (classId && subjectId) {
      academicManagementApi.getBooks(token, subjectId, classId).then(setBooks).catch(() => {});
      setBookId(null);
      setChapters([]);
      setChapterId(null);
      setTopics([]);
      setTopicId(null);
    }
  }, [classId, subjectId, token]);

  useEffect(() => {
    if (bookId) {
      academicManagementApi.getChapters(token, bookId).then(setChapters).catch(() => {});
      setChapterId(null);
      setTopics([]);
      setTopicId(null);
    }
  }, [bookId, token]);

  useEffect(() => {
    if (chapterId) {
      academicManagementApi.getTopics(token, chapterId).then(setTopics).catch(() => {});
      setTopicId(null);
    }
  }, [chapterId, token]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const updateOption = (index: number, text: string) => {
    const newOpts = [...options];
    newOpts[index] = { ...newOpts[index], text };
    setOptions(newOpts);
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (!answer.trim()) {
      toast.error("Answer is required");
      return;
    }

    setSaving(true);
    try {
      let optionsJson: string | null = null;
      if (questionType === "mcq") {
        const filledOpts = options.filter(o => o.text.trim());
        if (filledOpts.length < 2) {
          toast.error("MCQ needs at least 2 options");
          setSaving(false);
          return;
        }
        optionsJson = JSON.stringify(filledOpts);
      }

      await questionsApi.createQuestion(token, {
        class_id: classId,
        subject_id: subjectId,
        book_id: bookId,
        chapter_id: chapterId,
        topic_id: topicId,
        question_type: questionType,
        question_text: questionText,
        options: optionsJson,
        answer,
        explanation,
        marks,
        difficulty,
        tags,
        source,
        source_page: null,
        language,
      });
      toast.success("Question created!");
      router.push("/admin/question-bank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Question</h1>
          <p className="text-sm text-muted-foreground mt-1">Add a question to the bank</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        {/* Academic Management Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Class</label>
            <select value={classId || ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
            <select value={subjectId || ""} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Book</label>
            <select value={bookId || ""} onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={!classId || !subjectId}>
              <option value="">Select Book</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Chapter</label>
            <select value={chapterId || ""} onChange={(e) => setChapterId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={!bookId}>
              <option value="">Select Chapter</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Topic</label>
            <select value={topicId || ""} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={!chapterId}>
              <option value="">Select Topic</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Question Type & Meta */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Question Type</label>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Marks</label>
            <input type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="bn">Bengali</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Question *</label>
          <textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter the question..."
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        {/* MCQ Options */}
        {questionType === "mcq" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Options</label>
            {options.map((opt, i) => (
              <div key={opt.label} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                  {opt.label}
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${opt.label}`}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
        )}

        {/* Answer */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {questionType === "mcq" ? "Correct Option" : "Answer"} *
          </label>
          {questionType === "mcq" ? (
            <div className="flex gap-2">
              {["A", "B", "C", "D"].map((label) => (
                <button
                  key={label}
                  onClick={() => setAnswer(label)}
                  className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                    answer === label
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <textarea rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the answer..."
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          )}
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Explanation</label>
          <textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain the answer (optional)..."
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Tags</label>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addTag} className="px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-primary-dark"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Source</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. NCTB Book, Board Question"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Question"}
        </button>
      </div>
    </div>
  );
}
