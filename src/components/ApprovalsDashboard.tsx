import React, { useState, useEffect } from "react";
import { User, RentRecord, AdjustmentRecord } from "../types";

interface Props {
  user: User;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function ApprovalCentre({ user, onBackToSelector, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<"rents" | "adjustments">("rents");
  
  const [rents, setRents] = useState<RentRecord[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedRent, setSelectedRent] = useState<RentRecord | null>(null);
  const [selectedAdj, setSelectedAdj] = useState<AdjustmentRecord | null>(null);
  
  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignee, setAssignee] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("lr_token") || "";
      
      // Fetch Pending Rents
      const rentRes = await fetch("/api/rents?status=Pending", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (rentRes.ok) {
        setRents(await rentRes.json());
      }
      
      // Fetch Pending Adjustments
      const adjRes = await fetch("/api/adjustment?status=Pending", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (adjRes.ok) {
        setAdjustments(await adjRes.json());
      }
      
      // Fetch users for assignment
      const usersRes = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (usersRes.ok) {
        setPortalUsers(await usersRes.json());
      } else {
        // Mock fallback if API fails
        setPortalUsers([{ name: "Admin User" }, { name: "Anurag Prasad" }]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (type: "rents" | "adjustments", id: number, status: "Approved" | "Rejected") => {
    if (!window.confirm(`Are you sure you want to mark this as ${status}?`)) return;
    
    setError("");
    setSuccessMsg("");
    try {
      const token = localStorage.getItem("lr_token") || "";
      const res = await fetch(`/api/${type === "rents" ? "rents" : "adjustment"}/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Action failed");
      }
      
      setSuccessMsg(`Successfully marked as ${status}`);
      setSelectedRent(null);
      setSelectedAdj(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const handleAssign = async (type: "rents" | "adjustments", id: number) => {
    if (!assignee) return alert("Please select a user to assign to.");
    
    try {
      const token = localStorage.getItem("lr_token") || "";
      const res = await fetch(`/api/${type === "rents" ? "rents" : "adjustment"}/${id}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ assigned_to: assignee })
      });
      
      if (res.ok) {
        setSuccessMsg(`Task successfully assigned to ${assignee}`);
        setShowAssignModal(false);
        setAssignee("");
        loadData();
      } else {
        throw new Error("Failed to assign");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg font-sans text-text">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-border flex flex-col justify-between hidden md:flex">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold text-primary">Approval Centre</h1>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab("rents")}
              className={`w-full flex justify-between items-center px-4 py-2 rounded-lg transition-colors ${ activeTab === "rents" ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:bg-surface-hover" }`}
            >
              <span>Rental Plans</span>
              {rents.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-primary rounded-full opacity-80">
                  {rents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("adjustments")}
              className={`w-full flex justify-between items-center px-4 py-2 rounded-lg transition-colors ${ activeTab === "adjustments" ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:bg-surface-hover" }`}
            >
              <span>Adjustments</span>
              {adjustments.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-primary rounded-full opacity-80">
                  {adjustments.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <p className="text-xs text-text-muted mb-2 px-2 tracking-wide">Logged in as <b className="text-text">{user.name}</b></p>
          <button onClick={onBackToSelector} className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
            Back to Menu
          </button>
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-bg">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 md:hidden">
          <h1 className="text-xl font-bold text-primary">Approval Centre</h1>
          <button onClick={onBackToSelector} className="text-sm text-text-secondary">Menu</button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-primary tracking-tight">
                Pending {activeTab === "rents" ? "Rental Plans" : "Adjustments"}
              </h2>
              <button 
                onClick={loadData}
                className="px-4 py-1.5 bg-white border border-border shadow-sm rounded-lg text-sm font-medium text-text hover:border-primary hover:text-primary transition-all"
              >
                Refresh
              </button>
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
            {successMsg && <div className="mb-4 p-4 bg-green-light border border-green/20 text-green rounded-lg text-sm">{successMsg}</div>}

            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* RENTS TAB */}
                {activeTab === "rents" && (
                  rents.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-border text-text-muted shadow-sm">
                      No pending rental plans to approve.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rents.map((rent: any) => (
                        <div 
                          key={rent.id} 
                          onClick={() => setSelectedRent(rent)}
                          className="bg-white p-5 rounded-xl border border-border shadow-xs hover:shadow-md cursor-pointer transition-shadow flex flex-col justify-between group relative"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                                {rent.level.charAt(0).toUpperCase() + rent.level.slice(1)} Level
                              </span>
                              <span className="text-xs text-text-muted">{rent.created_at?.split('T')[0] || "2026-07-07"}</span>
                            </div>
                            <h3 className="text-xl font-extrabold text-text mb-1">₹{rent.rent_amount}</h3>
                            <div className="text-sm text-text-muted space-y-1 mt-3">
                              {rent.vehicle_model && <p>Model: <span className="text-text font-medium">{rent.vehicle_model}</span></p>}
                              {rent.driver_id && <p>Driver ID: <span className="text-text font-medium">{rent.driver_id}</span></p>}
                            </div>
                            {rent.assigned_to && (
                              <div className="mt-4 pt-3 border-t border-border/50 text-xs text-text-muted flex items-center justify-between">
                                <span>Assigned to: <b className="text-text">{rent.assigned_to}</b></span>
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded shadow">View Details</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ADJUSTMENTS TAB */}
                {activeTab === "adjustments" && (
                  adjustments.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-border text-text-muted shadow-sm">
                      No pending adjustments to approve.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {adjustments.map((adj: any) => (
                        <div 
                          key={adj.id} 
                          onClick={() => setSelectedAdj(adj)}
                          className="bg-white p-5 rounded-xl border border-border shadow-xs hover:shadow-md cursor-pointer transition-shadow flex flex-col justify-between group relative"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-indigo-700 tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                {adj.adjustment_type || "ADJUSTMENT"}
                              </span>
                              <span className="text-xs text-text-muted">{adj.adjustment_date || adj.created_at?.split('T')[0]}</span>
                            </div>
                            <h3 className="text-xl font-extrabold text-text mb-1">₹{adj.enter_amount}</h3>
                            <div className="text-sm text-text-muted space-y-1 mt-3">
                              <p>Partner: <span className="text-text font-medium">{adj.partner_name}</span></p>
                              <p>City: <span className="text-text font-medium">{adj.city_name}</span></p>
                            </div>
                            
                            {adj.assigned_to && (
                              <div className="mt-4 pt-3 border-t border-border/50 text-xs text-text-muted flex items-center justify-between">
                                <span>Assigned to: <b className="text-text">{adj.assigned_to}</b></span>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded shadow">View Details</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* RENT DETAILS MODAL */}
      {selectedRent && (
        <div className="fixed inset-0 bg-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg">
              <h3 className="font-bold text-lg text-primary">Rental Plan Details</h3>
              <button onClick={() => setSelectedRent(null)} className="text-text-muted hover:text-text rounded-full p-1 hover:bg-black/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
                <div>
                  <p className="text-text-muted text-xs mb-1">Level</p>
                  <p className="font-semibold text-text">{selectedRent.level}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Amount</p>
                  <p className="font-extrabold text-xl text-primary">₹{selectedRent.rent_amount}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Vehicle Model</p>
                  <p className="font-medium text-text">{selectedRent.vehicle_model || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Vehicle No</p>
                  <p className="font-medium text-text">{selectedRent.vehicle_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Driver ID</p>
                  <p className="font-medium text-text">{selectedRent.driver_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Vendor ID</p>
                  <p className="font-medium text-text">{selectedRent.vendor_id || "N/A"}</p>
                </div>
                
                {(selectedRent as any).assigned_to && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                    <p className="text-xs text-blue-600 font-bold mb-1">Assignment</p>
                    <p className="text-sm text-blue-900">
                      Assigned to <span className="font-bold">{ (selectedRent as any).assigned_to }</span> 
                      { (selectedRent as any).assigned_by && ` by ${(selectedRent as any).assigned_by}` }
                    </p>
                  </div>
                )}
              </div>
              
              {showAssignModal ? (
                <div className="bg-bg p-4 rounded-xl border border-border mt-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-sm font-bold text-text mb-3">Assign to Portal User</h4>
                  <select 
                    value={assignee} 
                    onChange={e => setAssignee(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-3"
                  >
                    <option value="">Select a user...</option>
                    {portalUsers.map((u, i) => (
                      <option key={i} value={u.name}>{u.name} {u.role ? `(${u.role})` : ""}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAssign("rents", selectedRent.id)}
                      className="flex-1 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-hover"
                    >
                      Save Assignment
                    </button>
                    <button 
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 border border-border text-text-muted text-sm font-medium rounded-lg hover:bg-surface"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="w-full text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 py-2 rounded-lg transition-colors mb-6"
                >
                  {(selectedRent as any).assigned_to ? "Change Assignment" : "Assign Request"}
                </button>
              )}
            </div>
            
            <div className="px-6 py-4 bg-bg border-t border-border flex gap-3">
              <button 
                onClick={() => handleAction("rents", selectedRent.id, "Rejected")}
                className="flex-1 bg-white border border-red-500 text-red-600 py-2.5 rounded-lg font-bold hover:bg-red-50 transition-colors"
              >
                Reject
              </button>
              <button 
                onClick={() => handleAction("rents", selectedRent.id, "Approved")}
                className="flex-1 bg-green text-white py-2.5 rounded-lg font-bold hover:bg-green/90 transition-colors shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUSTMENT DETAILS MODAL */}
      {selectedAdj && (
        <div className="fixed inset-0 bg-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg">
              <h3 className="font-bold text-lg text-primary">Adjustment Details</h3>
              <button onClick={() => setSelectedAdj(null)} className="text-text-muted hover:text-text rounded-full p-1 hover:bg-black/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
                <div className="col-span-2 flex justify-between items-center bg-bg p-4 rounded-xl border border-border mb-2">
                  <div>
                    <p className="text-text-muted text-xs mb-1">Amount</p>
                    <p className="font-extrabold text-2xl text-primary">₹{selectedAdj.enter_amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted text-xs mb-1">Type</p>
                    <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                      {selectedAdj.adjustment_type}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-text-muted text-xs mb-1">Partner</p>
                  <p className="font-medium text-text">{selectedAdj.partner_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Driver ID</p>
                  <p className="font-medium text-text">{selectedAdj.driver_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">City</p>
                  <p className="font-medium text-text">{selectedAdj.city_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1">Date</p>
                  <p className="font-medium text-text">{selectedAdj.adjustment_date || "N/A"}</p>
                </div>
                
                {selectedAdj.remarks && (
                  <div className="col-span-2 bg-yellow-light/50 p-3 rounded-lg border border-yellow/30 mt-2">
                    <p className="text-xs text-amber-800 font-bold mb-1">Remarks</p>
                    <p className="text-sm text-amber-900">{selectedAdj.remarks}</p>
                  </div>
                )}
                
                {(selectedAdj as any).assigned_to && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                    <p className="text-xs text-blue-600 font-bold mb-1">Assignment</p>
                    <p className="text-sm text-blue-900">
                      Assigned to <span className="font-bold">{ (selectedAdj as any).assigned_to }</span> 
                      { (selectedAdj as any).assigned_by && ` by ${(selectedAdj as any).assigned_by}` }
                    </p>
                  </div>
                )}
              </div>
              
              {showAssignModal ? (
                <div className="bg-bg p-4 rounded-xl border border-border mt-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-sm font-bold text-text mb-3">Assign to Portal User</h4>
                  <select 
                    value={assignee} 
                    onChange={e => setAssignee(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-3"
                  >
                    <option value="">Select a user...</option>
                    {portalUsers.map((u, i) => (
                      <option key={i} value={u.name}>{u.name} {u.role ? `(${u.role})` : ""}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAssign("adjustments", selectedAdj.id)}
                      className="flex-1 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-hover"
                    >
                      Save Assignment
                    </button>
                    <button 
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 border border-border text-text-muted text-sm font-medium rounded-lg hover:bg-surface"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="w-full text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 py-2 rounded-lg transition-colors mb-6"
                >
                  {(selectedAdj as any).assigned_to ? "Change Assignment" : "Assign Request"}
                </button>
              )}
            </div>
            
            <div className="px-6 py-4 bg-bg border-t border-border flex gap-3">
              <button 
                onClick={() => handleAction("adjustments", selectedAdj.id, "Rejected")}
                className="flex-1 bg-white border border-red-500 text-red-600 py-2.5 rounded-lg font-bold hover:bg-red-50 transition-colors"
              >
                Reject
              </button>
              <button 
                onClick={() => handleAction("adjustments", selectedAdj.id, "Approved")}
                className="flex-1 bg-green text-white py-2.5 rounded-lg font-bold hover:bg-green/90 transition-colors shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
