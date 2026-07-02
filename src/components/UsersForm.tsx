import React, { useState, useEffect } from "react";
import { 
  Users, ArrowLeft, Trash2, Search, UserPlus, ShieldAlert,
  Info, CheckCircle, RefreshCw, Key, Eye, EyeOff, Edit
} from "lucide-react";
import { User as UserSession } from "../types";

interface UsersFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface AppUser {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string | null;
}

export default function UsersForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: UsersFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form Fields State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [revealedPasswordId, setRevealedPasswordId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Executive");
  const [customRole, setCustomRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Full Name is required");
    if (!username.trim()) return alert("Username is required");
    if (!editingId && !password.trim()) return alert("Password is required");

    const finalRole = role === "Other" ? customRole.trim() : role;
    if (!finalRole) return alert("Role is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PUT" : "POST";
      
      const payload: any = {
        name: name.trim(),
        role: finalRole,
        username: username.trim()
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "User account updated successfully!" : "User account created successfully!");
        // Reset form
        setName("");
        setRole("Executive");
        setCustomRole("");
        setUsername("");
        setPassword("");
        setEditingId(null);
        setActiveTab("registry");
      } else {
        alert(data.detail || "Failed to submit user account");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, targetUsername: string) => {
    if (user.id === id) {
       return alert("You cannot delete your own logged-in account!");
    }
    if (!confirm(`Are you sure you want to delete user "${targetUsername}"? This will disable their access immediately.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("User deleted successfully!");
        fetchRecords();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete user");
      }
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-bg">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToSelector}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text hover:bg-bg hover:text-primary transition-all cursor-pointer"
              title="Back to Selector"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-sans text-sm font-bold text-primary tracking-tight">Portal User Desk</span>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex rounded-xl bg-bg p-1">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === "form" 
                  ? "bg-white text-primary shadow-xs" 
                  : "text-text-muted hover:text-primary"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create Account
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === "registry" 
                  ? "bg-white text-primary shadow-xs" 
                  : "text-text-muted hover:text-primary"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              User Accounts Registry
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-widest">Logged In As</span>
              <span className="font-sans text-xs font-extrabold text-primary">{displayName}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-sans text-xs font-extrabold text-primary">
              {initials}
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex flex-col text-right">
              <span className="font-sans text-[9px] font-bold text-text-muted uppercase tracking-widest">IST Time</span>
              <span className="font-sans text-xs font-extrabold text-primary">{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "form" ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="bg-primary px-8 py-6 text-white flex items-center justify-between">
              <div>
                <h2 className="font-sans text-lg font-extrabold tracking-tight">
                  {editingId ? `Update User Account #${editingId}` : "Create User Account"}
                </h2>
                <p className="font-sans text-[11px] text-white/70 mt-1">
                  {editingId ? `Edit account details and roles for user @${username}` : "Register portal login access for executives and managers"}
                </p>
              </div>
              <Key className="h-8 w-8 text-white/20" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Name */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Anand Kumar..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Designation/Role <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Driver Relations Manager">Driver Relations Manager</option>
                    <option value="Onboarding Specialist">Onboarding Specialist</option>
                    <option value="Partner Onboarding Lead">Partner Onboarding Lead</option>
                    <option value="Regional Operations Manager">Regional Operations Manager</option>
                    <option value="Finance Team">Finance Team</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                {role === "Other" && (
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                      Custom Role Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Operations Assistant..."
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-6">
                <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-4 flex items-center gap-1.5">
                  Portal Login Credentials
                </h3>
                
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. anandkumar"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs lowercase"
                    />
                    <p className="font-sans text-[10px] text-text-muted mt-1">Only letters/numbers, lowercase, no spaces.</p>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                      Password {editingId ? "(Optional)" : <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="password" 
                      placeholder={editingId ? "Leave blank to keep existing password..." : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingId}
                      minLength={6}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                    <p className="font-sans text-[10px] text-text-muted mt-1">
                      {editingId ? "Leave empty to keep current password. Minimum 6 characters if editing." : "Minimum 6 characters recommended."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setName("");
                      setRole("Executive");
                      setCustomRole("");
                      setUsername("");
                      setPassword("");
                      setActiveTab("registry");
                    }}
                    className="flex-1 rounded-xl border border-border hover:bg-bg px-4 py-3 font-sans text-sm font-bold text-text transition-all cursor-pointer text-center"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${editingId ? 'flex-1 bg-amber-500 hover:bg-amber-600' : 'w-full bg-primary hover:bg-primary-hover'}`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {editingId ? "Update Portal User" : "Register Portal User"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border bg-slate-50/50 px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">User Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Manage existing portal login accounts and access levels</p>
                </div>

                <div className="flex flex-1 items-center max-w-md gap-3 md:justify-end">
                  <div className="relative w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search users by name, username, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <button 
                    onClick={fetchRecords}
                    disabled={isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-16 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-16 text-center">
                <Users className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No User Accounts Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Try modifying your query or register a new user account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">User ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Designation / Role</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Password</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Created On</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((r) => {
                      const isSelf = user.id === r.id;
                      const isRevealed = revealedPasswordId === r.id;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                          <td className="px-6 py-4 font-sans text-sm font-bold text-text">{r.name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-primary font-semibold">@{r.username}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              r.role === "Administrator" 
                                ? "bg-red-50 text-red-600 border border-red-200/50" 
                                : r.role === "Finance Team" 
                                ? "bg-amber-50 text-amber-600 border border-amber-200/50"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {r.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-text font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span>{isRevealed ? r.raw_password : "••••••••"}</span>
                              <button 
                                onClick={() => setRevealedPasswordId(isRevealed ? null : r.id)}
                                className="text-text-muted hover:text-primary transition-all focus:outline-none cursor-pointer"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-sans text-xs text-text-muted">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            }) : "-"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingId(r.id);
                                setName(r.name);
                                setUsername(r.username);
                                const commonRoles = ["Executive", "Driver Relations Manager", "Onboarding Specialist", "Partner Onboarding Lead", "Regional Operations Manager", "Finance Team", "Administrator"];
                                if (commonRoles.includes(r.role)) {
                                  setRole(r.role);
                                  setCustomRole("");
                                } else {
                                  setRole("Other");
                                  setCustomRole(r.role);
                                }
                                setPassword(""); // reset password input when editing
                                setActiveTab("form");
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-200/40 transition-all cursor-pointer"
                              title="Edit User Details & Password"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.username)}
                              disabled={isSelf}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={isSelf ? "Cannot delete yourself" : "Delete User Account"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex items-center justify-between text-xs text-text-muted">
              <span>Showing {filteredRecords.length} of {records.length} accounts</span>
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Passwords are fully hashed using bcrypt.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
