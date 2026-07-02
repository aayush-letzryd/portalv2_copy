import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, UserCheck, Database, IndianRupee
} from "lucide-react";
import { OnboardingRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface OnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function OnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: OnboardingFormProps) {
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

  const [vendorType, setVendorType] = useState<"Individual" | "Operator">("Individual");
  const [driverId, setDriverId] = useState("");
  const [customRentAmount, setCustomRentAmount] = useState("");
  const [sameAsDriver, setSameAsDriver] = useState(true);
  const [operatorDrivers, setOperatorDrivers] = useState<any[]>([]);

  const [linkedWalkinId, setLinkedWalkinId] = useState<number | null>(null);
  const [walkinSearchInput, setWalkinSearchInput] = useState("");
  const [driverName, setDriverName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [operatingPlace, setOperatingPlace] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [dlExpiryDate, setDlExpiryDate] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panAadhaarLinked, setPanAadhaarLinked] = useState("Yes");
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [otherBankName, setOtherBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [stats, setStats] = useState({
    total_onboarded: 0,
    vendor_count: 0,
    latest_onboarding: "-",
    last_7_days_count: 0
  });

  // Document Uploads / Camera State
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [dlFront, setDlFront] = useState<string | null>(null);
  const [dlBack, setDlBack] = useState<string | null>(null);
  const [panCardPhoto, setPanCardPhoto] = useState<string | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [cameraActiveField, setCameraActiveField] = useState<"selfie" | "dl_front" | "dl_back" | "pan" | "aadhaar" | null>(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [records, setRecords] = useState<OnboardingRecord[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/stats/onboarding", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Error fetching stats", e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      queryParams.append("limit", "10");
      
      const res = await fetch(`/api/onboarding?${queryParams.toString()}`, { headers });
      if (res.ok) setRecords(await res.json());
      fetchStats();
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterCity]);

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete onboarding record #${id}?`)) return;
    try {
      const res = await fetch(`/api/onboarding/${id}`, {
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

    const cleanPhone = phoneNumber.trim();
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (upiId && !/^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/.test(upiId)) {
      alert("Please enter a valid UPI ID (e.g. name@bank or phone@upi). It must contain '@'.");
      return;
    }

    const payload = {

      vendor_type: vendorType,
      driver_id: driverId,
      custom_rent_amount: customRentAmount,
      operator_drivers: vendorType === "Operator" ? operatorDrivers : [],

      driver_name: driverName.trim(),
      phone_number: cleanPhone,
      whatsapp_number: whatsappNumber.trim() || undefined,
      dob: dob,
      city: city,
      operating_place: operatingPlace.trim() || undefined,
      present_address: presentAddress.trim(),
      permanent_address: permanentAddress.trim(),
      emergency_name: emergencyName.trim(),
      emergency_phone: emergencyPhone.trim(),
      dl_number: dlNumber.trim().toUpperCase(),
      dl_expiry_date: dlExpiryDate,
      lead_source: leadSource.trim() || undefined,
      pan_number: panNumber.trim().toUpperCase(),
      aadhaar_number: aadhaarNumber.replace(/\s/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3"),
      pan_aadhaar_linked: panAadhaarLinked,
      selfie_photo: selfiePhoto || undefined,
      dl_front: dlFront || undefined,
      dl_back: dlBack || undefined,
      pan_card_photo: panCardPhoto || undefined,
      walkin_id: linkedWalkinId || undefined,
      vendor_name: vendorName.trim() || undefined,
      vendor_id: vendorId.trim() || undefined,
      aadhaar_card_photo: aadhaarPhoto || undefined,
      father_name: fatherName.trim(),
      bank_name: bankName || undefined,
      other_bank_name: otherBankName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      ifsc_code: ifscCode.trim().toUpperCase() || undefined,
      upi_id: upiId.trim().toLowerCase() || undefined,
    };

    try {
      const url = editingId ? `/api/onboarding/${editingId}` : "/api/onboarding";
      const method = editingId ? "PUT" : "POST";
      const token = localStorage.getItem("lr_token");
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to save record");
      }
      
      alert(`Onboarding form successfully ${editingId ? 'updated' : 'submitted'}!`);
      
      alert(`Onboarding form successfully ${editingId ? 'updated' : 'submitted'}!`);
      
      resetForm();
      fetchData();
      setActiveTab("registry");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setVendorType("Individual");
    setDriverId("");
    setCustomRentAmount("");
    setOperatorDrivers([]);

    setLinkedWalkinId(null);
    setWalkinSearchInput("");
    setDriverName("");
    setPhoneNumber("");
    setWhatsappNumber("");
    setDob("");
    setCity("Hyderabad");
    setOperatingPlace("");
    setPresentAddress("");
    setPermanentAddress("");
    setSameAsPresentAddress(false);
    setEmergencyName("");
    setEmergencyPhone("");
    setDlNumber("");
    setDlExpiryDate("");
    setLeadSource("");
    setPanNumber("");
    setAadhaarNumber("");
    setPanAadhaarLinked("Yes");
    setSelfiePhoto(null);
    setDlFront(null);
    setDlBack(null);
    setPanCardPhoto(null);
    setVendorName("");
    setVendorId("");
    setAadhaarPhoto(null);
    setFatherName("");
    setBankName("State Bank of India");
    setOtherBankName("");
    setAccountNumber("");
    setIfscCode("");
    setUpiId("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "selfie" | "dl_front" | "dl_back" | "pan" | "aadhaar") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (field === "selfie") setSelfiePhoto(reader.result);
          if (field === "dl_front") setDlFront(reader.result);
          if (field === "dl_back") setDlBack(reader.result);
          if (field === "pan") setPanCardPhoto(reader.result);
          if (field === "aadhaar") setAadhaarPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/onboarding/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setDriverName(data.driver_name || "");
      setPhoneNumber(data.phone_number || "");
      setWhatsappNumber(data.whatsapp_number || "");
      setDob(data.dob || "");
      setCity(data.city || "Hyderabad");
      setOperatingPlace(data.operating_place || "");
      setPresentAddress(data.present_address || "");
      setPermanentAddress(data.permanent_address || "");
      setSameAsPresentAddress(data.present_address === data.permanent_address);
      setEmergencyName(data.emergency_name || "");
      setEmergencyPhone(data.emergency_phone || "");
      setDlNumber(data.dl_number || "");
      setDlExpiryDate(data.dl_expiry_date || "");
      setLeadSource(data.lead_source || "");
      setPanNumber(data.pan_number || "");
      setAadhaarNumber(data.aadhaar_number || "");
      setPanAadhaarLinked(data.pan_aadhaar_linked || "Yes");

      setVendorType(data.vendor_type || "Individual");
      setDriverId(data.driver_id || "");
      setCustomRentAmount(data.custom_rent_amount || "");

      
      setSelfiePhoto(data.selfie_photo || null);
      setDlFront(data.dl_front || null);
      setDlBack(data.dl_back || null);
      setPanCardPhoto(data.pan_card_photo || null);
      setAadhaarPhoto(data.aadhaar_card_photo || null);
      setVendorName(data.vendor_name || "");
      setVendorId(data.vendor_id || "");
      setFatherName(data.father_name || "");
      setBankName(data.bank_name || "State Bank of India");
      setOtherBankName(data.other_bank_name || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setUpiId(data.upi_id || "");
      
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

  const handleWalkinSearch = async () => {
    if (!walkinSearchInput.trim()) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/search?q=${encodeURIComponent(walkinSearchInput)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      if (data.length === 0) {
        alert("No walk-in record found for that query.");
        return;
      }
      
      const record = data[0]; // Take the most recent match
      if (window.confirm(`Found Walk-in: ${record.person_name} (${record.person_number}). Link and autofill?`)) {
        setLinkedWalkinId(record.id);
        if (record.person_name) setDriverName(record.person_name);
        if (record.person_number) setPhoneNumber(record.person_number.replace(/\D/g, '').slice(-10));
        if (record.city) {
          // Attempt to match city string or id to CITIES, default to Hyderabad if not found
          const matchedCity = CITIES.find(c => c.value === record.city || c.text === record.city);
          if (matchedCity) setCity(matchedCity.value);
        }
        if (record.dl_number) setDlNumber(record.dl_number);
        if (record.aadhaar_number) setAadhaarNumber(record.aadhaar_number);
        setWalkinSearchInput("");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No entries available to export.");
      return;
    }

    const headers = [
      "ID", "Driver Name", "Phone", "DOB", "City", "DL Number", 
      "DL Expiry", "Plan", "PAN Number", "Aadhaar", "Created At"
    ];

    const rows = records.map((r) => [
      r.id,
      `"${r.driver_name}"`,
      `"${r.phone_number}"`,
      r.dob,
      `"${r.city}"`,
      `"${r.dl_number}"`,
      r.dl_expiry_date,
      `"${r.driver_plan}"`,
      `"${r.pan_number}"`,
      `"${r.aadhaar_number}"`,
      r.created_at
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `driver_onboarding_export_${new Date().toISOString().substring(0,10)}.csv`;
    link.click();
  };

  // Helper for camera uploads
  const removePhoto = (field: "selfie" | "dl_front" | "dl_back" | "pan") => {
    if (field === "selfie") setSelfiePhoto(null);
    if (field === "dl_front") setDlFront(null);
    if (field === "dl_back") setDlBack(null);
    if (field === "pan") setPanCardPhoto(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg font-sans">
      
      {/* 1. Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          
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
              Driver Onboarding
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
              <Database className="h-4 w-4" />
              Onboarding Registry
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

      {/* 2. Main Content Area */}
      <main className="flex-grow mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-8">
        
        {/* --- FORM TAB --- */}
        {activeTab === "form" && (
          <div className="max-w-4xl mx-auto">
            
            {/* Form Card */}
            <div className="bg-surface rounded-2xl shadow-xl shadow-slate-200/50 border border-border/40 overflow-hidden relative">
              
              <div className="bg-primary px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                    <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase backdrop-blur-sm">
                      LetzRyd Desk
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Onboarding Record #${editingId}` : "Onboarding Form"}
                  </h1>
                </div>

                <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="relative flex w-full sm:w-72 items-center">
                    <Search className="absolute left-3 h-4 w-4 text-white/60" />
                    <input
                      type="number"
                      placeholder="Edit existing record (ID)..."
                      value={retrieveIdInput}
                      onChange={(e) => setRetrieveIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRetrieveId()}
                      className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-white/50 backdrop-blur-md outline-none transition-all focus:border-white focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                    />
                    <button 
                      onClick={handleRetrieveId}
                      className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-green hover:bg-slate-50 transition-colors"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>

              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing existing Onboarding Record #{editingId}
                  </div>
                  <button 
                    onClick={() => { setEditingId(null); handleFormSubmit({ preventDefault: () => {} } as any); }} // Hacky reset
                    className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <div className="p-8 pb-10">
                <form onSubmit={handleFormSubmit} className="space-y-8">
                  
                  {/* Optional Walk-in Link */}
                  {!editingId && (
                    <div className="bg-slate-50 border border-border/80 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                          <Search className="h-4 w-4 text-green" /> Link to Walk-in Record
                        </h4>
                        <p className="font-sans text-xs text-text-muted mt-1">
                          Fetch driver details from the Walk-In registry by ID, Phone, or DL Number.
                        </p>
                      </div>
                      <div className="flex w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="Search Walk-Ins..."
                          value={walkinSearchInput}
                          onChange={(e) => setWalkinSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleWalkinSearch();
                            }
                          }}
                          className="h-10 w-full sm:w-64 rounded-l-lg border border-border bg-white px-3 text-sm focus:border-primary outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleWalkinSearch}
                          className="h-10 rounded-r-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
                        >
                          Fetch
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Candidate Info */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6">
                    <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                      Candidate Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Driver Name *</label>
                        <input type="text" required value={driverName} onChange={(e) => {
                          setDriverName(e.target.value);
                          if (sameAsDriver) setVendorName(e.target.value);
                        }} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Full Name as per Aadhaar" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Father's Name *</label>
                        <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Father's Full Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Phone Number *</label>
                        <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="10-digit mobile" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">WhatsApp Number</label>
                        <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Same as phone" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Date of Birth *</label>
                        <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Operating City (Bang, Hyd, Mum) *</label>
                        <select required value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                          {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Operating Place</label>
                        <input type="text" value={operatingPlace} onChange={(e) => setOperatingPlace(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter operating place" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Driver ID *</label>
                        <input type="text" required value={driverId} onChange={(e) => {
                          setDriverId(e.target.value);
                          if (sameAsDriver) setVendorId(e.target.value);
                        }} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter Driver ID" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Custom Rent Amount (Optional)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input type="number" value={customRentAmount} onChange={(e) => setCustomRentAmount(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="₹ per day" />
                        </div>
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3 flex items-center pt-2">
                        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-primary">
                          <input 
                            type="checkbox" 
                            checked={sameAsDriver}
                            onChange={(e) => {
                              setSameAsDriver(e.target.checked);
                              if (e.target.checked) {
                                setVendorName(driverName);
                                setVendorId(driverId);
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary/20"
                          />
                          Vendor details same as Driver details (Individual)
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Vendor Name</label>
                        <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} disabled={sameAsDriver} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60" placeholder="Enter Vendor Name (if any)" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Vendor ID</label>
                        <input type="text" value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={sameAsDriver} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60" placeholder="Enter Vendor ID (if any)" />
                      </div>
                      <div className="space-y-2 lg:col-span-3">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Present Address *</label>
                        <input type="text" required value={presentAddress} onChange={(e) => {
                          setPresentAddress(e.target.value);
                          if (sameAsPresentAddress) setPermanentAddress(e.target.value);
                        }} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Full residential address" />
                      </div>
                      <div className="space-y-2 lg:col-span-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Permanent Address *</label>
                          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-primary">
                            <input 
                              type="checkbox" 
                              checked={sameAsPresentAddress}
                              onChange={(e) => {
                                setSameAsPresentAddress(e.target.checked);
                                if (e.target.checked) setPermanentAddress(presentAddress);
                              }}
                              className="rounded border-border text-primary focus:ring-primary/20"
                            />
                            Same as Present Address
                          </label>
                        </div>
                        <input type="text" required value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} disabled={sameAsPresentAddress} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60" placeholder="Full permanent address" />
                      </div>
                    </div>
                  </div>
 
                  {/* Section 2: Emergency */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6 pt-6">
                    <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Emergency Contact Name *</label>
                        <input type="text" required value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Relation & Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Emergency Phone *</label>
                        <input type="tel" required value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="10-digit emergency number" />
                      </div>
                    </div>
                  </div>
 
                  {/* Section 3: Legal & KYC */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6 pt-6">
                    <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                      Document Verifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Driving License Number</label>
                        <input type="text" value={dlNumber} onChange={(e) => setDlNumber(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm uppercase focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. MH04 20110012345" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">DL Expiry Date</label>
                        <input type="date" value={dlExpiryDate} onChange={(e) => setDlExpiryDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">PAN Number *</label>
                        <input type="text" required value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm font-mono focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="ABCDE1234F" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Aadhaar Number *</label>
                        <input type="text" required value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm font-mono focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0000 0000 0000" />
                      </div>
                      
                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Is PAN Linked to Aadhaar? *</label>
                        <select required value={panAadhaarLinked} onChange={(e) => setPanAadhaarLinked(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                          <option value="Yes">Yes, Linked</option>
                          <option value="No">No, Not Linked</option>
                        </select>
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Lead Source</label>
                        <input type="text" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Facebook" />
                      </div>
                    </div>
                  </div>
 
                  {/* Section 4: Document Captures */}
                  <div className="flex flex-col gap-5 pt-6">
                    <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                      Document Captures
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {[
                        { id: "selfie", label: "Driver Selfie", val: selfiePhoto, setter: setSelfiePhoto },
                        { id: "dl_front", label: "DL Front Image", val: dlFront, setter: setDlFront },
                        { id: "dl_back", label: "DL Back Image", val: dlBack, setter: setDlBack },
                        { id: "pan", label: "PAN Card Image", val: panCardPhoto, setter: setPanCardPhoto },
                        { id: "aadhaar", label: "Aadhaar Card Image", val: aadhaarPhoto, setter: setAadhaarPhoto },
                      ].map((doc) => (
                        <div key={doc.id} className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                          <span className="font-sans text-xs font-semibold text-text-muted">{doc.label}</span>
                          
                          {doc.val ? (
                            <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
                              <img 
                                src={doc.val} 
                                alt={`${doc.label} Thumbnail`} 
                                className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
                              />
                              <button
                                type="button"
                                onClick={() => doc.setter(null)}
                                className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                                title="Remove image"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3 border border-border/50 bg-white rounded-lg">
                              <div className="rounded-full bg-primary/10 p-3 text-primary">
                                <Camera className="h-5 w-5" />
                              </div>
                              <span className="font-sans text-xs text-text-dim">No photo captured</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCameraActiveField(doc.id as any)}
                                  className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-semibold px-3 py-1.5 transition-colors cursor-pointer"
                                >
                                  <Camera className="h-3 w-3" />
                                  Capture
                                </button>
                                <label className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[10px] font-semibold px-3 py-1.5 transition-colors cursor-pointer">
                                  <Upload className="h-3 w-3" />
                                  Upload
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleFileUpload(e, doc.id as any)}
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                    </div>
                  </div>
 
                  {/* Section 5: Bank Details */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6 pt-6">
                    <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">5</span>
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Bank Name</label>
                        <select 
                          value={bankName} 
                          onChange={(e) => setBankName(e.target.value)} 
                          className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        >
                          <option value="State Bank of India">State Bank of India (SBI)</option>
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                          <option value="IndusInd Bank">IndusInd Bank</option>
                          <option value="Yes Bank">Yes Bank</option>
                          <option value="Federal Bank">Federal Bank</option>
                          <option value="Bank of Baroda">Bank of Baroda</option>
                          <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                          <option value="Canara Bank">Canara Bank</option>
                          <option value="Union Bank of India">Union Bank of India</option>
                          <option value="IDBI Bank">IDBI Bank</option>
                          <option value="Other">Other (Specify below)</option>
                        </select>
                      </div>

                      {bankName === "Other" && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Specify Bank Name *</label>
                          <input 
                            type="text" 
                            required={bankName === "Other"} 
                            value={otherBankName} 
                            onChange={(e) => setOtherBankName(e.target.value)} 
                            className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                            placeholder="Enter bank name" 
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Number</label>
                        <input 
                          type="text" 
                          value={accountNumber} 
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} 
                          className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                          placeholder="9 to 18 digit account no." 
                          maxLength={18}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">IFSC Code</label>
                        <input 
                          type="text" 
                          value={ifscCode} 
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())} 
                          className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm uppercase focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                          placeholder="e.g. IFSC0001234" 
                          maxLength={11}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">UPI ID</label>
                        <input 
                          type="text" 
                          value={upiId} 
                          onChange={(e) => setUpiId(e.target.value.toLowerCase())} 
                          className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                          placeholder="e.g. username@upi" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 max-w-sm">
                      <p className="text-xs text-text-muted leading-relaxed">
                        By submitting this form, you verify that all uploaded documents have been inspected physically.
                      </p>
                      <p className="text-[10px] font-bold text-red-500 uppercase">* means mandatory</p>
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {editingId ? "Update Onboarding Record" : "Submit Onboarding Record"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- REGISTRY TAB --- */}
        {activeTab === "registry" && (
          <div className="space-y-6">
            
            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Card 1: Total Onboarded */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Total Onboarded
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {stats.total_onboarded}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-2">
                    Active driver fleet registry
                  </span>
                </div>
                <div className="rounded-xl bg-teal-50/50 text-green p-3">
                  <User className="h-6 w-6" />
                </div>
              </div>

              {/* Card 2: No of Vendors */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    No. of Vendors
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-green mt-1">
                    {stats.vendor_count}
                  </span>
                  <span className="font-sans text-[10px] text-text-dim mt-2">
                    Driver supplier agencies
                  </span>
                </div>
                <div className="rounded-xl bg-green-light/40 text-green p-3">
                  <UserCheck className="h-6 w-6" />
                </div>
              </div>

              {/* Card 3: Last Added */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Last Added
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {stats.latest_onboarding}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-2">
                    Most recent fleet entry
                  </span>
                </div>
                <div className="rounded-xl bg-blue-50/50 text-primary p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              {/* Card 4: Last 7 Days Added */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase">
                    Last 7 Days Added
                  </span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {stats.last_7_days_count}
                  </span>
                  <span className="font-sans text-[10px] text-text-dim mt-2">
                    Pipeline growth this week
                  </span>
                </div>
                <div className="rounded-xl bg-yellow-50/50 text-amber-600 p-3">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>

            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-border/60 overflow-hidden relative">
              <div className="bg-white p-6 border-b border-border/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-green" />
                    Onboarding Database
                  </h2>
                  <p className="font-sans text-sm text-text-muted mt-1">Review securely onboarded drivers and their digital assets.</p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button onClick={handleExportCSV} className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text-muted hover:bg-slate-50 hover:text-primary transition-colors shadow-xs cursor-pointer">
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                  <button onClick={fetchData} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-muted hover:bg-slate-50 hover:text-primary transition-colors shadow-xs cursor-pointer" title="Refresh Data">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab("form"); }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Add Driver
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-slate-50/50 p-4 border-b border-border/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
                    <input 
                      type="text" 
                      placeholder="Search names, phone, DL, Aadhaar..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-xs"
                    />
                  </div>
                  
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
                    <select 
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-xs appearance-none"
                    >
                      <option value="all">All Cities & Hubs</option>
                      {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-white border-b border-border/60">
                    <tr>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-left">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-left">Driver Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-left">License & KYC</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-left">Location</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-left">Vendor & Emergency</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim tracking-wider uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="h-8 w-8 text-border-strong mb-2 opacity-50" />
                            <p className="font-semibold">No onboarding records found matching current criteria.</p>
                            <p className="text-xs">Adjust your search or filters to see more results.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md bg-slate-100 text-text-muted font-mono text-[10px] font-bold border border-border/50">
                                #{r.id}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans font-bold text-sm text-text">{r.driver_name}</div>
                              <div className="font-sans text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                                <Phone className="h-3 w-3" /> {r.phone_number}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono text-[11px] font-bold text-text bg-slate-100 border border-border/50 rounded px-1.5 py-0.5 inline-block mb-1">
                                DL: {r.dl_number}
                              </div>
                              <div className="font-mono text-[10px] text-text-muted">
                                PAN: {r.pan_number}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans font-bold text-[12px] text-primary">{r.city}</div>
                              {r.operating_place && (
                                <div className="font-sans text-[11px] text-text-muted mt-0.5">
                                  {r.operating_place}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans font-semibold text-[12px] text-text">
                                {r.vendor_name ? `${r.vendor_name} (${r.vendor_id || '-'})` : "Direct Partner"}
                              </div>
                              <div className="font-sans text-[11px] text-text-muted mt-0.5">
                                Emg: {r.emergency_name} ({r.emergency_phone})
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-yellow-50 hover:text-yellow-600 transition-colors cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-4 w-4" />
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
      
      {/* 3. Global Camera Capture Modal overlay */}
      {cameraActiveField && (
        <CameraCapture 
          title={`Capture ${cameraActiveField.replace('_', ' ').toUpperCase()}`}
          onClose={() => setCameraActiveField(null)}
          onCapture={(dataUrl) => {
            if (cameraActiveField === "selfie") setSelfiePhoto(dataUrl);
            if (cameraActiveField === "dl_front") setDlFront(dataUrl);
            if (cameraActiveField === "dl_back") setDlBack(dataUrl);
            if (cameraActiveField === "pan") setPanCardPhoto(dataUrl);
            if (cameraActiveField === "aadhaar") setAadhaarPhoto(dataUrl);
            setCameraActiveField(null);
          }}
        />
      )}

    </div>
  );
}
