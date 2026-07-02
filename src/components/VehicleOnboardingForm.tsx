import React, { useState, useEffect } from "react";
import { 
  Truck, Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, Database, Info, AlertTriangle, ShieldCheck
} from "lucide-react";
import { VehicleRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface VehicleOnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function VehicleOnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: VehicleOnboardingFormProps) {
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
  
  // Panel 1: Identity & Status
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [letzrydUniqueNo, setLetzrydUniqueNo] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [model, setModel] = useState("");
  const [receivedAllocated, setReceivedAllocated] = useState("Receiving");
  const [deliveryMonth, setDeliveryMonth] = useState("");

  // Panel 2: Compliance & Validities
  const [registrationDate, setRegistrationDate] = useState("");
  const [rtoTaxValidity, setRtoTaxValidity] = useState("");
  const [permitValidity, setPermitValidity] = useState("");
  const [fitnessValidity, setFitnessValidity] = useState("");
  const [pollutionValidity, setPollutionValidity] = useState("");
  const [insuranceValidity, setInsuranceValidity] = useState("");
  const [authorizationCertificate, setAuthorizationCertificate] = useState("");
  const [insuranceMapping, setInsuranceMapping] = useState("");

  // Panel 3: Asset & Accessory Checklist
  const [kmsReading, setKmsReading] = useState("");
  const [trackingDeviceVendor, setTrackingDeviceVendor] = useState("");
  const [trackingDeviceType, setTrackingDeviceType] = useState("");
  const [cngInstalled, setCngInstalled] = useState("No");
  const [cngPlate, setCngPlate] = useState("");
  const [cngInstallationDate, setCngInstallationDate] = useState("");
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");

  // Documents
  const [rcDocument, setRcDocument] = useState<string | null>(null);
  const [insuranceDocument, setInsuranceDocument] = useState<string | null>(null);
  const [authorizationCertificateDoc, setAuthorizationCertificateDoc] = useState<string | null>(null);
  const [rtoTaxReceipt, setRtoTaxReceipt] = useState<string | null>(null);

  // Panel 4: PDI Photographic Verification (15 Images)
  const [imageFront, setImageFront] = useState<string | null>(null);
  const [imageLh, setImageLh] = useState<string | null>(null);
  const [imageBack, setImageBack] = useState<string | null>(null);
  const [imageRh, setImageRh] = useState<string | null>(null);
  const [engineChasisNoImg, setEngineChasisNoImg] = useState<string | null>(null);
  const [batterySlNoImg, setBatterySlNoImg] = useState<string | null>(null);
  const [engineCompartmentImg, setEngineCompartmentImg] = useState<string | null>(null);
  const [fastTagImg, setFastTagImg] = useState<string | null>(null);
  const [musicSystemImg, setMusicSystemImg] = useState<string | null>(null);
  const [keyQuantityImg, setKeyQuantityImg] = useState<string | null>(null);
  const [rhFrTyreImg, setRhFrTyreImg] = useState<string | null>(null);
  const [lhFrTyreImg, setLhFrTyreImg] = useState<string | null>(null);
  const [rhRearTyreImg, setRhRearTyreImg] = useState<string | null>(null);
  const [lhRearTyreImg, setLhRearTyreImg] = useState<string | null>(null);
  const [spareWheelImg, setSpareWheelImg] = useState<string | null>(null);

  // Camera State
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [stats, setStats] = useState({
    total_fleet: 0,
    receiving_count: 0,
    allocation_count: 0,
    cng_count: 0
  });

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/vehicle/stats", {
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
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("type", filterType);

      const res = await fetch(`/api/vehicle?${queryParams.toString()}`, {
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

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [searchQuery, filterCity, filterType]);

  const handlePhotoCaptured = (img: string) => {
    if (!cameraActiveField) return;
    const setters: Record<string, React.Dispatch<React.SetStateAction<string | null>>> = {
      image_front: setImageFront,
      image_lh: setImageLh,
      image_back: setImageBack,
      image_rh: setImageRh,
      engine_chasis_no_img: setEngineChasisNoImg,
      battery_sl_no_img: setBatterySlNoImg,
      engine_compartment_img: setEngineCompartmentImg,
      fast_tag_img: setFastTagImg,
      music_system_img: setMusicSystemImg,
      key_quantity_img: setKeyQuantityImg,
      rh_fr_tyre_img: setRhFrTyreImg,
      lh_fr_tyre_img: setLhFrTyreImg,
      rh_rear_tyre_img: setRhRearTyreImg,
      lh_rear_tyre_img: setLhRearTyreImg,
      spare_wheel_img: setSpareWheelImg
    };
    if (setters[cameraActiveField]) {
      setters[cameraActiveField](img);
    }
    setCameraActiveField(null);
  };

  const triggerUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const setters: Record<string, React.Dispatch<React.SetStateAction<string | null>>> = {
            image_front: setImageFront,
            image_lh: setImageLh,
            image_back: setImageBack,
            image_rh: setImageRh,
            engine_chasis_no_img: setEngineChasisNoImg,
            battery_sl_no_img: setBatterySlNoImg,
            engine_compartment_img: setEngineCompartmentImg,
            fast_tag_img: setFastTagImg,
            music_system_img: setMusicSystemImg,
            key_quantity_img: setKeyQuantityImg,
            rh_fr_tyre_img: setRhFrTyreImg,
            lh_fr_tyre_img: setLhFrTyreImg,
            rh_rear_tyre_img: setRhRearTyreImg,
            lh_rear_tyre_img: setLhRearTyreImg,
            spare_wheel_img: setSpareWheelImg,
            rc_document: setRcDocument,
            insurance_document: setInsuranceDocument,
            authorization_certificate_doc: setAuthorizationCertificateDoc,
            rto_tax_receipt: setRtoTaxReceipt
          };
          if (setters[field]) {
            setters[field](reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/vehicle/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Vehicle onboarding record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setVehicleNumber(data.vehicle_number || "");
      setLetzrydUniqueNo(data.letzryd_unique_no || "");
      setCityName(data.city_name || "Hyderabad");
      setModel(data.model || "");
      setReceivedAllocated(data.received_allocated || "Receiving");
      setDeliveryMonth(data.delivery_month || "");
      
      setRegistrationDate(data.registration_date || "");
      setRtoTaxValidity(data.rto_tax_validity || "");
      setPermitValidity(data.permit_validity || "");
      setFitnessValidity(data.fitness_validity || "");
      setPollutionValidity(data.pollution_validity || "");
      setInsuranceValidity(data.insurance_validity || "");
      setAuthorizationCertificate(data.authorization_certificate || "");
      setInsuranceMapping(data.insurance_mapping || "");
      
      setKmsReading(data.kms_reading || "");
      setTrackingDeviceVendor(data.tracking_device_vendor || "");
      setTrackingDeviceType(data.tracking_device_type || "");
      setCngInstalled(data.cng_installed || "No");
      setCngPlate(data.cng_plate || "");
      setCngInstallationDate(data.cng_installation_date || "");
      setJack(data.jack || "Available");
      setJackRod(data.jack_rod || "Available");
      setSpanner(data.spanner || "Available");
      setParkingTriangle(data.parking_triangle || "Available");
      setFireExtinguishers(data.fire_extinguishers || "Available");
      setSeatCover(data.seat_cover || "Available");
      setFloorCarpet(data.floor_carpet || "Available");

      // Set 15 photos
      setImageFront(data.image_front || null);
      setImageLh(data.image_lh || null);
      setImageBack(data.image_back || null);
      setImageRh(data.image_rh || null);
      setEngineChasisNoImg(data.engine_chasis_no_img || null);
      setBatterySlNoImg(data.battery_sl_no_img || null);
      setEngineCompartmentImg(data.engine_compartment_img || null);
      setFastTagImg(data.fast_tag_img || null);
      setMusicSystemImg(data.music_system_img || null);
      setKeyQuantityImg(data.key_quantity_img || null);
      setRhFrTyreImg(data.rh_fr_tyre_img || null);
      setLhFrTyreImg(data.lh_fr_tyre_img || null);
      setRhRearTyreImg(data.rh_rear_tyre_img || null);
      setLhRearTyreImg(data.lh_rear_tyre_img || null);
      setSpareWheelImg(data.spare_wheel_img || null);

      // Documents
      setRcDocument(data.rc_document || null);
      setInsuranceDocument(data.insurance_document || null);
      setAuthorizationCertificateDoc(data.authorization_certificate_doc || null);
      setRtoTaxReceipt(data.rto_tax_receipt || null);

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
    setVehicleNumber("");
    setLetzrydUniqueNo("");
    setCityName("Hyderabad");
    setModel("");
    setReceivedAllocated("Receiving");
    setDeliveryMonth("");
    setRegistrationDate("");
    setRtoTaxValidity("");
    setPermitValidity("");
    setFitnessValidity("");
    setPollutionValidity("");
    setInsuranceValidity("");
    setAuthorizationCertificate("");
    setInsuranceMapping("");
    setKmsReading("");
    setTrackingDeviceVendor("");
    setTrackingDeviceType("");
    setCngInstalled("No");
    setCngPlate("");
    setCngInstallationDate("");
    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    setImageFront(null);
    setImageLh(null);
    setImageBack(null);
    setImageRh(null);
    setEngineChasisNoImg(null);
    setBatterySlNoImg(null);
    setEngineCompartmentImg(null);
    setFastTagImg(null);
    setMusicSystemImg(null);
    setKeyQuantityImg(null);
    setRhFrTyreImg(null);
    setLhFrTyreImg(null);
    setRhRearTyreImg(null);
    setLhRearTyreImg(null);
    setSpareWheelImg(null);
    setRcDocument(null);
    setInsuranceDocument(null);
    setAuthorizationCertificateDoc(null);
    setRtoTaxReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return alert("Vehicle Reg Number is required");
    if (!cityName.trim()) return alert("City is required");
    if (!model.trim()) return alert("Model is required");
    if (!registrationDate.trim()) return alert("Registration Date is required");
    if (!fitnessValidity.trim()) return alert("Fitness Validity is required");
    if (!insuranceValidity.trim()) return alert("Insurance Validity is required");
    if (!kmsReading.trim()) return alert("KMs Reading is required");

    const payload = {
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      letzryd_unique_no: letzrydUniqueNo.trim() || undefined,
      city_name: cityName,
      model: model.trim(),
      received_allocated: receivedAllocated,
      delivery_month: deliveryMonth || undefined,
      registration_date: registrationDate,
      rto_tax_validity: rtoTaxValidity || undefined,
      permit_validity: permitValidity || undefined,
      fitness_validity: fitnessValidity,
      pollution_validity: pollutionValidity || undefined,
      insurance_validity: insuranceValidity,
      authorization_certificate: authorizationCertificate.trim() || undefined,
      insurance_mapping: insuranceMapping.trim() || undefined,
      kms_reading: kmsReading.trim(),
      tracking_device_vendor: trackingDeviceVendor.trim() || undefined,
      tracking_device_type: trackingDeviceType.trim() || undefined,
      cng_installed: cngInstalled,
      cng_plate: cngInstalled === "Yes" ? cngPlate.trim() : undefined,
      cng_installation_date: cngInstalled === "Yes" ? cngInstallationDate : undefined,
      jack,
      jack_rod: jackRod,
      spanner,
      parking_triangle: parkingTriangle,
      fire_extinguishers: fireExtinguishers,
      seat_cover: seatCover,
      floor_carpet: floorCarpet,
      image_front: imageFront || undefined,
      image_lh: imageLh || undefined,
      image_back: imageBack || undefined,
      image_rh: imageRh || undefined,
      engine_chasis_no_img: engineChasisNoImg || undefined,
      battery_sl_no_img: batterySlNoImg || undefined,
      engine_compartment_img: engineCompartmentImg || undefined,
      fast_tag_img: fastTagImg || undefined,
      music_system_img: musicSystemImg || undefined,
      key_quantity_img: keyQuantityImg || undefined,
      rh_fr_tyre_img: rhFrTyreImg || undefined,
      lh_fr_tyre_img: lhFrTyreImg || undefined,
      rh_rear_tyre_img: rhRearTyreImg || undefined,
      lh_rear_tyre_img: lhRearTyreImg || undefined,
      spare_wheel_img: spareWheelImg || undefined,
      rc_document: rcDocument || undefined,
      insurance_document: insuranceDocument || undefined,
      authorization_certificate_doc: authorizationCertificateDoc || undefined,
      rto_tax_receipt: rtoTaxReceipt || undefined
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/vehicle/${editingId}` : "/api/vehicle";
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
        throw new Error(errorText || "Failed to submit vehicle record");
      }

      alert(editingId ? "Vehicle compliance details updated!" : "Vehicle onboarded successfully!");
      resetForm();
      await fetchRecords();
      await fetchStats();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error submitting vehicle details");
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete vehicle record #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/vehicle/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRecords();
        await fetchStats();
      } else {
        alert("Failed to delete vehicle record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Vehicle Number", "Unique Asset ID", "City", "Model", "Operational Type",
      "Registration Date", "Fitness Validity", "Insurance Validity", "KMs Reading",
      "CNG Installed", "CNG Plate", "Jack Status", "Spare Wheel Photo", "Created At"
    ];
    const rows = records.map(r => [
      r.id, r.vehicle_number, r.letzryd_unique_no || "", r.city_name, r.model, r.received_allocated,
      r.registration_date, r.fitness_validity, r.insurance_validity, r.kms_reading,
      r.cng_installed, r.cng_plate || "", r.jack || "Available", r.spare_wheel_img ? "Yes" : "No", r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_fleet_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const photoFields = [
    { label: "Vehicle Front", key: "image_front", state: imageFront },
    { label: "Vehicle LH Side", key: "image_lh", state: imageLh },
    { label: "Vehicle Back", key: "image_back", state: imageBack },
    { label: "Vehicle RH Side", key: "image_rh", state: imageRh },
    { label: "Engine & Chasis No", key: "engine_chasis_no_img", state: engineChasisNoImg },
    { label: "Battery SL No", key: "battery_sl_no_img", state: batterySlNoImg },
    { label: "Engine Compartment", key: "engine_compartment_img", state: engineCompartmentImg },
    { label: "Fast Tag (Inside)", key: "fast_tag_img", state: fastTagImg },
    { label: "Music System", key: "music_system_img", state: musicSystemImg },
    { label: "RH Front Tyre", key: "rh_fr_tyre_img", state: rhFrTyreImg },
    { label: "LH Front Tyre", key: "lh_fr_tyre_img", state: lhFrTyreImg },
    { label: "RH Rear Tyre", key: "rh_rear_tyre_img", state: rhRearTyreImg },
    { label: "LH Rear Tyre", key: "lh_rear_tyre_img", state: lhRearTyreImg },
    { label: "Spare Wheel", key: "spare_wheel_img", state: spareWheelImg }
  ];

  const documentFields = [
    { label: "RC Document", key: "rc_document", state: rcDocument },
    { label: "Insurance Document", key: "insurance_document", state: insuranceDocument },
    { label: "Authorization Certificate", key: "authorization_certificate_doc", state: authorizationCertificateDoc },
    { label: "RTO Tax Receipt", key: "rto_tax_receipt", state: rtoTaxReceipt },
  ];

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
              Vehicle Form
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
              Onboarding Form
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
              Fleet Registry
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
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name || user.username || "User"}</span>
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
          <div className="w-full flex flex-col gap-6">
            
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
                    {editingId ? `Edit Record #${editingId}` : "Vehicle Onboarding Form"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId ? "Modifying existing vehicle entry. Submit form to update database." : "Digitize new vehicle intake, track legal compliance dates, and conduct rigorous photographic Pre-Delivery Inspections (PDI)."}
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

            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                
                {/* Panel 1: Identity & Status */}
                <div className="space-y-4">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                    Vehicle Identity & Status
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Vehicle Reg Number *</label>
                      <input
                        type="text"
                        required
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. TS09EA1234"
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">LetzRyd Unique Asset ID</label>
                      <input
                        type="text"
                        value={letzrydUniqueNo}
                        onChange={(e) => setLetzrydUniqueNo(e.target.value)}
                        placeholder="LR asset code..."
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Operational City *</label>
                      <select
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                      >
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Delhi">Delhi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Vehicle Model *</label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. Tata Nexon EV"
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Status Type *</label>
                      <select
                        value={receivedAllocated}
                        onChange={(e) => setReceivedAllocated(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                      >
                        <option value="Receiving">Receiving (Fleet Intake)</option>
                        <option value="Allocation">Allocation (To Partner)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Delivery Month</label>
                      <input
                        type="month"
                        value={deliveryMonth}
                        onChange={(e) => setDeliveryMonth(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Panel 2: Compliance & Validities */}
                <div className="space-y-4">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                    Compliance & Validities
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Registration Date *</label>
                      <input
                        type="date"
                        required
                        value={registrationDate}
                        onChange={(e) => setRegistrationDate(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">RTO Tax Validity</label>
                      <input
                        type="date"
                        value={rtoTaxValidity}
                        onChange={(e) => setRtoTaxValidity(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Permit Validity</label>
                      <input
                        type="date"
                        value={permitValidity}
                        onChange={(e) => setPermitValidity(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Fitness Validity *</label>
                      <input
                        type="date"
                        required
                        value={fitnessValidity}
                        onChange={(e) => setFitnessValidity(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Pollution Validity</label>
                      <input
                        type="date"
                        value={pollutionValidity}
                        onChange={(e) => setPollutionValidity(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Insurance Validity *</label>
                      <input
                        type="date"
                        required
                        value={insuranceValidity}
                        onChange={(e) => setInsuranceValidity(e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Authorization Certificate No</label>
                      <input
                        type="text"
                        value={authorizationCertificate}
                        onChange={(e) => setAuthorizationCertificate(e.target.value)}
                        placeholder="Cert details..."
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">Insurance Mapping Link</label>
                      <input
                        type="text"
                        value={insuranceMapping}
                        onChange={(e) => setInsuranceMapping(e.target.value)}
                        placeholder="Mapping details..."
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Panel 3: Asset & Accessory Checklist */}
              <div className="space-y-4">
                  <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                    Asset & Accessory Checklist
                  </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Odometer Reading *</label>
                    <input
                      type="number"
                      required
                      value={kmsReading}
                      onChange={(e) => setKmsReading(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GPS Device Vendor</label>
                    <input
                      type="text"
                      value={trackingDeviceVendor}
                      onChange={(e) => setTrackingDeviceVendor(e.target.value)}
                      placeholder="e.g. Roadcast"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GPS Tracker Type</label>
                    <input
                      type="text"
                      value={trackingDeviceType}
                      onChange={(e) => setTrackingDeviceType(e.target.value)}
                      placeholder="e.g. AIS 140"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">CNG Kit Installed?</label>
                    <select
                      value={cngInstalled}
                      onChange={(e) => setCngInstalled(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  
                  {cngInstalled === "Yes" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-text mb-1">CNG Cylinder Plate No *</label>
                        <input
                          type="text"
                          required
                          value={cngPlate}
                          onChange={(e) => setCngPlate(e.target.value)}
                          placeholder="Plate details..."
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text mb-1">CNG Installation Date *</label>
                        <input
                          type="date"
                          required
                          value={cngInstallationDate}
                          onChange={(e) => setCngInstallationDate(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Sub Checklist grid */}
                <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4 lg:grid-cols-7 border-t border-slate-50">
                  {[
                    { label: "Jack", state: jack, setter: setJack },
                    { label: "Jack Rod", state: jackRod, setter: setJackRod },
                    { label: "Spanner", state: spanner, setter: setSpanner },
                    { label: "Triangle", state: parkingTriangle, setter: setParkingTriangle },
                    { label: "Fire Ext.", state: fireExtinguishers, setter: setFireExtinguishers },
                    { label: "Seat Cover", state: seatCover, setter: setSeatCover },
                    { label: "Floor Carpet", state: floorCarpet, setter: setFloorCarpet }
                  ].map((chk) => (
                    <div key={chk.label}>
                      <span className="block text-[10px] font-bold text-text mb-1">{chk.label}</span>
                      <select
                        value={chk.state}
                        onChange={(e) => chk.setter(e.target.value)}
                        className="w-full rounded-lg border border-border px-2 py-1 text-[10px] focus:border-primary focus:outline-hidden bg-white transition-colors"
                      >
                        <option value="Available">Available</option>
                        <option value="Missing">Missing</option>
                      </select>
                    </div>
                  ))}

                  {/* Add Key Quantity as a standard number field in Panel 3 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Key Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={keyQuantity}
                      onChange={(e) => setKeyQuantity(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Panel 4: Vehicle Documents Uploads */}
              <div className="border-t border-border/60 pt-6 mt-4">
                <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                  Vehicle Documents
                </h3>
                <p className="font-sans text-[11px] text-text-muted mb-4 max-w-xl">
                  Upload PDF or Images for the required vehicle documents.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {documentFields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                      <span className="font-sans text-[11px] font-semibold text-text-muted text-center">{field.label}</span>
                      
                      {field.state ? (
                        <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[100px]">
                          {field.state.includes("application/pdf") ? (
                            <FileText className="h-10 w-10 text-primary mb-2" />
                          ) : (
                            <img 
                              src={field.state} 
                              alt={field.label} 
                              className="max-h-20 w-auto object-contain rounded-md shadow-xs border border-border"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const setters: Record<string, any> = {
                                rc_document: setRcDocument,
                                insurance_document: setInsuranceDocument,
                                authorization_certificate_doc: setAuthorizationCertificateDoc,
                                rto_tax_receipt: setRtoTaxReceipt
                              };
                              setters[field.key](null);
                            }}
                            className="absolute top-1 right-1 rounded-full bg-rose-50 border border-rose-200 p-1 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-3 min-h-[100px] gap-2">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          
                          <div className="relative w-full mt-1">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => triggerUpload(field.key, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-[10px] font-medium text-text-muted py-1.5 transition-colors shadow-xs hover:bg-slate-50 pointer-events-none">
                              <Upload className="h-3 w-3" />
                              Upload PDF/Image
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 5: PDI Photographic Verification (14 Images Grid) */}
              <div className="border-t border-border/60 pt-6 mt-4">
                <h3 className="font-sans text-xs font-bold text-primary tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">5</span>
                  PDI Photographic Verification
                </h3>
                <p className="font-sans text-[11px] text-text-muted mb-4 max-w-xl">
                  Scan or photograph vehicle credentials using the built-in webcam/mobile camera or upload existing image files.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {photoFields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                      <span className="font-sans text-[11px] font-semibold text-text-muted text-center">{field.label}</span>
                      
                      {field.state ? (
                        <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[100px]">
                          <img 
                            src={field.state} 
                            alt={field.label} 
                            className="max-h-20 w-auto object-contain rounded-md shadow-xs border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const setters: Record<string, any> = {
                                image_front: setImageFront,
                                image_lh: setImageLh,
                                image_back: setImageBack,
                                image_rh: setImageRh,
                                engine_chasis_no_img: setEngineChasisNoImg,
                                battery_sl_no_img: setBatterySlNoImg,
                                engine_compartment_img: setEngineCompartmentImg,
                                fast_tag_img: setFastTagImg,
                                music_system_img: setMusicSystemImg,
                                rh_fr_tyre_img: setRhFrTyreImg,
                                lh_fr_tyre_img: setLhFrTyreImg,
                                rh_rear_tyre_img: setRhRearTyreImg,
                                lh_rear_tyre_img: setLhRearTyreImg,
                                spare_wheel_img: setSpareWheelImg
                              };
                              setters[field.key](null);
                            }}
                            className="absolute top-1 right-1 rounded-full bg-rose-50 border border-rose-200 p-1 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-3 min-h-[100px] gap-2">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <Camera className="h-4 w-4" />
                          </div>
                          
                          <div className="flex flex-col gap-1.5 w-full mt-1">
                            <button
                              type="button"
                              onClick={() => setCameraActiveField(field.key)}
                              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-semibold py-1.5 transition-colors cursor-pointer w-full"
                            >
                              <Camera className="h-3 w-3" />
                              Capture
                            </button>
                            <label className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[10px] font-semibold py-1.5 transition-colors cursor-pointer w-full">
                              <Upload className="h-3 w-3" />
                              Upload
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => triggerUpload(field.key, e)}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form submit actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t border-border/40 pt-6">
                <div className="flex flex-col gap-1 max-w-sm">
                  <p className="text-[10px] font-bold text-red-500 uppercase">* means mandatory</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md shadow-primary/10 transition-colors cursor-pointer"
                  >
                    {editingId ? "Save Changes" : "Onboard Vehicle"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* Tab 2: Registry View */}
        {activeTab === "registry" && (
          <div className="space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              
              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 animate-pulse">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Onboarded</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.total_fleet}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-light text-green">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">CNG Enabled</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.cng_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Receiving Split</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.receiving_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-light text-amber-600">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider">Allocated Split</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.allocation_count}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filters panel */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search vehicle number or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-lg border border-border py-1.5 pr-3 pl-9 font-sans text-xs font-semibold focus:border-primary focus:outline-hidden transition-colors"
                  />
                </div>
                
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Delhi">Delhi</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Receiving">Receiving</option>
                  <option value="Allocation">Allocation</option>
                </select>
              </div>

              <button
                onClick={exportCSV}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text-muted hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary" />
                Export CSV
              </button>
            </div>

            {/* List Table */}
            <div className="overflow-hidden border border-border rounded-xl bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted uppercase tracking-wider select-none">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Vehicle Reg No</th>
                      <th className="py-3 px-4">Model & Asset ID</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Compliance Dates</th>
                      <th className="py-3 px-4">Odometer</th>
                      <th className="py-3 px-4">Checklist Status</th>
                      <th className="py-3 px-4">Operation Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-text-muted font-medium">
                          No vehicle records found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-text-muted">#{record.id}</td>
                          <td className="py-4 px-4 font-bold text-gray-900">{record.vehicle_number}</td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-text">{record.model}</div>
                            {record.letzryd_unique_no && (
                              <div className="text-[9px] text-text-muted font-mono mt-0.5">{record.letzryd_unique_no}</div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-text-muted">{record.city_name}</td>
                          <td className="py-4 px-4 font-mono text-[10px]">
                            <div>Fitness: <span className="font-bold text-text">{record.fitness_validity}</span></div>
                            <div className="mt-0.5">Insurance: <span className="font-bold text-text">{record.insurance_validity}</span></div>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-text-muted">{record.kms_reading} KMs</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5 text-[9px] font-bold text-text-muted">
                              <div>Jack: <span className={record.jack === "Available" ? "text-green" : "text-red-500"}>{record.jack || "Available"}</span></div>
                              <div>CNG Cylinder: <span className={record.cng_installed === "Yes" ? "text-green" : "text-slate-400"}>{record.cng_installed || "No"}</span></div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              record.received_allocated === "Receiving" ? "bg-blue-50 text-blue-600" : "bg-green-light text-green"
                            }`}>
                              {record.received_allocated}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => loadRecordForEdit(record.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Camera capture element */}
      {cameraActiveField && (
        <CameraCapture
          title={`Capture ${photoFields.find(f => f.key === cameraActiveField)?.label || "PDI"} Photo`}
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
            <span className="font-semibold text-white/80">Operations Management Registry</span>
          </div>
          <span>LetzRyd © Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
