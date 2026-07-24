import { ClipboardList, UserCheck, Settings, Key, LogOut, Truck, AlertTriangle, Wrench, MapPin, IndianRupee, Users, ShieldCheck, TicketIcon, UserCircle, Lock } from "lucide-react";
import { User } from "../types";

interface FormSelectorProps {
  user: User;
  onSelectForm: (form: "walkin" | "onboarding" | "operator_onboarding" | "adjustment" | "allocation" | "expenses" | "vehicle_onboarding" | "workshops" | "hubs_parking" | "rents" | "accident" | "inspection" | "users" | "vehicle_models" | "cities" | "roles" | "tickets" | "employees" | "maintenance" | "challans") => void;
  onLogout: () => void;
}

// Defining RBAC arrays
const WRITE_ACCESS_ROLES = ["SA", "BH", "CM", "DM", "OB"];
const ALL_ROLES = ["SA", "BH", "CM", "DM", "OB", "SP"];

const CARDS = [
  { key: "walkin",              label: "Lead Generation Form",   sub: "Log walk-in enquiries",               icon: ClipboardList, iconBg: "bg-blue-50",    iconColor: "text-primary",     hover: "hover:border-primary",     allowedRoles: ALL_ROLES },
  { key: "onboarding",          label: "Individual Onboarding",  sub: "Onboard new drivers to the fleet",    icon: UserCheck,     iconBg: "bg-green-light", iconColor: "text-green",       hover: "hover:border-green",       allowedRoles: WRITE_ACCESS_ROLES },
  { key: "operator_onboarding", label: "Operator Onboarding",    sub: "Register new fleet partners",         icon: UserCheck,     iconBg: "bg-blue-50",    iconColor: "text-primary",     hover: "hover:border-blue-500",    allowedRoles: WRITE_ACCESS_ROLES },
  { key: "adjustment",          label: "Adjustment Form",        sub: "Credit / debit wallet adjustments",   icon: Settings,      iconBg: "bg-yellow-light",iconColor: "text-amber-600",   hover: "hover:border-amber-500",   allowedRoles: ALL_ROLES },
  { key: "allocation",          label: "Allocation Form",        sub: "Assign vehicles to drivers",          icon: Key,           iconBg: "bg-slate-100",  iconColor: "text-primary",     hover: "hover:border-primary",     allowedRoles: ALL_ROLES },
  { key: "expenses",            label: "Expenses Form",          sub: "Record operational expenses",         icon: ClipboardList, iconBg: "bg-red-50",     iconColor: "text-red-600",     hover: "hover:border-rose-500",    allowedRoles: ALL_ROLES },
  { key: "vehicle_onboarding",  label: "Vehicle Onboarding",     sub: "Add vehicles to the fleet registry",  icon: Truck,         iconBg: "bg-blue-50",    iconColor: "text-primary",     hover: "hover:border-primary",     allowedRoles: WRITE_ACCESS_ROLES },
  { key: "workshops",           label: "Workshops Form",         sub: "Manage service vendors & garages",    icon: Wrench,        iconBg: "bg-green-light", iconColor: "text-green",       hover: "hover:border-green",       allowedRoles: ALL_ROLES },
  { key: "hubs_parking",        label: "Hubs & Parking",         sub: "Track hub locations & parking slots", icon: MapPin,        iconBg: "bg-yellow-light",iconColor: "text-amber-600",   hover: "hover:border-amber-500",   allowedRoles: ALL_ROLES },
  { key: "rents",               label: "Rent Plans",             sub: "Configure driver rent & payment plans",icon: IndianRupee,   iconBg: "bg-blue-50",    iconColor: "text-blue-600",    hover: "hover:border-blue-500",    allowedRoles: ALL_ROLES },
  { key: "accident",            label: "Accidents Form",         sub: "Report & document vehicle accidents",  icon: AlertTriangle, iconBg: "bg-red-50",     iconColor: "text-red-600",     hover: "hover:border-red-500",     allowedRoles: ALL_ROLES },
  { key: "inspection",          label: "Vehicle Inspection",     sub: "Conduct & log vehicle inspections",   icon: ClipboardList, iconBg: "bg-blue-50",    iconColor: "text-primary",     hover: "hover:border-primary",     allowedRoles: ALL_ROLES },
  { key: "users",               label: "Portal Users",           sub: "Manage portal logins & credentials",  icon: Users,         iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  hover: "hover:border-indigo-500",  allowedRoles: ["SA"] },
  { key: "employees",           label: "Employees Desk",         sub: "Manage internal LetzRyd team members", icon: UserCircle,    iconBg: "bg-violet-50",  iconColor: "text-violet-600",  hover: "hover:border-violet-500",  allowedRoles: ["SA", "BH"] },
  { key: "vehicle_models",      label: "Vehicle Models Desk",    sub: "Fleet make, model & variant registry", icon: Truck,         iconBg: "bg-emerald-50", iconColor: "text-emerald-600", hover: "hover:border-emerald-500", allowedRoles: ALL_ROLES },
  { key: "cities",              label: "Operating Cities",       sub: "Manage cities where LetzRyd operates", icon: MapPin,        iconBg: "bg-sky-50",     iconColor: "text-sky-600",     hover: "hover:border-sky-500",     allowedRoles: ["SA", "BH", "CM"] },
  { key: "roles",               label: "Roles & Permissions",    sub: "Control form access by user role",    icon: ShieldCheck,   iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  hover: "hover:border-indigo-500",  allowedRoles: ["SA"] },
  { key: "tickets",             label: "Tickets Desk",           sub: "Driver, Operator, Vendor & Internal issues", icon: TicketIcon, iconBg: "bg-rose-50",   iconColor: "text-rose-600",    hover: "hover:border-rose-500",    allowedRoles: ALL_ROLES },
  { key: "maintenance",         label: "Maintenance Desk",       sub: "Log vehicle servicing & workshop lifecycles", icon: Wrench,     iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  hover: "hover:border-indigo-500",  allowedRoles: ALL_ROLES },
  { key: "challans",            label: "Traffic Challans",       sub: "Log fines, check disputes & track driver recovery", icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-600",   hover: "hover:border-red-500",     allowedRoles: ALL_ROLES },
] as const;

export default function FormSelector({ user, onSelectForm, onLogout }: FormSelectorProps) {
  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  let currentRoleCode = user.role_code;
  if (!currentRoleCode) {
    const roleStr = (user.role || "").toLowerCase();
    if (roleStr.includes("admin")) currentRoleCode = "SA"; // Super Admin
    else if (roleStr.includes("business head")) currentRoleCode = "BH";
    else if (roleStr.includes("city manager")) currentRoleCode = "CM";
    else if (roleStr.includes("driver manager")) currentRoleCode = "DM";
    else if (roleStr.includes("support")) currentRoleCode = "SP";
    else currentRoleCode = "OB"; // Default Onboarding Exec
  }

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
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Operations Portal
            </span>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {["SA", "BH", "CM"].includes(currentRoleCode) && (
              <button
                onClick={() => onSelectForm("approvals" as any)}
                className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 font-sans text-xs font-bold text-slate-900 hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
              >
                Approval Centre
              </button>
            )}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg/50 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-slate-900">
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
          {CARDS.map(({ key, label, sub, icon: Icon, iconBg, iconColor, hover, allowedRoles }) => {
            const hasAccess = allowedRoles.includes(currentRoleCode);

            return (
              <button
                key={key}
                onClick={() => hasAccess && onSelectForm(key as any)}
                disabled={!hasAccess}
                className={`group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-6 text-left shadow-sm transition-all duration-200 ${hasAccess ? `${hover} hover:shadow-md cursor-pointer` : 'opacity-60 bg-slate-50 cursor-not-allowed grayscale'}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconColor} ${hasAccess ? 'group-hover:scale-105' : ''} transition-transform duration-200`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-grow">
                  <h3 className="font-sans text-sm font-bold text-gray-900 mb-1 leading-tight">{label}</h3>
                  <p className="font-sans text-xs text-gray-500 leading-snug line-clamp-1">{sub}</p>
                </div>
                {hasAccess ? (
                  <span className="absolute top-4 right-4 rounded-md bg-green-light px-2.5 py-1 text-[10px] font-extrabold text-green">
                    Live
                  </span>
                ) : (
                  <span className="absolute top-4 right-4 rounded-md bg-slate-200 px-2 py-1.5 text-slate-500 shadow-inner">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-xs text-slate-900 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-bold text-slate-900">LetzRyd Operations Management</span>
          <span className="font-semibold text-slate-800">© Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}