export function getStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en ?? Object.values(val)[0] ?? "";
}

export function sanitizeAssistantText(assistantText: string, ctxProducts: any[]) {
  if (!assistantText) return "";
  const productBlockRe = /•\s+\*\*([^*\n]+)\*\*[ \t]*\n((?:[ \t]*-[ \t]+[^\n]*\n?)*)/g;

  const sanitizeProductBlock = (matchName: string) => {
    const name = matchName.trim();
    let found = null;
    found = ctxProducts.find((p) => p.id && p.id === name);
    if (!found) {
      const slug = name.startsWith("/products/") ? name.replace(/^\/products\//, "") : name;
      found = ctxProducts.find((p) => p.slug && p.slug === slug);
    }
    if (!found) {
      found = ctxProducts.find((p) => p.name && p.name.toLowerCase() === name.toLowerCase());
    }
    if (!found) return null;
    const img = (found.images && found.images[0]) || "";
    const price = found.price != null ? `${Number(found.price)} kr` : "";
    const productUrl = `/products/${found.slug}`;
    return `• **${getStr(found.name)}**\n  - \n  - ${price}\n  - ![${getStr(found.name)}](${img})\n  - → [View product](${productUrl})\n`;
  };

  let sanitized = assistantText;
  let anyProductReplaced = false;
  sanitized = sanitized.replace(productBlockRe, (full, name, body) => {
    const repl = sanitizeProductBlock(name);
    if (repl) { anyProductReplaced = true; return repl; }
    return "";
  });

  const routeMap: Record<string, string> = {
    '/create-your-own': '[Create Your Own](/create-your-own)',
    '/create': '[Create Your Own](/create-your-own)',
    '/products': '[Browse Products](/products)',
    '/cart': '[View Cart](/cart)',
    '/contact': '[Contact Us](/contact)',
    '/account': '[Account](/account)',
    '/shipping': '[Shipping Info](/shipping)',
    '/order-tracking': '[Order Tracking](/order-tracking)',
    '/reviews': '[Reviews](/reviews)',
    '/help': '[Help](/help)',
    '/faq': '[FAQ](/faq)'
  };

  Object.keys(routeMap).forEach((r) => {
    const rx = new RegExp(`(?<!\])\\b${r}\\b(?!\()`, 'g');
    sanitized = sanitized.replace(rx, routeMap[r]);
  });

  const hadProductIntent = /\b(product|best seller|best sellers|recommend|gift|suggest)\b/i.test(assistantText);
  if (hadProductIntent && !anyProductReplaced) {
    sanitized += "\nI couldn't find exact active products matching that right now. → [Browse Products](/products)";
  }

  return sanitized;
}

export default sanitizeAssistantText;
