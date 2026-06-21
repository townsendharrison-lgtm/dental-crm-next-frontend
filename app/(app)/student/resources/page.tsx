"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  Search,
  Zap,
  MessageCircle,
  FileText,
  Shield,
  Target,
  Users,
  Award,
  Rocket,
  CheckCircle,
  Star,
  Trophy,
  Flame,
  Heart,
  BarChart,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface ResourceItem {
  id: string;
  title: string;
  url: string;
  estimatedTime: string;
  category: string;
  icon: string;
}

const RESOURCES: ResourceItem[] = [
  { id: "r1", title: "Find a Dentist", url: "/student/find-dentist", estimatedTime: "5m", category: "Outreach", icon: "Search" },
  { id: "r2", title: "DAT Accelerator", url: "https://dataccelerator.com", estimatedTime: "Ongoing", category: "Study", icon: "Zap" },
  { id: "r3", title: "Mentor Assistant", url: "/student/mentor-assistant", estimatedTime: "10m", category: "Support", icon: "MessageCircle" },
  { id: "r4", title: "Personal Statement Help", url: "#", estimatedTime: "30m", category: "Writing", icon: "FileText" },
  { id: "r5", title: "Letter Vault", url: "/student/letters/vault", estimatedTime: "15m", category: "Documents", icon: "Shield" },
  { id: "r6", title: "Casper Hub", url: "#", estimatedTime: "20m", category: "Testing", icon: "Target" },
  { id: "r7", title: "Interview Hub", url: "#", estimatedTime: "45m", category: "Interview", icon: "Users" },
  { id: "r8", title: "Competitive Alignment Index", url: "#", estimatedTime: "10m", category: "Analytics", icon: "BarChart" },
];

export default function ResourcesPage() {
  const router = useRouter();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Search": return <Search size={24} />;
      case "Zap": return <Zap size={24} />;
      case "MessageCircle": return <MessageCircle size={24} />;
      case "FileText": return <FileText size={24} />;
      case "Shield": return <Shield size={24} />;
      case "Target": return <Target size={24} />;
      case "Users": return <Users size={24} />;
      case "BookOpen": return <BookOpen size={24} />;
      case "Award": return <Award size={24} />;
      case "Rocket": return <Rocket size={24} />;
      case "CheckCircle": return <CheckCircle size={24} />;
      case "Star": return <Star size={24} />;
      case "Trophy": return <Trophy size={24} />;
      case "Flame": return <Flame size={24} />;
      case "Heart": return <Heart size={24} />;
      case "BarChart": return <BarChart size={24} />;
      default: return <BookOpen size={24} />;
    }
  };

  const handleResourceClick = (resource: ResourceItem) => {
    if (resource.url.startsWith("/")) {
      router.push(resource.url);
    } else if (resource.url === "#") {
      toast.info(`${resource.title} is coming soon!`);
    } else {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black text-white tracking-tighter mb-2"
          >
            STUDENT <span className="text-indigo-500">RESOURCES</span>
          </motion.h1>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">
            Essential Tools & Support for Your Journey
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RESOURCES.map((resource, index) => {
            const isInternal = resource.url.startsWith("/");
            const isPlaceholder = resource.url === "#";

            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleResourceClick(resource)}
                className="group bg-slate-900/40 border border-slate-800 p-8 rounded-3xl hover:border-indigo-500/50 transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                {!isInternal && !isPlaceholder && (
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={20} className="text-indigo-400" />
                  </div>
                )}

                <div>
                  <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    {getIcon(resource.icon)}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {resource.category} • {resource.estimatedTime}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  {isInternal ? "Open Feature" : isPlaceholder ? "Coming Soon" : "Access Resource"}{" "}
                  <ChevronRight size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
