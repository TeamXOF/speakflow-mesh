"use client";

/**
 * Students roster (teacher) — REAL per-student stats from the database:
 * checkpoints passed/attempted, stars, average accuracy, last activity,
 * account status, and the parent auto-update preference. Rows open the
 * student's full progress view. Add / edit / delete are real CRUD.
 */

import { Users, Search, Plus, MoreVertical, Edit2, Trash2, X, Star, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  fetchRoster, RosterEntry, createStudent, updateStudent, deleteStudent, toggleParentUpdates,
} from "@/lib/api";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { useAuth } from "@/components/auth/AuthProvider";

export default function StudentsPage() {
  const { addNotification } = useSpeakFlow();
  const router = useRouter();
  const { isTeacher } = useAuth();
  const [students, setStudents] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<RosterEntry | null>(null);
  const [formData, setFormData] = useState({ name: "", grade: 3, level: "Level 1" });
  const [saving, setSaving] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [togglingParent, setTogglingParent] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      if (isTeacher) setStudents(await fetchRoster());
    } catch (err: any) {
      addNotification({ title: "Error", message: err.message || "Failed to load roster", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Honor ?q= from the topbar search (read via location — no prerender hook)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createStudent(formData);
      addNotification({ title: "Success", message: "Student added successfully", type: "success" });
      setShowAddModal(false);
      setFormData({ name: "", grade: 3, level: "Level 1" });
      loadStudents();
    } catch (err: any) {
      addNotification({ title: "Error", message: err.message || "Failed to add student", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    setSaving(true);
    try {
      await updateStudent(currentStudent.id, formData);
      addNotification({ title: "Success", message: "Student updated", type: "success" });
      setShowEditModal(false);
      loadStudents();
    } catch (err: any) {
      addNotification({ title: "Error", message: err.message || "Failed to update student", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentStudent) return;
    setSaving(true);
    try {
      await deleteStudent(currentStudent.id);
      addNotification({ title: "Success", message: "Student deleted", type: "success" });
      setShowDeleteModal(false);
      loadStudents();
    } catch (err: any) {
      addNotification({ title: "Error", message: err.message || "Failed to delete student", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleParentToggle = async (s: RosterEntry) => {
    setTogglingParent(s.id);
    try {
      await toggleParentUpdates(s.id, !s.parent_update_enabled);
      setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, parent_update_enabled: !x.parent_update_enabled } : x)));
      addNotification({
        title: s.parent_update_enabled ? "Parent updates off" : "Parent updates on",
        message: `${s.name}: automatic parent updates ${!s.parent_update_enabled ? "enabled" : "disabled"}.`,
        type: "success",
      });
    } catch (err: any) {
      addNotification({ title: "Error", message: err.message || "Toggle failed", type: "error" });
    } finally {
      setTogglingParent(null);
    }
  };

  const filtered = students.filter((s) =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()));

  const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Students</h1>
          <p className="text-sm text-text-secondary mt-1">Live roster — real progress, accounts, and parent-update preferences.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-text-primary text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Student
        </button>
      </div>

      <div className="speakflow-card bg-white p-6">
        <div className="relative max-w-md mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-muted" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary bg-gray-50"
            placeholder="Search students..."
          />
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold">Student</th>
                <th className="px-6 py-4 font-bold text-center">Checkpoints</th>
                <th className="px-6 py-4 font-bold text-center">Avg Accuracy</th>
                <th className="px-6 py-4 font-bold text-center">Stars</th>
                <th className="px-6 py-4 font-bold text-center">Parent Updates</th>
                <th className="px-6 py-4 font-bold">Account</th>
                <th className="px-6 py-4 font-bold">Last Active</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">Loading roster…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">No students found.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/students/${s.id}`)}
                    className="bg-white border-b hover:bg-accent-primary-bg/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-accent-primary-bg text-accent-primary-dark flex items-center justify-center mr-3 font-bold text-xs">
                          {initials(s.name)}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{s.name}</p>
                          <p className="text-xs text-text-muted">Grade {s.grade} • {s.level}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold">
                      {s.checkpoints_passed}<span className="text-text-muted">/{s.checkpoints_attempted || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.avg_accuracy != null ? (
                        <span className={`font-mono font-bold ${s.avg_accuracy >= 85 ? "text-status-complete" : s.avg_accuracy >= 70 ? "text-accent-primary-dark" : "text-status-anxious"}`}>
                          {s.avg_accuracy}%
                        </span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-amber-500 font-mono font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{s.stars}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleParentToggle(s)}
                        disabled={togglingParent === s.id}
                        title={s.parent_update_enabled ? "Automatic parent updates are ON — click to disable" : "Automatic parent updates are OFF — click to enable"}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${s.parent_update_enabled ? "bg-status-complete" : "bg-gray-300"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.parent_update_enabled ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {s.account_username ? (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          s.account_status === "approved" ? "bg-green-100 text-green-700" :
                          s.account_status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
                        }`}>
                          @{s.account_username}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">no account</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {s.last_active ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-text-muted" />
                          {formatDistanceToNow(new Date(s.last_active.replace(" ", "T")))} ago
                        </span>
                      ) : <span className="text-xs text-text-muted">never</span>}
                    </td>
                    <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()} ref={dropdownRef}>
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === s.id ? null : s.id)}
                        className="p-1 text-text-muted hover:text-text-primary rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openDropdownId === s.id && (
                        <div className="absolute right-6 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36 z-10">
                          <button
                            onClick={() => { setCurrentStudent(s); setFormData({ name: s.name, grade: s.grade, level: s.level }); setShowEditModal(true); setOpenDropdownId(null); }}
                            className="w-full flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-gray-50"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                          </button>
                          <button
                            onClick={() => { setCurrentStudent(s); setShowDeleteModal(true); setOpenDropdownId(null); }}
                            className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
          <div className="speakflow-card bg-white w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary flex items-center"><Users className="w-5 h-5 mr-2 text-text-muted" /> Add Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Student name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary" />
              <div className="grid grid-cols-2 gap-3">
                <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  {["Level 1", "Level 2", "Level 3"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-xl bg-accent-primary-dark text-white text-sm font-bold hover:bg-accent-primary disabled:opacity-60">
                {saving ? "Saving…" : "Add Student"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEditModal(false)}>
          <div className="speakflow-card bg-white w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary">Edit {currentStudent.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Student name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary" />
              <div className="grid grid-cols-2 gap-3">
                <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  {["Level 1", "Level 2", "Level 3"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-xl bg-accent-primary-dark text-white text-sm font-bold hover:bg-accent-primary disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="speakflow-card bg-white w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">Delete {currentStudent.name}?</h3>
            <p className="text-sm text-text-secondary mb-6">This removes the student and all their session history. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-text-secondary hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
