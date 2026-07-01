import { useState, useEffect } from "react";
import Login from "./components/Login";
import FormSelector from "./components/FormSelector";
import WalkInForm from "./components/WalkInForm";
import OnboardingForm from "./components/OnboardingForm";
import AdjustmentForm from "./components/AdjustmentForm";
import AllocationForm from "./components/AllocationForm";
import ExpensesForm from "./components/ExpensesForm";
import { User } from "./types";

const LOCAL_STORAGE_TOKEN_KEY = "lr_token";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<"login" | "selector" | "walkin" | "onboarding" | "adjustment" | "allocation" | "expenses">("login");
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
    </div>
  );
}
