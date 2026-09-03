import React from 'react';
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
} from 'lucide-react';
import { SystemOverview } from '@stuff-manager/shared';

export type NavTab =
  | 'overview'
  | 'all-packages'
  | 'brew'
  | 'npm'
  | 'pip'
  | 'cargo'
  | 'ports'
  | 'processes'
  | 'containers'
  | 'doctor'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  overview?: SystemOverview;
}

// Stable badge: fixed height, min-width so content never resizes the row.
// Always rendered (even if empty) on items that can have a badge, so columns
// are permanently reserved and switching active state never shifts widths.
const NavBadge: React.FC<{
  value?: number | string;
  variant?: 'default' | 'warning';
  visible: boolean;
}> = ({ value, variant = 'default', visible }) => {
  // Keep the node in the DOM at all times so column layout stays stable.
  // When not visible we render an invisible zero-width placeholder.
  if (!visible) {
    return <span className="inline-flex w-0 overflow-hidden" aria-hidden="true" />;
  }
  if (variant === 'warning') {
    return (
      <span
        className="
          inline-flex items-center justify-center
          h-5 min-w-[2.5rem] px-1.5
          rounded-full font-mono text-[11px] whitespace-nowrap
          bg-amber-500/20 text-amber-300 border border-amber-500/30
        "
      >
        {value}
      </span>
    );
  }
  return (
    <span
      className="
        inline-flex items-center justify-center
        h-5 min-w-[1.75rem] px-1.5
        rounded-full font-mono text-xs
        bg-slate-800 text-slate-300
      "
    >
      {value}
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, overview }) => {
  const brewCount = overview?.managers.find((m) => m.id === 'brew')?.packageCount || 0;
  const npmCount = overview?.managers.find((m) => m.id === 'npm')?.packageCount || 0;
  const pipCount = overview?.managers.find((m) => m.id === 'pip')?.packageCount || 0;
  const cargoCount = overview?.managers.find((m) => m.id === 'cargo')?.packageCount || 0;
  const totalPackages = overview?.totalPackages || 0;
  const updatesCount = overview?.totalUpdates || 0;
  const portsCount = overview?.totalPorts || 0;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, hasBadge: false },
    {
      id: 'all-packages',
      label: 'All Packages',
      icon: Package,
      hasBadge: true,
      badge: totalPackages > 0 ? totalPackages : undefined,
      badgeVariant: 'default' as const,
    },
    {
      id: 'brew',
      label: 'Homebrew',
      icon: Boxes,
      hasBadge: true,
      badge: brewCount > 0 ? brewCount : undefined,
      badgeVariant: 'default' as const,
    },
    {
      id: 'npm',
      label: 'npm Global',
      icon: Terminal,
      hasBadge: true,
      badge: npmCount > 0 ? npmCount : undefined,
      badgeVariant: 'default' as const,
    },
    {
      id: 'pip',
      label: 'Python (pip)',
      icon: Terminal,
      hasBadge: true,
      badge: pipCount > 0 ? pipCount : undefined,
      badgeVariant: 'default' as const,
    },
    {
      id: 'cargo',
      label: 'Cargo (Rust)',
      icon: Terminal,
      hasBadge: true,
      badge: cargoCount > 0 ? cargoCount : undefined,
      badgeVariant: 'default' as const,
    },
  ];

  const systemItems = [
    {
      id: 'ports',
      label: 'Listening Ports',
      icon: Radio,
      hasBadge: true,
      badge: portsCount > 0 ? portsCount : undefined,
      badgeVariant: 'default' as const,
    },
    {
      id: 'processes',
      label: 'Processes & Services',
      icon: Cpu,
      hasBadge: true,
      badge: overview?.runningProcessesCount,
      badgeVariant: 'default' as const,
    },
    {
      id: 'doctor',
      label: 'Environment Doctor',
      icon: Activity,
      hasBadge: true,
      badge: overview?.doctorIssuesCount ? `${overview.doctorIssuesCount} issues` : undefined,
      badgeVariant: 'warning' as const,
    },
    { id: 'containers', label: 'Containers & ADB', icon: Smartphone, hasBadge: false },
    { id: 'history', label: 'Operation History', icon: History, hasBadge: false },
    { id: 'settings', label: 'Settings', icon: Settings, hasBadge: false },
  ];

  // Shared nav-item style. The key fix is that ALL items always have a border —
  // inactive items use border-transparent so the border takes up space but is
  // invisible. This prevents any layout shift when the active border appears.
  const navItemBase = `
    w-full flex items-center justify-between
    px-3 rounded-lg text-sm font-medium
    border
    transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c121e]
  `.trim();

  // Fixed height so active-state styling never changes the element's box.
  // 36px (h-9) is consistent across all items.
  const navItemHeight = 'h-9';

  const activeStyle = 'bg-blue-600/15 text-blue-400 border-blue-500/30 shadow-sm';
  const inactiveStyle = 'text-slate-300 hover:text-white hover:bg-slate-800/50 border-transparent';

  const renderNavItem = (item: typeof navItems[0]) => {
    const Icon = item.icon;
    const active = currentTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id as NavTab)}
        className={`${navItemBase} ${navItemHeight} ${active ? activeStyle : inactiveStyle}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* flex-shrink-0 + explicit w/h ensures icons never resize the row */}
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {/* Badge slot — always rendered when hasBadge=true to keep the right
            column stable even while value transitions between defined/undefined */}
        {'hasBadge' in item && item.hasBadge && (
          <NavBadge
            value={item.badge}
            variant={'badgeVariant' in item ? item.badgeVariant : 'default'}
            visible={item.badge !== undefined}
          />
        )}
      </button>
    );
  };

  return (
    <aside
      className="
        w-64 flex-shrink-0
        border-r border-slate-800/80
        bg-[#0c121e]/90
        flex flex-col
        h-screen
        select-none
      "
    >
      {/* Brand Header — fixed height */}
      <div className="h-16 flex-shrink-0 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow-primary">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              PACKAGE GUI
            </h1>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-emerald-400 animate-pulse" />
              localhost:4173
            </div>
          </div>
        </div>
      </div>

      {/* Nav List — flex-1 so it fills space between header and footer */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Software Management */}
        <div className="space-y-0.5">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Software Management
          </div>
          {navItems.map(renderNavItem)}
        </div>

        {/* System & Runtime */}
        <div className="space-y-0.5">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            System & Runtime
          </div>
          {systemItems.map(renderNavItem)}
        </div>
      </div>

      {/* System Status Footer — flex-shrink-0 keeps it anchored at the bottom */}
      <div className="flex-shrink-0 p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
          <span className="text-slate-300 font-semibold truncate pr-2">
            {overview?.os?.displayName ? overview.os.displayName.split('(')[0].trim() : 'Local Node'}
          </span>
          <span className="text-emerald-400 flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> Ready
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Shell: {overview?.os?.shell || 'default'}</span>
          <span className="text-blue-400 font-semibold">{updatesCount} updates</span>
        </div>
      </div>
    </aside>
  );
};
