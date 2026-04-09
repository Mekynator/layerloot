// /api/products.ts
// Minimal API route to fetch products by IDs (for SavedItemsSection)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ids = (req.query.ids as string)?.split(',') ?? [];
  if (!ids.length) return res.status(400).json({ error: 'No ids provided' });

  // Fetch products from Supabase
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
