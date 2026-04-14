UPDATE public.site_settings
SET value = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'to' = '/create'
      THEN jsonb_set(elem, '{to}', '"/create-your-own"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(value::jsonb) AS elem
)
WHERE key = 'nav_links';