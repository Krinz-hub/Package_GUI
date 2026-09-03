import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, AppError } from './api/client';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { PackageTable } from './components/packages/PackageTable';
import { PackageDetailDrawer } from './components/packages/PackageDetailDrawer';
import { InstallModal } from './components/packages/InstallModal';
import { LiveTerminalDrawer } from './components/terminal/LiveTerminalDrawer';
import { EmbeddedTerminalPanel } from './components/terminal/EmbeddedTerminalPanel';
import { PrivilegedDialog } from './components/terminal/PrivilegedDialog';
import { ActionErrorModal } from './components/common/ActionErrorModal';
import { DoctorView } from './components/doctor/DoctorView';
import { PortsView } from './components/ports/PortsView';
import { ProcessView } from './components/processes/ProcessView';
import { ContainersView } from './components/containers/ContainersView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { useTerminal } from './context/TerminalContext';
import { Package, PackageManagerType } from '@stuff-manager/shared';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isTerminalPanelOpen, setIsTerminalPanelOpen] = useState(false);
  const [actionError, setActionError] = useState<{ error: AppError | Error; title: string; retryFn?: () => void } | null>(null);

  const queryClient = useQueryClient();
  const { startJob, setPrivilegedDialog, setIsOpen: setIsLogsOpen } = useTerminal();

  // Health check query (determines backend connection status)
  const { data: healthData, isError: isHealthError } = useQuery({
    queryKey: ['health'],
    queryFn: api.checkHealth,
    refetchInterval: 5000,
    retry: 3,
  });

  const isBackendConnected = !isHealthError && (healthData?.ok ?? true);

  // Overview query
  const { data: overview, isFetching: isOverviewFetching } = useQuery({
    queryKey: ['overview'],
    queryFn: api.getOverview,
    refetchInterval: 30000,
  });

  // Packages query
  const activeManagerFilter: PackageManagerType | undefined =
    currentTab === 'brew' || currentTab === 'npm' || currentTab === 'pip' || currentTab === 'cargo'
      ? (currentTab as PackageManagerType)
      : undefined;

  const {
    data: packagesData,
    isLoading: isPackagesLoading,
    isFetching: isPackagesFetching,
  } = useQuery({
    queryKey: ['packages', activeManagerFilter],
    queryFn: () => api.getPackages(activeManagerFilter),
    refetchInterval: 60000,
  });

  // Ports query
  const {
    data: portsData,
    isLoading: isPortsLoading,
    refetch: refetchPorts,
  } = useQuery({
    queryKey: ['ports'],
    queryFn: api.getPorts,
    refetchInterval: 10000,
  });

  // Doctor query
  const {
    data: doctorData,
    isLoading: isDoctorLoading,
    refetch: refetchDoctor,
  } = useQuery({
    queryKey: ['doctor'],
    queryFn: api.getDoctor,
  });

  // Processes query
  const {
    data: processesData,
    isLoading: isProcessesLoading,
    refetch: refetchProcesses,
  } = useQuery({
    queryKey: ['processes'],
    queryFn: api.getProcesses,
    refetchInterval: 10000,
  });

  // Services query
  const {
    data: servicesData,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    refetchInterval: 15000,
  });

  // Containers query
  const {
    data: dockerData,
    isLoading: isDockerLoading,
    refetch: refetchDocker,
  } = useQuery({
    queryKey: ['containers', 'docker'],
    queryFn: api.getDocker,
  });

  const { data: androidData, refetch: refetchAndroid } = useQuery({
    queryKey: ['containers', 'android'],
    queryFn: api.getAndroid,
  });

  // History query
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['history'],
    queryFn: api.getHistory,
  });

  const allPackages = packagesData?.packages || [];

  // Filter packages by search query
  const filteredPackages = allPackages.filter((pkg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pkg.name.toLowerCase().includes(q) ||
      (pkg.displayName && pkg.displayName.toLowerCase().includes(q)) ||
      (pkg.description && pkg.description.toLowerCase().includes(q)) ||
      pkg.manager.toLowerCase().includes(q)
    );
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleUpdate = async (pkg: Package, forceTerminal = false) => {
    if (forceTerminal) {
      setPrivilegedDialog({
        isOpen: true,
        jobName: `Update ${pkg.name}`,
        command: `brew upgrade ${pkg.name}`,
        onConfirm: async () => {
          try {
            const res = await api.updatePackage({
              manager: pkg.manager,
              name: pkg.name,
              isCask: pkg.type === 'cask',
              forceTerminalPrivilege: true,
            });
            if (res.job) startJob(res.job);
          } catch (err: any) {
            setActionError({
              error: err,
              title: `Failed to update ${pkg.name}`,
              retryFn: () => handleUpdate(pkg, forceTerminal),
            });
          }
        },
        onCancel: () => {},
      });
      return;
    }

    try {
      const res = await api.updatePackage({
        manager: pkg.manager,
        name: pkg.name,
        isCask: pkg.type === 'cask',
      });
      if (res.job) startJob(res.job);
    } catch (err: any) {
      setActionError({
        error: err,
        title: `Failed to update ${pkg.name}`,
        retryFn: () => handleUpdate(pkg, forceTerminal),
      });
    }
  };

  const handleReinstall = async (pkg: Package, forceTerminal = false) => {
    if (forceTerminal) {
      setPrivilegedDialog({
        isOpen: true,
        jobName: `Reinstall ${pkg.name}`,
        command: `brew reinstall ${pkg.name}`,
        onConfirm: async () => {
          try {
            const res = await api.reinstallPackage({
              manager: pkg.manager,
              name: pkg.name,
              isCask: pkg.type === 'cask',
              forceTerminalPrivilege: true,
            });
            if (res.job) startJob(res.job);
          } catch (err: any) {
            setActionError({
              error: err,
              title: `Failed to reinstall ${pkg.name}`,
              retryFn: () => handleReinstall(pkg, forceTerminal),
            });
          }
        },
        onCancel: () => {},
      });
      return;
    }

    try {
      const res = await api.reinstallPackage({
        manager: pkg.manager,
        name: pkg.name,
        isCask: pkg.type === 'cask',
      });
      if (res.job) startJob(res.job);
    } catch (err: any) {
      setActionError({
        error: err,
        title: `Failed to reinstall ${pkg.name}`,
        retryFn: () => handleReinstall(pkg, forceTerminal),
      });
    }
  };

  const handleUninstall = async (pkg: Package, forceTerminal = false) => {
    if (!window.confirm(`Are you sure you want to uninstall "${pkg.displayName || pkg.name}"?`)) {
      return;
    }

    if (forceTerminal) {
      setPrivilegedDialog({
        isOpen: true,
        jobName: `Uninstall ${pkg.name}`,
        command: `brew uninstall ${pkg.name}`,
        onConfirm: async () => {
          try {
            const res = await api.uninstallPackage({
              manager: pkg.manager,
              name: pkg.name,
              isCask: pkg.type === 'cask',
              forceTerminalPrivilege: true,
            });
            if (res.job) {
              startJob(res.job);
              setSelectedPackage(null);
            }
          } catch (err: any) {
            setActionError({
              error: err,
              title: `Failed to uninstall ${pkg.name}`,
              retryFn: () => handleUninstall(pkg, forceTerminal),
            });
          }
        },
        onCancel: () => {},
      });
      return;
    }

    try {
      const res = await api.uninstallPackage({
        manager: pkg.manager,
        name: pkg.name,
        isCask: pkg.type === 'cask',
      });
      if (res.job) {
        startJob(res.job);
        setSelectedPackage(null);
      }
    } catch (err: any) {
      setActionError({
        error: err,
        title: `Failed to uninstall ${pkg.name}`,
        retryFn: () => handleUninstall(pkg, forceTerminal),
      });
    }
  };

  const handleSelectPackageById = async (pkgId: string) => {
    try {
      const pkg = await api.getPackage(pkgId);
      if (pkg) setSelectedPackage(pkg);
    } catch (err: any) {
      setActionError({ error: err, title: `Unable to open package ${pkgId}` });
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'System Overview & Host Dashboard';
      case 'all-packages':
        return 'All Installed Software';
      case 'brew':
        return 'Homebrew Packages & Casks';
      case 'npm':
        return 'Global npm Packages & CLI Tools';
      case 'pip':
        return 'Python pip3 Packages';
      case 'cargo':
        return 'Cargo Rust Binaries';
      case 'ports':
        return 'Listening Network Ports';
      case 'doctor':
        return 'Environment Doctor & Tool Diagnostics';
      case 'processes':
        return 'Processes & Developer Services';
      case 'containers':
        return 'Docker Containers & Android ADB';
      case 'history':
        return 'Audit Logs & Operation History';
      case 'settings':
        return 'Settings & Cross-Platform Security';
      default:
        return 'PACKAGE GUI';
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-[#e2e8f0] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
        }}
        overview={overview}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header with backend connection indicator */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isOverviewFetching || isPackagesFetching}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          isTerminalPanelOpen={isTerminalPanelOpen}
          onToggleTerminalPanel={() => setIsTerminalPanelOpen(!isTerminalPanelOpen)}
          title={getTabTitle()}
          isBackendConnected={isBackendConnected}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === 'overview' && (
            <OverviewDashboard
              overview={overview}
              packages={allPackages}
              onNavigate={setCurrentTab}
              onSelectPackage={setSelectedPackage}
              onUpdatePackage={handleUpdate}
            />
          )}

          {(currentTab === 'all-packages' ||
            currentTab === 'brew' ||
            currentTab === 'npm' ||
            currentTab === 'pip' ||
            currentTab === 'cargo') && (
            <PackageTable
              packages={filteredPackages}
              isLoading={isPackagesLoading}
              onSelectPackage={setSelectedPackage}
              onUpdatePackage={handleUpdate}
              onReinstallPackage={handleReinstall}
              onUninstallPackage={handleUninstall}
            />
          )}

          {currentTab === 'ports' && (
            <PortsView
              ports={portsData?.ports || []}
              isLoading={isPortsLoading}
              onRefresh={() => refetchPorts()}
              onSelectPackageId={handleSelectPackageById}
            />
          )}

          {currentTab === 'doctor' && (
            <DoctorView
              checks={doctorData?.checks || []}
              isLoading={isDoctorLoading}
              onRefresh={() => refetchDoctor()}
            />
          )}

          {currentTab === 'processes' && (
            <ProcessView
              processes={processesData?.processes || []}
              services={servicesData?.services || []}
              isLoading={isProcessesLoading}
              onRefresh={() => {
                refetchProcesses();
                refetchServices();
              }}
            />
          )}

          {currentTab === 'containers' && (
            <ContainersView
              dockerInfo={dockerData}
              androidInfo={androidData}
              isLoading={isDockerLoading}
              onRefresh={() => {
                refetchDocker();
                refetchAndroid();
              }}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              history={historyData?.history || []}
              isLoading={isHistoryLoading}
              onRefresh={() => refetchHistory()}
            />
          )}

          {currentTab === 'settings' && <SettingsView overview={overview} />}
        </main>
      </div>

      {/* Package Detail Slide-over Drawer */}
      <PackageDetailDrawer
        packageData={selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onUpdate={handleUpdate}
        onReinstall={handleReinstall}
        onUninstall={handleUninstall}
      />

      {/* Install Package Modal */}
      <InstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />

      {/* Live Command Logs Drawer (PACKAGE GUI operations) */}
      <LiveTerminalDrawer />

      {/* Embedded Interactive Shell Terminal Panel (xterm.js) */}
      <EmbeddedTerminalPanel
        isOpen={isTerminalPanelOpen}
        onClose={() => setIsTerminalPanelOpen(false)}
        shellName={overview?.os?.shell || 'zsh'}
      />

      {/* Native Privileged Confirmation Dialog */}
      <PrivilegedDialog />

      {/* Structured Action Error Modal */}
      <ActionErrorModal
        error={actionError?.error || null}
        title={actionError?.title}
        onClose={() => setActionError(null)}
        onRetry={actionError?.retryFn}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenTerminal={() => setIsTerminalPanelOpen(true)}
      />
    </div>
  );
}
