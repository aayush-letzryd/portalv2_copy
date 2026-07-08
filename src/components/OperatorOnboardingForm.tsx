import React, { useState, useEffect } from "react";
import { 
  User, FileText, CheckCircle, 
  ChevronLeft, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, UserCheck, Database, IndianRupee
} from "lucide-react";
import { OnboardingRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface OperatorOnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface DriverSubForm {
  driver_name: string;
  father_name: string;
  phone_number: string;
  whatsapp_number: string;
  dob: string;
  present_address: string;
  permanent_address: string;
  sameAsPresentAddress: boolean;
  emergency_name: string;
  emergency_phone: string;
  dl_number: string;
  dl_expiry_date: string;
  pan_number: string;
  aadhaar_number: string;
  pan_aadhaar_linked: string;
  custom_rent_amount: string;
  driver_id: string;
  selfie_photo: string | null;
  dl_front: string | null;
  dl_back: string | null;
  pan_card_photo: string | null;
  aadhaar_card_photo: string | null;
}



export default function OperatorOnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: OperatorOnboardingFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  // Retrieve / Edit state
  const [retrieveIdInput, setRetrieveIdInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Operator (Vendor) State
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [operatingPlace, setOperatingPlace] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [customRentAmount, setCustomRentAmount] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  
  // Operator Documents
  const [operatorSelfie, setOperatorSelfie] = useState<string | null>(null);
  const [operatorPanPhoto, setOperatorPanPhoto] = useState<string | null>(null);
  const [operatorAadhaarPhoto, setOperatorAadhaarPhoto] = useState<string | null>(null);
  const [operatorPan, setOperatorPan] = useState("");
  const [operatorAadhaar, setOperatorAadhaar] = useState("");

  // 2. Drivers List
  const [drivers, setDrivers] = useState<DriverSubForm[]>([]);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriverIdx, setEditingDriverIdx] = useState<number | null>(null);

  // 3. Driver Sub-Form State
  const [dName, setDName] = useState("");
  const [dFather, setDFather] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dWhatsapp, setDWhatsapp] = useState("");
  const [dDob, setDDob] = useState("");
  const [dPresentAddr, setDPresentAddr] = useState("");
  const [dPermanentAddr, setDPermanentAddr] = useState("");
  const [dSameAsPresent, setDSameAsPresent] = useState(false);
  const [dEmergName, setDEmergName] = useState("");
  const [dEmergPhone, setDEmergPhone] = useState("");
  const [dDlNum, setDDlNum] = useState("");
  const [dDlExpiry, setDDlExpiry] = useState("");
  const [dPanNum, setDPanNum] = useState("");
  const [dAadhaarNum, setDAadhaarNum] = useState("");
  const [dPanAadhaarLinked, setDPanAadhaarLinked] = useState("Yes");
  const [dCustomRent, setDCustomRent] = useState("");
  const [dDriverId, setDDriverId] = useState("");

  // Driver Uploads
  const [dSelfie, setDSelfie] = useState<string | null>(null);
  const [dDlFront, setDDlFront] = useState<string | null>(null);
  const [dDlBack, setDDlBack] = useState<string | null>(null);
  const [dPanPhoto, setDPanPhoto] = useState<string | null>(null);
  const [dAadhaarPhoto, setDAadhaarPhoto] = useState<string | null>(null);

  // Active Camera Capture Field
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);

  // Registry & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [stats, setStats] = useState({
    total_onboarded: 0,
    vendor_count: 0,
    latest_onboarding: "-",
    last_7_days_count: 0
  });

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/stats/onboarding", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      queryParams.append("limit", "15");

      const res = await fetch(`/api/onboarding?${queryParams.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.filter((r: any) => r.vendor_type === "Operator"));
      }
      fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchData();
    }
  }, [activeTab, searchQuery, filterCity]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetOperatorForm = () => {
    setVendorName("");
    setVendorId("");
    setPhoneNumber("");
    setWhatsappNumber("");
    setOperatingPlace("");
    setPresentAddress("");
    setPermanentAddress("");
    setCustomRentAmount("");
    setOperatorSelfie(null);
    setOperatorPanPhoto(null);
    setOperatorAadhaarPhoto(null);
    setOperatorPan("");
    setOperatorAadhaar("");
    setBankName("State Bank of India");
    setAccountNumber("");
    setIfscCode("");
    setUpiId("");
    setDrivers([]);
    setEditingId(null);
  };

  // Load operator record for edit by ID
  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/onboarding/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Operator record not found");
      const data = await res.json();

      if (data.vendor_type !== "Operator") {
        alert("This record is not an Operator. Please use Individual Onboarding for this ID.");
        return;
      }

      setEditingId(data.id);
      setVendorName(data.driver_name || data.vendor_name || "");
      setVendorId(data.vendor_id || "");
      setPhoneNumber(data.phone_number || "");
      setWhatsappNumber(data.whatsapp_number || "");
      setCity(data.city || "Hyderabad");
      setOperatingPlace(data.operating_place || "");
      setPresentAddress(data.present_address || "");
      setPermanentAddress(data.permanent_address || "");
      setSameAsPresentAddress(data.present_address === data.permanent_address);
      setOperatorPan(data.pan_number || "");
      setOperatorAadhaar(data.aadhaar_number || "");
      setCustomRentAmount(data.custom_rent_amount || "");
      setOperatorSelfie(data.selfie_photo || null);
      setOperatorPanPhoto(data.pan_card_photo || null);
      setOperatorAadhaarPhoto(data.aadhaar_card_photo || null);
      setBankName(data.bank_name || "State Bank of India");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setUpiId(data.upi_id || "");
      setDrivers([]);

      setActiveTab("form");
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetrieveId = async () => {
    const id = parseInt(retrieveIdInput);
    if (!id || id <= 0) return alert("Please enter a valid numeric Operator record ID");
    await loadRecordForEdit(id);
  };

  const handleAddDriver = () => {
    if (!dName || !dPhone || !dPanNum || !dAadhaarNum || !dDriverId) {
      alert("Please fill mandatory driver fields: Name, Phone, Driver ID, PAN, Aadhaar.");
      return;
    }
    const newDriver: DriverSubForm = {
      driver_name: dName,
      father_name: dFather,
      phone_number: dPhone,
      whatsapp_number: dWhatsapp || dPhone,
      dob: dDob,
      present_address: dPresentAddr,
      permanent_address: dSameAsPresent ? dPresentAddr : dPermanentAddr,
      sameAsPresentAddress: dSameAsPresent,
      emergency_name: dEmergName,
      emergency_phone: dEmergPhone,
      dl_number: dDlNum,
      dl_expiry_date: dDlExpiry,
      pan_number: dPanNum,
      aadhaar_number: dAadhaarNum,
      pan_aadhaar_linked: dPanAadhaarLinked,
      custom_rent_amount: dCustomRent,
      driver_id: dDriverId,
      selfie_photo: dSelfie,
      dl_front: dDlFront,
      dl_back: dDlBack,
      pan_card_photo: dPanPhoto,
      aadhaar_card_photo: dAadhaarPhoto
    };

    if (editingDriverIdx !== null) {
      const updated = [...drivers];
      updated[editingDriverIdx] = newDriver;
      setDrivers(updated);
      setEditingDriverIdx(null);
    } else {
      setDrivers([...drivers, newDriver]);
    }
    resetDriverForm();
    setShowDriverForm(false);
  };

  const openEditDriver = (idx: number) => {
    const d = drivers[idx];
    setDName(d.driver_name);
    setDFather(d.father_name);
    setDPhone(d.phone_number);
    setDWhatsapp(d.whatsapp_number);
    setDDob(d.dob);
    setDPresentAddr(d.present_address);
    setDPermanentAddr(d.permanent_address);
    setDSameAsPresent(d.sameAsPresentAddress);
    setDEmergName(d.emergency_name);
    setDEmergPhone(d.emergency_phone);
    setDDlNum(d.dl_number);
    setDDlExpiry(d.dl_expiry_date);
    setDPanNum(d.pan_number);
    setDAadhaarNum(d.aadhaar_number);
    setDPanAadhaarLinked(d.pan_aadhaar_linked);
    setDCustomRent(d.custom_rent_amount);
    setDDriverId(d.driver_id);
    setDSelfie(d.selfie_photo);
    setDDlFront(d.dl_front);
    setDDlBack(d.dl_back);
    setDPanPhoto(d.pan_card_photo);
    setDAadhaarPhoto(d.aadhaar_card_photo);
    setEditingDriverIdx(idx);
    setShowDriverForm(true);
  };

  const resetDriverForm = () => {
    setDName("");
    setDFather("");
    setDPhone("");
    setDWhatsapp("");
    setDDob("");
    setDPresentAddr("");
    setDPermanentAddr("");
    setDSameAsPresent(false);
    setDEmergName("");
    setDEmergPhone("");
    setDDlNum("");
    setDDlExpiry("");
    setDPanNum("");
    setDAadhaarNum("");
    setDPanAadhaarLinked("Yes");
    setDCustomRent("");
    setDDriverId("");
    setDSelfie(null);
    setDDlFront(null);
    setDDlBack(null);
    setDPanPhoto(null);
    setDAadhaarPhoto(null);
    setEditingDriverIdx(null);
  };

  const handleRemoveDriver = (idx: number) => {
    setDrivers(drivers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !vendorId || !phoneNumber) {
      return alert("Operator Name, Operator ID, and Phone Number are required.");
    }
    if (drivers.length === 0) {
      return alert("Please add at least one driver under this Operator.");
    }

    try {
      const token = localStorage.getItem("lr_token");

      const payload = {
        driver_name: vendorName, 
        phone_number: phoneNumber,
        whatsapp_number: whatsappNumber,
        dob: "1970-01-01",
        city,
        operating_place: operatingPlace,
        present_address: presentAddress,
        permanent_address: sameAsPresentAddress ? presentAddress : permanentAddress,
        emergency_name: "N/A",
        emergency_phone: "0000000000",
        pan_number: operatorPan || "PENDING",
        aadhaar_number: operatorAadhaar || "PENDING",
        selfie_photo: operatorSelfie || undefined,
        pan_card_photo: operatorPanPhoto || undefined,
        aadhaar_card_photo: operatorAadhaarPhoto || undefined,
        vendor_name: vendorName,
        vendor_id: vendorId,
        vendor_type: "Operator",
        father_name: "N/A",
        custom_rent_amount: customRentAmount || undefined,
        bank_name: bankName,
        account_number: accountNumber || undefined,
        ifsc_code: ifscCode || undefined,
        upi_id: upiId || undefined,
        operator_drivers: drivers.map(d => ({
          driver_name: d.driver_name,
          phone_number: d.phone_number,
          dl_number: d.dl_number,
          custom_rent_amount: d.custom_rent_amount,
          driver_id: d.driver_id,
          whatsapp_number: d.whatsapp_number,
          dob: d.dob,
          present_address: d.present_address,
          permanent_address: d.permanent_address,
          emergency_name: d.emergency_name,
          emergency_phone: d.emergency_phone,
          pan_number: d.pan_number,
          aadhaar_number: d.aadhaar_number,
          father_name: d.father_name,
          dl_expiry_date: d.dl_expiry_date,
          pan_aadhaar_linked: d.pan_aadhaar_linked
        }))
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/onboarding/${editingId}` : "/api/onboarding";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Onboarding submission failed");
      alert(editingId ? "Operator record updated successfully!" : "Operator and Drivers Onboarded successfully!");
      
      resetOperatorForm();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  const renderDocCard = (id: string, label: string, value: string | null, setter: (val: string | null) => void, acceptPdf = false) => {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
        <span className="font-sans text-xs font-semibold text-text-muted">{label}</span>
        
        {value ? (
          <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
            {value.startsWith("data:application/pdf") ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary" />
                <span className="text-xs text-primary font-semibold">PDF Uploaded</span>
              </div>
            ) : (
              <img 
                src={value} 
                alt={`${label} Thumbnail`} 
                className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
              />
            )}
            <button
              type="button"
              onClick={() => setter(null)}
              className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3 border border-border/50 bg-white rounded-lg">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-sans text-xs text-text-dim">No file uploaded</span>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setCameraActiveField(id)}
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
                  accept={acceptPdf ? "image/*,application/pdf" : "image/*"} 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setter)}
                />
              </label>
            </div>
            {acceptPdf && (
              <span className="text-[9px] text-text-dim">Supports JPG, PNG, PDF</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* HEADER */}
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
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Operator Onboarding
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Onboarding Form
            </button>
            <button 
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Operator Registry
            </button>
          </nav>

          {/* Clock & Profile */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-mono text-xs font-extrabold text-green">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name}</span>
                <span className="font-mono text-[10px] text-text-muted mt-0.5 leading-none">{user.role || "Executive"}</span>
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

      <main className="flex-grow mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "form" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface rounded-2xl shadow-xl shadow-slate-200/50 border border-border/40 overflow-hidden relative bg-white">
              
              {/* CARD HEADER */}
              <div className="bg-primary px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                    <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                      Operator Desk
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Operator Record #${editingId}` : "Operator Onboarding Form"}
                  </h1>
                </div>

                {/* Retrieve by ID */}
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
                      type="button"
                      onClick={handleRetrieveId}
                      className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-green hover:bg-slate-50 transition-colors"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit mode banner */}
              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing Operator Record #{editingId}
                  </div>
                  <button 
                    type="button"
                    onClick={resetOperatorForm}
                    className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}



              <div className="p-8 pb-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* SECTION 1: OPERATOR PROFILE DETAILS */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6">
                    <h3 className="font-sans text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                      Operator Profile Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operator Name *</label>
                        <input type="text" required value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Fleet/Operator Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operator ID (Vendor ID) *</label>
                        <input type="text" required value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Unique Vendor ID (e.g. VND-HYD-001)" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Phone Number *</label>
                        <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="10-digit mobile" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">WhatsApp Number</label>
                        <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="WhatsApp Number" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operating City *</label>
                        <select required value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                          {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operating Place / Hub</label>
                        <input type="text" value={operatingPlace} onChange={(e) => setOperatingPlace(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. HITEC Hub" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Custom Operator Rent / Day (Optional)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input type="number" value={customRentAmount} onChange={(e) => setCustomRentAmount(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Operator Rent Per Day" />
                        </div>
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-xs font-bold text-text-muted">Business Address</label>
                        <input type="text" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Registered business address" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: OPERATOR BANK ACCOUNT */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6 pt-2">
                    <h3 className="font-sans text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                      Operator Bank Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Bank Name</label>
                        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="SBI, HDFC, ICICI..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Account Number</label>
                        <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Account No" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">IFSC Code</label>
                        <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="IFSC Code" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">UPI ID</label>
                        <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="operator@upi" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: OPERATOR KYC & DOCUMENTS */}
                  <div className="flex flex-col gap-5 border-b border-border/40 pb-6 pt-2">
                    <h3 className="font-sans text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                      Operator KYC &amp; Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">PAN Number</label>
                        <input type="text" value={operatorPan} onChange={(e) => setOperatorPan(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="PAN Card No." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Aadhaar Number</label>
                        <input type="text" value={operatorAadhaar} onChange={(e) => setOperatorAadhaar(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Aadhaar Card No." />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                      {renderDocCard("operator_selfie", "Operator Photo / Selfie", operatorSelfie, setOperatorSelfie)}
                      {renderDocCard("operator_pan", "Operator PAN Copy", operatorPanPhoto, setOperatorPanPhoto, true)}
                      {renderDocCard("operator_aadhaar", "Operator Aadhaar Copy", operatorAadhaarPhoto, setOperatorAadhaarPhoto, true)}
                    </div>
                  </div>

                  {/* SECTION 4: DRIVERS UNDER THIS OPERATOR */}
                  <div className="flex flex-col gap-5 pt-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-sans text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                        Drivers under this Operator ({drivers.length})
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => { resetDriverForm(); setShowDriverForm(true); }} 
                        className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Add Driver
                      </button>
                    </div>

                    {drivers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {drivers.map((drv, index) => (
                          <div key={index} className="flex justify-between items-start p-4 bg-slate-50 border border-border/60 rounded-xl relative">
                            <div className="flex-1">
                              <p className="font-bold text-sm text-text">{drv.driver_name}</p>
                              <p className="text-xs text-text-muted mt-0.5">ID: <span className="font-mono font-bold text-primary">{drv.driver_id}</span> | Phone: {drv.phone_number}</p>
                              {drv.dl_number && <p className="text-xs text-text-muted mt-0.5">DL: {drv.dl_number} {drv.dl_expiry_date ? `(Exp: ${drv.dl_expiry_date})` : ""}</p>}
                              <p className="text-xs text-green font-semibold mt-1">
                                Rent: {drv.custom_rent_amount ? `₹${drv.custom_rent_amount}/day` : "Baseline default"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                type="button" 
                                onClick={() => openEditDriver(index)} 
                                className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                title="Edit Driver"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveDriver(index)} 
                                className="p-2 rounded-full text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove Driver"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-text-dim text-xs bg-slate-50/50 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2">
                        <User className="h-8 w-8 opacity-40 text-primary" />
                        <span>No drivers added yet. Click <strong>Add Driver</strong> to begin.</span>
                      </div>
                    )}
                  </div>

                  {/* DRIVER ADDER BOX (SLIDE-DOWN SUBFORM) */}
                  {showDriverForm && (
                    <div className="p-6 border-2 border-primary/20 rounded-2xl bg-slate-50/50 space-y-6">
                      <div className="flex justify-between items-center border-b border-border pb-3">
                        <h4 className="font-sans text-sm font-bold text-primary">
                          {editingDriverIdx !== null ? `Edit Driver #${editingDriverIdx + 1}` : "New Driver Details"}
                        </h4>
                        <button type="button" onClick={() => { setShowDriverForm(false); resetDriverForm(); }} className="text-text-muted hover:text-text cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Driver Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Driver Name *</label>
                          <input type="text" value={dName} onChange={(e) => setDName(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Full Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Father's Name</label>
                          <input type="text" value={dFather} onChange={(e) => setDFather(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Father's Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Phone Number *</label>
                          <input type="tel" value={dPhone} onChange={(e) => setDPhone(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="10-digit phone" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">WhatsApp Number</label>
                          <input type="tel" value={dWhatsapp} onChange={(e) => setDWhatsapp(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Same as phone if blank" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Date of Birth</label>
                          <input type="date" value={dDob} onChange={(e) => setDDob(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Driver ID *</label>
                          <input type="text" value={dDriverId} onChange={(e) => setDDriverId(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. DR-HYD-001" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Custom Driver Rent / Day (Optional)</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <input type="number" value={dCustomRent} onChange={(e) => setDCustomRent(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Driver Rent Per Day" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">DL Number</label>
                          <input type="text" value={dDlNum} onChange={(e) => setDDlNum(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Driving Licence No." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">DL Expiry Date</label>
                          <input type="date" value={dDlExpiry} onChange={(e) => setDDlExpiry(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">PAN Number *</label>
                          <input type="text" value={dPanNum} onChange={(e) => setDPanNum(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="PAN Card No." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Aadhaar Number *</label>
                          <input type="text" value={dAadhaarNum} onChange={(e) => setDAadhaarNum(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Aadhaar No." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">PAN-Aadhaar Linked</label>
                          <select value={dPanAadhaarLinked} onChange={(e) => setDPanAadhaarLinked(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Pending">Pending Verification</option>
                          </select>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Present Address</label>
                          <input type="text" value={dPresentAddr} onChange={(e) => setDPresentAddr(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Present Address" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-muted">Permanent Address</label>
                            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer hover:text-primary">
                              <input type="checkbox" checked={dSameAsPresent} onChange={(e) => setDSameAsPresent(e.target.checked)} className="rounded border-border text-primary" />
                              Same as Present
                            </label>
                          </div>
                          <input type="text" value={dPermanentAddr} onChange={(e) => setDPermanentAddr(e.target.value)} disabled={dSameAsPresent} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary outline-none disabled:opacity-60" placeholder="Permanent Address" />
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Emergency Contact Name</label>
                          <input type="text" value={dEmergName} onChange={(e) => setDEmergName(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary outline-none" placeholder="Relation & Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Emergency Phone</label>
                          <input type="tel" value={dEmergPhone} onChange={(e) => setDEmergPhone(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm focus:border-primary outline-none" placeholder="Emergency Mobile" />
                        </div>
                      </div>

                      {/* Driver KYC Images */}
                      <div className="border-t border-border pt-4">
                        <label className="text-xs font-bold text-text-muted block mb-3">Driver KYC Documents</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderDocCard("d_selfie", "Driver Selfie / Photo", dSelfie, setDSelfie)}
                          {renderDocCard("d_dl_front", "DL Front Copy", dDlFront, setDDlFront, true)}
                          {renderDocCard("d_dl_back", "DL Back Copy", dDlBack, setDDlBack, true)}
                          {renderDocCard("d_pan", "PAN Card Copy", dPanPhoto, setDPanPhoto, true)}
                          {renderDocCard("d_aadhaar", "Aadhaar Card Copy", dAadhaarPhoto, setDAadhaarPhoto, true)}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button type="button" onClick={() => { setShowDriverForm(false); resetDriverForm(); }} className="px-5 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer">Cancel</button>
                        <button type="button" onClick={handleAddDriver} className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-md cursor-pointer">
                          {editingDriverIdx !== null ? "Update Driver" : "Save Driver to Fleet"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <div className="pt-6 border-t border-border flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={resetOperatorForm}
                      className="px-6 py-3 border border-border rounded-xl text-sm font-bold text-text-muted hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Clear Form
                    </button>
                    <button 
                      type="submit" 
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white hover:bg-primary-hover shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {editingId ? "Update Operator Record" : "Submit Operator Onboarding"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {activeTab === "registry" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold">Total Operators</p>
                <p className="text-2xl font-bold text-primary mt-1">{records.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold">Last 7 Days</p>
                <p className="text-2xl font-bold text-green mt-1">{stats.last_7_days_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold">Latest Onboarding</p>
                <p className="text-sm font-bold text-text mt-1 truncate">{stats.latest_onboarding || "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold">Total Vendor Count</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.vendor_count}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green" />
                    Operator Onboardings Registry
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">Review and manage fleet operator agencies.</p>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search operator name, ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full lg:w-64 pl-9 pr-3 rounded-lg border border-border text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-border text-xs focus:border-primary outline-none"
                  >
                    <option value="all">All Cities</option>
                    {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                  </select>
                  <button onClick={fetchData} className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg border border-border bg-white transition-colors" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">ID</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Operator Name</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Vendor ID</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">City</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Phone</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Rent / Day</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Bank</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Onboarded</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono text-text-muted">#{r.id}</td>
                        <td className="px-5 py-4 text-xs font-bold">{r.driver_name || r.vendor_name}</td>
                        <td className="px-5 py-4 text-xs font-mono text-primary">{r.vendor_id || "—"}</td>
                        <td className="px-5 py-4 text-xs">{r.city}</td>
                        <td className="px-5 py-4 text-xs">{r.phone_number}</td>
                        <td className="px-5 py-4 text-xs font-bold text-green">
                          {(r as any).custom_rent_amount ? `₹${(r as any).custom_rent_amount}/day` : "—"}
                        </td>
                        <td className="px-5 py-4 text-xs text-text-muted">
                          {r.bank_name ? `${r.bank_name}` : "—"}
                          {(r as any).account_number ? ` (${String((r as any).account_number).slice(-4).padStart(String((r as any).account_number).length, '*')})` : ""}
                        </td>
                        <td className="px-5 py-4 text-xs text-text-muted">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => loadRecordForEdit(r.id)}
                            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-text-dim text-xs">
                          <div className="flex flex-col items-center gap-2">
                            <UserCheck className="h-8 w-8 opacity-30 text-primary" />
                            <span>No operator onboarding records found.</span>
                            <button
                              onClick={() => setActiveTab("form")}
                              className="mt-1 text-primary font-bold underline cursor-pointer"
                            >
                              Onboard your first Operator
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {cameraActiveField && (
        <CameraCapture 
          title={`Capture ${cameraActiveField.replace(/_/g, ' ')}`}
          onClose={() => setCameraActiveField(null)}
          onCapture={(dataUrl) => {
            if (cameraActiveField === "operator_selfie") setOperatorSelfie(dataUrl);
            if (cameraActiveField === "operator_pan") setOperatorPanPhoto(dataUrl);
            if (cameraActiveField === "operator_aadhaar") setOperatorAadhaarPhoto(dataUrl);
            if (cameraActiveField === "d_selfie") setDSelfie(dataUrl);
            if (cameraActiveField === "d_dl_front") setDDlFront(dataUrl);
            if (cameraActiveField === "d_dl_back") setDDlBack(dataUrl);
            if (cameraActiveField === "d_pan") setDPanPhoto(dataUrl);
            if (cameraActiveField === "d_aadhaar") setDAadhaarPhoto(dataUrl);
            setCameraActiveField(null);
          }}
        />
      )}
    </div>
  );
}
