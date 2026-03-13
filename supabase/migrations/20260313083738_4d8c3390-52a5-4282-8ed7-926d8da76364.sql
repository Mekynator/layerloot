
DO $$
DECLARE
  next_order int;
BEGIN
  -- Only seed if no blocks exist for the home page
  IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' LIMIT 1) THEN
    INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
    ('home', 'hero', 'Hero Banner', '{"heading":"Gear Up Your Print Lab","subheading":"Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop.","button_text":"Shop Now","button_link":"/products"}'::jsonb, 0, true),
    ('home', 'shipping_banner', 'Shipping Banner', '{"text":"Free shipping on orders over 75 kr"}'::jsonb, 1, true),
    ('home', 'entry_cards', 'Entry Cards', '{}'::jsonb, 2, true),
    ('home', 'categories', 'Shop by Category', '{"heading":"Shop by Category","subheading":"Find exactly what you need","limit":6}'::jsonb, 3, true),
    ('home', 'featured_products', 'Best Sellers', '{"heading":"Best Sellers","subheading":"Our most popular 3D printed items","limit":8}'::jsonb, 4, true),
    ('home', 'how_it_works', 'How It Works', '{"heading":"How It Works","subheading":"From idea to your doorstep in 4 simple steps"}'::jsonb, 5, true),
    ('home', 'faq', 'FAQ', '{"heading":"Frequently Asked Questions"}'::jsonb, 6, true),
    ('home', 'trust_badges', 'Trust Badges', '{}'::jsonb, 7, true);
  ELSE
    -- If blocks exist but new types are missing, add them at the end
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO next_order FROM site_blocks WHERE page = 'home';
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'shipping_banner') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'shipping_banner', 'Shipping Banner', '{"text":"Free shipping on orders over 75 kr"}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'entry_cards') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'entry_cards', 'Entry Cards', '{}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'categories') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'categories', 'Shop by Category', '{"heading":"Shop by Category","subheading":"Find exactly what you need","limit":6}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'featured_products') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'featured_products', 'Best Sellers', '{"heading":"Best Sellers","subheading":"Our most popular 3D printed items","limit":8}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'how_it_works') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'how_it_works', 'How It Works', '{"heading":"How It Works","subheading":"From idea to your doorstep in 4 simple steps"}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'faq') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'faq', 'FAQ', '{"heading":"Frequently Asked Questions"}'::jsonb, next_order, true);
      next_order := next_order + 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_blocks WHERE page = 'home' AND block_type = 'trust_badges') THEN
      INSERT INTO site_blocks (page, block_type, title, content, sort_order, is_active) VALUES
      ('home', 'trust_badges', 'Trust Badges', '{}'::jsonb, next_order, true);
    END IF;
  END IF;
END $$;
