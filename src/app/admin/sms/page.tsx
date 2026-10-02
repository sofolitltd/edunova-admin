"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { smsApi, attendanceApi, type SmsTemplate, type User } from "@/lib/api";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import {
  MessageSquare, ExternalLink, Loader2, Plus, Edit, Trash2, X, Send, Users, Phone,
} from "lucide-react";
import { toast } from "sonner";

const BULKSMS_DASHBOARD_URL = "https://bulksmsbd.net/dashboard";

export default function SmsPage() {
  const router = useRouter();

  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const [smsBalanceLoading, setSmsBalanceLoading] = useState(true);
  const [smsBalanceError, setSmsBalanceError] = useState(false);

  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", body: "" });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showDeleteTemplate, setShowDeleteTemplate] = useState<SmsTemplate | null>(null);

  const { batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [recipientMode, setRecipientMode] = useState<"students" | "custom">("students");
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [customNumbers, setCustomNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadSmsBalance = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setSmsBalanceLoading(true);
    setSmsBalanceError(false);
    try {
      const data = await smsApi.getBalance(token);
      setSmsBalance(data.balance);
    } catch {
      setSmsBalanceError(true);
    } finally {
      setSmsBalanceLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setTemplatesLoading(true);
    try {
      const data = await smsApi.getTemplates(token);
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await attendanceApi.getStudents(token, batchIdNum);
      setStudents(data);
      setSelectedStudentIds(new Set());
    } catch {
      toast.error("Failed to load students");
    }
  }, [batchIdNum]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadSmsBalance();
    loadTemplates();
  }, [loadSmsBalance, loadTemplates, router]);

  useEffect(() => {
    if (recipientMode === "students") loadStudents();
  }, [recipientMode, loadStudents]);

  const resetTemplateForm = () => {
    setTemplateForm({ name: "", body: "" });
    setEditingTemplateId(null);
    setShowTemplateForm(false);
  };

  const openCreateTemplate = () => {
    resetTemplateForm();
    setShowTemplateForm(true);
  };

  const openEditTemplate = (t: SmsTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateForm({ name: t.name, body: t.body });
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      toast.error("Name and body are required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSavingTemplate(true);
    try {
      if (editingTemplateId) {
        await smsApi.updateTemplate(token, editingTemplateId, templateForm);
        toast.success("Template updated");
      } else {
        await smsApi.createTemplate(token, templateForm);
        toast.success("Template created");
      }
      resetTemplateForm();
      loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!showDeleteTemplate) return;
    const token = getToken();
    if (!token) return;
    setSavingTemplate(true);
    try {
      await smsApi.deleteTemplate(token, showDeleteTemplate.id);
      toast.success("Template deleted");
      setShowDeleteTemplate(null);
      loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const applyTemplate = (t: SmsTemplate) => setMessage(t.body);

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllStudents = () => {
    setSelectedStudentIds((prev) =>
      prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))
    );
  };

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Message is required"); return; }

    const token = getToken();
    if (!token) return;

    const payload: { message: string; student_ids?: number[]; mobiles?: string[] } = { message };

    if (recipientMode === "students") {
      if (selectedStudentIds.size === 0) { toast.error("Select at least one student"); return; }
      payload.student_ids = Array.from(selectedStudentIds);
    } else {
      const mobiles = customNumbers.split(/[,\n]/).map((m) => m.trim()).filter(Boolean);
      if (mobiles.length === 0) { toast.error("Enter at least one phone number"); return; }
      payload.mobiles = mobiles;
    }

    setSending(true);
    try {
      const result = await smsApi.send(token, payload);
      if (result.failed.length === 0) {
        toast.success(`Sent to ${result.sent} recipient(s)`);
      } else {
        toast.warning(`Sent ${result.sent}, failed ${result.failed.length}`);
      }
      loadSmsBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SMS</h1>
        <p className="text-sm text-muted-foreground mt-1">Balance, templates, and manual SMS sending</p>
      </div>

      {/* SMS Balance */}
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BulkSMS BD Balance</p>
            {smsBalanceLoading ? (
              <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </p>
            ) : smsBalanceError ? (
              <p className="text-sm text-destructive">Unable to fetch balance</p>
            ) : (
              <p className="text-lg font-semibold text-foreground">৳{(smsBalance ?? 0).toLocaleString()}</p>
            )}
          </div>
        </div>
        <a
          href={BULKSMS_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-all"
        >
          Recharge on BulkSMS BD
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Templates */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Templates</h2>
          <button
            onClick={openCreateTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
        {templatesLoading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">No templates yet</div>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 break-words">{t.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => applyTemplate(t)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Use
                  </button>
                  <button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowDeleteTemplate(t)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="px-6 py-3 text-xs text-muted-foreground border-t border-border">
          Placeholders available when sending to students: <code>{"{{name}}"}</code>, <code>{"{{class}}"}</code>, <code>{"{{mobile}}"}</code>
        </p>
      </div>

      {/* Send SMS */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <h2 className="font-semibold text-foreground">Send SMS</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecipientMode("students")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${recipientMode === "students" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            <Users className="w-4 h-4" />
            Students / Batch
          </button>
          <button
            onClick={() => setRecipientMode("custom")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${recipientMode === "custom" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            <Phone className="w-4 h-4" />
            Custom Numbers
          </button>
        </div>

        {recipientMode === "students" ? (
          <div className="space-y-3">
            <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={false} />
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b border-border">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.size === students.length}
                    onChange={toggleAllStudents}
                  />
                  Select all ({students.length})
                </label>
                <span className="text-xs text-muted-foreground">{selectedStudentIds.size} selected</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {students.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">No students found</div>
                ) : (
                  students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/30 cursor-pointer">
                      <input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudent(s.id)} />
                      <span className="text-foreground">{s.full_name}</span>
                      <span className="text-muted-foreground">({s.mobile})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <textarea
            value={customNumbers}
            onChange={(e) => setCustomNumbers(e.target.value)}
            placeholder="Enter phone numbers, separated by commas or new lines"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message or pick a template above with 'Use'"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send SMS
        </button>
      </div>

      {/* Template Create/Edit Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetTemplateForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editingTemplateId ? "Edit" : "New"} Template</h3>
              <button onClick={resetTemplateForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Fee Due Reminder"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Body *</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Dear {{name}}, your fee for {{class}} is due..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Use <code>{"{{name}}"}</code>, <code>{"{{class}}"}</code>, <code>{"{{mobile}}"}</code> as placeholders.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetTemplateForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateForm.name.trim() || !templateForm.body.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {savingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTemplateId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Delete Confirmation */}
      {showDeleteTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteTemplate(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Template</h3>
              <button onClick={() => setShowDeleteTemplate(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Delete <strong className="text-foreground">{showDeleteTemplate.name}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDeleteTemplate(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleDeleteTemplate}
                disabled={savingTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all"
              >
                {savingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
