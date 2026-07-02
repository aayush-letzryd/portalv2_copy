import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft
} from "lucide-react";
import { WalkInRecord, User as UserSession, CITIES, OnboardingOutcome, VisitorType } from "../types";
import CameraCapture from "./CameraCapture";

interface WalkInFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function WalkInForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: WalkInFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Header clock state simulated directly
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
  const [visitorType, setVisitorType] = useState<VisitorType>("Individual");
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [city, setCity] = useState("Hyderabad");
  const [operatingPlace, setOperatingPlace] = useState("");
  const [personName, setPersonName] = useState("");
  const [personNumber, setPersonNumber] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [visitingReason, setVisitingReason] = useState("");
  const [joinedStatus, setJoinedStatus] = useState<OnboardingOutcome>("Pending");
  const [remarks, setRemarks] = useState("");

  // Document Uploads / Camera State
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
  const [dlImage, setDlImage] = useState<string | null>(null);
  const [cameraActiveField, setCameraActiveField] = useState<"aadhaar" | "dl" | null>(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Top header quick search "Retrieve" state
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  // Initials for avatar
  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [records, setRecords] = useState<WalkInRecord[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, joined: 0, pending: 0, individuals: 0, operators: 0, conversionRate: 0 });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("visitor_type", filterType);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);
      queryParams.append("limit", "10"); // backend will increase to 50 if search is present
      
      const [recordsRes, statsRes] = await Promise.all([
        fetch(`/api/walkins?${queryParams.toString()}`, { headers }),
        fetch("/api/stats", { headers })
      ]);
      
      if (recordsRes.ok) setRecords(await recordsRes.json());
      if (statsRes.ok) {
        const s = await statsRes.json();
        setMetrics({
          total: s.total,
          joined: s.joined,
          pending: s.pending,
          individuals: s.individuals,
          operators: s.operators,
          conversionRate: s.conversion_rate
        });
      }
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterCity, filterType, filterStatus]);

  const handleDeleteRecord = async (id: number) => {
    try {
      const res = await fetch(`/api/walkins/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      await fetchData();
    } catch (e: any) {
      alert(e.message || "Error deleting record");
    }
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Standard phone check
    const cleanPhone = personNumber.trim();
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    // Aadhaar check if provided
    const cleanAadhaar = aadhaarNumber.replace(/\s/g, "");
    if (cleanAadhaar && !/^[0-9]{12}$/.test(cleanAadhaar)) {
      alert("Aadhaar Card must be exactly 12 digits.");
      return;
    }

    const payload = {
      visitor_type: visitorType,
      event_date: eventDate,
      city: city,
      operating_place: operatingPlace.trim() || undefined,
      person_name: personName.trim(),
      person_number: cleanPhone,
      dl_number: dlNumber.trim().toUpperCase(),
      aadhaar_number: cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : undefined,
      aadhaar_image: aadhaarImage || undefined,
      dl_image: dlImage || undefined,
      visiting_reason: visitingReason.trim(),
      joined_status: joinedStatus,
      remarks: remarks.trim() || undefined
    };

    const url = editingId ? `/api/walkins/${editingId}` : "/api/walkins";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("lr_token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save record");

      // Reset Form Fields
      resetForm();
      alert(editingId ? "Walk-In record updated successfully!" : "New Walk-In recorded successfully!");
      
      // Refresh data and jump to registry
      await fetchData();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error saving record");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setVisitorType("Individual");
    setEventDate(new Date().toISOString().split("T")[0]);
    setCity("Hyderabad");
    setOperatingPlace("");
    setPersonName("");
    setPersonNumber("");
    setDlNumber("");
    setAadhaarNumber("");
    setAadhaarImage(null);
    setDlImage(null);
    setVisitingReason("");
    setJoinedStatus("Pending");
    setRemarks("");
  };

  // Populate form for editing
  const loadRecordIntoForm = (record: WalkInRecord) => {
    setEditingId(record.id);
    setVisitorType(record.visitor_type);
    setEventDate(record.event_date);
    setCity(record.city);
    setOperatingPlace(record.operating_place || "");
    setPersonName(record.person_name);
    setPersonNumber(record.person_number);
    setDlNumber(record.dl_number);
    setAadhaarNumber(record.aadhaar_number || "");
    setAadhaarImage(record.aadhaar_image || null);
    setDlImage(record.dl_image || null);
    setVisitingReason(record.visiting_reason);
    setJoinedStatus(record.joined_status);
    setRemarks(record.remarks || "");

    setActiveTab("form");
  };

  // Retrieve handler (from top header search input)
  const handleRetrieveId = () => {
    const idNum = parseInt(retrieveIdInput.trim());
    if (!idNum) {
      alert("Please enter a valid numeric ID.");
      return;
    }
    const found = records.find(r => r.id === idNum);
    if (found) {
      loadRecordIntoForm(found);
      setRetrieveIdInput("");
    } else {
      alert(`Record with ID #${idNum} not found in database.`);
    }
  };

  // Handle Photo Capture Callback
  const handlePhotoCaptured = (base64: string) => {
    if (cameraActiveField === "aadhaar") {
      setAadhaarImage(base64);
    } else if (cameraActiveField === "dl") {
      setDlImage(base64);
    }
    setCameraActiveField(null);
  };

  // File Upload Helper (converts to base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "aadhaar" | "dl") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (field === "aadhaar") {
            setAadhaarImage(reader.result);
          } else {
            setDlImage(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No entries available to export.");
      return;
    }

    const headers = [
      "Record ID",
      "Date",
      "City Hub",
      "Operating Place",
      "Candidate Name",
      "Phone Number",
      "Driving License",
      "Aadhaar Number",
      "Visitor Classification",
      "Purpose of Visit",
      "Outcome Status",
      "Notes",
      "Executive Name"
    ];

    const rows = records.map((r) => [
      r.id,
      r.event_date,
      `"${r.city}"`,
      `"${r.operating_place || ""}"`,
      `"${r.person_name}"`,
      r.person_number,
      r.dl_number,
      r.aadhaar_number || "—",
      r.visitor_type,
      `"${r.visiting_reason}"`,
      r.joined_status,
      `"${r.remarks || ""}"`,
      `"${r.executive_name}"`
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `walkin_records_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER: Sticky Google/LetzRyd inspired header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Portal Info */}
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
              alt="LetzRyd" 
              className="h-7 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted tracking-wider uppercase sm:inline-block">
              Walk-In Form
            </span>
          </div>

          {/* Navigation Tab Pills */}
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
              Check-In Form
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "registry" 
                  ? "bg-primary text-white shadow-sm shadow-primary/20" 
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <Plus className="h-4 w-4" />
              Walk-In Registry
            </button>
          </nav>

          {/* Clock & Profile Pill */}
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
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name}</span>
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FORM CHECK-IN */}
        {activeTab === "form" && (
          <div className="mx-auto max-w-5xl flex flex-col gap-6">
            
            {/* Dark Brand Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-green/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white tracking-widest uppercase">
                      LetzRyd Desk
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/60 text-xs font-medium">Operations Portal</span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Record #${editingId}` : "Walk-In Form"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId && "Modifying existing registered walk-in entry. Submit form to update database."}
                  </p>
                </div>

                {/* Retrieve block */}
                <div className="flex flex-col gap-2 items-start md:items-end">
                  <div className="flex gap-2 w-full max-w-xs">
                    <input
                      type="number"
                      placeholder="Edit existing ID..."
                      value={retrieveIdInput}
                      onChange={(e) => setRetrieveIdInput(e.target.value)}
                      className="h-10 w-full rounded-lg bg-white/10 border border-white/15 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white focus:text-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleRetrieveId}
                      className="h-10 rounded-lg bg-green px-4 text-xs font-semibold text-white hover:bg-green/90 transition-colors tracking-wide cursor-pointer"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleFormSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              {/* Grid sections following design document: side-by-side bento column layout */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                
                {/* 1. Visit Categorization */}
                <div className="flex flex-col gap-5 border-b border-border/40 pb-6 md:border-b-0 md:pb-0">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                    Visit Categorization
                  </h3>

                  {/* Visitor Classification */}
                  <div className="flex flex-col gap-2">
                    <label className="font-sans text-xs font-semibold text-text-muted">
                      Visitor Classification <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setVisitorType("Individual")}
                        className={`flex h-11 items-center justify-center rounded-lg border font-sans text-xs font-semibold transition-all cursor-pointer ${
                          visitorType === "Individual"
                            ? "border-green bg-green-light/40 text-green"
                            : "border-border hover:bg-slate-50 text-text-muted"
                        }`}
                      >
                        Individual Walk-In
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitorType("Operator")}
                        className={`flex h-11 items-center justify-center rounded-lg border font-sans text-xs font-semibold transition-all cursor-pointer ${
                          visitorType === "Operator"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-slate-50 text-text-muted"
                        }`}
                      >
                        Operator Walk-In
                      </button>
                    </div>
                  </div>

                  {/* Date of Check-In */}
                  <div className="flex flex-col gap-2">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="event_date">
                      <Calendar className="h-3.5 w-3.5 text-text-dim" />
                      Date of Check-In <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="event_date"
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white"
                    />
                  </div>

                  {/* Operating City */}
                  <div className="flex flex-col gap-2">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="city">
                      <MapPin className="h-3.5 w-3.5 text-text-dim" />
                      Operating City (Hub) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white cursor-pointer"
                    >
                      {CITIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.text}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operating Place */}
                  <div className="flex flex-col gap-2">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="operating_place">
                      <MapPin className="h-3.5 w-3.5 text-text-dim" />
                      Operating Place
                    </label>
                    <input
                      id="operating_place"
                      type="text"
                      placeholder="Enter specific area/office location"
                      value={operatingPlace}
                      onChange={(e) => setOperatingPlace(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                    />
                  </div>
                </div>

                {/* 2. Candidate Information */}
                <div className="flex flex-col gap-5 border-b border-border/40 pb-6 md:border-b-0 md:pb-0">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                    Candidate Information
                  </h3>

                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="person_name">
                      <User className="h-3.5 w-3.5 text-text-dim" />
                      Person's Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="person_name"
                      type="text"
                      required
                      placeholder="Enter full legal name..."
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="person_number">
                      <Phone className="h-3.5 w-3.5 text-text-dim" />
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="person_number"
                      type="tel"
                      required
                      placeholder="10-digit Indian number"
                      value={personNumber}
                      onChange={(e) => setPersonNumber(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                    />
                    <span className="text-[10px] text-text-dim">Without country code (+91)</span>
                  </div>

                   {/* Driving License (Hidden for Operator, Optional for Individual) */}
                   {visitorType !== "Operator" && (
                     <div className="flex flex-col gap-1.5">
                       <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="dl_number">
                         <FileText className="h-3.5 w-3.5 text-text-dim" />
                         Driving License Number <span className="text-text-dim font-normal text-[10px]">(Optional)</span>
                       </label>
                       <input
                         id="dl_number"
                         type="text"
                         placeholder="e.g. TS09 20210045612"
                         value={dlNumber}
                         onChange={(e) => setDlNumber(e.target.value)}
                         className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                       />
                     </div>
                   )}

                  {/* Aadhaar (Optional) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted flex items-center gap-1" htmlFor="aadhaar_number">
                      <FileText className="h-3.5 w-3.5 text-text-dim" />
                      Aadhaar Card Number <span className="text-text-dim font-normal text-[10px]">(Optional)</span>
                    </label>
                    <input
                      id="aadhaar_number"
                      type="text"
                      placeholder="12-digit Aadhaar number"
                      maxLength={14} // to allow formatting spaces
                      value={aadhaarNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAadhaarNumber(val);
                      }}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                    />
                  </div>
                </div>

                {/* 3. Visit Purpose & Outcomes */}
                <div className="flex flex-col gap-5">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                    Visit Purpose & Outcomes
                  </h3>

                  {/* Visiting Reason */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="visiting_reason">
                      Visiting Reason <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="visiting_reason"
                      type="text"
                      required
                      placeholder="e.g. Onboarding, Enquiry, Support"
                      value={visitingReason}
                      onChange={(e) => setVisitingReason(e.target.value)}
                      className="h-11 rounded-lg border border-border px-3.5 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim"
                    />
                  </div>

                  {/* Onboarding Outcome */}
                  <div className="flex flex-col gap-2">
                    <label className="font-sans text-xs font-semibold text-text-muted">
                      Onboarding Outcome Status <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-col gap-2">
                      {(["Joined", "Pending", "Not Interested"] as OnboardingOutcome[]).map((status) => (
                        <label 
                          key={status} 
                          className={`flex items-center gap-3 rounded-lg border p-3 text-xs font-semibold cursor-pointer transition-all ${
                            joinedStatus === status 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-border hover:bg-slate-50 text-text-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name="joined_status"
                            checked={joinedStatus === status}
                            onChange={() => setJoinedStatus(status)}
                            className="h-4 w-4 border-border text-primary accent-primary"
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="remarks">
                      Remarks / Notes <span className="text-text-dim font-normal text-[10px]">(Optional)</span>
                    </label>
                    <textarea
                      id="remarks"
                      rows={3}
                      placeholder="Document action items, details..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="rounded-lg border border-border p-3 font-sans text-sm text-text outline-none focus:border-2 focus:border-primary bg-white placeholder:text-text-dim resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* 4. Secure Document Uploads (Optional, with real Camera captures) */}
              <div className="border-t border-border/60 pt-6">
                <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                  Secure Document Uploads (Optional)
                </h3>
                <p className="font-sans text-[11px] text-text-muted mb-4 max-w-xl">
                  Scan or photograph candidate credentials using the built-in webcam/mobile camera or upload existing image files.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Aadhaar Photo Card */}
                  <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                    <span className="font-sans text-xs font-semibold text-text-muted">Aadhaar Card Photo</span>
                    
                    {aadhaarImage ? (
                      <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
                        <img 
                          src={aadhaarImage} 
                          alt="Aadhaar Thumbnail" 
                          className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setAadhaarImage(null)}
                          className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3">
                        <div className="rounded-full bg-primary/10 p-3 text-primary">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="font-sans text-xs text-text-dim">No photo captured yet</span>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCameraActiveField("aadhaar")}
                            className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Capture Photo
                          </button>
                          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer">
                            <Upload className="h-3.5 w-3.5" />
                            Upload File
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, "aadhaar")}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                   {/* Driving License Photo Card (Hidden for Operator) */}
                   {visitorType !== "Operator" && (
                     <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                       <span className="font-sans text-xs font-semibold text-text-muted">Driving License Photo</span>
                       
                       {dlImage ? (
                         <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
                           <img 
                             src={dlImage} 
                             alt="DL Thumbnail" 
                             className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
                           />
                           <button
                             type="button"
                             onClick={() => setDlImage(null)}
                             className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3">
                           <div className="rounded-full bg-primary/10 p-3 text-primary">
                             <Camera className="h-5 w-5" />
                           </div>
                           <span className="font-sans text-xs text-text-dim">No photo captured yet</span>
                           <div className="flex gap-2.5">
                             <button
                               type="button"
                               onClick={() => setCameraActiveField("dl")}
                               className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer"
                             >
                               <Camera className="h-3.5 w-3.5" />
                               Capture Photo
                             </button>
                             <label className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer">
                               <Upload className="h-3.5 w-3.5" />
                               Upload File
                               <input 
                                 type="file" 
                                 accept="image/*" 
                                 className="hidden" 
                                 onChange={(e) => handleFileUpload(e, "dl")}
                               />
                             </label>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t border-border/40 pt-6">
                <div className="flex flex-col gap-1 max-w-sm">
                  <p className="text-[10px] font-bold text-red-500 uppercase">* means mandatory</p>
                </div>
                <div className="flex justify-end gap-3">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => { resetForm(); setActiveTab("registry"); }}
                      className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md shadow-primary/10 transition-colors cursor-pointer"
                  >
                    {editingId ? "Update Walk-In Entry" : "Save Walk-In Entry"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: WALK-IN REGISTRY DATABASE */}
        {activeTab === "registry" && (
          <div id="tab-registry-container" className="flex flex-col gap-8">
            
            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Card 1: Total Walk-Ins */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Total Walk-Ins
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {metrics.total}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-2">
                    <strong className="text-green font-semibold">{metrics.individuals}</strong> Individuals · <strong className="text-primary font-semibold">{metrics.operators}</strong> Operators
                  </span>
                </div>
                <div className="rounded-xl bg-teal-50/50 text-green p-3">
                  <User className="h-6 w-6" />
                </div>
              </div>

              {/* Card 2: Onboardings Completed */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Onboardings Completed
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-green mt-1">
                    {metrics.joined}
                  </span>
                  <span className="font-sans text-[10px] text-text-dim mt-2">
                    Added to active fleet list
                  </span>
                </div>
                <div className="rounded-xl bg-green-light/40 text-green p-3">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* Card 3: Conversion Rate */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex-grow flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Conversion Rate
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {metrics.conversionRate}%
                  </span>
                  {/* CSS progress bar */}
                  <div className="mt-3.5 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green rounded-full transition-all duration-500" 
                      style={{ width: `${metrics.conversionRate}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 text-text-muted p-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              {/* Card 4: Pending Follow-Ups */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Pending Follow-Ups
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-amber-500 mt-1">
                    {metrics.pending}
                  </span>
                  <span className="font-sans text-[10px] text-text-dim mt-2">
                    Requires document auditing
                  </span>
                </div>
                <div className="rounded-xl bg-amber-50 text-amber-500 p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

            </div>

            {/* Records Card */}
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
              
              {/* Header section with actions */}
              <div className="border-b border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-primary tracking-tight">Walk-In Records Database</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">
                    Review, search, audit, and follow up on incoming on-ground supply entries.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-text-muted transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab("form"); }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Add Walk-In
                  </button>
                </div>
              </div>

              {/* Filter Toolbars */}
              <div className="bg-slate-50/50 p-4 border-b border-border/50 grid grid-cols-1 gap-3 sm:grid-cols-4">
                
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input
                    type="text"
                    placeholder="Search candidate, phone, DL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border pl-9 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary"
                  />
                </div>

                {/* City Filter */}
                <div className="relative">
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">All Cities</option>
                    <option value="Hyderabad">Hyderabad Hub</option>
                    <option value="Bangalore">Bangalore Hub</option>
                    <option value="Mumbai">Mumbai Hub</option>
                  </select>
                </div>

                {/* Visitor Type Filter */}
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">All Visitor Types</option>
                    <option value="Individual">Individuals Only</option>
                    <option value="Operator">Operators Only</option>
                  </select>
                </div>

                {/* Outcome Status Filter */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">All Outcome Statuses</option>
                    <option value="Joined">Joined</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>

              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/60">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">Candidate Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">License &amp; Contact</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">Type &amp; Purpose</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">Hub Location</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">Recorded By</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="h-8 w-8 text-border-strong mb-2 opacity-50" />
                            <p className="font-semibold">No records found matching current criteria.</p>
                            <p className="text-xs">Adjust your search or filters to see more results.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const isDriver = r.visitor_type === "Individual";
                        
                        // outcome color pills
                        let statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                        if (r.joined_status === "Joined") {
                          statusColor = "bg-green-light border-green/20 text-green";
                        } else if (r.joined_status === "Not Interested") {
                          statusColor = "bg-red-50 border-red-100 text-red-600";
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">
                              #{r.id.toString().slice(-4)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-sm font-bold text-gray-900">{r.person_name}</div>
                              <div className="font-sans text-[10px] text-text-dim mt-0.5">Date: {r.event_date}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-semibold text-text">{r.person_number}</div>
                              <div className="font-mono text-[10px] text-text-dim mt-0.5">{r.dl_number}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                isDriver 
                                  ? "bg-green-light/40 text-green" 
                                  : "bg-blue-50 text-primary"
                              }`}>
                                {r.visitor_type}
                              </span>
                              <div className="font-sans text-[11px] text-text-muted mt-1.5 font-semibold">
                                {r.visiting_reason}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-sans text-xs font-semibold text-text">
                              {r.city}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-semibold text-text">{r.executive_name}</div>
                              <div className="font-mono text-[10px] text-text-dim mt-0.5">ID: {r.executive_id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                                {r.joined_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => loadRecordIntoForm(r)}
                                  className="rounded-lg p-1.5 border border-border bg-white text-text-muted hover:text-primary hover:bg-slate-50 transition-all cursor-pointer"
                                  title="Edit entry"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete the walk-in record for ${r.person_name}?`)) {
                                      handleDeleteRecord(r.id);
                                    }
                                  }}
                                  className="rounded-lg p-1.5 border border-border bg-white text-text-muted hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
                                  title="Delete entry"
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

              {/* Table footer */}
              <div className="bg-slate-50 p-4 border-t border-border/40 flex justify-between text-xs text-text-dim font-sans">
                <span>Showing {records.length} database entries</span>
                <span>Active Core: PostgreSQL Database</span>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Reusable Camera Overlay */}
      {cameraActiveField && (
        <CameraCapture
          title={`Capture ${cameraActiveField === "aadhaar" ? "Aadhaar Card" : "Driving License"} Photo`}
          onCapture={handlePhotoCaptured}
          onClose={() => setCameraActiveField(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-xs text-white/50 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd" 
              className="h-6 w-auto object-contain filter brightness-0 invert"
              referrerPolicy="no-referrer"
            />
            <span className="text-white/30">|</span>
            <span className="font-semibold text-white/80">Walk-In Operations Registry</span>
          </div>
          <span>LetzRyd © Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>

    </div>
  );
}
