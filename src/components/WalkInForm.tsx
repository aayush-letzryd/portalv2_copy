import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, ChevronRight
} from "lucide-react";
import { WalkInRecord, User as UserSession, CITIES, OnboardingOutcome } from "../types";
import CameraCapture from "./CameraCapture";

interface WalkInFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

// Minimal hook to debounce search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// MASKING FUNCTION (Req 9): Masks all but the last 4 digits of sensitive IDs
const maskSensitiveID = (idString: string | null | undefined) => {
  if (!idString) return "—";
  const cleanStr = idString.replace(/\s/g, ''); // Remove spaces
  if (cleanStr.length <= 4) return cleanStr;
  return "*".repeat(cleanStr.length - 4) + cleanStr.slice(-4);
};

export default function WalkInForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: WalkInFormProps) {
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
  
  const [enquiryDate, setEnquiryDate] = useState<string>("");
  const [enquiryTime, setEnquiryTime] = useState<string>("");
  const [visitingReason, setVisitingReason] = useState<string>("Onboarding");
  
  const [city, setCity] = useState("Hyderabad");
  const [personNumber, setPersonNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  
  const [interestedPosition, setInterestedPosition] = useState<string>("Driver");
  const [modeOfEnquiry, setModeOfEnquiry] = useState<string>("In-person Visit");
  
  const [referredByName, setReferredByName] = useState("");
  const [referredByPhone, setReferredByPhone] = useState("");

  const [joinedStatus, setJoinedStatus] = useState<OnboardingOutcome>("Onboarding Process Initiated");
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
  const [filterTimePeriod, setFilterTimePeriod] = useState("beginning_of_month");
  
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Quick Search for "Retrieve"
  const [searchRetrieveQuery, setSearchRetrieveQuery] = useState("");
  const debouncedRetrieveQuery = useDebounce(searchRetrieveQuery, 500);
  const [retrieveResults, setRetrieveResults] = useState<any[]>([]);
  const [isRetrieveFocused, setIsRetrieveFocused] = useState(false);

  // Initials for avatar
  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const [records, setRecords] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, joined: 0, pending: 0, individuals: 0, operators: 0, conversionRate: 0 });

  // Init defaults
  useEffect(() => {
    if (!editingId && !enquiryDate) {
      const now = new Date();
      setEnquiryDate(now.toISOString().split("T")[0]);
      setEnquiryTime(now.toTimeString().slice(0, 5));
    }
  }, [editingId, enquiryDate]);

  // AUTO-FILL & DUPLICATE LOGIC (Req 2 & 11)
  useEffect(() => {
    const checkExistingPhone = async () => {
      const cleanPhone = personNumber.replace(/\D/g, "");
      // Only check when exactly 10 digits are typed and we are not currently editing an old record
      if (cleanPhone.length === 10 && !editingId) {
        try {
          const token = localStorage.getItem("lr_token");
          const res = await fetch(`/api/walkins/search?q=${cleanPhone}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (data && data.length > 0) {
            const match = data[0]; // Take the most recent match
            
            // Pre-fill fields automatically
            setFirstName(match.first_name || match.person_name?.split(" ")[0] || "");
            setLastName(match.last_name || match.person_name?.split(" ").slice(1).join(" ") || "");
            if (match.dl_number) setDlNumber(match.dl_number);
            if (match.aadhaar_number) setAadhaarNumber(match.aadhaar_number);
            if (match.city) setCity(match.city);
            
            // Duplicate Warning check
            if (match.joined_status === "Successfully Onboarded") {
              alert(`Already filled: A record for ${match.person_name || 'this candidate'} is already fully onboarded in the system.`);
            } else {
              alert(`Candidate found! Details have been auto-filled from previous visit.`);
            }
          }
        } catch (e) {
          console.error("Error auto-filling candidate details", e);
        }
      }
    };
    
    // Slight debounce so it doesn't trigger on every single keystroke if they type fast
    const timeoutId = setTimeout(() => {
      checkExistingPhone();
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [personNumber, editingId]);

  const fetchData = async (pageNum = 1) => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("visitor_type", filterType);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);
      if (filterTimePeriod !== "all") queryParams.append("time_period", filterTimePeriod);
      queryParams.append("page", pageNum.toString());
      queryParams.append("limit", "10");
      
      const [recordsRes, statsRes] = await Promise.all([
        fetch(`/api/walkins?${queryParams.toString()}`, { headers }),
        fetch("/api/stats", { headers })
      ]);
      
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data.items || []);
        setTotalRecords(data.total || 0);
      }
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

  useEffect(() => {
    fetchData(page);
  }, [searchQuery, filterCity, filterType, filterStatus, filterTimePeriod, page]);

  useEffect(() => {
    if (debouncedRetrieveQuery.trim().length > 1) {
      fetch(`/api/walkins/search?q=${encodeURIComponent(debouncedRetrieveQuery)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      })
      .then(res => res.json())
      .then(data => setRetrieveResults(data || []))
      .catch(() => setRetrieveResults([]));
    } else {
      setRetrieveResults([]);
    }
  }, [debouncedRetrieveQuery]);

  const handleDeleteRecord = async (id: number) => {
    try {
      const res = await fetch(`/api/walkins/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      await fetchData(page);
    } catch (e: any) {
      alert(e.message || "Error deleting record");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanPhone = "";
    if (visitingReason === "Onboarding" || personNumber) {
        cleanPhone = personNumber.trim();
        if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
            alert("Please enter a valid 10-digit Indian phone number.");
            return;
        }
    }

    let cleanAadhaar = "";
    if (visitingReason === "Onboarding" && aadhaarNumber) {
        cleanAadhaar = aadhaarNumber.replace(/\s/g, "");
        if (cleanAadhaar && !/^[0-9]{12}$/.test(cleanAadhaar)) {
            alert("Aadhaar Card must be exactly 12 digits.");
            return;
        }
    }

    const payload = {
      visitor_type: interestedPosition,
      event_date: enquiryDate,
      enquiry_time: enquiryTime,
      city: city,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      person_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      person_number: cleanPhone || undefined,
      dl_number: visitingReason === "Onboarding" ? dlNumber.trim().toUpperCase() : undefined,
      aadhaar_number: visitingReason === "Onboarding" && cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : undefined,
      aadhaar_image: visitingReason === "Onboarding" ? (aadhaarImage || undefined) : undefined,
      dl_image: visitingReason === "Onboarding" ? (dlImage || undefined) : undefined,
      visiting_reason: visitingReason,
      mode_of_enquiry: modeOfEnquiry,
      referred_by_name: modeOfEnquiry === "Referral" ? (referredByName.trim() || undefined) : undefined,
      referred_by_phone: modeOfEnquiry === "Referral" ? (referredByPhone.trim() || undefined) : undefined,
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

      resetForm();
      alert(editingId ? "Walk-In record updated successfully!" : "New Walk-In recorded successfully!");
      
      await fetchData(1);
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error saving record");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    const now = new Date();
    setEnquiryDate(now.toISOString().split("T")[0]);
    setEnquiryTime(now.toTimeString().slice(0, 5));
    setVisitingReason("Onboarding");
    setCity("Hyderabad");
    setFirstName("");
    setLastName("");
    setPersonNumber("");
    setDlNumber("");
    setAadhaarNumber("");
    setAadhaarImage(null);
    setDlImage(null);
    setInterestedPosition("Driver");
    setModeOfEnquiry("In-person Visit");
    setReferredByName("");
    setReferredByPhone("");
    setJoinedStatus("Onboarding Process Initiated");
    setRemarks("");
  };

  const fetchRecordDetailsForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/${id}`, { headers: { "Authorization": `Bearer ${token}` }});
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      loadRecordIntoForm(data, id);
      setSearchRetrieveQuery("");
      setRetrieveResults([]);
      setIsRetrieveFocused(false);
    } catch (e) {
      alert("Error loading record details");
    }
  };

  const loadRecordIntoForm = (record: any, id: number) => {
    setEditingId(id);
    setInterestedPosition(record.visitor_type || "Driver");
    setEnquiryDate(record.event_date || "");
    setEnquiryTime(record.enquiry_time || "");
    setCity(record.city || "Hyderabad");
    setFirstName(record.first_name || record.person_name?.split(" ")[0] || "");
    setLastName(record.last_name || record.person_name?.split(" ").slice(1).join(" ") || "");
    setPersonNumber(record.person_number || "");
    setDlNumber(record.dl_number || "");
    setAadhaarNumber(record.aadhaar_number || "");
    setAadhaarImage(record.aadhaar_image || null);
    setDlImage(record.dl_image || null);
    setVisitingReason(record.visiting_reason || "Onboarding");
    setModeOfEnquiry(record.mode_of_enquiry || "In-person Visit");
    setReferredByName(record.referred_by_name || "");
    setReferredByPhone(record.referred_by_phone || "");
    setJoinedStatus(record.joined_status || "Onboarding Process Initiated");
    setRemarks(record.remarks || "");

    setActiveTab("form");
  };

  const handlePhotoCaptured = (base64: string) => {
    if (cameraActiveField === "aadhaar") {
      setAadhaarImage(base64);
    } else if (cameraActiveField === "dl") {
      setDlImage(base64);
    }
    setCameraActiveField(null);
  };

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

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No entries available to export.");
      return;
    }

    const headers = [
      "Walk-in ID", "Enquiry Date", "Enquiry Time", "City Hub", "First Name", "Last Name",
      "Phone Number", "Driving License", "Aadhaar Number", "Interested Position", 
      "Visiting Reason", "Mode of Enquiry", "Outcome Status", "Executive Name"
    ];

    const rows = records.map((r) => [
      r.id, r.event_date, r.enquiry_time, `"${r.city_name}"`, `"${r.first_name || ''}"`, `"${r.last_name || ''}"`,
      r.person_number, r.dl_number, maskSensitiveID(r.aadhaar_number), r.visitor_type,
      `"${r.visiting_reason}"`, `"${r.mode_of_enquiry}"`, r.joined_status, `"${r.executive_name}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `walkin_records_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalRecords / 10) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onBackToSelector}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd" 
              className="h-7 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">Walk-In Form</span>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-slate-900" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" /> Walk-In Form
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-slate-900" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              Walk-In Registry
            </button>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-mono text-xs font-extrabold text-primary">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-slate-900">{initials}</div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name}</span>
              </div>
            </div>
            <span className="h-5 border-l border-border" />
            <button onClick={onLogout} className="flex h-8 items-center px-2.5 text-xs text-text-muted hover:text-red-600 transition-colors cursor-pointer">Sign Out</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FORM */}
        {activeTab === "form" && (
          <div className="mx-auto max-w-5xl flex flex-col gap-6">
            
            <div className="relative overflow-visible rounded-2xl bg-primary p-6 text-slate-900 shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-white/20 to-transparent pointer-events-none rounded-2xl" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-white/40 px-2 py-0.5 text-[9px] font-bold tracking-widest text-slate-900">LetzRyd Desk</span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold">{editingId ? `Edit Walk-in #${editingId}` : "Walk-In Form"}</h1>
                </div>

                <div className="relative w-full max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700" />
                    <input
                      type="text"
                      placeholder="Search to edit... (Name, Phone, ID)"
                      value={searchRetrieveQuery}
                      onChange={(e) => setSearchRetrieveQuery(e.target.value)}
                      onFocus={() => setIsRetrieveFocused(true)}
                      onBlur={() => setTimeout(() => setIsRetrieveFocused(false), 200)}
                      className="h-10 w-full rounded-lg bg-white/30 border border-white/50 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-700 outline-none focus:bg-white transition-all"
                    />
                  </div>
                  {isRetrieveFocused && retrieveResults.length > 0 && (
                    <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden flex flex-col max-h-64 overflow-y-auto">
                      {retrieveResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={() => fetchRecordDetailsForEdit(r.id)}
                          className="flex flex-col items-start px-4 py-3 border-b border-border hover:bg-green-50 transition-colors text-left"
                        >
                          <div className="flex justify-between w-full">
                            <span className="font-bold text-sm text-slate-900">#{r.id} - {r.first_name} {r.last_name}</span>
                            <span className="text-xs font-mono text-text-dim">{r.person_number}</span>
                          </div>
                          <span className="text-xs text-text-muted mt-1">{r.city}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                
                {/* Check-in info */}
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-slate-900 font-bold text-[10px]">1</div>
                    <h3 className="font-sans text-xs font-bold text-primary">Enquiry Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-semibold text-text-muted">Enquiry Date *</label>
                      <input type="date" required value={enquiryDate} onChange={(e) => setEnquiryDate(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-semibold text-text-muted">Enquiry Time *</label>
                      <input type="time" required value={enquiryTime} onChange={(e) => setEnquiryTime(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted">Visiting Reason *</label>
                    <select required value={visitingReason} onChange={(e) => setVisitingReason(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary">
                      <option value="Onboarding">Onboarding</option>
                      <option value="Enquiry">Enquiry</option>
                      <option value="Complaints">Complaints</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted">Operating City *</label>
                    <select required value={city} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary">
                      {CITIES.map((c) => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>
                  </div>
                </div>

                {/* Person info */}
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-slate-900 font-bold text-[10px]">2</div>
                    <h3 className="font-sans text-xs font-bold text-primary">Candidate Information</h3>
                  </div>
                  
                  {/* PHONE MOVED TO THE TOP FOR AUTO-FILL (Req 10) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-text-muted flex justify-between">
                      <span>Phone Number *</span>
                      <span className="text-[10px] text-primary italic font-bold">Will auto-fill if candidate exists</span>
                    </label>
                    <input type="tel" placeholder="Enter 10-digit number" required value={personNumber} onChange={(e) => setPersonNumber(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                  </div>

                  {(visitingReason === "Onboarding" || visitingReason !== "Onboarding") && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-text-muted">First Name *</label>
                          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-text-muted">Last Name *</label>
                          <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                        </div>
                      </div>
                    </>
                  )}

                  {visitingReason === "Onboarding" && (
                    <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-slate-50 border border-border rounded-xl">
                      <div className="col-span-2">
                        <h4 className="text-xs font-bold text-primary mb-3 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Documents (Optional)</h4>
                      </div>
                      
                      {/* Aadhaar group */}
                      <div className="flex flex-col gap-3 border-r border-border/50 pr-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-semibold text-text-muted">Aadhaar Number</label>
                          <input type="text" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="h-9 rounded border border-border px-2 text-xs outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-2 relative">
                          <label className="font-sans text-[10px] font-semibold text-text-muted">Aadhaar Image (Optional)</label>
                          {aadhaarImage ? (
                            <div className="relative">
                              <img src={aadhaarImage} alt="Aadhaar" className="w-full h-16 object-cover rounded border border-border" />
                              <button type="button" onClick={() => setAadhaarImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow cursor-pointer text-red-500 hover:bg-red-50"><X className="w-3 h-3"/></button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setCameraActiveField("aadhaar")} className="flex-1 bg-white hover:bg-slate-100 text-[10px] py-1.5 rounded text-center border border-border cursor-pointer transition-colors">Camera</button>
                              <label className="flex-1 bg-white hover:bg-slate-100 text-[10px] py-1.5 rounded text-center border border-border cursor-pointer transition-colors">
                                File <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "aadhaar")} />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DL group */}
                      <div className="flex flex-col gap-3 pl-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-semibold text-text-muted">DL Number</label>
                          <input type="text" value={dlNumber} onChange={(e) => setDlNumber(e.target.value)} className="h-9 rounded border border-border px-2 text-xs outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-2 relative">
                          <label className="font-sans text-[10px] font-semibold text-text-muted">DL Image (Optional)</label>
                          {dlImage ? (
                            <div className="relative">
                              <img src={dlImage} alt="DL" className="w-full h-16 object-cover rounded border border-border" />
                              <button type="button" onClick={() => setDlImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow cursor-pointer text-red-500 hover:bg-red-50"><X className="w-3 h-3"/></button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setCameraActiveField("dl")} className="flex-1 bg-white hover:bg-slate-100 text-[10px] py-1.5 rounded text-center border border-border cursor-pointer transition-colors">Camera</button>
                              <label className="flex-1 bg-white hover:bg-slate-100 text-[10px] py-1.5 rounded text-center border border-border cursor-pointer transition-colors">
                                File <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "dl")} />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

              {/* Status and Referrals */}
              <div className="flex flex-col gap-5">
                 <div className="flex items-center gap-2 border-b border-border pb-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-slate-900 font-bold text-[10px]">3</div>
                    <h3 className="font-sans text-xs font-bold text-primary">Classifications & Outcome</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 
                 <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-text-muted">Interested Position</label>
                        <select value={interestedPosition} onChange={(e) => setInterestedPosition(e.target.value)} className="h-10 rounded border border-border px-3 text-sm bg-white outline-none focus:border-primary">
                          <option value="Driver">Driver</option>
                          <option value="Operator">Operator</option>
                          <option value="Enquiry">Enquiry</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-text-muted">Mode of Enquiry</label>
                        <select 
                          value={modeOfEnquiry} 
                          onChange={(e) => {
                            setModeOfEnquiry(e.target.value);
                            if (e.target.value !== "Referral") {
                              setReferredByName("");
                              setReferredByPhone("");
                            }
                          }} 
                          className="h-10 rounded border border-border px-3 text-sm bg-white outline-none focus:border-primary"
                        >
                          <option value="In-person Visit">In-person Visit</option>
                          <option value="Enquiry on Phone">Enquiry on Phone</option>
                          <option value="Referral">Referral</option>
                        </select>
                      </div>
                    </div>

                    {modeOfEnquiry === "Referral" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-text-muted">Referred By (Name) *</label>
                          <input type="text" required value={referredByName} onChange={(e) => setReferredByName(e.target.value)} className="h-10 rounded border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-text-muted">Referred By (Phone) *</label>
                          <input type="tel" required value={referredByPhone} onChange={(e) => setReferredByPhone(e.target.value)} className="h-10 rounded border border-border px-3 text-sm bg-white outline-none focus:border-primary" />
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-semibold text-text-muted">Onboarding Outcome Status *</label>
                      <select required value={joinedStatus} onChange={(e) => setJoinedStatus(e.target.value as OnboardingOutcome)} className="h-10 rounded border border-border px-3 text-sm bg-white outline-none focus:border-primary">
                          <option value="Onboarding Process Initiated">Onboarding Process Initiated</option>
                          <option value="Successfully Onboarded">Successfully Onboarded</option>
                          <option value="Follow Up Required">Follow Up Required</option>
                          <option value="No Follow Up Required / Closed">No Follow Up Required / Closed</option>
                          <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-semibold text-text-muted">Remarks</label>
                      <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="rounded border border-border p-2 text-sm bg-white outline-none focus:border-primary resize-none" />
                    </div>
                 </div>

              </div>
           </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 pt-6 border-t border-border">
                <p className="text-[10px] font-bold text-red-500">* Mandatory Fields</p>
                <div className="flex gap-3">
                  {editingId && <button type="button" onClick={() => { resetForm(); setActiveTab("registry"); }} className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer">Cancel Edit</button>}
                  <button type="submit" className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-slate-900 px-6 font-sans text-sm font-semibold shadow-md cursor-pointer transition-colors">{editingId ? "Update Walk-In Entry" : "Save Walk-In Entry"}</button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: REGISTRY */}
        {activeTab === "registry" && (
          <div className="flex flex-col gap-8">

            {/* Filter Toolbars */}
            <div className="bg-white rounded-xl shadow-xs border border-border p-4 grid grid-cols-1 gap-3 sm:grid-cols-5 items-center">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Search candidate, phone, DL, ID..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setPage(1);}}
                  className="h-10 w-full rounded-lg border border-border pl-9 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="relative">
                <select value={filterTimePeriod} onChange={(e) => {setFilterTimePeriod(e.target.value); setPage(1);}} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Time</option>
                  <option value="beginning_of_month">This Month</option>
                  <option value="last_1_month">Last 1 Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="last_1_year">Last 1 Year</option>
                </select>
              </div>

              <div className="relative">
                <select value={filterCity} onChange={(e) => {setFilterCity(e.target.value); setPage(1);}} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Cities</option>
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                </select>
              </div>

              <div className="relative">
                <select value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setPage(1);}} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Statuses</option>
                  <option value="Onboarding Process Initiated">Onboarding Process Initiated</option>
                  <option value="Successfully Onboarded">Successfully Onboarded</option>
                  <option value="Follow Up Required">Follow Up Required</option>
                  <option value="No Follow Up Required / Closed">No Follow Up Required / Closed</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Total Walk-Ins</span>
                  <span className="font-sans text-3xl font-extrabold text-slate-900 mt-1">{metrics.total}</span>
                </div>
                <div className="rounded-xl bg-slate-100 text-slate-600 p-3"><User className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Successful onboardings</span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">{metrics.joined}</span>
                </div>
                <div className="rounded-xl bg-green-50 text-primary p-3"><CheckCircle className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex-grow flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Conversion Rate</span>
                  <span className="font-sans text-3xl font-extrabold text-slate-900 mt-1">{metrics.conversionRate}%</span>
                </div>
                <div className="rounded-xl bg-slate-100 text-slate-600 p-3"><ShieldCheck className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Pending Follow-Ups</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-500 mt-1">{metrics.pending}</span>
                </div>
                <div className="rounded-xl bg-amber-50 text-amber-500 p-3"><Clock className="h-6 w-6" /></div>
              </div>
            </div>

            {/* Records Card */}
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
              
              <div className="border-b border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900 tracking-tight">Walk-In Registry</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Search, Edit, Follow up and review on Walk-in leads</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportCSV} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-text-muted transition-colors cursor-pointer shadow-2xs"><Download className="h-4 w-4" /> Export CSV</button>
                  <button onClick={() => { resetForm(); setActiveTab("form"); }} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover px-4 font-sans text-xs font-semibold text-slate-900 transition-colors cursor-pointer shadow-xs"><Plus className="h-4 w-4" /> Add Walk-In</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/60">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Walk-in ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">City</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Contact</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Position</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Gov. IDs</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Recorded By</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim">Outcome Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">No records found.</td></tr>
                    ) : (
                      records.map((r) => {
                        let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                        if (r.joined_status === "Successfully Onboarded" || r.joined_status === "Joined" || r.joined_status === "Onboarded") statusColor = "bg-green-50 border-green-200 text-primary";
                        else if (r.joined_status === "Follow Up Required" || r.joined_status === "Pending") statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                        else if (r.joined_status === "Onboarding Process Initiated") statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                        else if (r.joined_status === "No Follow Up Required / Closed" || r.joined_status === "Not Interested") statusColor = "bg-red-50 border-red-100 text-red-600";

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">#{r.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-sm font-bold text-gray-900">{r.first_name ? `${r.first_name} ${r.last_name}`.trim() : (r.person_name || 'N/A')}</div>
                              <div className="font-sans text-[10px] text-text-dim">{r.event_date}</div>
                            </td>
                            <td className="px-6 py-4 font-sans text-xs font-bold text-slate-700 bg-slate-100/50 rounded">{r.city || r.city_name || '-'}</td>
                            <td className="px-6 py-4 font-sans text-xs font-semibold text-text">{r.person_number}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700">{r.visitor_type}</span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-text-muted font-semibold flex flex-col gap-1">
                               <span>DL: {maskSensitiveID(r.dl_number)}</span>
                               <span>ID: {maskSensitiveID(r.aadhaar_number)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-semibold text-text">{r.executive_name}</div>
                              <div className="font-mono text-[10px] text-text-dim">ID: {r.executive_id}</div>
                            </td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}>{r.joined_status}</span></td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex gap-2">
                                <button type="button" onClick={() => fetchRecordDetailsForEdit(r.id)} className="rounded-lg p-1.5 border border-border bg-white text-text-muted hover:text-primary hover:bg-slate-50 transition-all cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => { if (window.confirm('Delete this record?')) handleDeleteRecord(r.id); }} className="rounded-lg p-1.5 border border-border bg-white text-text-muted hover:text-rose-500 hover:bg-rose-50 border-rose-200 transition-all cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="bg-slate-50 p-4 border-t border-border/40 flex items-center justify-between text-xs font-sans">
                <span className="text-text-dim">Showing {(page-1)*10 + 1} - {Math.min(page*10, totalRecords)} of {totalRecords} records</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100"><ChevronLeft className="w-3 h-3 mr-1" /> Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalRecords === 0} className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100">Next <ChevronRight className="w-3 h-3 ml-1" /></button>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {cameraActiveField && (
        <CameraCapture
          title={`Capture ${cameraActiveField === "aadhaar" ? "Aadhaar" : "DL"} Photo`}
          onCapture={handlePhotoCaptured}
          onClose={() => setCameraActiveField(null)}
        />
      )}

      <footer className="bg-primary py-8 text-center text-xs font-bold text-slate-900 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>Walk-In Operations Registry</span>
          <span>LetzRyd © 2026</span>
        </div>
      </footer>
    </div>
  );
}