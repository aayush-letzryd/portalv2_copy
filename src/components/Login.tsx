import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid username or password");
      }
      
      localStorage.setItem("lr_token", data.token);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-height-screen w-full flex items-center justify-center bg-bg px-4 py-12 md:py-24">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-md md:aspect-16/10">
        
        {/* Left Side: Solid Brand Area */}
        <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-white md:flex">
          <div className="flex flex-col gap-6">
            {/* Logo properly scaled - no weird stretching */}
            <div className="w-48 h-auto flex items-center">
              <img 
                src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
                alt="LetzRyd logo" 
                className="max-h-12 w-auto object-contain filter brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-8 flex flex-col gap-3">
              <h2 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                Operations Portal
              </h2>
              <p className="font-sans text-sm text-white/70 leading-relaxed max-w-sm">
                Secure operations hub for on-ground driver check-ins, fleet registries, and partner query processing.
              </p>
            </div>
          </div>
          
          <div className="font-sans text-xs text-white/40">
            LetzRyd Fleet Operations Co.
          </div>
        </div>

        {/* Right Side: Clean Centered Login Form */}
        <div className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:p-16">
          <div className="w-full max-w-md mx-auto flex flex-col">
            
            {/* Header / Logo for mobile */}
            <div className="mb-8 md:hidden">
              <img 
                src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
                alt="LetzRyd" 
                className="max-h-8 w-auto object-contain mb-4"
                referrerPolicy="no-referrer"
              />
              <h1 className="font-sans text-2xl font-bold text-primary tracking-tight">
                Operations Portal
              </h1>
            </div>

            <div className="mb-6 hidden md:block">
              <h1 className="font-sans text-3xl font-bold text-primary tracking-tight">
                Sign in
              </h1>
              <p className="font-sans text-sm text-text-muted mt-2">
                Enter your credentials to access the portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Username field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="e.g. dshiva"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-lg border border-border-strong/50 px-3.5 font-sans text-sm text-text bg-white placeholder:text-text-dim outline-none focus:border-2 focus:border-primary transition-all"
                />
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border-strong/50 pl-3.5 pr-11 font-sans text-sm text-text bg-white placeholder:text-text-dim outline-none focus:border-2 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors p-1 rounded-sm"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-sans text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-sans text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:opacity-90 disabled:opacity-75 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-8 text-center font-sans text-[11px] text-text-dim max-w-[280px] mx-auto leading-relaxed">
              For demo, use username <strong className="text-primary font-semibold">test</strong> with password <strong className="text-primary font-semibold">123456</strong>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
