import React from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Terminal,
  Activity,
  Cpu,
  Radio,
  History,
  Settings,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { SystemOverview } from "@stuff-manager/shared";

export type NavTab =
  | "overview"
  | "all-packages"
  | "brew"
  | "npm"
  | "pip"
  | "cargo"
  | "ports"
  | "processes"
  | "containers"
  | "doctor"
  | "history"
  | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  overview?: SystemOverview;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  overview,
}) => {
  const brewCount =
    overview?.managers.find((m) => m.id === "brew")?.packageCount || 0;
  const npmCount =
    overview?.managers.find((m) => m.id === "npm")?.packageCount || 0;
  const pipCount =
    overview?.managers.find((m) => m.id === "pip")?.packageCount || 0;
  const cargoCount =
    overview?.managers.find((m) => m.id === "cargo")?.packageCount || 0;
  const totalPackages = overview?.totalPackages || 0;
  const updatesCount = overview?.totalUpdates || 0;
  const portsCount = overview?.totalPorts || 0;

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "all-packages",
      label: "All Packages",
      icon: Package,
      badge: totalPackages > 0 ? totalPackages : undefined,
      badgeColor:
        updatesCount > 0
          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          : undefined,
    },
    {
      id: "brew",
      label: "Homebrew",
      icon: Boxes,
      badge: brewCount > 0 ? brewCount : undefined,
    },
    {
      id: "npm",
      label: "npm Global",
      icon: Terminal,
      badge: npmCount > 0 ? npmCount : undefined,
    },
    {
      id: "pip",
      label: "Python (pip)",
      icon: Terminal,
      badge: pipCount > 0 ? pipCount : undefined,
    },
    {
      id: "cargo",
      label: "Cargo (Rust)",
      icon: Terminal,
      badge: cargoCount > 0 ? cargoCount : undefined,
    },
  ];

  const systemItems = [
    {
      id: "ports",
      label: "Listening Ports",
      icon: Radio,
      badge: portsCount > 0 ? portsCount : undefined,
    },
    {
      id: "processes",
      label: "Processes & Services",
      icon: Cpu,
      badge: overview?.runningProcessesCount,
    },
    {
      id: "doctor",
      label: "Environment Doctor",
      icon: Activity,
      alert: overview?.doctorIssuesCount
        ? `${overview.doctorIssuesCount} issues`
        : undefined,
    },
    { id: "containers", label: "Containers & ADB", icon: Smartphone },
    { id: "history", label: "Operation History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0c121e]/90 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow-primary">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              PACKAGE GUI
            </h1>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {typeof window !== "undefined" ? window.location.host : "127.0.0.1:7421"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Navigation */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Software Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      item.badgeColor || "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Diagnostics, Ports, Processes */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            System & Runtime
          </div>
          {systemItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.alert && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.alert}
                  </span>
                )}
                {item.badge !== undefined && !item.alert && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
          <span className="text-slate-300 font-semibold truncate pr-2">
            {overview?.os?.displayName
              ? overview.os.displayName.split("(")[0].trim()
              : "Local Node"}
          </span>
          <span className="text-emerald-400 flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Shell: {overview?.os?.shell || "default"}</span>
          <span className="text-blue-400 font-semibold">
            {updatesCount} updates
          </span>
        </div>
      </div>
    </aside>
  );
};
