/**
 * Dev-only diagnostics for storefront fetch/render issues.
 * Silent in production to avoid console noise.
 */
export const diag = (area: string, msg: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    if (data !== undefined) console.warn(`[storefront:${area}]`, msg, data);
    else console.warn(`[storefront:${area}]`, msg);
  }
};

export const diagError = (area: string, msg: string, err: unknown) => {
  if (import.meta.env.DEV) console.error(`[storefront:${area}]`, msg, err);
};
