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

export type CapabilityBlockReasonCode =
  | "permission-exceeds-limit"
  | "risk-exceeds-limit"
  | "missing-context"
  | "no-task-match"
  | "over-limit";

export interface CapabilityBlockReason {
  code: CapabilityBlockReasonCode;
  message: string;
}

export interface CapabilitySelectionRequest {
  task: string;
  context?: string[];
  maxPermissionLevel?: PermissionLevel;
  maxRiskLevel?: RiskLevel;
  limit?: number;
}

export interface CapabilitySelection {
  capabilityId: string;
  title: string;
  score: number;
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  matchedTerms: string[];
  matchedContext: string[];
  missingContext: string[];
  underlyingTools: string[];
  proofReturned: string[];
}

export interface SelectedCapability {
  id: string;
  title: string;
  description: string;
  intent: string;
  whenToUse: string;
  requiredContext: string[];
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  proofReturned: string[];
  examples: string[];
  underlyingTools?: never;
}

export interface SelectedCapabilitySurface {
  mode: "selected-surface";
  task: string;
  capabilities: SelectedCapability[];
}

export interface BlockedCapabilitySelection {
  capabilityId: string;
  title: string;
  score: number;
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  matchedTerms: string[];
  matchedContext: string[];
  missingContext: string[];
  reasons: CapabilityBlockReason[];
}

export interface CapabilitySelectionReceipt {
  mode: "selection-receipt";
  task: string;
  providedContext: string[];
  maxPermissionLevel: PermissionLevel;
  maxRiskLevel: RiskLevel;
  limit: number;
  selectedCapabilityIds: string[];
  selected: CapabilitySelection[];
  blocked: BlockedCapabilitySelection[];
  exposedUnderlyingTools: string[];
  exposedToolCount: number;
  selectedEstimatedTokens: number;
  toolsExecuted: false;
}

export interface CapabilitySelectionReport {
  mode: "selection";
  task: string;
  providedContext: string[];
  maxPermissionLevel: PermissionLevel;
  maxRiskLevel: RiskLevel;
  limit: number;
  consideredCapabilityCount: number;
  selected: CapabilitySelection[];
  blocked: BlockedCapabilitySelection[];
  exposedUnderlyingTools: string[];
  exposedToolCount: number;
  selectedEstimatedTokens: number;
  surface: SelectedCapabilitySurface;
  receipt: CapabilitySelectionReceipt;
}

export type CapabilityInvocationPlanIssueCode =
  | "invalid-tool-surface"
  | "capability-not-found"
  | "capability-not-selected"
  | "receipt-missing-selected-detail"
  | "receipt-policy-mismatch"
  | "receipt-risk-mismatch"
  | "receipt-context-mismatch"
  | "empty-tool-request"
  | "tool-not-found"
  | "tool-not-in-capability"
  | "tool-not-exposed";

export interface CapabilityInvocationPlanIssue {
  code: CapabilityInvocationPlanIssueCode;
  path: string;
  message: string;
}

export interface CapabilityToolRoute {
  toolId: string;
  toolName: string;
  serverId: string;
  serverTitle: string;
  category: string;
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
}

export interface CapabilityInvocationPlanRequest {
  servers: McpLikeServer[];
  capabilities: Capability[];
  receipt: CapabilitySelectionReceipt;
  capabilityId: string;
  requestedToolIds?: string[];
}

export interface CapabilityInvocationPlan {
  mode: "capability-invocation-plan";
  valid: boolean;
  task: string;
  capabilityId: string;
  requestedToolIds: string[];
  allowedToolRoutes: CapabilityToolRoute[];
  proofRequired: string[];
  issues: CapabilityInvocationPlanIssue[];
  toolsExecuted: false;
}

export type CapabilityInvocationResultStatus = "ok" | "error";

export type CapabilityProofValue = string | string[];

export interface CapabilityInvocationToolResult {
  toolId: string;
  status: CapabilityInvocationResultStatus;
  summary: string;
  proof?: Record<string, CapabilityProofValue>;
  changedResources?: string[];
  errorMessage?: string;
}

export type CapabilityInvocationReceiptSource = "caller-supplied" | "local-fixture";

export type CapabilityInvocationReceiptIssueCode =
  | "invalid-invocation-plan"
  | "unplanned-tool-result"
  | "duplicate-tool-result"
  | "missing-tool-result"
  | "tool-execution-failed"
  | "missing-required-proof";

export interface CapabilityInvocationReceiptIssue {
  code: CapabilityInvocationReceiptIssueCode;
  path: string;
  message: string;
}

export interface CapabilityProofEntry {
  label: string;
  values: string[];
  toolIds: string[];
}

export interface CapabilityToolExecution {
  toolId: string;
  toolName: string;
  serverId: string;
  serverTitle: string;
  category: string;
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  status: CapabilityInvocationResultStatus | "missing";
  summary: string;
  proofReturned: string[];
  errorMessage?: string;
}

export interface CapabilityInvocationReceiptRequest {
  plan: CapabilityInvocationPlan;
  results: CapabilityInvocationToolResult[];
  source?: CapabilityInvocationReceiptSource;
}

export interface CapabilityInvocationReceipt {
  mode: "capability-invocation-receipt";
  valid: boolean;
  task: string;
  capabilityId: string;
  executionMode: "local-simulated";
  source: CapabilityInvocationReceiptSource;
  plannedToolIds: string[];
  attemptedToolIds: string[];
  executedToolRoutes: CapabilityToolExecution[];
  proof: CapabilityProofEntry[];
  missingProof: string[];
  changedResources: string[];
  issues: CapabilityInvocationReceiptIssue[];
  toolsExecuted: boolean;
}
