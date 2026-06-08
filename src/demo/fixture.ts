import type { Capability, McpLikeServer, RawTool } from "../types.js";

type ToolInput = Omit<RawTool, "serverId" | "serverTitle" | "category">;

function tool(server: Omit<McpLikeServer, "tools">, input: ToolInput): RawTool {
  return {
    ...input,
    serverId: server.id,
    serverTitle: server.title,
    category: server.category,
  };
}

const serverHeaders: Array<Omit<McpLikeServer, "tools">> = [
  {
    id: "error-tracker",
    title: "Error Tracker",
    category: "error tracking and logs",
    description: "Fake incident telemetry server for stack traces, event search, and error metadata.",
  },
  {
    id: "issue-tracker",
    title: "Issue Tracker",
    category: "issue tracker",
    description: "Fake work-tracking server for finding incidents and recording follow-up tasks.",
  },
  {
    id: "source-repository",
    title: "Source Repository",
    category: "source repository",
    description: "Fake repository server for reading code and preparing a small local patch.",
  },
  {
    id: "documentation",
    title: "Documentation",
    category: "documentation",
    description: "Fake docs server for runbooks, service ownership, and troubleshooting notes.",
  },
  {
    id: "database",
    title: "Database",
    category: "database query",
    description: "Fake database server for read-only production-shape diagnostics.",
  },
  {
    id: "browser-testing",
    title: "Browser Testing",
    category: "browser testing",
    description: "Fake browser server for smoke checks, screenshots, and UI validation.",
  },
  {
    id: "deployment",
    title: "Deployment",
    category: "deployment status",
    description: "Fake deploy server for release health, logs, and risky rollout actions.",
  },
  {
    id: "chat-status",
    title: "Chat Status",
    category: "chat and status update",
    description: "Fake team chat server for incident context and human-readable updates.",
  },
  {
    id: "package-info",
    title: "Package Info",
    category: "package and dependency information",
    description: "Fake package metadata server for dependency risk and upgrade planning.",
  },
  {
    id: "pull-request",
    title: "Pull Request",
    category: "pull request output",
    description: "Fake pull request server for publishing and reviewing a proposed fix.",
  },
];

const [
  errorTracker,
  issueTracker,
  sourceRepository,
  documentation,
  database,
  browserTesting,
  deployment,
  chatStatus,
  packageInfo,
  pullRequest,
] = serverHeaders;

if (
  !errorTracker ||
  !issueTracker ||
  !sourceRepository ||
  !documentation ||
  !database ||
  !browserTesting ||
  !deployment ||
  !chatStatus ||
  !packageInfo ||
  !pullRequest
) {
  throw new Error("Demo server headers are incomplete.");
}

export const demoServers: McpLikeServer[] = [
  {
    ...errorTracker,
    tools: [
      tool(errorTracker, {
        id: "error.searchEvents",
        name: "searchEvents",
        description:
          "Search recent production error events by service, release, customer impact, trace id, and time window.",
        permissionLevel: "read",
        riskLevel: "medium",
        duplicateGroup: "incident-evidence-search",
        tags: ["incident", "logs", "search"],
      }),
      tool(errorTracker, {
        id: "error.getTrace",
        name: "getTrace",
        description:
          "Read one trace with stack frames, request metadata, environment, release version, and grouped exception details.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["incident", "trace"],
      }),
      tool(errorTracker, {
        id: "error.listProjects",
        name: "listProjects",
        description:
          "List every monitoring project, team slug, environment, alert rule, and archived project visible to the token.",
        permissionLevel: "read",
        riskLevel: "low",
        noisy: true,
        tags: ["inventory", "noisy"],
      }),
      tool(errorTracker, {
        id: "error.deleteProject",
        name: "deleteProject",
        description:
          "Delete a monitoring project and all associated events, alert rules, retention settings, and historical traces.",
        permissionLevel: "admin",
        riskLevel: "high",
        noisy: true,
        tags: ["destructive", "admin"],
      }),
    ],
  },
  {
    ...issueTracker,
    tools: [
      tool(issueTracker, {
        id: "issue.searchIssues",
        name: "searchIssues",
        description:
          "Search incidents, bugs, owners, labels, linked pull requests, priority, assignee, and release-blocking state.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "work-item-search",
        tags: ["issues", "search"],
      }),
      tool(issueTracker, {
        id: "issue.createIssue",
        name: "createIssue",
        description:
          "Create a follow-up issue with title, body, labels, priority, owner, incident link, and reproduction notes.",
        permissionLevel: "write",
        riskLevel: "medium",
        tags: ["issues", "write"],
      }),
      tool(issueTracker, {
        id: "issue.bulkUpdateLabels",
        name: "bulkUpdateLabels",
        description:
          "Apply label changes to a broad issue query, including archived issues and unrelated teams if filters are loose.",
        permissionLevel: "write",
        riskLevel: "medium",
        noisy: true,
        tags: ["issues", "bulk", "noisy"],
      }),
      tool(issueTracker, {
        id: "issue.bulkCloseIssues",
        name: "bulkCloseIssues",
        description:
          "Close every issue matching a query and notify subscribers, even when the query spans multiple teams or projects.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["issues", "destructive", "admin"],
      }),
    ],
  },
  {
    ...sourceRepository,
    tools: [
      tool(sourceRepository, {
        id: "repo.searchCode",
        name: "searchCode",
        description:
          "Search repository files, symbols, tests, config, migration scripts, and ownership hints by literal or regex query.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "source-evidence-search",
        tags: ["repo", "search"],
      }),
      tool(sourceRepository, {
        id: "repo.getFile",
        name: "getFile",
        description:
          "Read a repository file at a branch, tag, or commit sha with path, line metadata, and detected language.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["repo", "read"],
      }),
      tool(sourceRepository, {
        id: "repo.commitPatch",
        name: "commitPatch",
        description:
          "Commit a small patch to a branch with author metadata, commit message, changed files, and diff summary.",
        permissionLevel: "write",
        riskLevel: "medium",
        tags: ["repo", "write"],
      }),
      tool(sourceRepository, {
        id: "repo.deleteRepository",
        name: "deleteRepository",
        description:
          "Delete the source repository, issues, pull requests, settings, branch protections, and all historical references.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["repo", "destructive", "admin"],
      }),
    ],
  },
  {
    ...documentation,
    tools: [
      tool(documentation, {
        id: "docs.searchPages",
        name: "searchPages",
        description:
          "Search runbooks, service docs, owner notes, past incident summaries, rollout playbooks, and debugging guides.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "source-evidence-search",
        tags: ["docs", "search"],
      }),
      tool(documentation, {
        id: "docs.getPage",
        name: "getPage",
        description:
          "Read one documentation page with title, sections, last updated time, owner, links, and embedded code snippets.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["docs", "read"],
      }),
      tool(documentation, {
        id: "docs.summarizeRunbook",
        name: "summarizeRunbook",
        description:
          "Summarize the relevant steps from a runbook and return the exact cited sections used for the summary.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["docs", "runbook"],
      }),
      tool(documentation, {
        id: "docs.reindexWorkspace",
        name: "reindexWorkspace",
        description:
          "Reindex every page, archived space, attachment, generated preview, and stale backlink in the documentation system.",
        permissionLevel: "write",
        riskLevel: "medium",
        noisy: true,
        tags: ["docs", "bulk", "noisy"],
      }),
    ],
  },
  {
    ...database,
    tools: [
      tool(database, {
        id: "db.runReadOnlyQuery",
        name: "runReadOnlyQuery",
        description:
          "Run a bounded read-only SQL query against production-shaped tables with row limits and query text captured.",
        permissionLevel: "read",
        riskLevel: "medium",
        duplicateGroup: "runtime-state-query",
        tags: ["database", "query"],
      }),
      tool(database, {
        id: "db.explainQuery",
        name: "explainQuery",
        description:
          "Explain a SQL query plan without mutating data, including indexes, estimated rows, filters, and execution cost.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["database", "explain"],
      }),
      tool(database, {
        id: "db.runWriteQuery",
        name: "runWriteQuery",
        description:
          "Run a write SQL statement that can update, insert, delete, lock, or rewrite application data in bulk.",
        permissionLevel: "write",
        riskLevel: "high",
        tags: ["database", "write", "danger"],
      }),
      tool(database, {
        id: "db.dropTable",
        name: "dropTable",
        description:
          "Drop a database table, indexes, constraints, grants, views, dependent objects, and stored production data.",
        permissionLevel: "admin",
        riskLevel: "high",
        noisy: true,
        tags: ["database", "destructive", "admin"],
      }),
    ],
  },
  {
    ...browserTesting,
    tools: [
      tool(browserTesting, {
        id: "browser.openPage",
        name: "openPage",
        description:
          "Open a local or staging page with viewport, route, console capture, network capture, and timeout settings.",
        permissionLevel: "execute",
        riskLevel: "medium",
        tags: ["browser", "test"],
      }),
      tool(browserTesting, {
        id: "browser.runSmokeTest",
        name: "runSmokeTest",
        description:
          "Run a deterministic smoke test for the incident path and return assertions, console errors, and timing.",
        permissionLevel: "execute",
        riskLevel: "medium",
        tags: ["browser", "test"],
      }),
      tool(browserTesting, {
        id: "browser.captureScreenshot",
        name: "captureScreenshot",
        description:
          "Capture a screenshot for visual proof with viewport, path, timestamp, and page title metadata.",
        permissionLevel: "read",
        riskLevel: "low",
        tags: ["browser", "proof"],
      }),
      tool(browserTesting, {
        id: "browser.clearSession",
        name: "clearSession",
        description:
          "Clear cookies, local storage, session storage, permissions, cache, and saved browser state for every origin.",
        permissionLevel: "write",
        riskLevel: "medium",
        noisy: true,
        tags: ["browser", "state", "noisy"],
      }),
    ],
  },
  {
    ...deployment,
    tools: [
      tool(deployment, {
        id: "deploy.getStatus",
        name: "getStatus",
        description:
          "Read deployment state, release id, commit sha, environment, health checks, rollout percentage, and region status.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "release-state",
        tags: ["deploy", "status"],
      }),
      tool(deployment, {
        id: "deploy.searchLogs",
        name: "searchLogs",
        description:
          "Search deployment logs by service, release, region, trace id, request id, severity, and time window.",
        permissionLevel: "read",
        riskLevel: "medium",
        duplicateGroup: "incident-evidence-search",
        tags: ["deploy", "logs", "search"],
      }),
      tool(deployment, {
        id: "deploy.invalidateCache",
        name: "invalidateCache",
        description:
          "Invalidate edge cache keys, static assets, API route cache, image cache, and regional deployment cache.",
        permissionLevel: "write",
        riskLevel: "medium",
        noisy: true,
        tags: ["deploy", "cache", "noisy"],
      }),
      tool(deployment, {
        id: "deploy.rollbackProduction",
        name: "rollbackProduction",
        description:
          "Roll production traffic back to an earlier release across every region and emit customer-visible status events.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["deploy", "destructive", "admin"],
      }),
    ],
  },
  {
    ...chatStatus,
    tools: [
      tool(chatStatus, {
        id: "chat.searchIncidentChannel",
        name: "searchIncidentChannel",
        description:
          "Search incident channel messages, decisions, owners, timestamps, status summaries, and linked evidence.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "incident-evidence-search",
        tags: ["chat", "search"],
      }),
      tool(chatStatus, {
        id: "chat.postStatusUpdate",
        name: "postStatusUpdate",
        description:
          "Post a concise incident update with current impact, next action, owner, evidence links, and confidence level.",
        permissionLevel: "write",
        riskLevel: "medium",
        tags: ["chat", "write"],
      }),
      tool(chatStatus, {
        id: "chat.listChannels",
        name: "listChannels",
        description:
          "List every channel, archived room, member count, topic, retention policy, bot membership, and private channel hint.",
        permissionLevel: "read",
        riskLevel: "low",
        noisy: true,
        tags: ["chat", "inventory", "noisy"],
      }),
      tool(chatStatus, {
        id: "chat.archiveChannel",
        name: "archiveChannel",
        description:
          "Archive a channel, remove active collaboration space, notify members, and freeze future incident communication.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["chat", "destructive", "admin"],
      }),
    ],
  },
  {
    ...packageInfo,
    tools: [
      tool(packageInfo, {
        id: "package.lookup",
        name: "lookup",
        description:
          "Look up package version, release date, dependency tree, license, maintainers, deprecation, and changelog links.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "release-state",
        tags: ["package", "metadata"],
      }),
      tool(packageInfo, {
        id: "package.auditPackage",
        name: "auditPackage",
        description:
          "Audit one dependency for known vulnerabilities, patched versions, transitive paths, and production reachability.",
        permissionLevel: "read",
        riskLevel: "medium",
        duplicateGroup: "runtime-state-query",
        tags: ["package", "security"],
      }),
      tool(packageInfo, {
        id: "package.planUpgrade",
        name: "planUpgrade",
        description:
          "Plan a dependency upgrade with target version, migration notes, affected packages, and test recommendations.",
        permissionLevel: "write",
        riskLevel: "medium",
        tags: ["package", "upgrade"],
      }),
      tool(packageInfo, {
        id: "package.publishPackage",
        name: "publishPackage",
        description:
          "Publish a package version to the registry with tags, provenance metadata, release notes, and public visibility.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["package", "publish", "admin"],
      }),
    ],
  },
  {
    ...pullRequest,
    tools: [
      tool(pullRequest, {
        id: "pr.searchPullRequests",
        name: "searchPullRequests",
        description:
          "Search pull requests by branch, author, linked issue, changed file, review state, failing check, and mergeability.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "work-item-search",
        tags: ["pull-request", "search"],
      }),
      tool(pullRequest, {
        id: "pr.getStatus",
        name: "getStatus",
        description:
          "Read pull request checks, review state, branch protection, changed files, merge queue, and linked deployment state.",
        permissionLevel: "read",
        riskLevel: "low",
        duplicateGroup: "release-state",
        tags: ["pull-request", "status"],
      }),
      tool(pullRequest, {
        id: "pr.createOrUpdate",
        name: "createOrUpdate",
        description:
          "Create or update a pull request with title, body, reviewers, labels, linked issue, and generated evidence summary.",
        permissionLevel: "write",
        riskLevel: "medium",
        tags: ["pull-request", "write"],
      }),
      tool(pullRequest, {
        id: "pr.merge",
        name: "merge",
        description:
          "Merge a pull request into the protected base branch after checks, reviews, and release gates have completed.",
        permissionLevel: "admin",
        riskLevel: "high",
        tags: ["pull-request", "merge", "admin"],
      }),
    ],
  },
];

export const demoCapabilities: Capability[] = [
  {
    id: "triage-production-incident",
    title: "Triage Production Incident",
    description: "Collect the smallest useful evidence set for a production incident without exposing broad admin actions.",
    intent: "Understand impact, likely source, and current release state.",
    whenToUse: "Use when an agent needs to investigate a production symptom before editing code.",
    requiredContext: ["service name", "time window", "symptom or trace id"],
    permissionLevel: "read",
    riskLevel: "medium",
    underlyingTools: [
      "error.searchEvents",
      "error.getTrace",
      "deploy.searchLogs",
      "deploy.getStatus",
      "chat.searchIncidentChannel",
    ],
    proofReturned: ["event ids", "trace id", "release id", "log query", "chat permalink"],
    examples: ["Find checkout errors for release 2026.06.08 in the last 30 minutes."],
  },
  {
    id: "inspect-work-items",
    title: "Inspect Work Items",
    description: "Find related issues and pull requests without exposing bulk issue mutation tools.",
    intent: "Connect the incident to existing work and active code review.",
    whenToUse: "Use when the agent needs prior context, owners, duplicate reports, or review status.",
    requiredContext: ["incident keywords", "repository name"],
    permissionLevel: "read",
    riskLevel: "low",
    underlyingTools: ["issue.searchIssues", "pr.searchPullRequests"],
    proofReturned: ["issue ids", "pull request ids", "owners", "review states"],
    examples: ["Find open issues and PRs mentioning checkout timeout."],
  },
  {
    id: "inspect-source-context",
    title: "Inspect Source Context",
    description: "Read code and runbooks together so the agent sees implementation and operating guidance in one surface.",
    intent: "Locate the likely code path and the documented recovery path.",
    whenToUse: "Use before proposing a code change or operational recommendation.",
    requiredContext: ["repository name", "service area", "keyword or stack frame"],
    permissionLevel: "read",
    riskLevel: "low",
    underlyingTools: [
      "repo.searchCode",
      "repo.getFile",
      "docs.searchPages",
      "docs.getPage",
      "docs.summarizeRunbook",
    ],
    proofReturned: ["file paths", "line references", "runbook section ids", "citations"],
    examples: ["Find the retry logic mentioned by the stack trace and cite the runbook section."],
  },
  {
    id: "query-runtime-state",
    title: "Query Runtime State",
    description: "Run bounded read-only diagnostics across data and dependency metadata.",
    intent: "Check whether runtime state or package risk explains the incident.",
    whenToUse: "Use when code evidence is not enough and the agent needs bounded operational facts.",
    requiredContext: ["approved read-only query", "row limit", "package name when relevant"],
    permissionLevel: "read",
    riskLevel: "medium",
    underlyingTools: ["db.runReadOnlyQuery", "db.explainQuery", "package.auditPackage"],
    proofReturned: ["SQL text", "row count", "query plan summary", "package advisory ids"],
    examples: ["Count failed payments by status for the incident window with a 100 row limit."],
  },
  {
    id: "validate-browser-behavior",
    title: "Validate Browser Behavior",
    description: "Open the affected path, run smoke checks, and capture visible proof.",
    intent: "Prove the user-facing path is broken or fixed.",
    whenToUse: "Use after identifying a likely reproduction or after preparing a patch.",
    requiredContext: ["URL", "viewport", "expected assertion"],
    permissionLevel: "execute",
    riskLevel: "medium",
    underlyingTools: ["browser.openPage", "browser.runSmokeTest", "browser.captureScreenshot"],
    proofReturned: ["assertion results", "console errors", "screenshot path", "viewport"],
    examples: ["Run the checkout smoke test and capture a screenshot of the failing state."],
  },
  {
    id: "prepare-code-change",
    title: "Prepare Code Change",
    description: "Create a small branch change and connect it to the tracked incident.",
    intent: "Turn verified evidence into a reviewable code change.",
    whenToUse: "Use only after evidence identifies a narrow code path and expected fix.",
    requiredContext: ["branch name", "file paths", "patch summary", "linked issue"],
    permissionLevel: "write",
    riskLevel: "medium",
    underlyingTools: ["repo.commitPatch", "issue.createIssue", "pr.createOrUpdate"],
    proofReturned: ["commit sha", "changed files", "issue id", "pull request url"],
    examples: ["Commit the null-check fix and open a PR linked to the incident issue."],
  },
  {
    id: "coordinate-status-update",
    title: "Coordinate Status Update",
    description: "Post one concise update with evidence instead of exposing broad chat administration.",
    intent: "Keep humans informed about impact, owner, next action, and confidence.",
    whenToUse: "Use when the investigation state changes or a fix is ready for review.",
    requiredContext: ["incident channel", "current impact", "next action", "evidence links"],
    permissionLevel: "write",
    riskLevel: "medium",
    underlyingTools: ["chat.postStatusUpdate"],
    proofReturned: ["message permalink", "posted summary", "timestamp"],
    examples: ["Post that the checkout fix is in review with links to the trace and PR."],
  },
  {
    id: "merge-reviewed-pull-request",
    title: "Merge Reviewed Pull Request",
    description: "Expose the risky merge action as one clearly labeled capability with explicit proof requirements.",
    intent: "Complete a verified change after checks, review, and release gates pass.",
    whenToUse: "Use only when CI is green, review is approved, and the user has allowed merge authority.",
    requiredContext: ["pull request id", "green check summary", "approval record"],
    permissionLevel: "admin",
    riskLevel: "high",
    underlyingTools: ["pr.merge"],
    proofReturned: ["merge commit sha", "checks summary", "approval ids"],
    examples: ["Merge PR 42 after required checks and review approval are present."],
  },
];
