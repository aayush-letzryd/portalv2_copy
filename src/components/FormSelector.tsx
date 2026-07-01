import { ClipboardList, UserCheck, Settings, Key, LogOut, Truck, AlertTriangle } from "lucide-react";
import { User } from "../types";

interface FormSelectorProps {
  user: User;
  onSelectForm: (form: "walkin" | "onboarding" | "adjustment" | "allocation" | "expenses") => void;
  onLogout: () => void;
}

export default function FormSelector({ user, onSelectForm, onLogout }: FormSelectorProps) {
  // Extract initials for avatar
  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd logo" 
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted tracking-wider uppercase sm:inline-block">
              Operations Portal
            </span>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg/50 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white uppercase">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold text-text leading-tight">{user.name || user.username}</span>
                <span className="font-mono text-[10px] text-text-muted mt-0.5 leading-none">{user.role || "Executive"} · {user.executive_id || "-"}</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shadow-xs cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight">Select a Form</h1>
        </div>

        {/* Form Selection Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Walk-In Form (Active Card) */}
          <button
            onClick={() => onSelectForm("walkin")}
            className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white p-6 text-left shadow-sm hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary group-hover:scale-105 transition-transform duration-200">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Walk-In Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green uppercase tracking-wider">
              Live
            </span>
          </button>

          {/* Driver Onboarding Form (Active Card) */}
          <button
            onClick={() => onSelectForm("onboarding")}
            className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white p-6 text-left shadow-sm hover:border-green hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-light text-green group-hover:scale-105 transition-transform duration-200">
              <UserCheck className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Onboarding Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green uppercase tracking-wider">
              Live
            </span>
          </button>

          {/* Adjustment Form (Active Card) */}
          <button
            onClick={() => onSelectForm("adjustment")}
            className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white p-6 text-left shadow-sm hover:border-amber-500 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-light text-amber-600 group-hover:scale-105 transition-transform duration-200">
              <Settings className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Adjustment Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green uppercase tracking-wider">
              Live
            </span>
          </button>

          {/* Allocation Form (Active Card) */}
          <button
            onClick={() => onSelectForm("allocation")}
            className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white p-6 text-left shadow-sm hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-primary group-hover:scale-105 transition-transform duration-200">
              <Key className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Allocation Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green uppercase tracking-wider">
              Live
            </span>
          </button>

          {/* Expenses Form (Active Card) */}
          <button
            onClick={() => onSelectForm("expenses")}
            className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white p-6 text-left shadow-sm hover:border-rose-500 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:scale-105 transition-transform duration-200">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Expenses Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green uppercase tracking-wider">
              Live
            </span>
          </button>

          {/* Vehicle Onboarding Form (Disabled Card) */}
          <div className="relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white/60 p-6 opacity-60">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Vehicle Onboarding</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Coming Soon
            </span>
          </div>

          {/* Accidents Form (Disabled Card) */}
          <div className="relative flex flex-col items-start gap-4 rounded-xl border border-border bg-white/60 p-6 opacity-60">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold text-gray-900 mb-1">Accidents Form</h3>
            </div>
            <span className="absolute top-4 right-4 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Coming Soon
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-xs text-white/50 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold text-white/80">LetzRyd Operations Management</span>
          <span>© Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
