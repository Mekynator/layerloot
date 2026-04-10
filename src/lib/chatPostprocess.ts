export type ParsedChatProduct = {
  id?: string;
  slug?: string;
  name: string;
  benefit?: string;
  price?: string;
  priceValue?: number;
  imageUrl?: string;
  productUrl?: string;
};

export function parseChatProducts(content: string): ParsedChatProduct[] {
  const products: ParsedChatProduct[] = [];
  const re = /•\s+\*\*([^*\n]+)\*\*[ \t]*\n((?:[ \t]*-[ \t]+[^\n]*\n?)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim();
    const body = m[2];
    const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
    const linkMatch = body.match(/→\s*\[[^\]]*\]\(([^)]+)\)/);
    const priceMatch = body.match(/-[ \t]+([^\n]*\b\d[\d.,]*\s*kr[^\n]*)/i);
    const bodyLines = body
      .split("\n")
      .map((l) => l.replace(/^[ \t]*-[ \t]+/, "").trim())
      .filter(Boolean);
    const benefit = bodyLines.find(
      (l) => !l.startsWith("!") && !l.startsWith("→") && !/\b\d[\d.,]*\s*kr\b/i.test(l),
    );
    products.push({
      name,
      imageUrl: imgMatch?.[1],
      productUrl: linkMatch?.[1],
      price: priceMatch?.[1]?.trim(),
      benefit,
    });
  }
  return products;
}

export function stripProductBlocks(content: string): string {
  return content.replace(/•\s+\*\*[^*\n]+\*\*[ \t]*\n(?:[ \t]*-[ \t]+[^\n]*\n?)*/g, "").trim();
}

export function sanitizeContent(content: string) {
  const routeRegex = /(?:\[[^\]]+\]\((\/[^)]+)\))|((?:\/[a-zA-Z0-9_\-\/\?=&%]+))/g;
  const foundRoutes = new Set<string>();
  const sanitized = content.replace(routeRegex, (match, p1, p2) => {
    const route = p1 || p2;
    if (route) foundRoutes.add(route);
    return "";
  }).trim();
  return { sanitized, routes: Array.from(foundRoutes) };
}
