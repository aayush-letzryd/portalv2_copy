import { useState, useEffect } from "react";
import Login from "./components/Login";
import FormSelector from "./components/FormSelector";
import WalkInForm from "./components/WalkInForm";
import OnboardingForm from "./components/OnboardingForm";
import { User } from "./types";

const LOCAL_STORAGE_TOKEN_KEY = "lr_token";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<"login" | "selector" | "walkin" | "onboarding">("login");
  const [isInitializing, setIsInitializing] = useState(true);

  // Load user session from API using token on startup
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
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

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setScreen("selector");
  };

  const handleLogout = () => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      }).catch(console.error);
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    setScreen("login");
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      {screen === "login" && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {screen === "selector" && user && (
        <FormSelector 
          user={user} 
          onSelectForm={(form) => setScreen(form)} 
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
    </div>
  );
}
