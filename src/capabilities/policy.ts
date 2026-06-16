import type { PermissionLevel, RiskLevel } from "../types.js";

export const permissionLevels: readonly PermissionLevel[] = ["read", "write", "execute", "admin"];
export const riskLevels: readonly RiskLevel[] = ["low", "medium", "high"];

const permissionRank: Record<PermissionLevel, number> = {
  read: 0,
  write: 1,
  execute: 2,
  admin: 3,
};

const riskRank: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function comparePermissionLevels(left: PermissionLevel, right: PermissionLevel): number {
  return permissionRank[left] - permissionRank[right];
}

export function compareRiskLevels(left: RiskLevel, right: RiskLevel): number {
  return riskRank[left] - riskRank[right];
}

export function isPermissionAllowed(actual: PermissionLevel, max: PermissionLevel): boolean {
  return comparePermissionLevels(actual, max) <= 0;
}

export function isRiskAllowed(actual: RiskLevel, max: RiskLevel): boolean {
  return compareRiskLevels(actual, max) <= 0;
}

export function isPermissionLevel(value: string): value is PermissionLevel {
  return permissionLevels.includes(value as PermissionLevel);
}

export function isRiskLevel(value: string): value is RiskLevel {
  return riskLevels.includes(value as RiskLevel);
}

export function isRisky(permissionLevel: PermissionLevel, riskLevel: RiskLevel): boolean {
  return permissionLevel === "admin" || riskLevel === "high";
}
