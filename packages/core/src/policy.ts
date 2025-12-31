import type { PolicyFile, PolicyRule, PolicyCapabilities, RiskLevel, OperatingMode } from "./schemas";

// ─────────────────────────────────────────────────────────────────
// POLICY INHERITANCE (SPEC-RT-003)
// Resolves policy inheritance chains and merges policies
// ─────────────────────────────────────────────────────────────────

/** Maximum inheritance depth to prevent infinite loops */
export const MAX_INHERITANCE_DEPTH = 10;

/** Error thrown when policy resolution fails */
export class PolicyResolutionError extends Error {
  constructor(
    message: string,
    public readonly policyId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PolicyResolutionError";
  }
}

/** Result of policy resolution */
export interface ResolvedPolicy {
  /** The fully resolved policy (all inheritance applied) */
  policy: PolicyFile;
  /** Chain of policy IDs from root to this policy */
  inheritanceChain: string[];
  /** Number of policies in the chain */
  depth: number;
}

/** Policy repository for loading policies by ID */
export interface PolicyRepository {
  /** Gets a policy by ID */
  get(id: string): PolicyFile | undefined;
  /** Checks if a policy exists */
  has(id: string): boolean;
}

/**
 * Creates a PolicyRepository from a Map
 */
export function createPolicyRepository(
  policies: Map<string, PolicyFile>
): PolicyRepository {
  return {
    get: (id) => policies.get(id),
    has: (id) => policies.has(id),
  };
}

/**
 * Resolves a policy by ID, applying all inherited policies.
 *
 * @param policyId The ID of the policy to resolve
 * @param repository Repository for loading policies
 * @returns Resolved policy with all inheritance applied
 */
export function resolvePolicy(
  policyId: string,
  repository: PolicyRepository
): ResolvedPolicy {
  const chain: PolicyFile[] = [];
  const seenIds = new Set<string>();
  let currentId: string | undefined = policyId;

  // Build inheritance chain
  while (currentId) {
    if (seenIds.has(currentId)) {
      throw new PolicyResolutionError(
        `Circular inheritance detected: ${currentId}`,
        policyId
      );
    }

    if (chain.length >= MAX_INHERITANCE_DEPTH) {
      throw new PolicyResolutionError(
        `Maximum inheritance depth (${MAX_INHERITANCE_DEPTH}) exceeded`,
        policyId
      );
    }

    const policy = repository.get(currentId);
    if (!policy) {
      throw new PolicyResolutionError(
        `Policy not found: ${currentId}`,
        policyId
      );
    }

    seenIds.add(currentId);
    chain.push(policy);
    currentId = policy.extends;
  }

  // Reverse to get root-first order
  chain.reverse();

  // Merge policies from root to leaf
  const mergedPolicy = chain.reduce<PolicyFile>(
    (accumulated, current) => mergePolicies(accumulated, current),
    createEmptyPolicy(chain[0]?.id ?? policyId)
  );

  // Use the original policy's ID
  mergedPolicy.id = policyId;

  return {
    policy: mergedPolicy,
    inheritanceChain: chain.map((p) => p.id),
    depth: chain.length,
  };
}

/**
 * Creates an empty policy as a starting point for merging
 */
function createEmptyPolicy(id: string): PolicyFile {
  return {
    version: "1.0",
    id,
    name: "",
    applies_to: [],
    rules: [],
  };
}

/**
 * Merges two policies, with the child taking precedence.
 *
 * Merge rules:
 * - Scalar values: child overrides parent
 * - Arrays (rules): child's rules are appended after parent's
 * - Capabilities: deep merge with child overriding
 * - applies_to: replaced entirely by child if specified
 */
export function mergePolicies(
  parent: PolicyFile,
  child: PolicyFile
): PolicyFile {
  return {
    version: child.version,
    id: child.id,
    name: child.name || parent.name,
    description: child.description ?? parent.description,
    extends: child.extends, // Keep child's extends for reference
    applies_to:
      child.applies_to.length > 0 && child.applies_to[0] !== "*"
        ? child.applies_to
        : parent.applies_to,
    capabilities: mergeCapabilities(parent.capabilities, child.capabilities),
    rules: mergeRules(parent.rules, child.rules),
    metadata: {
      ...parent.metadata,
      ...child.metadata,
      // Merge tags
      tags: mergeArrays(parent.metadata?.tags, child.metadata?.tags),
    },
  };
}

/**
 * Merges capability objects
 */
function mergeCapabilities(
  parent?: PolicyCapabilities,
  child?: PolicyCapabilities
): PolicyCapabilities | undefined {
  if (!parent && !child) {
    return undefined;
  }

  if (!parent) {
    return child;
  }

  if (!child) {
    return parent;
  }

  return {
    default_effect: child.default_effect ?? parent.default_effect,
    allowed_tools: mergeArrays(parent.allowed_tools, child.allowed_tools),
    denied_tools: mergeArrays(parent.denied_tools, child.denied_tools),
    allowed_domains: mergeArrays(parent.allowed_domains, child.allowed_domains),
    denied_domains: mergeArrays(parent.denied_domains, child.denied_domains),
    max_budget_per_session:
      child.max_budget_per_session ?? parent.max_budget_per_session,
    max_budget_per_day: child.max_budget_per_day ?? parent.max_budget_per_day,
    may_spawn: child.may_spawn ?? parent.may_spawn,
    max_spawn_depth: child.max_spawn_depth ?? parent.max_spawn_depth,
  };
}

/**
 * Merges rule arrays.
 * Child rules are appended after parent rules, so they have higher precedence
 * when rules are evaluated in order.
 */
function mergeRules(
  parentRules: PolicyRule[],
  childRules: PolicyRule[]
): PolicyRule[] {
  // Combine rules - child rules come after parent, giving them effective priority
  const allRules = [...parentRules, ...childRules];

  // Sort by priority (higher priority evaluated first)
  return allRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Merges two arrays, removing duplicates
 */
function mergeArrays<T>(parent?: T[], child?: T[]): T[] {
  const combined = [...(parent ?? []), ...(child ?? [])];
  return [...new Set(combined)];
}

// ─────────────────────────────────────────────────────────────────
// POLICY EVALUATION
// Evaluates policies against actions and resources
// ─────────────────────────────────────────────────────────────────

/** Context for policy evaluation */
export interface PolicyEvaluationContext {
  /** Current risk level of the agent */
  riskLevel: RiskLevel;
  /** Current operating mode */
  mode: OperatingMode;
  /** Current timestamp (ISO 8601) */
  timestamp?: string;
  /** Custom context values */
  custom?: Record<string, unknown>;
}

/** Result of evaluating a policy rule */
export interface PolicyEvaluationResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Effect that was applied */
  effect: "allow" | "deny" | "audit";
  /** Rule that matched, if any */
  matchedRule?: PolicyRule;
  /** Whether any rule matched */
  matched: boolean;
  /** Reason for the decision */
  reason: string;
}

/**
 * Evaluates a policy for a given action and resource.
 *
 * @param policy The resolved policy to evaluate
 * @param action The action being performed (e.g., "read_file")
 * @param resource The resource being accessed (e.g., "/path/to/file")
 * @param context Evaluation context
 * @returns Evaluation result
 */
export function evaluatePolicy(
  policy: PolicyFile,
  action: string,
  resource: string,
  context: PolicyEvaluationContext
): PolicyEvaluationResult {
  // Find first matching rule
  for (const rule of policy.rules) {
    if (ruleMatches(rule, action, resource, context)) {
      return {
        allowed: rule.effect === "allow",
        effect: rule.effect,
        matchedRule: rule,
        matched: true,
        reason: `Rule "${rule.id}" matched: ${rule.description ?? rule.effect}`,
      };
    }
  }

  // No rule matched, use default effect from capabilities
  const defaultEffect = policy.capabilities?.default_effect ?? "deny";
  return {
    allowed: defaultEffect === "allow",
    effect: defaultEffect,
    matchedRule: undefined,
    matched: false,
    reason: `No rule matched, using default effect: ${defaultEffect}`,
  };
}

/**
 * Checks if a rule matches the given action, resource, and context
 */
function ruleMatches(
  rule: PolicyRule,
  action: string,
  resource: string,
  context: PolicyEvaluationContext
): boolean {
  // Check action match
  if (!matchesPattern(action, rule.actions)) {
    return false;
  }

  // Check resource match
  if (!matchesPattern(resource, rule.resources)) {
    return false;
  }

  // Check conditions if present
  if (rule.conditions) {
    if (!evaluateConditions(rule.conditions, context)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a value matches any of the patterns
 */
function matchesPattern(value: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === "*") {
      return true;
    }
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (value.startsWith(prefix)) {
        return true;
      }
    } else if (pattern.startsWith("*")) {
      const suffix = pattern.slice(1);
      if (value.endsWith(suffix)) {
        return true;
      }
    } else if (pattern === value) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluates rule conditions against context
 */
function evaluateConditions(
  conditions: NonNullable<PolicyRule["conditions"]>,
  context: PolicyEvaluationContext
): boolean {
  // Check risk level condition
  if (conditions.risk_levels && conditions.risk_levels.length > 0) {
    if (!conditions.risk_levels.includes(context.riskLevel)) {
      return false;
    }
  }

  // Check mode condition
  if (conditions.modes && conditions.modes.length > 0) {
    if (!conditions.modes.includes(context.mode)) {
      return false;
    }
  }

  // Check time range condition
  if (conditions.time_ranges && conditions.time_ranges.length > 0 && context.timestamp) {
    const currentTime = new Date(context.timestamp);
    const timeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format

    const inRange = conditions.time_ranges.some(range => {
      return timeStr >= range.start && timeStr <= range.end;
    });

    if (!inRange) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if an action is allowed by capability lists.
 * Uses tool allow/deny lists for quick checks without full rule evaluation.
 */
export function isToolAllowed(
  tool: string,
  capabilities?: PolicyCapabilities
): boolean {
  if (!capabilities) {
    return false; // Default deny when no capabilities defined
  }

  // Check denied list first (takes precedence)
  if (
    capabilities.denied_tools.length > 0 &&
    matchesPattern(tool, capabilities.denied_tools)
  ) {
    return false;
  }

  // Check allowed list
  if (
    capabilities.allowed_tools.length > 0 &&
    matchesPattern(tool, capabilities.allowed_tools)
  ) {
    return true;
  }

  // Fall back to default effect
  return capabilities.default_effect === "allow";
}

/**
 * Checks if a domain is allowed by capability lists.
 */
export function isDomainAllowed(
  domain: string,
  capabilities?: PolicyCapabilities
): boolean {
  if (!capabilities) {
    return false;
  }

  // Check denied list first
  if (
    capabilities.denied_domains.length > 0 &&
    matchesDomainPattern(domain, capabilities.denied_domains)
  ) {
    return false;
  }

  // Check allowed list
  if (
    capabilities.allowed_domains.length > 0 &&
    matchesDomainPattern(domain, capabilities.allowed_domains)
  ) {
    return true;
  }

  return capabilities.default_effect === "allow";
}

/**
 * Matches a domain against domain patterns (supports wildcards like *.example.com)
 */
function matchesDomainPattern(domain: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === "*") {
      return true;
    }
    if (pattern.startsWith("*.")) {
      // Wildcard subdomain match
      const suffix = pattern.slice(1); // .example.com
      if (domain === pattern.slice(2) || domain.endsWith(suffix)) {
        return true;
      }
    } else if (pattern === domain) {
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────
// POLICY SELECTION ALGORITHM (SPEC-RT-003 / AIG-24)
// Selects the appropriate policy for an agent based on various criteria
// ─────────────────────────────────────────────────────────────────

/** Policy selection criteria */
export interface PolicySelectionCriteria {
  /** Asset ID to match */
  assetId: string;
  /** Risk level of the agent */
  riskLevel: RiskLevel;
  /** Operating mode */
  mode: OperatingMode;
  /** Tags associated with the agent */
  tags?: string[];
  /** Environment (e.g., "production", "staging") */
  environment?: string;
}

/** Policy selection result */
export interface PolicySelectionResult {
  /** The selected policy (null if none found) */
  policy: PolicyFile | null;
  /** Policy ID */
  policyId: string | null;
  /** How the policy was selected */
  selectionReason: PolicySelectionReason;
  /** Policies that were considered */
  candidatePolicies: string[];
  /** Score breakdown for the selected policy */
  score?: PolicyScore;
}

/** Reason for policy selection */
export type PolicySelectionReason =
  | "explicit_match"       // Matched by explicit asset ID
  | "risk_level_match"     // Matched by risk level
  | "tag_match"            // Matched by tags
  | "wildcard_match"       // Matched by wildcard applies_to
  | "default_policy"       // Used default policy
  | "no_policy_found";     // No matching policy

/** Score breakdown for policy selection */
export interface PolicyScore {
  /** Total score */
  total: number;
  /** Explicit asset match bonus */
  explicitMatch: number;
  /** Risk level match bonus */
  riskLevelMatch: number;
  /** Tag match count */
  tagMatches: number;
  /** Priority from policy */
  priority: number;
}

/**
 * Selects the best policy for an agent based on criteria.
 *
 * Selection algorithm:
 * 1. Filter policies by applies_to (asset ID or wildcard)
 * 2. Score remaining policies:
 *    - Explicit asset match: +100
 *    - Risk level match: +50
 *    - Each tag match: +10
 *    - Policy priority: +priority value
 * 3. Return highest scoring policy
 *
 * @param criteria Selection criteria
 * @param repository Policy repository
 * @param defaultPolicyId Optional default policy ID
 * @returns Selected policy result
 */
export function selectPolicy(
  criteria: PolicySelectionCriteria,
  repository: PolicyRepository,
  defaultPolicyId?: string
): PolicySelectionResult {
  const candidatePolicies: string[] = [];
  const scoredPolicies: Array<{
    policyId: string;
    policy: PolicyFile;
    score: PolicyScore;
    reason: PolicySelectionReason;
  }> = [];

  // Iterate through all policies in repository
  // Note: This assumes we can iterate - in practice, might need getAllIds() method
  const policies = getAllPoliciesFromRepository(repository);

  for (const [policyId, policy] of policies) {
    candidatePolicies.push(policyId);

    // Check if policy applies to this asset
    const appliesToResult = checkAppliesTo(policy.applies_to, criteria.assetId);
    if (!appliesToResult.applies) {
      continue;
    }

    // Score the policy
    const score = scorePolicy(policy, criteria, appliesToResult.isExplicit);
    const reason = determineSelectionReason(appliesToResult, score);

    scoredPolicies.push({ policyId, policy, score, reason });
  }

  // Sort by score descending
  scoredPolicies.sort((a, b) => b.score.total - a.score.total);

  // Return the best match
  if (scoredPolicies.length > 0) {
    const best = scoredPolicies[0];
    return {
      policy: best.policy,
      policyId: best.policyId,
      selectionReason: best.reason,
      candidatePolicies,
      score: best.score,
    };
  }

  // Try default policy
  if (defaultPolicyId && repository.has(defaultPolicyId)) {
    const defaultPolicy = repository.get(defaultPolicyId);
    if (defaultPolicy) {
      return {
        policy: defaultPolicy,
        policyId: defaultPolicyId,
        selectionReason: "default_policy",
        candidatePolicies,
      };
    }
  }

  // No policy found
  return {
    policy: null,
    policyId: null,
    selectionReason: "no_policy_found",
    candidatePolicies,
  };
}

/** Helper to get all policies from repository */
function getAllPoliciesFromRepository(
  repository: PolicyRepository
): Map<string, PolicyFile> {
  // If the repository is actually a Map, return it
  // This is a workaround for the interface limitation
  if (repository instanceof Map) {
    return repository as unknown as Map<string, PolicyFile>;
  }

  // Otherwise, we need to iterate through known IDs
  // In a real implementation, the repository would have a keys() or values() method
  const result = new Map<string, PolicyFile>();

  // Try to access internal map if available
  const anyRepo = repository as unknown as { policies?: Map<string, PolicyFile> };
  if (anyRepo.policies instanceof Map) {
    return anyRepo.policies;
  }

  return result;
}

/** Check if applies_to matches the asset ID */
function checkAppliesTo(
  appliesTo: string[],
  assetId: string
): { applies: boolean; isExplicit: boolean } {
  for (const pattern of appliesTo) {
    if (pattern === "*") {
      return { applies: true, isExplicit: false };
    }
    if (pattern === assetId) {
      return { applies: true, isExplicit: true };
    }
    // Support wildcard prefixes like "aigrc-2024-*"
    if (pattern.endsWith("*") && assetId.startsWith(pattern.slice(0, -1))) {
      return { applies: true, isExplicit: false };
    }
  }
  return { applies: false, isExplicit: false };
}

/** Score a policy based on criteria */
function scorePolicy(
  policy: PolicyFile,
  criteria: PolicySelectionCriteria,
  isExplicitMatch: boolean
): PolicyScore {
  let total = 0;
  let explicitMatch = 0;
  let riskLevelMatch = 0;
  let tagMatches = 0;

  // Explicit asset match
  if (isExplicitMatch) {
    explicitMatch = 100;
    total += 100;
  }

  // Check risk level conditions in rules
  const hasRiskLevelRule = policy.rules.some(rule =>
    rule.conditions?.risk_levels?.includes(criteria.riskLevel)
  );
  if (hasRiskLevelRule) {
    riskLevelMatch = 50;
    total += 50;
  }

  // Check tag matches
  const policyTags = policy.metadata?.tags ?? [];
  const criteriaTags = criteria.tags ?? [];
  for (const tag of criteriaTags) {
    if (policyTags.includes(tag)) {
      tagMatches++;
      total += 10;
    }
  }

  // Add priority bonus (if rules have priorities)
  const maxPriority = Math.max(...policy.rules.map(r => r.priority ?? 0), 0);
  total += maxPriority;

  return {
    total,
    explicitMatch,
    riskLevelMatch,
    tagMatches,
    priority: maxPriority,
  };
}

/** Determine the selection reason based on score */
function determineSelectionReason(
  appliesToResult: { applies: boolean; isExplicit: boolean },
  score: PolicyScore
): PolicySelectionReason {
  if (appliesToResult.isExplicit) {
    return "explicit_match";
  }
  if (score.riskLevelMatch > 0) {
    return "risk_level_match";
  }
  if (score.tagMatches > 0) {
    return "tag_match";
  }
  return "wildcard_match";
}

/**
 * Creates a policy selector with caching for repeated lookups.
 */
export interface PolicySelector {
  /** Select a policy for given criteria */
  select(criteria: PolicySelectionCriteria): PolicySelectionResult;
  /** Clear the cache */
  clearCache(): void;
  /** Get cache statistics */
  getCacheStats(): { hits: number; misses: number; size: number };
}

/**
 * Creates a policy selector with LRU caching.
 *
 * @param repository Policy repository
 * @param defaultPolicyId Default policy ID
 * @param cacheSize Maximum cache size (default: 100)
 * @returns Policy selector
 */
export function createPolicySelector(
  repository: PolicyRepository,
  defaultPolicyId?: string,
  cacheSize: number = 100
): PolicySelector {
  const cache = new Map<string, PolicySelectionResult>();
  let hits = 0;
  let misses = 0;

  function getCacheKey(criteria: PolicySelectionCriteria): string {
    return `${criteria.assetId}|${criteria.riskLevel}|${criteria.mode}|${(criteria.tags ?? []).sort().join(",")}|${criteria.environment ?? ""}`;
  }

  function select(criteria: PolicySelectionCriteria): PolicySelectionResult {
    const key = getCacheKey(criteria);

    // Check cache
    if (cache.has(key)) {
      hits++;
      return cache.get(key)!;
    }

    misses++;

    // Perform selection
    const result = selectPolicy(criteria, repository, defaultPolicyId);

    // Add to cache
    if (cache.size >= cacheSize) {
      // Remove oldest entry (first key)
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    cache.set(key, result);

    return result;
  }

  return {
    select,
    clearCache: () => cache.clear(),
    getCacheStats: () => ({ hits, misses, size: cache.size }),
  };
}
