"use client";

import React, { useState, useEffect, useMemo } from "react";

// Interface definitions matching app-wombcare database model structure
interface Referral {
  id: string;
  patientName: string;
  mobile: string;
  email: string;
  problem: string;
  doctorId: string;
  doctorReferralCode: string;
  referralStatus: "pending" | "contacted" | "converted" | "rejected" | "inactive";
  convertedPatientId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  date: Date;
  type: "period_start" | "period_end" | "wellness_log" | "profile_created";
  title: string;
  details: string;
}

// Inline SVGs for consistent UI icons across mobile and desktop
const SparklesIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="w-6 h-6 text-[#FF4D8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg className="w-6 h-6 text-[#7C5CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-[#7C5CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Home() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [doctorToken, setDoctorToken] = useState<string | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<any | null>(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Dashboard layout states
  const [activeTab, setActiveTab] = useState<"referrals" | "patients">("referrals");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states (Referrals)
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [problem, setProblem] = useState("PCOD/PMOS");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Dossier details modal states
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<"overview" | "timeline">("overview");
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState("");
  const [noteError, setNoteError] = useState("");

  // Check session storage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("doctorToken");
    const storedDoctor = localStorage.getItem("doctorInfo");
    if (storedToken && storedDoctor) {
      setDoctorToken(storedToken);
      setDoctorInfo(JSON.parse(storedDoctor));
      setIsLoggedIn(true);
    }
    setCheckingSession(false);
  }, []);

  // Fetch referrals and patient lists
  const loadData = async (tokenParam?: string) => {
    const activeToken = tokenParam || doctorToken;
    if (!activeToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://womb-care-backend-76858014616.europe-west1.run.app/api/referrals/my-referrals",
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }
      );
      const resJson = await response.json();
      if (resJson.success) {
        setReferrals(resJson.referrals || []);
      }
    } catch (err) {
      console.error("Error loading referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load data immediately on login
  useEffect(() => {
    if (isLoggedIn && doctorToken) {
      loadData(doctorToken);
    }
  }, [isLoggedIn, doctorToken]);

  // Auth Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch(
        "https://womb-care-backend-76858014616.us-central1.run.app/api/doctors/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setAuthError(data.message || "Invalid email or password.");
        setAuthLoading(false);
        return;
      }

      // Check role permissions: Must be a doctor
      if (data.role !== "doctor") {
        setAuthError("Access Denied. You do not have doctor clearance.");
        setAuthLoading(false);
        return;
      }

      // Store auth session
      localStorage.setItem("doctorToken", data.token);
      localStorage.setItem("doctorInfo", JSON.stringify(data.doctor));
      setDoctorToken(data.token);
      setDoctorInfo(data.doctor);
      setIsLoggedIn(true);
    } catch (err) {
      setAuthError("Connection error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Trigger
  const handleLogout = () => {
    localStorage.removeItem("doctorToken");
    localStorage.removeItem("doctorInfo");
    setDoctorToken(null);
    setDoctorInfo(null);
    setIsLoggedIn(false);
    setAuthEmail("");
    setAuthPassword("");
  };

  // Submit new referral
  const handleReferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!patientName.trim()) {
      setSubmitError("Patient name is required.");
      return;
    }
    if (!mobile.trim()) {
      setSubmitError("Mobile number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        "https://womb-care-backend-76858014616.europe-west1.run.app/api/referrals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctorToken}`,
          },
          body: JSON.stringify({
            patientName: patientName.trim(),
            mobile: mobile.trim(),
            email: "",
            problem: problem,
          }),
        }
      );

      const resJson = await response.json();
      if (resJson.success) {
        setSubmitSuccess(`Referral successfully submitted for ${patientName}! 🌸`);
        setPatientName("");
        setMobile("");
        setProblem("PCOD/PMOS");
        loadData();
      } else {
        setSubmitError(resJson.message || "Failed to submit referral.");
      }
    } catch (err) {
      setSubmitError("Connection failure to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Dossier
  const handleOpenDossier = async (referredId: string) => {
    setSelectedPatientId(referredId);
    setDossierLoading(true);
    setDossierData(null);
    setDossierTab("overview");
    setNoteError("");
    setNoteSuccess("");

    try {
      const response = await fetch(
        `https://womb-care-backend-76858014616.europe-west1.run.app/api/doctor/patient-history/${referredId}`,
        {
          headers: {
            Authorization: `Bearer ${doctorToken}`,
          },
        }
      );
      const resJson = await response.json();
      if (resJson.success) {
        setDossierData(resJson);
        setEditingNoteText(resJson.profile?.doctorNote || "");
      } else {
        alert(resJson.message || "Unable to retrieve clinical dossier history.");
        setSelectedPatientId(null);
      }
    } catch (err) {
      alert("Error reaching server to fetch patient logs.");
      setSelectedPatientId(null);
    } finally {
      setDossierLoading(false);
    }
  };

  // Save clinical notes
  const handleSaveNotes = async () => {
    if (!dossierData?.profile?.id) {
      setNoteError("No profile ID found for this patient.");
      return;
    }

    setSavingNote(true);
    setNoteError("");
    setNoteSuccess("");

    try {
      const response = await fetch(
        `https://womb-care-backend-76858014616.europe-west1.run.app/api/profiles/${dossierData.profile.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctorToken}`,
          },
          body: JSON.stringify({
            doctorNote: editingNoteText,
          }),
        }
      );
      const resJson = await response.json();
      if (resJson.success) {
        setNoteSuccess("Clinical guidance updated successfully! 🌸");
        setDossierData({
          ...dossierData,
          profile: {
            ...dossierData.profile,
            doctorNote: editingNoteText,
          },
        });
      } else {
        setNoteError(resJson.message || "Failed to update clinical note.");
      }
    } catch (err) {
      setNoteError("Network issue: Unable to save clinical notes.");
    } finally {
      setSavingNote(false);
    }
  };

  // Group events for timeline view
  const timelineDataGrouped = useMemo(() => {
    if (!dossierData) return {};
    const events: TimelineEvent[] = [];

    // 1. Account Creation
    if (dossierData.profile?.createdAt) {
      events.push({
        date: new Date(dossierData.profile.createdAt),
        type: "profile_created",
        title: "Account & Profile Created 🌸",
        details: "Initial WombCare registration completed. Baseline parameters stored in user profiles.",
      });
    }

    // 2. Period Log Events
    if (dossierData.periodHistory) {
      dossierData.periodHistory.forEach((cycle: any) => {
        if (cycle.startDate) {
          events.push({
            date: new Date(cycle.startDate),
            type: "period_start",
            title: "Period Cycle Started 🩸",
            details: `Logged start of period cycle. Status: Active bleeding. Symptoms logged: ${
              Array.isArray(cycle.symptoms) && cycle.symptoms.length > 0 ? cycle.symptoms.join(", ") : "None"
            }.`,
          });
        }
        if (cycle.endDate) {
          events.push({
            date: new Date(cycle.endDate),
            type: "period_end",
            title: "Period Cycle Ended ✨",
            details: `Logged completion of period bleeding phase. Bleeding duration: ${Math.round(
              (new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24)
            )} days. Notes: ${cycle.notes || "None"}.`,
          });
        }
      });
    }

    // 3. Wellness Telemetry
    if (dossierData.wellnessHistory) {
      dossierData.wellnessHistory.forEach((log: any) => {
        const logDateStr = log.date || log.logDate;
        if (logDateStr) {
          const symptomsList =
            Array.isArray(log.symptoms) && log.symptoms.length > 0 ? log.symptoms.join(", ") : "None";
          events.push({
            date: new Date(logDateStr),
            type: "wellness_log",
            title: "Daily Wellness Telemetry Log",
            details: `Mood: ${log.mood || "N/A"} | Sleep: ${log.sleep || 0} hrs | Hydration: ${
              log.waterIntake || 0
            } ml | Cycle Day: ${log.cycleDay || "N/A"}\nActive Symptoms: ${symptomsList}${
              log.journal ? `\nJournal Description: "${log.journal}"` : ""
            }`,
          });
        }
      });
    }

    // Sort descending
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group
    const grouped: { [key: string]: TimelineEvent[] } = {};
    events.forEach((evt) => {
      const monthYear = evt.date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(evt);
    });

    return grouped;
  }, [dossierData]);

  // Derived patient search/filters
  const totalReferrals = referrals.length;
  const totalPatients = useMemo(() => {
    return referrals.filter((r) => r.referralStatus === "converted").length;
  }, [referrals]);

  const activeReferralsList = useMemo(() => {
    return referrals.filter((r) => r.referralStatus !== "converted");
  }, [referrals]);

  const activePatientsList = useMemo(() => {
    return referrals
      .filter((r) => r.referralStatus === "converted")
      .filter((pat) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          (pat.patientName || "").toLowerCase().includes(q) ||
          (pat.email || "").toLowerCase().includes(q) ||
          (pat.doctorReferralCode || "").toLowerCase().includes(q) ||
          (pat.mobile || "").toLowerCase().includes(q)
        );
      });
  }, [referrals, searchQuery]);

  if (checkingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8F4FF]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF4D8D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666] font-semibold text-sm">Loading Doctor Session...</p>
        </div>
      </div>
    );
  }

  // --- MOBILE OPTIMIZED LOGIN INTERFACE ---
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#F8F4FF] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden selection:bg-[#FFE5EF] selection:text-[#FF4D8D]">
        {/* Soft floating blurred background elements matching app auth screens */}
        <div className="absolute top-[-10%] left-[-10%] w-[65%] h-[65%] rounded-full bg-[#FFE5EF]/50 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] rounded-full bg-[#EEE9FF]/50 blur-[90px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-[30px] border border-white shadow-xl p-7 sm:p-9 relative z-10 transition-all duration-300">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-[42px] font-black text-[#FF4D8D] tracking-tight leading-none">
              WombCare
            </h1>
            <p className="text-[10px] text-[#7C5CFF] font-extrabold tracking-widest uppercase mt-1">
              Doctor Clinical Portal
            </p>
            <p className="text-[#666] text-xs sm:text-sm mt-3">
              Sign in to manage patient referrals and clinical health metrics
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 bg-[#FFE5EF] border border-[#FFE4E1] text-[#FF4D8D] text-xs font-semibold rounded-2xl flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[#555] text-xs font-bold mb-2">
                Clinical Email ID
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3.5 bg-[#FAFAFA] border border-[#EEE] rounded-[18px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] focus:bg-white transition-all text-base sm:text-sm"
                placeholder="doctor@wombcare.in"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[#555] text-xs font-bold mb-2">
                Security Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3.5 bg-[#FAFAFA] border border-[#EEE] rounded-[18px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] focus:bg-white transition-all text-base sm:text-sm"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-[#111] hover:bg-[#222] text-white font-bold rounded-[24px] shadow-lg transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[58px]"
            >
              {authLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Verify & Access Portal"
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // --- FAITHFUL WEB / MOBILE PORTAL DASHBOARD ---
  return (
    <main className="min-h-screen bg-[#F8F4FF] selection:bg-[#FFE5EF] selection:text-[#FF4D8D] relative flex flex-col font-sans">
      {/* Navigation Top bar (Sticky) */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-black text-[#FF4D8D] leading-none tracking-tight">
                WombCare
              </h1>
              <p className="text-[9px] text-[#7C5CFF] font-extrabold uppercase tracking-wider mt-0.5">
                Doctor Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              🩺 Dr. {doctorInfo?.name || "Practitioner"}
            </span>

            <button
              onClick={() => loadData()}
              disabled={loading}
              title="Refresh Dashboard Data"
              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <RefreshIcon className={`w-5 h-5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer min-h-[36px]"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 relative z-10 flex-1">
        
        {/* Welcome Section */}
        <section className="px-1.5 sm:px-0">
          <h2 className="text-[34px] font-black text-[#111] leading-tight">Doctor Portal</h2>
          <p className="text-[15px] text-[#666] mt-1.5">Manage referrals and patient wellness</p>
        </section>

        {/* Overview Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-100 rounded-[28px] p-[22px] shadow-sm flex flex-col justify-between">
            <h2 className="text-[#666] text-xs font-bold uppercase tracking-wider">Clinic Location</h2>
            <div className="mt-4">
              <p className="text-base font-bold text-slate-800">{doctorInfo?.hospital || "WombCare Clinic"}</p>
              <p className="text-xs text-slate-500 mt-1">Specialization: {doctorInfo?.specialty || "Hormonal Health"}</p>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Referral Code:</span>
              <span className="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{doctorInfo?.referralCode || "N/A"}</span>
            </div>
          </div>

          <div className="bg-[#FFE5EF] rounded-[28px] p-[22px] shadow-sm flex flex-col justify-between group min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-[#666] text-xs font-bold uppercase tracking-wider">Active Patients</span>
              <UserGroupIcon />
            </div>
            <div>
              <p className="text-[28px] font-black text-[#111]">{totalPatients}</p>
              <p className="text-xs font-bold text-[#666] mt-1">Converted referrals roster</p>
            </div>
          </div>

          <div className="bg-[#EEE9FF] rounded-[28px] p-[22px] shadow-sm flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-[#666] text-xs font-bold uppercase tracking-wider">Referrals Submitted</span>
              <DocumentTextIcon />
            </div>
            <div>
              <p className="text-[28px] font-black text-[#111]">{totalReferrals}</p>
              <p className="text-xs font-bold text-[#666] mt-1">Total referrals issued</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation segmented bar matching app-wombcare tabContainer */}
        <section className="flex bg-[#F1EAFE] p-1.5 rounded-[22px] border border-transparent mx-1.5 sm:mx-0">
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex-1 text-center py-3.5 rounded-[18px] font-bold text-xs sm:text-[15px] tracking-wide transition-all cursor-pointer min-h-[52px] flex items-center justify-center gap-1.5 ${
              activeTab === "referrals"
                ? "bg-[#111] text-white shadow-md"
                : "text-[#777] hover:text-[#111]"
            }`}
          >
            Referrals Feed
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`flex-1 text-center py-3.5 rounded-[18px] font-bold text-xs sm:text-[15px] tracking-wide transition-all cursor-pointer min-h-[52px] flex items-center justify-center gap-1.5 ${
              activeTab === "patients"
                ? "bg-[#111] text-white shadow-md"
                : "text-[#777] hover:text-[#111]"
            }`}
          >
            My Active Patients
          </button>
        </section>

        {/* --- REFERRALS TAB CONTENT --- */}
        {activeTab === "referrals" && (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* Quick Referral Form Card (faithful to mobile app formCard) */}
            <div className="md:col-span-5 bg-white rounded-[34px] p-6 shadow-sm border border-slate-100/50 space-y-6">
              <div>
                <h3 className="text-[26px] font-black text-[#111] leading-none">Referral Details</h3>
                <p className="text-xs text-slate-500 mt-2">Enter patient coordinates and wellness category</p>
              </div>

              {submitError && (
                <div className="p-3 bg-[#FFE5EF] border border-[#FFE4E1] text-[#FF4D8D] text-xs font-semibold rounded-xl">
                  <span>⚠️ {submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl">
                  <span>🌸 {submitSuccess}</span>
                </div>
              )}

              <form onSubmit={handleReferSubmit} className="space-y-4">
                <div>
                  <label className="block text-[#555] text-xs font-bold mb-2">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-[18px] h-[58px] bg-[#FAFAFA] border border-[#EEE] rounded-[18px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#FF4D8D] focus:bg-white transition-all text-base sm:text-[15px]"
                    placeholder="Enter patient full name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[#555] text-xs font-bold mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-[18px] h-[58px] bg-[#FAFAFA] border border-[#EEE] rounded-[18px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#FF4D8D] focus:bg-white transition-all text-base sm:text-[15px]"
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[#555] text-xs font-bold mb-2">
                    Clinical Goal / Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProblem("PCOD/PMOS")}
                      className={`py-3 px-3 rounded-[16px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[48px] ${
                        problem === "PCOD/PMOS"
                          ? "bg-[#FF4D8D] border-transparent text-white shadow-sm"
                          : "bg-[#FFF0F5] border-[1.5px] border-[#FFE4E1] text-[#FF4D8D] hover:bg-[#FFE5EF]"
                      }`}
                    >
                      PCOS/PCOD/PMOS
                    </button>

                    <button
                      type="button"
                      onClick={() => setProblem("Conceive")}
                      className={`py-3 px-3 rounded-[16px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[48px] ${
                        problem === "Conceive"
                          ? "bg-[#FF4D8D] border-transparent text-white shadow-sm"
                          : "bg-[#FFF0F5] border-[1.5px] border-[#FFE4E1] text-[#FF4D8D] hover:bg-[#FFE5EF]"
                      }`}
                    >
                      Conceive
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[58px] bg-[#111] hover:bg-[#222] text-white font-bold rounded-[24px] text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Submit Patient Referral"
                  )}
                </button>
              </form>
            </div>

            {/* Recent Referrals List */}
            <div className="md:col-span-7 space-y-4">
              <h3 className="text-[24px] font-black text-[#111] px-1 sm:px-0">Recent Referrals</h3>

              {loading && referrals.length === 0 ? (
                <div className="bg-white rounded-[28px] p-10 text-center shadow-sm border border-slate-100">
                  <div className="w-6 h-6 border-2 border-[#FF4D8D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-xs font-semibold">Syncing referrals list...</p>
                </div>
              ) : activeReferralsList.length === 0 ? (
                <div className="bg-white rounded-[28px] p-10 text-center shadow-sm border border-slate-100/50 flex flex-col items-center justify-center">
                  <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-500 font-bold text-xs">No active referrals found</p>
                </div>
              ) : (
                <div className="grid gap-3.5">
                  {activeReferralsList.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white rounded-[28px] p-[22px] shadow-sm flex items-center justify-between gap-3 border border-slate-100/40 hover:border-pink-100 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-[#111] text-[18px] leading-tight">{ref.patientName}</p>
                        <p className="text-[#555] text-sm font-normal">
                          Clinical Condition: <span className="font-semibold text-[#FF4D8D]">{ref.problem}</span>
                        </p>
                        <p className="text-[#999] text-xs font-medium">
                          {ref.mobile} • {new Date(ref.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>

                      <span
                        className={`text-[11px] font-extrabold uppercase px-3 py-1.5 rounded-full border tracking-wider flex-shrink-0 ${
                          ref.referralStatus === "pending"
                            ? "bg-[#FFE5EF] border-transparent text-[#111]"
                            : ref.referralStatus === "contacted"
                            ? "bg-[#EEE9FF] border-transparent text-[#111]"
                            : ref.referralStatus === "converted"
                            ? "bg-[#DCFCE7] border-transparent text-[#16A34A]"
                            : "bg-[#FEE2E2] border-transparent text-[#EF4444]"
                        }`}
                      >
                        {ref.referralStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* --- PATIENTS TAB CONTENT --- */}
        {activeTab === "patients" && (
          <section className="space-y-4">
            
            {/* Search Input Bar (matching searchBarContainer in doctor.tsx) */}
            <div className="bg-white rounded-[18px] border border-[#E2D9F3] flex items-center px-4 h-[52px] shadow-sm w-full gap-2.5">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by name, email, referral code..."
                className="bg-transparent border-none outline-none text-[#111] placeholder-[#A0A0A0] text-base sm:text-sm ml-2 w-full focus:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#999] hover:text-[#555] cursor-pointer p-1">
                  <CloseIcon />
                </button>
              )}
            </div>

            {/* Converted Patients Grid */}
            {loading && activePatientsList.length === 0 ? (
              <div className="bg-white rounded-[28px] p-10 text-center shadow-sm">
                <div className="w-6 h-6 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-xs">Syncing patient roster...</p>
              </div>
            ) : activePatientsList.length === 0 ? (
              <div className="bg-white rounded-[28px] p-10 text-center shadow-sm flex flex-col items-center justify-center border border-slate-100">
                <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-[#999] font-medium text-[15px]">No converted referral patients yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {activePatientsList.map((pat) => (
                  <div
                    key={pat.id}
                    className="bg-white rounded-[30px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-[#7C5CFF] transition-all gap-5"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-[#111] text-[20px]">
                          {pat.patientName}
                        </p>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="text-[#7C5CFF] font-medium text-sm">Referral Code: <span className="font-bold font-mono">{pat.doctorReferralCode}</span></p>
                        {pat.email && <p className="text-[#999] text-xs font-semibold">{pat.email}</p>}
                        <p className="text-[#999] text-xs font-semibold">Mobile: {pat.mobile}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenDossier(pat.id)}
                      className="w-full py-2.5 bg-[#DCFCE7] hover:bg-emerald-100 text-[#16A34A] font-bold rounded-full text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <span>View Dossier</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* --- PATIENT HEALTH DOSSIER SIDE-PANEL / DRAWERS (LAID OUT EXACTLY AS THE APP VIEWS) --- */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 bg-[#111]/50 backdrop-blur-sm flex justify-end transition-opacity duration-300">
          
          {/* Side panel uses background #F8F4FF just like in the app-wombcare dossier screen */}
          <div className="bg-[#F8F4FF] w-full md:max-w-3xl h-full flex flex-col shadow-2xl relative animate-slide-in">
            
            {/* Header section (matching modalHeader) */}
            <div className="p-5 border-b border-[#EEE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <ArrowLeftIcon />
                </button>
                <div>
                  <h2 className="font-bold text-[#111] text-[24px] max-w-[200px] sm:max-w-xs truncate leading-none">
                    {dossierLoading
                      ? "Loading Profile..."
                      : dossierData?.patient?.patientName || "Clinical Dossier"}
                  </h2>
                  {!dossierLoading && (
                    <p className="text-[13px] text-[#666] truncate max-w-[200px] sm:max-w-xs mt-1">
                      {dossierData?.patient?.email ? `${dossierData.patient.email} • ` : ""}
                      {dossierData?.patient?.mobile || ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientId(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content Segment tabs (dossierTabContainer style) */}
            {dossierLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-500 text-xs font-semibold">Retrieving Clinical Dossier File...</p>
              </div>
            ) : (
              <>
                {/* Dossier tabs segment bar */}
                <div className="p-[20px] pb-1">
                  <div className="flex bg-[#F0E9FF] p-[4px] rounded-[16px] border border-transparent w-full">
                    <button
                      onClick={() => setDossierTab("overview")}
                      className={`py-2 px-3 text-[13px] font-bold transition-all rounded-[12px] cursor-pointer flex items-center gap-1.5 flex-1 justify-center min-h-[38px] ${
                        dossierTab === "overview"
                          ? "bg-[#7C5CFF] text-white shadow-sm"
                          : "text-[#7C5CFF]"
                      }`}
                    >
                      Clinical Profile
                    </button>
                    <button
                      onClick={() => setDossierTab("timeline")}
                      className={`py-2 px-3 text-[13px] font-bold transition-all rounded-[12px] cursor-pointer flex items-center gap-1.5 flex-1 justify-center min-h-[38px] ${
                        dossierTab === "timeline"
                          ? "bg-[#7C5CFF] text-white shadow-sm"
                          : "text-[#7C5CFF]"
                      }`}
                    >
                      Date-wise History
                    </button>
                  </div>
                </div>

                {/* Dossier details scroll view */}
                <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
                  {dossierTab === "overview" ? (
                    <>
                      {/* Clinical Biometrics Card (dossierCard) */}
                      <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                        <h4 className="font-bold text-[#111] text-[18px]">Clinical Profile</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Age</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {dossierData?.profile?.age ? `${dossierData.profile.age} years` : "Not specified"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Weight</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {dossierData?.profile?.weight ? `${dossierData.profile.weight} kg` : "Not specified"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Height</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {dossierData?.profile?.height ? `${dossierData.profile.height} cm` : "Not specified"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">BMI Ratio</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {(() => {
                                const w = dossierData?.profile?.weight;
                                const h = dossierData?.profile?.height;
                                if (w && h) {
                                  const bmiVal = parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
                                  let cat = "Normal";
                                  if (bmiVal < 18.5) cat = "Underweight";
                                  else if (bmiVal >= 25 && bmiVal < 30) cat = "Overweight";
                                  else if (bmiVal >= 30) cat = "Obese";
                                  return `${bmiVal} (${cat})`;
                                }
                                return "N/A";
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Cycle regularity</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {dossierData?.patient?.cycleRegularity || "Regular"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Country</span>
                            <span className="text-[16px] font-bold text-[#111] mt-1 block">
                              {dossierData?.patient?.country || "India"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Care Program Card (dossierCard) */}
                      <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                        <h4 className="font-bold text-[#111] text-[18px]">Care Plan & Goals</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Active Subscription</span>
                            {dossierData?.profile?.activePlan ? (
                              <div className={dossierData.profile.activePlan.toLowerCase().includes("premium") ? "bg-[#FFF3D6] rounded-[12px] px-3 py-1 mt-1.5 inline-block" : "bg-[#E0F2FE] rounded-[12px] px-3 py-1 mt-1.5 inline-block"}>
                                <span className={dossierData.profile.activePlan.toLowerCase().includes("premium") ? "text-[#D89B00] text-xs font-bold uppercase" : "text-[#0284C7] text-xs font-bold uppercase"}>
                                  ✨ {dossierData.profile.activePlan}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic mt-1">No plan selected</p>
                            )}
                          </div>

                          <div>
                            <span className="text-[12px] font-bold text-[#999] block uppercase">Water Intake Target</span>
                            <span className="text-xs font-bold text-[#111] mt-2 block">
                              🥛 {dossierData?.profile?.targetWater ? `${dossierData.profile.targetWater} glasses` : "8 glasses"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[12px] font-bold text-[#999] block uppercase mb-1.5">User Highlighted Symptoms</span>
                          {dossierData?.profile?.symptoms && dossierData.profile.symptoms.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {dossierData.profile.symptoms.map((symptom: string, sIdx: number) => (
                                <span key={sIdx} className="bg-[#FFE5EF] text-[#FF4D8D] text-xs font-bold px-3 py-1 rounded-[12px]">
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No active symptoms logged</p>
                          )}
                        </div>

                        <div>
                          <span className="text-[12px] font-bold text-[#999] block uppercase">Baseline Health Problem Description</span>
                          <p className="text-[15px] text-[#444] leading-[22px] mt-1.5">
                            {dossierData?.profile?.personalNotes || dossierData?.patient?.problem || "No personal notes recorded."}
                          </p>
                        </div>
                      </div>

                      {/* Logged Periods (cycleHistoryItem) */}
                      <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                        <h4 className="font-bold text-[#111] text-[18px]">Logged Cycles & Periods</h4>
                        {dossierData?.periodHistory && dossierData.periodHistory.length > 0 ? (
                          <div className="divide-y divide-[#F3EBFD]">
                            {dossierData.periodHistory.map((cycle: any, idx: number) => {
                              const hasEnded = !!cycle.endDate;
                              const bleedingDays = hasEnded
                                ? Math.round((new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24))
                                : null;
                              return (
                                <div key={idx} className="flex items-center py-2.5 gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#FFE5EF] flex items-center justify-center text-pink-500 flex-shrink-0">
                                    🩸
                                  </div>
                                  <div className="text-xs flex-1 space-y-0.5">
                                    <p className="text-[14px] font-medium text-[#111]">
                                      Start: {new Date(cycle.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className={`text-[14px] font-medium ${hasEnded ? "text-[#555]" : "text-[#FF4D8D]"}`}>
                                      End: {hasEnded ? new Date(cycle.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "Ongoing Bleeding"}
                                    </p>
                                    <div className={hasEnded ? "bg-[#DCFCE7] rounded-lg px-2 py-0.5 mt-1 inline-block" : "bg-[#FEE2E2] rounded-lg px-2 py-0.5 mt-1 inline-block"}>
                                      <span className={hasEnded ? "text-[#16A34A] text-[11px] font-semibold" : "text-[#EF4444] text-[11px] font-semibold"}>
                                        {hasEnded ? `${bleedingDays || 1} days bleeding period` : "Period currently active"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#999] italic">No cycle logs tracked yet by user.</p>
                        )}
                      </div>

                      {/* Wellness logs telemetry (wellnessHistoryItem) */}
                      <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                        <h4 className="font-bold text-[#111] text-[18px]">Wellness Telemetry (Last 10 Days)</h4>
                        {dossierData?.wellnessHistory && dossierData.wellnessHistory.length > 0 ? (
                          <div className="divide-y divide-[#F3EBFD]">
                            {dossierData.wellnessHistory.slice(0, 10).map((log: any, idx: number) => (
                              <div key={idx} className="flex items-center py-2.5 gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#EEE9FF] flex items-center justify-center text-purple-500 flex-shrink-0">
                                  ⚡
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <p className="text-[14px] font-bold text-[#111]">
                                    {new Date(log.logDate || log.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                  <div className="flex gap-4 text-[#666] text-xs font-semibold">
                                    <span>Mood: {log.mood || "N/A"}</span>
                                    <span>Sleep: {log.sleep || log.sleepHours || "0"} hrs</span>
                                    <span>Water: {log.waterIntake || log.waterIntakeMl || "0"} ml</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#999] italic">No daily wellness metrics logged yet.</p>
                        )}
                      </div>

                      {/* Clinical Recommendations (dossierCard) */}
                      <div className="bg-white rounded-[28px] p-5 shadow-sm border border-[#EFEAFA] space-y-4">
                        <h4 className="font-bold text-[#111] text-[18px] flex items-center gap-1">
                          Clinical Guidance & Note
                        </h4>
                        <span className="text-[12px] font-bold text-[#999] block uppercase">Doctor Recommendations</span>

                        {noteError && (
                          <div className="p-3 bg-pink-50 border border-pink-100 text-pink-700 text-xs rounded-xl">
                            {noteError}
                          </div>
                        )}

                        {noteSuccess && (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl">
                            {noteSuccess}
                          </div>
                        )}

                        {/* text-base on mobile prevents iOS safari auto-zooming on focus */}
                        <textarea
                          rows={4}
                          className="w-full p-4 bg-[#FAFAFA] border border-[#EFEAFA] rounded-[18px] text-base sm:text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all resize-none"
                          placeholder="Recommend diet plans, supplement schedules, exercise logs, or guidance..."
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                        />

                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNote}
                          className="w-full h-[50px] bg-[#FF4D8D] hover:bg-pink-600 text-white font-bold rounded-[18px] text-[14px] shadow-sm transition-all cursor-pointer flex items-center justify-center"
                        >
                          {savingNote ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Save Clinical Guidance 🌸"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    // DATE-WISE HISTORY TIMELINE (timelineMonthSection)
                    <div className="space-y-6">
                      {Object.keys(timelineDataGrouped).length === 0 ? (
                        <div className="bg-white rounded-[28px] p-8 text-center border border-slate-100">
                          <p className="text-xs text-[#999] italic">No timeline metrics or tracking logs available.</p>
                        </div>
                      ) : (
                        Object.keys(timelineDataGrouped).map((monthYear, mIdx) => (
                          <div key={mIdx} className="space-y-3">
                            <h5 className="text-[13px] font-black text-[#7C5CFF] tracking-wider uppercase ml-1">
                              {monthYear}
                            </h5>

                            <div className="border-l-2 border-[#E2D9F3] pl-[18px] ml-3.5 space-y-4">
                              {timelineDataGrouped[monthYear].map((event, eIdx) => {
                                let badgeColor = "#7C5CFF";
                                if (event.type === "period_start") {
                                  badgeColor = "#FF4D8D";
                                } else if (event.type === "period_end") {
                                  badgeColor = "#10B981";
                                } else if (event.type === "profile_created") {
                                  badgeColor = "#3B82F6";
                                }

                                return (
                                  <div key={eIdx} className="relative timelineEventItem">
                                    {/* Left Icon Badge Circle */}
                                    <div
                                      style={{ borderColor: badgeColor, color: badgeColor }}
                                      className="absolute top-1 left-[-29px] w-[22px] h-[22px] rounded-full bg-white border flex items-center justify-center text-[10px] font-bold"
                                    >
                                      •
                                    </div>
                                    
                                    <div className="bg-white rounded-[14px] p-3 border border-[#F3EBFD] shadow-sm space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-[#111] truncate">{event.title}</p>
                                        <span className="text-[9px] text-[#888] font-bold flex-shrink-0">
                                          {event.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-[#555] leading-relaxed whitespace-pre-line">
                                        {event.details}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Close button at the bottom of the drawer (matching modalCloseButtonFull) */}
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="w-full h-14 bg-[#111] hover:bg-[#222] text-white font-semibold rounded-[24px] text-base transition-all cursor-pointer flex items-center justify-center mt-6"
                  >
                    Close Dossier
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
