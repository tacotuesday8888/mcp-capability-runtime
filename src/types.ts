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

interface BaseTaxMeterReport {
  rawToolCount: number;
  rawEstimatedTokens: number;
  riskyRawToolCount: number;
  noisyRawToolCount: number;
  duplicateRawToolCount: number;
  duplicateToolGroups: DuplicateToolGroup[];
}

export interface ComparisonTaxMeterReport extends BaseTaxMeterReport {
  mode: "comparison";
  capabilityCount: number;
  capabilityEstimatedTokens: number;
  riskyCapabilityCount: number;
  toolCountReductionPercent: number;
  tokenReductionPercent: number;
  riskyExposureReductionPercent: number;
}

export interface RawOnlyTaxMeterReport extends BaseTaxMeterReport {
  mode: "raw-only";
  capabilityCount: null;
  capabilityEstimatedTokens: null;
  riskyCapabilityCount: null;
  toolCountReductionPercent: null;
  tokenReductionPercent: null;
  riskyExposureReductionPercent: null;
}

export type TaxMeterReport = ComparisonTaxMeterReport | RawOnlyTaxMeterReport;

export type ToolSurfaceAuditCode =
  | "duplicate-server-id"
  | "duplicate-tool-id"
  | "duplicate-capability-id"
  | "missing-underlying-tool"
  | "understated-permission-level"
  | "understated-risk-level"
  | "empty-required-array";

export interface ToolSurfaceAuditIssue {
  code: ToolSurfaceAuditCode;
  path: string;
  message: string;
}

export interface ToolSurfaceAuditReport {
  valid: boolean;
  issues: ToolSurfaceAuditIssue[];
}
