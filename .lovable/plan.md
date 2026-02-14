

# LayerLoot — 3D Printing E-Commerce Store

## Design & Branding
- **Industrial / Maker aesthetic**: Dark grays, workshop-inspired tones, orange/amber accents
- Mechanical, raw feel with clean typography
- LayerLoot logo and branding throughout

---

## Pages & Features

### 1. Home Page
- Hero banner with featured products and tagline
- Featured categories section (e.g., Miniatures, Tools, Custom Prints)
- Best sellers / new arrivals carousel
- Free shipping threshold banner
- Call-to-action sections

### 2. Products Page
- Category sidebar with subcategories (folders within categories)
- Product grid with filtering and sorting (price, newest, popularity)
- Product cards showing image, price, discount badge, and quick-add button
- Individual product detail page with image gallery, description, pricing, and add-to-cart

### 3. Shopping Cart & Checkout
- Cart drawer/page with quantity editing
- Free shipping progress bar (showing how much more to qualify)
- Stripe and PayPal payment integration (UI ready, connect accounts later)
- Order summary and confirmation page

### 4. Contact Page
- Contact form (name, email, subject, message)
- Business info and social links

### 5. User Account (Customer)
- Registration & login
- Order history and tracking
- **Loyalty Points System**: earn points per purchase, view balance
- **Rewards Store**: exchange points for vouchers, discount codes, and gift cards
- Profile management

### 6. Admin Dashboard (Your Account)
- **Dashboard overview**: revenue, order count, new customers, charts
- **Products management**: add/edit/delete products with images, prices, discounts, categories & subcategories
- **Categories management**: create categories and subfolders
- **Orders management**: view all orders, update status, filter by status
- **Clients management**: view customer list, order history per client
- **Shipping settings**: configure free shipping threshold

---

## Backend (Supabase)
- User authentication with role-based access (admin vs customer)
- Database tables for: products, categories, orders, order items, loyalty points, vouchers, shipping config
- File storage for product images
- Row-level security for data protection

---

## Shipping
- Free shipping above a configurable threshold amount
- Flat rate below the threshold
- Shipping info displayed in cart and checkout

