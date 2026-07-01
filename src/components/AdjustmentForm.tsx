import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, Settings, DollarSign
} from "lucide-react";
import { AdjustmentRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface AdjustmentFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function AdjustmentForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: AdjustmentFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  React.useEffect(() => {
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
  const [partnerName, setPartnerName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [driverId, setDriverId] = useState("");
  const [partnerNumber, setPartnerNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [partnerType, setPartnerType] = useState<"Individual" | "Fleet" | "Rental">("Individual");
  
  const [adjustmentType, setAdjustmentType] = useState<"Credit" | "Debit" | "Waiver">("Credit");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [enterAmount, setEnterAmount] = useState("");
  const [remittanceTowards, setRemittanceTowards] = useState("");
  const [adjustmentRelatedTo, setAdjustmentRelatedTo] = useState("");
  const [remarks, setRemarks] = useState("");

  const [firstLevelApprovalBy, setFirstLevelApprovalBy] = useState("");
  const [financeTeamStatus, setFinanceTeamStatus] = useState<"Approved" | "Pending" | "Rejected">("Pending");
  const [financeTeamRemarks, setFinanceTeamRemarks] = useState("");
  const [finalLevelApprovalBy, setFinalLevelApprovalBy] = useState("");
  const [status, setStatus] = useState<"Completed" | "Hold" | "Declined">("Hold");
  
  const [stats, setStats] = useState({
    total_adjustments: 0,
    total_amount: 0,
    approved_count: 0,
    completed_count: 0
  });

  // Proof Image State
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterAdjType, setFilterAdjType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [records, setRecords] = useState<AdjustmentRecord[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/adjustment/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/adjustment", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setPartnerName(data.partner_name || "");
      setPartnerCode(data.partner_code || "");
      setDriverId(data.driver_id || "");
      setPartnerNumber(data.partner_number || "");
      setVehicleNumber(data.vehicle_number || "");
      setCityName(data.city_name || "Hyderabad");
      setPartnerType(data.partner_type || "Individual");
      
      setAdjustmentType(data.adjustment_type || "Credit");
      setAdjustmentDate(data.adjustment_date || "");
      setEnterAmount(data.enter_amount || "");
      setRemittanceTowards(data.remittance_towards || "");
      setAdjustmentRelatedTo(data.adjustment_related_to || "");
      setRemarks(data.remarks || "");
      
      setFirstLevelApprovalBy(data.first_level_approval_by || "");
      setFinanceTeamStatus(data.finance_team_status || "Pending");
      setFinanceTeamRemarks(data.finance_team_remarks || "");
      setFinalLevelApprovalBy(data.final_level_approval_by || "");
      setStatus(data.status || "Hold");
      setPhoto(data.photo || null);
      
      setActiveTab("form");
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetrieveId = async () => {
    const id = parseInt(retrieveIdInput);
    if (!id || id <= 0) return alert("Please enter a valid numeric ID");
    await loadRecordForEdit(id);
  };

  const resetForm = () => {
    setEditingId(null);
    setPartnerName("");
    setPartnerCode("");
    setDriverId("");
    setPartnerNumber("");
    setVehicleNumber("");
    setCityName("Hyderabad");
    setPartnerType("Individual");
    
    setAdjustmentType("Credit");
    setAdjustmentDate(new Date().toISOString().split("T")[0]);
    setEnterAmount("");
    setRemittanceTowards("");
    setAdjustmentRelatedTo("");
    setRemarks("");
    
    setFirstLevelApprovalBy("");
    setFinanceTeamStatus("Pending");
    setFinanceTeamRemarks("");
    setFinalLevelApprovalBy("");
    setStatus("Hold");
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return alert("Partner Name is required");
    if (!partnerCode.trim()) return alert("Partner Code is required");
    if (!partnerNumber.trim()) return alert("Partner Number is required");
    if (!enterAmount || parseFloat(enterAmount) <= 0) return alert("Please enter a valid Amount");

    const payload = {
      partner_name: partnerName.trim(),
      partner_code: partnerCode.trim(),
      driver_id: driverId.trim() || null,
      partner_number: partnerNumber.trim(),
      vehicle_number: vehicleNumber.trim() || null,
      city_name: cityName,
      partner_type: partnerType,
      adjustment_type: adjustmentType,
      adjustment_date: adjustmentDate,
      enter_amount: enterAmount,
      remittance_towards: remittanceTowards.trim() || null,
      adjustment_related_to: adjustmentRelatedTo.trim() || null,
      remarks: remarks.trim() || null,
      first_level_approval_by: firstLevelApprovalBy.trim() || null,
      finance_team_status: financeTeamStatus,
      finance_team_remarks: financeTeamRemarks.trim() || null,
      final_level_approval_by: finalLevelApprovalBy.trim() || null,
      status: status,
      photo: photo
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/adjustment/${editingId}` : "/api/adjustment";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to submit adjustment request");
      }

      alert(editingId ? "Adjustment Request Updated Successfully!" : "Adjustment Request Submitted Successfully!");
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the adjustment request for ${name}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Adjustment deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter and Search logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // City Filter
      if (filterCity !== "all" && r.city_name !== filterCity) return false;
      // Adjustment Type Filter
      if (filterAdjType !== "all" && r.adjustment_type !== filterAdjType) return false;
      // Status Filter
      if (filterStatus !== "all" && r.status !== filterStatus) return false;

      // Query Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.partner_name || "").toLowerCase().includes(q) ||
          (r.partner_code || "").toLowerCase().includes(q) ||
          (r.driver_id || "").toLowerCase().includes(q) ||
          (r.partner_number || "").includes(q) ||
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterCity, filterAdjType, filterStatus]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Partner Name", "Partner Code", "Driver ID", "Partner Number", 
      "Vehicle Number", "City", "Partner Type", "Adjustment Type", "Date", 
      "Amount", "Remittance Towards", "Related To", "Remarks", 
      "1st Level Approval", "Finance Status", "Finance Remarks", "Final Approval", "Status", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.partner_name.replace(/"/g, '""')}"`,
      `"${r.partner_code.replace(/"/g, '""')}"`,
      r.driver_id || "",
      r.partner_number,
      r.vehicle_number || "",
      r.city_name,
      r.partner_type,
      r.adjustment_type,
      r.adjustment_date,
      r.enter_amount,
      `"${(r.remittance_towards || "").replace(/"/g, '""')}"`,
      `"${(r.adjustment_related_to || "").replace(/"/g, '""')}"`,
      `"${(r.remarks || "").replace(/"/g, '""')}"`,
      r.first_level_approval_by || "",
      r.finance_team_status,
      `"${(r.finance_team_remarks || "").replace(/"/g, '""')}"`,
      r.final_level_approval_by || "",
      r.status,
      r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_adjustments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBackToSelector}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
              title="Back to Form Selector"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted tracking-wider uppercase sm:inline-block">
              Adjustment
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "form"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <FileText className="h-4 w-4" />
              Adjustment Form
            </button>
            <button
              onClick={() => {
                setActiveTab("registry");
                fetchStats();
                fetchRecords();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "registry"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <Settings className="h-4 w-4" />
              Adjustment Registry
            </button>
          </nav>

          {/* Clock & User Profile */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim tracking-wider uppercase">Current Time (IST)</span>
              <span className="font-mono text-xs font-extrabold text-green">{currentTime}</span>
            </div>
            
            <span className="h-5 border-l border-border" />
            
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white uppercase">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{displayName}</span>
                {user.executive_id && <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id}</span>}
              </div>
            </div>

            <span className="h-5 border-l border-border" />

            <button 
              onClick={onLogout}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {activeTab === "form" ? (
          <div>
            {/* Form card header */}
            <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
              
              <div className="bg-primary text-white px-8 py-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-hover via-primary to-primary opacity-60" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden w-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase backdrop-blur-sm">
                        LetzRyd Desk
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Adjustment Record #${editingId}` : "Adjustment Form"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="number" 
                        placeholder="Edit existing record (ID)..." 
                        value={retrieveIdInput}
                        onChange={(e) => setRetrieveIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRetrieveId()}
                        className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-white/50 backdrop-blur-md outline-none transition-all focus:border-white focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                      />
                      <button 
                        onClick={handleRetrieveId}
                        className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-green hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Retrieve
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 3 COLUMN DETAILS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  
                  {/* COLUMN 1: PARTNER DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Partner Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Partner Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter full name..."
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Partner Code <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Unique LetzRyd ID..."
                          value={partnerCode}
                          onChange={(e) => setPartnerCode(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Driver ID (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Enter Driver ID if applicable..."
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Partner Number <span className="text-red-500">*</span></label>
                        <input 
                          type="tel" 
                          placeholder="+91 10-digit mobile..."
                          value={partnerNumber}
                          onChange={(e) => setPartnerNumber(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Vehicle Number (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. TS09 EA 1234..."
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">City Name <span className="text-red-500">*</span></label>
                        <select 
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          {CITIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.text}</option>
                          ))}
                          <option value="Chennai">Chennai</option>
                          <option value="Delhi">Delhi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Partner Type <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Individual", "Fleet", "Rental"].map((type) => (
                            <label key={type} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="partnerType" 
                                checked={partnerType === type}
                                onChange={() => setPartnerType(type as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: ADJUSTMENT DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Adjustment Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Adjustment Type <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Credit", "Debit", "Waiver"].map((type) => (
                            <label key={type} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="adjustmentType" 
                                checked={adjustmentType === type}
                                onChange={() => setAdjustmentType(type as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Adjustment Date <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={adjustmentDate}
                          onChange={(e) => setAdjustmentDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Enter Amount (₹) <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={enterAmount}
                          onChange={(e) => setEnterAmount(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Remittance Towards (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Reason for remittance..."
                          value={remittanceTowards}
                          onChange={(e) => setRemittanceTowards(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Adjustment Related To (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Maintenance, Tolls, Penalty..."
                          value={adjustmentRelatedTo}
                          onChange={(e) => setAdjustmentRelatedTo(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Detailed Remarks</label>
                        <textarea 
                          placeholder="Enter detailed adjustment remarks here..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: FINANCE & APPROVALS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Finance & Approvals
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">First Level Approval By</label>
                        <input 
                          type="text" 
                          placeholder="Approver name..."
                          value={firstLevelApprovalBy}
                          onChange={(e) => setFirstLevelApprovalBy(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Finance Team Status <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Approved", "Pending", "Rejected"].map((fStatus) => (
                            <label key={fStatus} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="financeTeamStatus" 
                                checked={financeTeamStatus === fStatus}
                                onChange={() => setFinanceTeamStatus(fStatus as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {fStatus}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Finance Team Remarks (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Finance comments..."
                          value={financeTeamRemarks}
                          onChange={(e) => setFinanceTeamRemarks(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Final Level Approval By</label>
                        <input 
                          type="text" 
                          placeholder="Final approver name..."
                          value={finalLevelApprovalBy}
                          onChange={(e) => setFinalLevelApprovalBy(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Final Status <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Completed", "Hold", "Declined"].map((fStatus) => (
                            <label key={fStatus} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="finalStatus" 
                                checked={status === fStatus}
                                onChange={() => setStatus(fStatus as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {fStatus}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ATTACHMENT SECTION */}
                <div className="border-t border-border pt-10">
                  <div className="border-b border-border pb-3 mb-6">
                    <h3 className="font-sans text-sm font-bold text-primary uppercase tracking-wider">
                      4. Attachments & Proof
                    </h3>
                    <p className="font-sans text-xs text-text-muted mt-1">Upload any receipts, bills, or proof related to this adjustment.</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Capture Card */}
                    <div className="w-full md:w-80 rounded-2xl border border-dashed border-border bg-bg/30 p-6 text-center hover:bg-bg/50 transition-all shadow-2xs">
                      {photo ? (
                        <div className="relative inline-block">
                          <img 
                            src={photo} 
                            alt="Attachment Proof" 
                            className="h-32 w-auto object-cover rounded-xl border border-border shadow-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => setPhoto(null)}
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white border border-white hover:bg-red-700 shadow-xs cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="font-sans text-xs font-bold text-text-muted">No photo uploaded</p>
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => setCameraActive(true)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-sans text-xs font-bold text-white hover:bg-primary-hover shadow-xs cursor-pointer"
                            >
                              <Camera className="h-3 w-3" />
                              Capture
                            </button>
                            <label className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-bold text-text-muted hover:bg-bg cursor-pointer transition-colors shadow-2xs">
                              <Upload className="h-3 w-3" />
                              Upload
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-border pt-8">
                  <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
                    <p className="text-[10px] font-bold text-red-500 uppercase">* means mandatory</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto justify-end">
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-border bg-white px-6 py-3 font-sans text-xs font-bold text-text hover:bg-bg transition-colors shadow-2xs cursor-pointer"
                    >
                      Reset Form
                    </button>
                    <button 
                      type="submit"
                      className="rounded-xl bg-green px-6 py-3 font-sans text-xs font-bold text-white hover:bg-green-hover transition-colors shadow-xs cursor-pointer"
                    >
                      {editingId ? "Save Changes" : "Submit Request"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* REGISTRY REGISTRATION */
          <div className="space-y-10">
            
            {/* 4 STATS CARDS */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* CARD 1: Total Adjustments */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-widest block">Total Adjustments</span>
                  <span className="font-sans text-3xl font-extrabold text-primary tracking-tight block mt-1">{stats.total_adjustments}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Requests processed</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <Settings className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 2: Total Amount */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-widest block">Total Amount</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-600 tracking-tight block mt-1">₹{stats.total_amount.toLocaleString("en-IN")}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Net adjustment value</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-light text-amber-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 3: Approved By Finance */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-widest block">Approved By Finance</span>
                  <span className="font-sans text-3xl font-extrabold text-green tracking-tight block mt-1">{stats.approved_count}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Ready for settlement</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-light text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 4: Completed Status */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-widest block">Completed Status</span>
                  <span className="font-sans text-3xl font-extrabold text-indigo-600 tracking-tight block mt-1">{stats.completed_count}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Fully closed adjustments</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* TABLE & FILTER CARD */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border bg-white px-6 py-5">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-text tracking-tight">Adjustment Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Audit log of all adjustment requests, approval states, and proofs.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text hover:bg-bg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      resetForm();
                      setActiveTab("form");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 font-sans text-xs font-bold text-white hover:bg-green-hover transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Adjustment
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-border bg-bg/30 px-6 py-4">
                
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search name, code, vehicle..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="relative">
                  <select 
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Cities</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>

                <div className="relative">
                  <select 
                    value={filterAdjType}
                    onChange={(e) => setFilterAdjType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                    <option value="Waiver">Waiver</option>
                  </select>
                </div>

                <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="Completed">Completed</option>
                    <option value="Hold">Hold</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/50 select-none">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left w-16">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">Partner Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">Contact & Driver</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">City & Vehicle</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">Approvals</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-left">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted tracking-wider uppercase text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-text-muted font-sans text-xs">
                          No matching adjustment records found in the database.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        return (
                          <tr key={r.id} className="hover:bg-bg/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{r.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.partner_name}</div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">{r.partner_code} · {r.partner_type}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.partner_number}</div>
                              {r.driver_id && <div className="font-mono text-[10px] text-text-muted mt-0.5">Driver ID: #{r.driver_id}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-extrabold text-primary">₹{parseFloat(r.enter_amount).toLocaleString("en-IN")}</div>
                              <span className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold mt-1 uppercase ${
                                r.adjustment_type === "Credit" ? "bg-green-light text-green" :
                                r.adjustment_type === "Debit" ? "bg-red-50 text-red-600 border border-red-100" :
                                "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}>
                                {r.adjustment_type}
                              </span>
                              <div className="font-sans text-[9px] text-text-muted mt-1">{r.adjustment_date}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.city_name}</div>
                              {r.vehicle_number && <div className="font-mono text-[10px] text-text-muted mt-0.5">{r.vehicle_number}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                                r.finance_team_status === "Approved" ? "bg-green/10 text-green" :
                                r.finance_team_status === "Rejected" ? "bg-red-100 text-red-700" :
                                "bg-amber-100 text-amber-700"
                              }`}>
                                {r.finance_team_status}
                              </span>
                              {r.final_level_approval_by && (
                                <div className="font-sans text-[9px] text-text-muted mt-1">By: {r.final_level_approval_by}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                                r.status === "Completed" ? "bg-green-500 text-white" :
                                r.status === "Declined" ? "bg-red-600 text-white" :
                                "bg-yellow-500 text-white"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                  title="Edit Adjustment"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.partner_name)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Adjustment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER STATS */}
              <div className="flex items-center justify-between border-t border-border bg-bg/20 px-6 py-4 font-sans text-xs text-text-muted">
                <span>Showing {filteredRecords.length} of {records.length} database entries</span>
                <span className="font-mono">Database Engine: PostgreSQL</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {cameraActive && (
        <CameraCapture 
          onCapture={(base64) => {
            setPhoto(base64);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* FOOTER SECTION */}
      <footer className="bg-primary py-8 text-center text-xs text-white/50 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd" 
              className="h-6 w-auto brightness-0 invert"
            />
             <span className="font-semibold text-white/80">LetzRyd Adjustment Desk</span>
          </div>
          <span>© Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
