export type PermissionLevel = "read" | "write" | "execute" | "admin";

export type RiskLevel = "low" | "medium" | "high";

export interface RawTool {
  id: string;
  serverId: string;
  serverTitle: string;
  name: string;
  description: string;
  category: string;
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  tags: string[];
  duplicateGroup?: string;
  noisy?: boolean;
}

export interface McpLikeServer {
  id: string;
  title: string;
  category: string;
  description: string;
  tools: RawTool[];
}

export interface Capability {
  id: string;
  title: string;
  description: string;
  intent: string;
  whenToUse: string;
  requiredContext: string[];
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  underlyingTools: string[];
  proofReturned: string[];
  examples: string[];
}

export interface DuplicateToolGroup {
  group: string;
  tools: string[];
}

export interface TaxMeterReport {
  rawToolCount: number;
  capabilityCount: number;
  rawEstimatedTokens: number;
  capabilityEstimatedTokens: number;
  riskyRawToolCount: number;
  riskyCapabilityCount: number;
  noisyRawToolCount: number;
  duplicateRawToolCount: number;
  duplicateToolGroups: DuplicateToolGroup[];
  toolCountReductionPercent: number;
  tokenReductionPercent: number;
  riskyExposureReductionPercent: number;
}
