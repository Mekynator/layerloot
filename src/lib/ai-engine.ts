// ─── AI + Automation Engine ───
// Pure logic — no React, no hooks. Types, suggestion scoring, automation rules, content templates.

// ─── Suggestion Types ───

export type AISuggestionType =
  | "content_improvement"
  | "section_reorder"
  | "section_add"
  | "section_remove"
  | "cta_optimize"
  | "personalization_add"
  | "ab_test_create"
  | "campaign_optimize"
  | "seo_improve"
  | "performance_flag";

export type AISuggestionPriority = "low" | "medium" | "high" | "critical";
export type AISuggestionStatus = "pending" | "accepted" | "dismissed" | "expired";

export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  title: string;
  description: string;
  priority: AISuggestionPriority;
  status: AISuggestionStatus;
  targetEntityType: "page" | "section" | "popup" | "product" | "campaign";
  targetEntityId: string;
  suggestedChanges: Record<string, unknown>;
  reasoning: string;
  estimatedImpact: string;
  createdAt: string;
}

// ─── Automation Rule Types ───

export type AutomationTrigger =
  | "low_engagement"
  | "high_bounce"
  | "cart_abandonment"
  | "new_visitor"
  | "returning_visitor"
  | "time_based"
  | "conversion_drop"
  | "experiment_complete"
  | "section_underperform";

export type AutomationAction =
  | "show_popup"
  | "reorder_sections"
  | "suggest_ab_test"
  | "enable_personalization"
  | "send_notification"
  | "flag_for_review"
  | "auto_optimize_cta"
  | "suggest_content_change";

export type AutomationRuleStatus = "active" | "paused" | "draft" | "archived";

export interface AutomationCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "between";
  value: number;
  secondaryValue?: number; // for "between"
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  action: AutomationAction;
  actionConfig: Record<string, unknown>;
  status: AutomationRuleStatus;
  cooldownMinutes: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── AI Insight Types ───

export type AIInsightCategory =
  | "performance"
  | "engagement"
  | "conversion"
  | "content"
  | "audience"
  | "experiment";

export interface AIInsight {
  id: string;
  category: AIInsightCategory;
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  trend: "up" | "down" | "stable";
  suggestion: AISuggestion | null;
  dataPoints: { label: string; value: number }[];
  createdAt: string;
}

// ─── Content Generation Types ───

export type ContentTone = "professional" | "casual" | "playful" | "luxurious" | "urgent";
export type ContentPurpose = "heading" | "subheading" | "cta" | "description" | "faq_answer" | "badge";

export interface ContentGenerationRequest {
  purpose: ContentPurpose;
  tone: ContentTone;
  context: {
    productName?: string;
    categoryName?: string;
    currentText?: string;
    targetAudience?: string;
    keywords?: string[];
  };
  maxLength?: number;
}

export interface ContentGenerationResult {
  id: string;
  text: string;
  confidence: number;
  alternates: string[];
}

// ─── Suggestion Scoring ───

const PRIORITY_WEIGHTS: Record<AISuggestionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const TYPE_BASE_SCORES: Record<AISuggestionType, number> = {
  performance_flag: 90,
  conversion_drop: 85,
  cta_optimize: 70,
  content_improvement: 60,
  ab_test_create: 55,
  personalization_add: 50,
  section_reorder: 45,
  section_add: 40,
  section_remove: 35,
  campaign_optimize: 50,
  seo_improve: 45,
};

// Fix: add conversion_drop to the type properly
(TYPE_BASE_SCORES as Record<string, number>).conversion_drop = 85;

export function scoreSuggestion(suggestion: AISuggestion): number {
  const baseScore = TYPE_BASE_SCORES[suggestion.type] ?? 50;
  const priorityMultiplier = PRIORITY_WEIGHTS[suggestion.priority];
  return Math.min(100, baseScore * (priorityMultiplier / 2.5));
}

export function sortSuggestionsByScore(suggestions: AISuggestion[]): AISuggestion[] {
  return [...suggestions].sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a));
}

// ─── Automation Rule Evaluation ───

export interface AutomationMetrics {
  bounceRate: number;
  avgEngagementSeconds: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  sectionViewRate: number;
  ctaClickRate: number;
  pageViews: number;
}

function evaluateCondition(condition: AutomationCondition, metrics: AutomationMetrics): boolean {
  const metricValue = (metrics as Record<string, number>)[condition.metric];
  if (metricValue === undefined) return false;

  switch (condition.operator) {
    case "gt": return metricValue > condition.value;
    case "lt": return metricValue < condition.value;
    case "eq": return metricValue === condition.value;
    case "gte": return metricValue >= condition.value;
    case "lte": return metricValue <= condition.value;
    case "between":
      return metricValue >= condition.value && metricValue <= (condition.secondaryValue ?? condition.value);
    default: return false;
  }
}

export function shouldTriggerRule(rule: AutomationRule, metrics: AutomationMetrics): boolean {
  if (rule.status !== "active") return false;

  // Check cooldown
  if (rule.lastTriggeredAt) {
    const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
    if (elapsed < rule.cooldownMinutes * 60 * 1000) return false;
  }

  // All conditions must be met
  return rule.conditions.every((c) => evaluateCondition(c, metrics));
}

export function evaluateRules(rules: AutomationRule[], metrics: AutomationMetrics): AutomationRule[] {
  return rules.filter((rule) => shouldTriggerRule(rule, metrics));
}

// ─── Content Generation Templates ───

const HEADING_TEMPLATES: Record<ContentTone, string[]> = {
  professional: [
    "Discover {product} — Crafted for Excellence",
    "Premium {product} Collection",
    "Elevate Your Experience with {product}",
  ],
  casual: [
    "Check Out {product}!",
    "You'll Love {product}",
    "Meet {product} — Your New Favorite",
  ],
  playful: [
    "✨ {product} Just Dropped!",
    "Say Hello to {product}!",
    "Ready to Fall in Love with {product}?",
  ],
  luxurious: [
    "The Art of {product}",
    "{product} — Uncompromising Quality",
    "Indulge in {product}",
  ],
  urgent: [
    "Don't Miss {product} — Limited Stock!",
    "Last Chance: {product} Going Fast",
    "{product} — Order Before It's Gone",
  ],
};

const CTA_TEMPLATES: Record<ContentTone, string[]> = {
  professional: ["Get Started", "Learn More", "Explore Now", "View Details"],
  casual: ["Check It Out", "See More", "Grab Yours", "Take a Look"],
  playful: ["Yes, I Want This!", "Gimme!", "Let's Go!", "Count Me In"],
  luxurious: ["Discover More", "Experience It", "Explore the Collection", "Indulge Now"],
  urgent: ["Shop Now", "Buy Before It's Gone", "Claim Yours", "Hurry — Order Now"],
};

const DESCRIPTION_TEMPLATES: Record<ContentTone, string[]> = {
  professional: [
    "Expertly crafted {product} designed with precision and quality materials.",
    "Discover the perfect {product} for discerning tastes. Built to last.",
  ],
  casual: [
    "Looking for a great {product}? We've got you covered with something special.",
    "A {product} that just works. Simple, reliable, and looks great too.",
  ],
  playful: [
    "This {product} is basically magic in a box. You're welcome. ✨",
    "We made {product} so good, even we can't stop staring at it.",
  ],
  luxurious: [
    "An exquisite {product} that embodies the pinnacle of craftsmanship and elegance.",
    "Meticulously designed {product} for those who appreciate the finer things.",
  ],
  urgent: [
    "Our best-selling {product} is flying off the shelves. Don't wait!",
    "Limited edition {product} — once it's gone, it's gone forever.",
  ],
};

function fillTemplate(template: string, context: ContentGenerationRequest["context"]): string {
  let text = template;
  if (context.productName) text = text.replace(/\{product\}/g, context.productName);
  if (context.categoryName) text = text.replace(/\{category\}/g, context.categoryName);
  return text;
}

export function generateContent(request: ContentGenerationRequest): ContentGenerationResult {
  const templates = getTemplatesForPurpose(request.purpose, request.tone);
  const filled = templates.map((t) => fillTemplate(t, request.context));

  // Pick the first as primary, rest as alternates
  const primary = filled[0] ?? request.context.currentText ?? "";
  const alternates = filled.slice(1);

  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: request.maxLength ? primary.slice(0, request.maxLength) : primary,
    confidence: 0.75 + Math.random() * 0.2,
    alternates,
  };
}

function getTemplatesForPurpose(purpose: ContentPurpose, tone: ContentTone): string[] {
  switch (purpose) {
    case "heading":
    case "subheading":
      return HEADING_TEMPLATES[tone] ?? HEADING_TEMPLATES.professional;
    case "cta":
      return CTA_TEMPLATES[tone] ?? CTA_TEMPLATES.professional;
    case "description":
    case "faq_answer":
      return DESCRIPTION_TEMPLATES[tone] ?? DESCRIPTION_TEMPLATES.professional;
    case "badge":
      return ["New", "Popular", "Best Seller", "Limited", "Exclusive"];
    default:
      return HEADING_TEMPLATES[tone] ?? HEADING_TEMPLATES.professional;
  }
}

// ─── Insight Generation from Analytics Data ───

export interface SectionAnalytics {
  sectionId: string;
  sectionType: string;
  sectionTitle: string;
  views: number;
  clicks: number;
  avgTimeVisible: number;
  bounceAfter: number;
}

export function generateSectionInsights(sections: SectionAnalytics[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const avgCTR = sections.reduce((sum, s) => sum + (s.views > 0 ? s.clicks / s.views : 0), 0) / Math.max(sections.length, 1);

  for (const section of sections) {
    const ctr = section.views > 0 ? section.clicks / section.views : 0;

    // Low engagement sections
    if (section.views > 10 && ctr < avgCTR * 0.5) {
      insights.push({
        id: `ins_${section.sectionId}_low_ctr`,
        category: "engagement",
        title: `Low engagement: "${section.sectionTitle}"`,
        description: `This section has a ${(ctr * 100).toFixed(1)}% click rate, well below the page average of ${(avgCTR * 100).toFixed(1)}%.`,
        metric: "click_through_rate",
        currentValue: ctr,
        benchmarkValue: avgCTR,
        trend: "down",
        suggestion: {
          id: `sug_${section.sectionId}_improve`,
          type: "content_improvement",
          title: `Improve "${section.sectionTitle}" content`,
          description: "Consider updating the headline, CTA, or visual to increase engagement.",
          priority: ctr < avgCTR * 0.25 ? "high" : "medium",
          status: "pending",
          targetEntityType: "section",
          targetEntityId: section.sectionId,
          suggestedChanges: {},
          reasoning: `Click-through rate is ${((1 - ctr / avgCTR) * 100).toFixed(0)}% below average.`,
          estimatedImpact: `Potential ${((avgCTR - ctr) * section.views).toFixed(0)} additional clicks`,
          createdAt: new Date().toISOString(),
        },
        dataPoints: [
          { label: "Current CTR", value: ctr },
          { label: "Page Average", value: avgCTR },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    // High bounce sections
    if (section.views > 10 && section.bounceAfter > 0.5) {
      insights.push({
        id: `ins_${section.sectionId}_high_bounce`,
        category: "performance",
        title: `High bounce after "${section.sectionTitle}"`,
        description: `${(section.bounceAfter * 100).toFixed(0)}% of visitors leave after viewing this section.`,
        metric: "bounce_after_rate",
        currentValue: section.bounceAfter,
        benchmarkValue: 0.3,
        trend: "up",
        suggestion: {
          id: `sug_${section.sectionId}_bounce`,
          type: "section_reorder",
          title: `Move or improve "${section.sectionTitle}"`,
          description: "Consider moving this section or adding a stronger transition to keep visitors engaged.",
          priority: section.bounceAfter > 0.7 ? "high" : "medium",
          status: "pending",
          targetEntityType: "section",
          targetEntityId: section.sectionId,
          suggestedChanges: {},
          reasoning: `Bounce rate after this section is ${(section.bounceAfter * 100).toFixed(0)}%.`,
          estimatedImpact: "Reduced page exit rate",
          createdAt: new Date().toISOString(),
        },
        dataPoints: [
          { label: "Bounce Rate", value: section.bounceAfter },
          { label: "Target", value: 0.3 },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    // Top performing sections
    if (section.views > 10 && ctr > avgCTR * 1.5) {
      insights.push({
        id: `ins_${section.sectionId}_top`,
        category: "engagement",
        title: `Top performer: "${section.sectionTitle}"`,
        description: `This section has ${(ctr * 100).toFixed(1)}% CTR — ${((ctr / avgCTR) * 100 - 100).toFixed(0)}% above average.`,
        metric: "click_through_rate",
        currentValue: ctr,
        benchmarkValue: avgCTR,
        trend: "up",
        suggestion: null,
        dataPoints: [
          { label: "Current CTR", value: ctr },
          { label: "Page Average", value: avgCTR },
        ],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}

// ─── Factory Helpers ───

export function createAutomationRule(name: string, trigger: AutomationTrigger, action: AutomationAction): AutomationRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    description: "",
    trigger,
    conditions: [],
    action,
    actionConfig: {},
    status: "draft",
    cooldownMinutes: 60,
    lastTriggeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createSuggestion(
  type: AISuggestionType,
  title: string,
  description: string,
  targetEntityType: AISuggestion["targetEntityType"],
  targetEntityId: string,
  priority: AISuggestionPriority = "medium",
): AISuggestion {
  return {
    id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    description,
    priority,
    status: "pending",
    targetEntityType,
    targetEntityId,
    suggestedChanges: {},
    reasoning: "",
    estimatedImpact: "",
    createdAt: new Date().toISOString(),
  };
}

// ─── Status Labels ───

export const SUGGESTION_TYPE_LABELS: Record<AISuggestionType, string> = {
  content_improvement: "Content Improvement",
  section_reorder: "Section Reorder",
  section_add: "Add Section",
  section_remove: "Remove Section",
  cta_optimize: "Optimize CTA",
  personalization_add: "Add Personalization",
  ab_test_create: "Create A/B Test",
  campaign_optimize: "Optimize Campaign",
  seo_improve: "SEO Improvement",
  performance_flag: "Performance Flag",
};

export const SUGGESTION_PRIORITY_COLORS: Record<AISuggestionPriority, string> = {
  critical: "bg-red-500/15 text-red-600",
  high: "bg-amber-500/15 text-amber-600",
  medium: "bg-blue-500/15 text-blue-600",
  low: "bg-muted text-muted-foreground",
};

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  low_engagement: "Low Engagement",
  high_bounce: "High Bounce Rate",
  cart_abandonment: "Cart Abandonment",
  new_visitor: "New Visitor",
  returning_visitor: "Returning Visitor",
  time_based: "Time-based",
  conversion_drop: "Conversion Drop",
  experiment_complete: "Experiment Complete",
  section_underperform: "Section Underperforming",
};

export const AUTOMATION_ACTION_LABELS: Record<AutomationAction, string> = {
  show_popup: "Show Popup",
  reorder_sections: "Reorder Sections",
  suggest_ab_test: "Suggest A/B Test",
  enable_personalization: "Enable Personalization",
  send_notification: "Send Notification",
  flag_for_review: "Flag for Review",
  auto_optimize_cta: "Auto-optimize CTA",
  suggest_content_change: "Suggest Content Change",
};

export const INSIGHT_CATEGORY_LABELS: Record<AIInsightCategory, string> = {
  performance: "Performance",
  engagement: "Engagement",
  conversion: "Conversion",
  content: "Content",
  audience: "Audience",
  experiment: "Experiments",
};

export const INSIGHT_CATEGORY_COLORS: Record<AIInsightCategory, string> = {
  performance: "bg-purple-500/15 text-purple-600",
  engagement: "bg-blue-500/15 text-blue-600",
  conversion: "bg-emerald-500/15 text-emerald-600",
  content: "bg-amber-500/15 text-amber-600",
  audience: "bg-pink-500/15 text-pink-600",
  experiment: "bg-indigo-500/15 text-indigo-600",
};

export const CONTENT_TONE_LABELS: Record<ContentTone, string> = {
  professional: "Professional",
  casual: "Casual",
  playful: "Playful",
  luxurious: "Luxurious",
  urgent: "Urgent",
};

export const CONTENT_PURPOSE_LABELS: Record<ContentPurpose, string> = {
  heading: "Heading",
  subheading: "Subheading",
  cta: "Call to Action",
  description: "Description",
  faq_answer: "FAQ Answer",
  badge: "Badge",
};
