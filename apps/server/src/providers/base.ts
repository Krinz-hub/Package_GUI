import {
  PackageManagerType,
  PackageManagerInfo,
  Package,
  OperationAction,
} from '@stuff-manager/shared';

export interface CommandPlan {
  executable: string;
  args: string[];
  requiresPrivilege?: boolean;
}

export interface PackageManagerProvider {
  readonly id: PackageManagerType;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;

  detect(): Promise<PackageManagerInfo>;
  list(): Promise<Package[]>;
  info(nameOrId: string): Promise<Package | null>;
  search?(query: string): Promise<Package[]>;

  planInstall(name: string, options?: { isCask?: boolean; global?: boolean }): Promise<CommandPlan>;
  planUninstall(name: string, options?: { isCask?: boolean; global?: boolean }): Promise<CommandPlan>;
  planUpdate(name: string, options?: { isCask?: boolean; global?: boolean }): Promise<CommandPlan>;
  planReinstall?(name: string, options?: { isCask?: boolean; global?: boolean }): Promise<CommandPlan>;
}
