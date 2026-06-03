"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";

// Interface definitions to match Backend model structure
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

// Inline SVGs as React components for visual excellence without extra packages
const SparklesIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RefreshIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Check existing session on load
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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Checking doctor session...</p>
        </div>
      </div>
    );
  }

  // --- LOGIN INTERFACE ---
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 relative flex items-center justify-center p-6 overflow-hidden selection:bg-pink-100 selection:text-pink-900">
        {/* Soft floating blurred background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-200/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100/50 shadow-2xl p-8 relative z-10 transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Womb<span className="text-pink-500">Care</span>
            </h1>
            <p className="text-sm text-purple-600 font-semibold tracking-wide uppercase mt-1">
              Doctor Clinical Portal
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Sign in to manage patient referrals and clinical health metrics
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-pink-50 border border-pink-100 text-pink-700 text-sm rounded-2xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-1">
                Clinical Email ID
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all text-sm"
                placeholder="doctor@wombcare.in"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all text-sm"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

  // --- MAIN PORTAL INTERFACE ---
  return (
    <main className="min-h-screen bg-slate-50 selection:bg-pink-100 selection:text-pink-900 relative">
      {/* Floating blurred accent blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-pink-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />

      {/* Navigation Top bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-purple-600 to-pink-500 w-10 h-10 rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Womb<span className="text-pink-500">Care</span>
              </h1>
              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                Doctor Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              🩺 Dr. {doctorInfo?.name || "Practitioner"}
            </span>

            <button
              onClick={() => loadData()}
              disabled={loading}
              title="Refresh Dashboard Data"
              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <RefreshIcon className={`w-5 h-5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 relative z-10">
        
        {/* Welcome & Overview Stats */}
        <section className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <h2 className="text-slate-500 text-sm font-semibold">Account Clinic</h2>
            <div className="mt-4">
              <p className="text-lg font-bold text-slate-800">{doctorInfo?.hospital || "WombCare Health"}</p>
              <p className="text-xs text-slate-500 mt-1">Specialization: {doctorInfo?.specialty || "Hormonal Health"}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Referral Code:</span>
              <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{doctorInfo?.referralCode || "N/A"}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center flex-shrink-0">
              <UserGroupIcon />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800">{totalPatients}</p>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">Active Converted Patients</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <DocumentTextIcon />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800">{totalReferrals}</p>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">Total Referrals Sent</p>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <section className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("referrals")}
            className={`pb-4 px-6 font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
              activeTab === "referrals"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Clinical Referrals
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`pb-4 px-6 font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
              activeTab === "patients"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My Active Patients
          </button>
        </section>

        {/* --- REFERRALS TAB CONTENT --- */}
        {activeTab === "referrals" && (
          <section className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* Quick Referral Form (40% width on Desktop) */}
            <div className="md:col-span-5 bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-6">
              
              {/* Form Hero header */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Quick Referral</h3>
                  <p className="text-xs text-pink-50 mt-1">Register a patient to WombCare instantly</p>
                </div>
                <SparklesIcon />
              </div>

              {submitError && (
                <div className="p-3.5 bg-pink-50 border border-pink-100 text-pink-700 text-xs rounded-xl flex items-center gap-2">
                  <span>⚠️ {submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <span>🌸 {submitSuccess}</span>
                </div>
              )}

              <form onSubmit={handleReferSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1.5">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-xs"
                    placeholder="Enter patient full name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-xs"
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1.5">
                    Clinical Goal / Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProblem("PCOD/PMOS")}
                      className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        problem === "PCOD/PMOS"
                          ? "bg-pink-50 border-pink-200 text-pink-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      PCOS/PCOD/PMOS
                    </button>

                    <button
                      type="button"
                      onClick={() => setProblem("Conceive")}
                      className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        problem === "Conceive"
                          ? "bg-pink-50 border-pink-200 text-pink-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Conceive
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs shadow-md shadow-pink-100 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Submit Patient Referral"
                  )}
                </button>
              </form>
            </div>

            {/* Recent Referrals List (60% width on Desktop) */}
            <div className="md:col-span-7 space-y-4">
              <h3 className="font-bold text-slate-800 text-lg">Recent Clinical Referrals</h3>

              {loading && referrals.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                  <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Syncing referrals list...</p>
                </div>
              ) : activeReferralsList.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                  <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-500 font-semibold text-sm">No referrals sent yet</p>
                  <p className="text-slate-400 text-xs mt-1">Submit referred patient on the left panel to begin.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeReferralsList.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">{ref.patientName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {ref.problem}
                          </span>
                          <span>•</span>
                          <span>{ref.mobile}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Referred on {new Date(ref.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-full border tracking-wider ${
                          ref.referralStatus === "pending"
                            ? "bg-amber-50 border-amber-200 text-amber-600"
                            : ref.referralStatus === "contacted"
                            ? "bg-sky-50 border-sky-200 text-sky-600"
                            : ref.referralStatus === "converted"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-rose-50 border-rose-200 text-rose-600"
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
          <section className="space-y-6">
            
            {/* Search and Hero Area */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-500 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl">Clinical Patient Roster</h3>
                <p className="text-xs text-purple-100 mt-1">Review user cycle updates, health questionnaires, and write notes</p>
              </div>

              {/* Search Bar */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center px-4 py-2 w-full md:max-w-sm">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by name, code, phone..."
                  className="bg-transparent border-none outline-none text-white placeholder-purple-200 text-sm ml-2 w-full focus:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-white/60 hover:text-white cursor-pointer">
                    <CloseIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Converted Patients Grid */}
            {loading && activePatientsList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Syncing converted patients...</p>
              </div>
            ) : activePatientsList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-slate-500 font-semibold text-sm">No converted patients yet</p>
                <p className="text-slate-400 text-xs mt-1">Referred users will appear here once they complete app registration.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {activePatientsList.map((pat) => (
                  <div
                    key={pat.id}
                    className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-lg">
                          {pat.patientName}
                        </p>
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                          Converted
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>Code: <span className="font-mono font-bold text-slate-700">{pat.doctorReferralCode}</span></p>
                        <p>Mobile: <span className="text-slate-700">{pat.mobile}</span></p>
                        {pat.email && <p>Email: <span className="text-slate-700">{pat.email}</span></p>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenDossier(pat.id)}
                      className="mt-6 w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>View Health Dossier</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* --- PATIENT HEALTH DOSSIER SIDE-PANEL / MODAL --- */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity duration-300">
          <div className="bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl relative animate-slide-in">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-all cursor-pointer"
                >
                  <ArrowLeftIcon />
                </button>
                <div>
                  <h2 className="font-black text-slate-800 text-xl">
                    {dossierLoading
                      ? "Loading Patient File..."
                      : dossierData?.patient?.patientName || "Clinical Dossier"}
                  </h2>
                  {!dossierLoading && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dossierData?.patient?.email ? `${dossierData.patient.email} • ` : ""}
                      {dossierData?.patient?.mobile || ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientId(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Dossier Loading Spinner */}
            {dossierLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-500 text-sm font-semibold">Retrieving Clinical Dossier File...</p>
              </div>
            ) : (
              <>
                {/* Dossier Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/30 px-6">
                  <button
                    onClick={() => setDossierTab("overview")}
                    className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      dossierTab === "overview"
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Clinical Profile
                  </button>
                  <button
                    onClick={() => setDossierTab("timeline")}
                    className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      dossierTab === "timeline"
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date-wise History
                  </button>
                </div>

                {/* Dossier Content Scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {dossierTab === "overview" ? (
                    <>
                      {/* Clinical Profile Grid */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h4 className="font-bold text-slate-800 text-sm">Biometrics & Parameters</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Age</span>
                            <span className="text-sm font-bold text-slate-800">
                              {dossierData?.profile?.age ? `${dossierData.profile.age} years` : "N/A"}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Weight</span>
                            <span className="text-sm font-bold text-slate-800">
                              {dossierData?.profile?.weight ? `${dossierData.profile.weight} kg` : "N/A"}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Height</span>
                            <span className="text-sm font-bold text-slate-800">
                              {dossierData?.profile?.height ? `${dossierData.profile.height} cm` : "N/A"}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">BMI Status</span>
                            <span className="text-sm font-bold text-slate-800">
                              {(() => {
                                const w = dossierData?.profile?.weight;
                                const h = dossierData?.profile?.height;
                                if (w && h) {
                                  const bmiVal = parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
                                  let cat = "Normal";
                                  if (bmiVal < 18.5) cat = "Under";
                                  else if (bmiVal >= 25 && bmiVal < 30) cat = "Over";
                                  else if (bmiVal >= 30) cat = "Obese";
                                  return `${bmiVal} (${cat})`;
                                }
                                return "N/A";
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Cycle Regularity</span>
                            <span className="text-sm font-bold text-slate-800">
                              {dossierData?.patient?.cycleRegularity || "Regular"}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Location Country</span>
                            <span className="text-sm font-bold text-slate-800">
                              {dossierData?.patient?.country || "India"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Care Program Card */}
                      <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h4 className="font-bold text-slate-800 text-sm">Care Plan & Goals</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Active Subscription</span>
                            <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${
                              dossierData?.profile?.activePlan
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {dossierData?.profile?.activePlan || "NO ACTIVE PLAN"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Daily Hydration Goal</span>
                            <span className="text-xs font-bold text-slate-700 mt-1 block">
                              🥛 {dossierData?.profile?.targetWater ? `${dossierData.profile.targetWater} glasses` : "8 glasses"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Highlighted Symptoms</span>
                          {dossierData?.profile?.symptoms && dossierData.profile.symptoms.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {dossierData.profile.symptoms.map((symptom: string, sIdx: number) => (
                                <span key={sIdx} className="bg-pink-50 text-pink-600 border border-pink-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No symptoms tracked by user</p>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Onboarding Clinical Goal</span>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            🎯 {dossierData?.profile?.wellnessGoal || dossierData?.patient?.problem || "PCOD Management"}
                          </p>
                        </div>
                      </div>

                      {/* Logged Periods */}
                      <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h4 className="font-bold text-slate-800 text-sm">Logged Cycle History</h4>
                        {dossierData?.periodHistory && dossierData.periodHistory.length > 0 ? (
                          <div className="space-y-3">
                            {dossierData.periodHistory.map((cycle: any, idx: number) => {
                              const hasEnded = !!cycle.endDate;
                              const bleedingDays = hasEnded
                                ? Math.round((new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24))
                                : null;
                              return (
                                <div key={idx} className="flex gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-500">
                                    🩸
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold text-slate-800">
                                      Start: {new Date(cycle.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-slate-500">
                                      End: {hasEnded ? new Date(cycle.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-pink-600 font-bold">Ongoing Bleeding Phase</span>}
                                    </p>
                                    <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded mt-1 ${
                                      hasEnded ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-pink-50 text-pink-600 border border-pink-100 animate-pulse"
                                    }`}>
                                      {hasEnded ? `${bleedingDays || 1} Days bleeding period` : "Active phase"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No cycle logs tracked yet by patient</p>
                        )}
                      </div>

                      {/* Daily Wellness Logs */}
                      <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h4 className="font-bold text-slate-800 text-sm">Wellness Telemetry (Last 10 Logs)</h4>
                        {dossierData?.wellnessHistory && dossierData.wellnessHistory.length > 0 ? (
                          <div className="space-y-3">
                            {dossierData.wellnessHistory.slice(0, 10).map((log: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between bg-slate-50/30 p-3 rounded-xl border border-slate-100 text-xs">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-700">
                                    {new Date(log.logDate || log.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                  <div className="flex gap-4 text-slate-500 text-[10px]">
                                    <span>Mood: {log.mood || "N/A"}</span>
                                    <span>Sleep: {log.sleep || log.sleepHours || "0"} hrs</span>
                                    <span>Water: {log.waterIntake || log.waterIntakeMl || "0"} ml</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">Day {log.cycleDay || "N/A"}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No daily wellness telemetry logged by user</p>
                        )}
                      </div>

                      {/* Clinical Recommendations */}
                      <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          ✍️ Clinical Guidance & Notes
                        </h4>

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

                        <textarea
                          rows={5}
                          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all resize-none"
                          placeholder="Write custom instructions, recommendations, or clinical coaching notes..."
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                        />

                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNote}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center"
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
                    // TIMELINE DATE-WISE VIEW
                    <div className="space-y-6">
                      {Object.keys(timelineDataGrouped).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center p-8">No chronological history logs tracked</p>
                      ) : (
                        Object.keys(timelineDataGrouped).map((monthYear, mIdx) => (
                          <div key={mIdx} className="space-y-4">
                            <h5 className="text-xs font-black text-purple-600 tracking-wider uppercase bg-purple-50 px-3 py-1 rounded inline-block">
                              {monthYear}
                            </h5>

                            <div className="border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
                              {timelineDataGrouped[monthYear].map((event, eIdx) => {
                                let badgeColor = "bg-purple-100 text-purple-600";
                                if (event.type === "period_start") {
                                  badgeColor = "bg-pink-100 text-pink-600";
                                } else if (event.type === "period_end") {
                                  badgeColor = "bg-emerald-100 text-emerald-600";
                                } else if (event.type === "profile_created") {
                                  badgeColor = "bg-sky-100 text-sky-600";
                                }

                                return (
                                  <div key={eIdx} className="relative space-y-1">
                                    {/* Event Bullet */}
                                    <div className="absolute top-1 left-[-22px] w-3 h-3 rounded-full bg-white border-2 border-purple-500" />
                                    
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${badgeColor}`}>
                                        {event.type.replace("_", " ")}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {event.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-xs">{event.title}</p>
                                    <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                                      {event.details}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
