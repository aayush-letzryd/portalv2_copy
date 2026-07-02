import { useState, useEffect } from "react";
import Login from "./components/Login";
import FormSelector from "./components/FormSelector";
import WalkInForm from "./components/WalkInForm";
import OnboardingForm from "./components/OnboardingForm";
import OperatorOnboardingForm from "./components/OperatorOnboardingForm";
import AdjustmentForm from "./components/AdjustmentForm";
import AllocationForm from "./components/AllocationForm";
import ExpensesForm from "./components/ExpensesForm";
import VehicleOnboardingForm from "./components/VehicleOnboardingForm";
import WorkshopsForm from "./components/WorkshopsForm";
import HubsParkingForm from "./components/HubsParkingForm";
import RentForm from "./components/RentForm";
import AccidentsForm from "./components/AccidentsForm";
import InspectionForm from "./components/InspectionForm";
import UsersForm from "./components/UsersForm";
import { User } from "./types";

const LOCAL_STORAGE_TOKEN_KEY = "lr_token";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<"login" | "selector" | "walkin" | "onboarding" | "operator_onboarding" | "adjustment" | "allocation" | "expenses" | "vehicle_onboarding" | "workshops" | "hubs_parking" | "rents" | "accident" | "inspection" | "users">("login");
  const [isInitializing, setIsInitializing] = useState(true);

  // Load user session from API using token on startup
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then(data => {
        setUser(data);
        setScreen("selector");
      })
      .catch(() => {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
      })
      .finally(() => {
        setIsInitializing(false);
      });
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (userSession: User) => {
    setUser(userSession);
    setScreen("selector");
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    setUser(null);
    setScreen("login");
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {screen === "login" && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {screen === "selector" && user && (
        <FormSelector 
          user={user} 
          onSelectForm={(formType) => setScreen(formType as any)} 
          onLogout={handleLogout}
        />
      )}
      {screen === "walkin" && user && (
        <WalkInForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "onboarding" && user && (
        <OnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "operator_onboarding" && user && (
        <OperatorOnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "adjustment" && user && (
        <AdjustmentForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "allocation" && user && (
        <AllocationForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "expenses" && user && (
        <ExpensesForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "vehicle_onboarding" && user && (
        <VehicleOnboardingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "workshops" && user && (
        <WorkshopsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "hubs_parking" && user && (
        <HubsParkingForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "rents" && user && (
        <RentForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "accident" && user && (
        <AccidentsForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "inspection" && user && (
        <InspectionForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
      {screen === "users" && user && (
        <UsersForm 
          user={user} 
          onBackToSelector={() => setScreen("selector")} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}
