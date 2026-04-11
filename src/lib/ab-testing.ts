// ─── A/B Testing Engine ───
// Pure logic — no React, no hooks.
// Manages experiment definitions, variant assignment, and consistent bucketing.

// ─── Types ───

export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "archived";

export type ExperimentTargetType = "page" | "section" | "popup" | "component";

export interface ExperimentTargeting {
  pages?: string[];
  sectionIds?: string[];
  componentIds?: string[];
  popupIds?: string[];
  devices?: ("mobile" | "tablet" | "desktop")[];
  languages?: string[];
  userTypes?: ("guest" | "logged_in" | "returning")[];
  campaignIds?: string[];
  userSegments?: ("new" | "casual" | "engaged" | "loyal")[];
}

export interface ExperimentVariant {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  weight: number; // 0–100, sums to 100 across all variants
  isControl: boolean;
  contentOverrides: Record<string, unknown>; // merged onto block/popup content
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  targetType: ExperimentTargetType;
  targetId: string; // the specific section/page/popup being tested
  targeting: ExperimentTargeting;
  variants: ExperimentVariant[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  winnerId: string | null;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: number; // timestamp
}

// ─── Assignment Storage ───

const ASSIGNMENT_KEY = "layerloot_ab_assignments";

function readAssignments(): Record<string, ExperimentAssignment> {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAssignments(assignments: Record<string, ExperimentAssignment>) {
  try {
    localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments));
  } catch {
    // ignore quota errors
  }
}

export function getAssignment(experimentId: string): ExperimentAssignment | null {
  return readAssignments()[experimentId] ?? null;
}

export function setAssignment(experimentId: string, variantId: string) {
  const assignments = readAssignments();
  assignments[experimentId] = {
    experimentId,
    variantId,
    assignedAt: Date.now(),
  };
  writeAssignments(assignments);
}

export function clearAssignment(experimentId: string) {
  const assignments = readAssignments();
  delete assignments[experimentId];
  writeAssignments(assignments);
}

export function clearAllAssignments() {
  try {
    localStorage.removeItem(ASSIGNMENT_KEY);
  } catch {
    // ignore
  }
}

// ─── Deterministic Bucketing ───

/**
 * Hash a string to a number 0–99 using a simple but consistent algorithm.
 * Used for stable variant assignment.
 */
function hashToPercent(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Get a stable session/user identifier for bucketing.
 * Uses analytics session ID which persists across page reloads in the same session.
 */
function getBucketId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem("layerloot_ab_bucket_id");
    if (!id) {
      // Try localStorage for cross-session consistency
      id = localStorage.getItem("layerloot_ab_bucket_id");
      if (!id) {
        id = crypto.randomUUID?.() ?? `ab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("layerloot_ab_bucket_id", id);
      }
      sessionStorage.setItem("layerloot_ab_bucket_id", id);
    }
    return id;
  } catch {
    return `ab-${Date.now()}`;
  }
}

// ─── Variant Selection ───

/**
 * Assign a user to a variant based on weighted distribution.
 * Uses deterministic bucketing (hash of bucketId + experimentId) for consistency.
 * Falls back to stored assignment if available.
 */
export function assignVariant(experiment: Experiment): ExperimentVariant | null {
  if (!experiment.variants.length) return null;
  if (experiment.status !== "running") return null;

  // Check existing assignment
  const existing = getAssignment(experiment.id);
  if (existing) {
    const variant = experiment.variants.find((v) => v.id === existing.variantId);
    if (variant) return variant;
    // Variant no longer exists, reassign
  }

  // If winner selected, always serve winner
  if (experiment.winnerId) {
    const winner = experiment.variants.find((v) => v.id === experiment.winnerId);
    if (winner) {
      setAssignment(experiment.id, winner.id);
      return winner;
    }
  }

  // Deterministic bucketing
  const bucketId = getBucketId();
  const bucket = hashToPercent(`${bucketId}:${experiment.id}`);

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      setAssignment(experiment.id, variant.id);
      return variant;
    }
  }

  // Fallback to last variant (rounding edge case)
  const fallback = experiment.variants[experiment.variants.length - 1];
  setAssignment(experiment.id, fallback.id);
  return fallback;
}

// ─── Targeting Evaluation ───

export interface ABUserContext {
  device: "mobile" | "tablet" | "desktop";
  language: string;
  isLoggedIn: boolean;
  isReturningVisitor: boolean;
  activeCampaignId: string | null;
  userSegment: "new" | "casual" | "engaged" | "loyal";
  currentPage: string;
}

/**
 * Check if an experiment's targeting matches the current user context.
 */
export function matchesTargeting(targeting: ExperimentTargeting, ctx: ABUserContext): boolean {
  if (targeting.devices?.length && !targeting.devices.includes(ctx.device)) return false;
  if (targeting.languages?.length && !targeting.languages.some((l) => ctx.language.toLowerCase().startsWith(l.toLowerCase()))) return false;

  if (targeting.userTypes?.length) {
    const userType = ctx.isLoggedIn ? "logged_in" : ctx.isReturningVisitor ? "returning" : "guest";
    if (!targeting.userTypes.includes(userType)) return false;
  }

  if (targeting.campaignIds?.length && ctx.activeCampaignId && !targeting.campaignIds.includes(ctx.activeCampaignId)) return false;
  if (targeting.userSegments?.length && !targeting.userSegments.includes(ctx.userSegment)) return false;

  return true;
}

/**
 * Check if an experiment targets a specific entity (section, popup, page, component).
 */
export function experimentTargetsEntity(experiment: Experiment, entityType: ExperimentTargetType, entityId: string): boolean {
  return experiment.targetType === entityType && experiment.targetId === entityId;
}

// ─── Content Application ───

/**
 * Apply A/B variant content overrides to a block's content.
 * Only applies if experiment is running and user is assigned to a non-control variant.
 * Returns original content if no changes needed.
 */
export function applyABVariantContent(
  content: Record<string, unknown>,
  variant: ExperimentVariant | null,
  experimentId: string,
): Record<string, unknown> {
  if (!variant || variant.isControl) {
    return content;
  }

  if (!variant.contentOverrides || Object.keys(variant.contentOverrides).length === 0) {
    return content;
  }

  return {
    ...content,
    ...variant.contentOverrides,
    _abExperimentId: experimentId,
    _abVariantId: variant.id,
    _abVariantName: variant.name,
  };
}

// ─── Factory Helpers ───

export function createExperimentVariant(
  experimentId: string,
  name: string,
  weight: number,
  isControl: boolean,
): ExperimentVariant {
  return {
    id: `abv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    experimentId,
    name,
    description: "",
    weight,
    isControl,
    contentOverrides: {},
  };
}

export function createExperiment(
  name: string,
  targetType: ExperimentTargetType,
  targetId: string,
): Experiment {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name,
    description: "",
    status: "draft",
    targetType,
    targetId,
    targeting: {},
    variants: [
      createExperimentVariant(id, "Control", 50, true),
      createExperimentVariant(id, "Variant B", 50, false),
    ],
    startDate: null,
    endDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    winnerId: null,
  };
}

// ─── Status Labels ───

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  draft: "Draft",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const EXPERIMENT_STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-emerald-500/15 text-emerald-600",
  paused: "bg-amber-500/15 text-amber-600",
  completed: "bg-blue-500/15 text-blue-600",
  archived: "bg-muted text-muted-foreground/60",
};

export const TARGET_TYPE_LABELS: Record<ExperimentTargetType, string> = {
  page: "Page",
  section: "Section / Block",
  popup: "Popup",
  component: "Component",
};
