import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDelta, percentage } from "@/lib/analytics";

export interface AnalyticsFilters {
  range: "7d" | "30d" | "90d";
  page: string;
  device: "all" | "desktop" | "tablet" | "mobile";
  surface: "all" | "storefront" | "admin";
}

type AnalyticsRow = {
  id: string;
  session_id: string;
  event_name: string;
  event_category: string;
  page_path: string | null;
  page_title: string | null;
  surface: string | null;
  device_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  reusable_id: string | null;
  component_id: string | null;
  popup_id: string | null;
  campaign_id: string | null;
  source: string | null;
  value: number | null;
  context: Record<string, any> | null;
  created_at: string;
};

const RANGE_TO_DAYS: Record<AnalyticsFilters["range"], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const CLICK_EVENTS = new Set(["section_click", "component_click", "button_click", "cta_click", "product_click", "popup_click"]);
const VIEW_EVENTS = new Set(["page_view", "section_view", "component_view", "popup_view", "button_impression", "product_view"]);
const CONVERSION_EVENTS = new Set(["add_to_cart", "checkout_started", "purchase_completed", "newsletter_signup", "custom_order_submit"]);

const toIsoRange = (range: AnalyticsFilters["range"]) => {
  const now = new Date();
  const from = new Date(now.getTime() - RANGE_TO_DAYS[range] * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - RANGE_TO_DAYS[range] * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
    previousFrom: previousFrom.toISOString(),
    previousTo: from.toISOString(),
  };
};

const withFilters = (query: any, filters: AnalyticsFilters) => {
  let next = query;
  if (filters.page !== "all") next = next.eq("page_path", filters.page);
  if (filters.device !== "all") next = next.eq("device_type", filters.device);
  if (filters.surface !== "all") next = next.eq("surface", filters.surface);
  return next;
};

const aggregateRows = (events: AnalyticsRow[]) => {
  const overview = {
    totalViews: 0,
    uniqueVisitors: new Set<string>(),
    totalClicks: 0,
    addToCarts: 0,
    checkouts: 0,
    purchases: 0,
    newsletterSignups: 0,
    customOrders: 0,
    engagementMs: 0,
    engagementSamples: 0,
    maxScrollDepth: 0,
  };

  const pageMap = new Map<string, any>();
  const sectionMap = new Map<string, any>();
  const componentMap = new Map<string, any>();
  const popupMap = new Map<string, any>();
  const productMap = new Map<string, any>();
  const editorMap = new Map<string, number>();

  events.forEach((event) => {
    const context = event.context || {};
    const pageKey = event.page_path || "/";
    const label = context.entityLabel || context.blockTitle || context.buttonLabel || event.entity_id || event.popup_id || pageKey;
    const isView = VIEW_EVENTS.has(event.event_name);
    const isClick = CLICK_EVENTS.has(event.event_name);
    const isConversion = CONVERSION_EVENTS.has(event.event_name);

    overview.uniqueVisitors.add(event.session_id);
    if (isView) overview.totalViews += 1;
    if (isClick) overview.totalClicks += 1;
    if (event.event_name === "add_to_cart") overview.addToCarts += 1;
    if (event.event_name === "checkout_started") overview.checkouts += 1;
    if (event.event_name === "purchase_completed") overview.purchases += 1;
    if (event.event_name === "newsletter_signup") overview.newsletterSignups += 1;
    if (event.event_name === "custom_order_submit") overview.customOrders += 1;
    if (event.event_name === "page_engagement") {
      const ms = Number(event.value || context.engagementMs || 0);
      overview.engagementMs += ms;
      overview.engagementSamples += 1;
      overview.maxScrollDepth = Math.max(overview.maxScrollDepth, Number(context.maxScrollDepth || 0));
    }

    const pageEntry = pageMap.get(pageKey) || {
      pagePath: pageKey,
      label: pageKey,
      views: 0,
      clicks: 0,
      conversions: 0,
      uniqueVisitors: new Set<string>(),
      engagementMs: 0,
      engagementSamples: 0,
      maxScrollDepth: 0,
    };
    if (event.event_name === "page_view") pageEntry.views += 1;
    if (isClick) pageEntry.clicks += 1;
    if (isConversion) pageEntry.conversions += 1;
    if (event.event_name === "page_engagement") {
      pageEntry.engagementMs += Number(event.value || context.engagementMs || 0);
      pageEntry.engagementSamples += 1;
      pageEntry.maxScrollDepth = Math.max(pageEntry.maxScrollDepth, Number(context.maxScrollDepth || 0));
    }
    pageEntry.uniqueVisitors.add(event.session_id);
    pageMap.set(pageKey, pageEntry);

    if (["section", "reusable_section", "global_component"].includes(event.entity_type || "") || ["section_view", "section_click", "component_view", "component_click"].includes(event.event_name)) {
      const key = `${event.entity_type || "section"}:${event.entity_id || event.reusable_id || event.component_id || label}`;
      const entry = sectionMap.get(key) || {
        id: event.entity_id || event.reusable_id || event.component_id || label,
        label,
        pagePath: pageKey,
        entityType: event.entity_type || "section",
        views: 0,
        clicks: 0,
        conversions: 0,
        interactions: 0,
      };
      if (event.event_name === "section_view" || event.event_name === "component_view") entry.views += 1;
      if (event.event_name === "section_click" || event.event_name === "component_click") entry.clicks += 1;
      if (isClick) entry.interactions += 1;
      if (isConversion) entry.conversions += 1;
      sectionMap.set(key, entry);
    }

    if (event.reusable_id || event.component_id || event.entity_type === "global_component") {
      const componentKey = event.component_id || event.reusable_id || event.entity_id || label;
      const entry = componentMap.get(componentKey) || {
        id: componentKey,
        label: context.reusableName || context.componentName || label,
        kind: event.entity_type === "global_component" ? "Global component" : "Reusable section",
        pages: new Set<string>(),
        views: 0,
        clicks: 0,
        conversions: 0,
        instances: new Set<string>(),
      };
      if (event.event_name === "section_view" || event.event_name === "component_view") entry.views += 1;
      if (isClick) entry.clicks += 1;
      if (isConversion) entry.conversions += 1;
      entry.pages.add(pageKey);
      if (event.entity_id) entry.instances.add(event.entity_id);
      componentMap.set(componentKey, entry);
    }

    if (event.popup_id || event.event_name.startsWith("popup_")) {
      const popupKey = event.popup_id || event.entity_id || "popup";
      const entry = popupMap.get(popupKey) || {
        id: popupKey,
        label: context.popupName || popupKey,
        views: 0,
        clicks: 0,
        closes: 0,
        conversions: 0,
        campaignId: event.campaign_id || null,
      };
      if (event.event_name === "popup_view") entry.views += 1;
      if (event.event_name === "popup_click") entry.clicks += 1;
      if (event.event_name === "popup_close") entry.closes += 1;
      if (isConversion) entry.conversions += 1;
      popupMap.set(popupKey, entry);
    }

    if (event.entity_type === "product" || ["product_view", "product_click", "add_to_cart", "purchase_completed"].includes(event.event_name)) {
      const productKey = event.entity_id || context.slug || label;
      const entry = productMap.get(productKey) || {
        id: productKey,
        label: context.productName || label,
        views: 0,
        clicks: 0,
        addToCarts: 0,
        purchases: 0,
        revenue: 0,
      };
      if (event.event_name === "product_view") entry.views += 1;
      if (event.event_name === "product_click") entry.clicks += 1;
      if (event.event_name === "add_to_cart") entry.addToCarts += 1;
      if (event.event_name === "purchase_completed") {
        entry.purchases += 1;
        entry.revenue += Number(event.value || 0);
      }
      productMap.set(productKey, entry);
    }

    if (event.surface === "admin" || event.event_name.startsWith("editor_") || event.event_name.startsWith("preset_") || event.event_name.startsWith("reusable_")) {
      editorMap.set(event.event_name, (editorMap.get(event.event_name) || 0) + 1);
    }
  });

  const pageStats = Array.from(pageMap.values()).map((entry) => ({
    pagePath: entry.pagePath,
    label: entry.label,
    views: entry.views,
    clicks: entry.clicks,
    conversions: entry.conversions,
    ctr: percentage(entry.clicks, entry.views),
    uniqueVisitors: entry.uniqueVisitors.size,
    avgEngagementMs: entry.engagementSamples ? Math.round(entry.engagementMs / entry.engagementSamples) : 0,
    maxScrollDepth: entry.maxScrollDepth,
  })).sort((a, b) => b.views - a.views);

  const sectionStats = Array.from(sectionMap.values()).map((entry) => ({
    ...entry,
    ctr: percentage(entry.clicks, entry.views),
  })).sort((a, b) => b.views - a.views);

  const componentStats = Array.from(componentMap.values()).map((entry) => ({
    ...entry,
    pageCount: entry.pages.size,
    instanceCount: entry.instances.size,
    ctr: percentage(entry.clicks, entry.views),
  })).sort((a, b) => b.views - a.views);

  const popupStats = Array.from(popupMap.values()).map((entry) => ({
    ...entry,
    ctr: percentage(entry.clicks, entry.views),
  })).sort((a, b) => b.views - a.views);

  const commerceStats = Array.from(productMap.values()).map((entry) => ({
    ...entry,
    ctr: percentage(entry.clicks, entry.views),
    addToCartRate: percentage(entry.addToCarts, entry.views || entry.clicks),
  })).sort((a, b) => b.views - a.views);

  return {
    overview: {
      totalViews: overview.totalViews,
      uniqueVisitors: overview.uniqueVisitors.size,
      totalClicks: overview.totalClicks,
      addToCarts: overview.addToCarts,
      checkouts: overview.checkouts,
      purchases: overview.purchases,
      newsletterSignups: overview.newsletterSignups,
      customOrders: overview.customOrders,
      ctr: percentage(overview.totalClicks, overview.totalViews),
      conversionRate: percentage(overview.purchases || overview.addToCarts, overview.uniqueVisitors.size),
      avgEngagementMs: overview.engagementSamples ? Math.round(overview.engagementMs / overview.engagementSamples) : 0,
      maxScrollDepth: overview.maxScrollDepth,
    },
    pageStats,
    sectionStats,
    componentStats,
    popupStats,
    commerceStats,
    editorStats: Array.from(editorMap.entries()).map(([eventName, count]) => ({ eventName, count })).sort((a, b) => b.count - a.count),
  };
};

export function useAnalyticsDashboard(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics-dashboard", filters],
    queryFn: async () => {
      const range = toIsoRange(filters.range);

      const currentQuery = withFilters(
        supabase
          .from("analytics_events" as any)
          .select("*")
          .gte("created_at", range.from)
          .lte("created_at", range.to)
          .order("created_at", { ascending: false })
          .limit(5000),
        filters,
      );

      const previousQuery = withFilters(
        supabase
          .from("analytics_events" as any)
          .select("*")
          .gte("created_at", range.previousFrom)
          .lt("created_at", range.previousTo)
          .order("created_at", { ascending: false })
          .limit(5000),
        filters,
      );

      const [currentRes, previousRes, pagesRes, reusableRes] = await Promise.all([
        currentQuery,
        previousQuery,
        supabase.from("site_pages").select("id, name, title, full_path, slug, is_home").order("sort_order"),
        supabase.from("reusable_blocks").select("id, name").eq("is_archived", false).order("updated_at", { ascending: false }),
      ]);

      const currentEvents = (currentRes.data ?? []) as AnalyticsRow[];
      const previousEvents = (previousRes.data ?? []) as AnalyticsRow[];
      const current = aggregateRows(currentEvents);
      const previous = aggregateRows(previousEvents);

      return {
        filtersMeta: {
          pages: (pagesRes.data ?? []).map((page: any) => ({
            value: page.is_home ? "/" : (page.full_path || `/${page.slug}`),
            label: page.title || page.name || page.slug,
          })),
          reusableBlocks: (reusableRes.data ?? []).map((item: any) => ({ value: item.id, label: item.name })),
        },
        currentEvents,
        previousEvents,
        current,
        previous,
        comparison: {
          totalViews: formatDelta(current.overview.totalViews, previous.overview.totalViews),
          uniqueVisitors: formatDelta(current.overview.uniqueVisitors, previous.overview.uniqueVisitors),
          totalClicks: formatDelta(current.overview.totalClicks, previous.overview.totalClicks),
          purchases: formatDelta(current.overview.purchases, previous.overview.purchases),
          addToCarts: formatDelta(current.overview.addToCarts, previous.overview.addToCarts),
          conversionRate: formatDelta(current.overview.conversionRate, previous.overview.conversionRate),
        },
      };
    },
  });
}
