
INSERT INTO public.site_pages (name, title, slug, full_path, page_type, is_home, is_published, show_in_header, show_in_footer, is_system, sort_order)
SELECT * FROM (VALUES
  ('Contact', 'Contact', 'contact', '/contact', 'main', false, true, true, true, false, 40),
  ('Creations', 'Community Creations', 'creations', '/creations', 'main', false, true, true, false, false, 50),
  ('Create Your Own', 'Create Your Own', 'create', '/create', 'main', false, true, true, false, false, 60)
) AS v(name, title, slug, full_path, page_type, is_home, is_published, show_in_header, show_in_footer, is_system, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_pages sp WHERE sp.slug = v.slug
);
