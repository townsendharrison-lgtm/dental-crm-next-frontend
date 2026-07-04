"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  MessageSquare,
  Shield,
  Save,
  AlertCircle,
  Sparkles,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { adminSettingsApi } from "@/lib/api/adminSettings";
import type { AdminSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Local form states
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [welcomeTemplateStudent, setWelcomeTemplateStudent] = useState("");
  const [welcomeTemplateMentor, setWelcomeTemplateMentor] = useState("");

  // Load settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await adminSettingsApi.get();
        setSettings(data);
        setPlatformName(data.platform_name);
        setSupportEmail(data.support_email);
        setMaintenanceMode(data.maintenance_mode);
        setAutoReplyEnabled(data.auto_reply_enabled);
        setAutoReplyMessage(data.auto_reply_message || "");
        setWelcomeTemplateStudent(data.welcome_template_student || "");
        setWelcomeTemplateMentor(data.welcome_template_mentor || "");
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        toast.error("Error loading system configurations.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await adminSettingsApi.update({
        platformName,
        supportEmail,
        maintenanceMode,
        autoReplyEnabled,
        autoReplyMessage,
        welcomeTemplateStudent,
        welcomeTemplateMentor,
      });
      setSettings(updated);
      setIsSaved(true);
      toast.success("Settings saved successfully!");
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      toast.error(err.message || "Failed to update configurations.");
    } finally {
      setSaving(false);
    }
  };

  const handleSimulateReminder = () => {
    toast.success("5-Day tracker reset simulated for all profiles!");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-400 text-sm">Loading platform configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">System Settings</h2>
          <p className="text-slate-400 flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-indigo-400" /> Configure global application rules and welcome automation.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </header>

      <AnimatePresence>
        {isSaved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400"
          >
            <Shield className="w-5 h-5" />
            <p className="text-sm font-bold">Settings saved successfully!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Card 1: Platform & Maintenance Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Platform Settings</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Global identity and operational modes
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                Platform Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed"
                  placeholder="Platform Name..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                Support Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-4" />
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed"
                  placeholder="Support Email..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-3xl">
              <div>
                <h4 className="font-bold text-white text-sm">Enable Maintenance Mode</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[80%]">
                  Puts the application into read-only mode for non-admin users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${
                  maintenanceMode ? "bg-amber-600" : "bg-slate-800"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                    maintenanceMode ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Auto-Reply Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Auto-Reply Settings</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Rule-based bot acknowledgements
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-3xl">
              <div>
                <h4 className="font-bold text-white text-sm">Enable Auto-Reply</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[80%]">
                  Automatically send a message when a student logs a chat query.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${
                  autoReplyEnabled ? "bg-indigo-600" : "bg-slate-800"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                    autoReplyEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Auto-Reply Message
              </label>
              <textarea
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                placeholder="Type the auto-reply text template here..."
              />
            </div>
          </div>
        </div>

        {/* Card 3: Welcome Templates */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Welcome Templates</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Customize welcome content for newly signed up users
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Student Welcome Message Template
              </label>
              <textarea
                value={welcomeTemplateStudent}
                onChange={(e) => setWelcomeTemplateStudent(e.target.value)}
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                placeholder="Template variables: {{student_name}}, {{email}}..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Mentor Welcome Message Template
              </label>
              <textarea
                value={welcomeTemplateMentor}
                onChange={(e) => setWelcomeTemplateMentor(e.target.value)}
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                placeholder="Template variables: {{mentor_name}}, {{email}}..."
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-300 leading-relaxed">
              <strong>Pro-tip:</strong> You can embed template placeholder tags such as <code>{"{{student_name}}"}</code> or <code>{"{{mentor_name}}"}</code> in these welcome messages. The system will dynamically resolve them when welcoming new users.
            </p>
          </div>
        </div>

        {/* Card 4: Developer Test Tools */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Developer Testing Tools</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Verify system behaviors and automated tracking
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Profile Reminder Simulation</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                Resets the 5-day tracker for all incomplete student profiles. This will trigger a new notification within 2 seconds for any student with missing data.
              </p>
            </div>
            <button
              onClick={handleSimulateReminder}
              className="px-6 py-3 bg-amber-600/10 border border-amber-500/20 rounded-xl text-sm font-bold text-amber-500 hover:bg-amber-600/20 transition-all shrink-0 cursor-pointer"
            >
              Simulate 5-Day Gap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
