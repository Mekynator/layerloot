export interface EmailTemplate {
  id: string;
  name: string;
  trigger_key: string;
  is_active: boolean;
  sort_order: number;
  subject: string;
  preheader: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  title: string;
  subtitle: string;
  body: string;
  highlight_box: string;
  cta_text: string;
  cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  footer_text: string;
  support_block: string;
  signature: string;
  show_logo: boolean;
  logo_url: string;
  header_image_url: string;
  content_image_url: string;
  footer_image_url: string;
  border_radius: number;
  padding: number;
  bg_color: string;
  card_color: string;
  text_color: string;
  accent_color: string;
  show_divider: boolean;
  show_support: boolean;
  show_legal: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_TEMPLATE: Omit<EmailTemplate, 'id' | 'name' | 'trigger_key' | 'sort_order'> = {
  is_active: true,
  subject: '',
  preheader: '',
  sender_name: 'LayerLoot',
  sender_email: 'noreply@layerloot.neuraltune.me',
  reply_to: 'layerloot.support@neuraltune.me',
  title: '',
  subtitle: '',
  body: '',
  highlight_box: '',
  cta_text: '',
  cta_url: '',
  secondary_cta_text: '',
  secondary_cta_url: '',
  footer_text: '© {{year}} {{site_name}} — Custom 3D printed creations',
  support_block: 'Need help? Contact us at {{support_email}}',
  signature: 'The LayerLoot Team',
  show_logo: true,
  logo_url: '',
  header_image_url: '',
  content_image_url: '',
  footer_image_url: '',
  border_radius: 12,
  padding: 25,
  bg_color: '#ffffff',
  card_color: '#f8fafc',
  text_color: '#475569',
  accent_color: '#3B82F6',
  show_divider: true,
  show_support: true,
  show_legal: true,
};

export interface PlaceholderCategory {
  name: string;
  icon: string;
  items: { key: string; desc: string }[];
}

export const PLACEHOLDER_CATEGORIES: PlaceholderCategory[] = [
  {
    name: 'General',
    icon: 'Globe',
    items: [
      { key: '{{site_name}}', desc: 'Store name' },
      { key: '{{site_url}}', desc: 'Website URL' },
      { key: '{{support_email}}', desc: 'Support email address' },
      { key: '{{year}}', desc: 'Current year' },
      { key: '{{customer_name}}', desc: 'Customer full name' },
      { key: '{{customer_email}}', desc: 'Customer email' },
      { key: '{{customer_phone}}', desc: 'Customer phone' },
      { key: '{{company_name}}', desc: 'Company name' },
      { key: '{{logo_url}}', desc: 'Logo image URL' },
    ],
  },
  {
    name: 'Authentication',
    icon: 'Shield',
    items: [
      { key: '{{login_url}}', desc: 'Login page URL' },
      { key: '{{reset_url}}', desc: 'Password reset URL' },
      { key: '{{verification_url}}', desc: 'Email verification URL' },
    ],
  },
  {
    name: 'Order',
    icon: 'ShoppingBag',
    items: [
      { key: '{{order_number}}', desc: 'Order reference number' },
      { key: '{{order_date}}', desc: 'Order placement date' },
      { key: '{{order_total}}', desc: 'Total amount' },
      { key: '{{order_status}}', desc: 'Current order status' },
      { key: '{{payment_method}}', desc: 'Payment method used' },
      { key: '{{shipping_method}}', desc: 'Shipping method' },
      { key: '{{shipping_address}}', desc: 'Shipping address block' },
      { key: '{{billing_address}}', desc: 'Billing address block' },
      { key: '{{tracking_url}}', desc: 'Shipment tracking link' },
      { key: '{{order_items_table}}', desc: 'Line items table' },
    ],
  },
  {
    name: 'Invoice / Receipt',
    icon: 'Receipt',
    items: [
      { key: '{{invoice_number}}', desc: 'Invoice/receipt number' },
      { key: '{{invoice_date}}', desc: 'Invoice date' },
      { key: '{{subtotal}}', desc: 'Subtotal before discounts' },
      { key: '{{discount_amount}}', desc: 'Discount applied' },
      { key: '{{shipping_amount}}', desc: 'Shipping cost' },
      { key: '{{tax_amount}}', desc: 'Tax / VAT amount' },
      { key: '{{grand_total}}', desc: 'Grand total' },
      { key: '{{currency}}', desc: 'Currency code' },
      { key: '{{vat_number}}', desc: 'VAT registration number' },
      { key: '{{invoice_download_url}}', desc: 'Download invoice URL' },
    ],
  },
  {
    name: 'Custom Request',
    icon: 'Wrench',
    items: [
      { key: '{{request_number}}', desc: 'Request reference' },
      { key: '{{request_date}}', desc: 'Submission date' },
      { key: '{{request_type}}', desc: 'Type of request' },
      { key: '{{request_fee}}', desc: 'Request fee amount' },
      { key: '{{quoted_price}}', desc: 'Quoted price' },
      { key: '{{custom_request_summary}}', desc: 'Request summary' },
      { key: '{{uploaded_files}}', desc: 'Uploaded files list' },
      { key: '{{customer_note}}', desc: 'Customer note' },
      { key: '{{custom_order_status}}', desc: 'Current status' },
      { key: '{{custom_order_link}}', desc: 'View request link' },
      { key: '{{review_notes}}', desc: 'Admin review notes' },
      { key: '{{dimensions}}', desc: 'Dimensions' },
      { key: '{{material}}', desc: 'Material used' },
      { key: '{{color}}', desc: 'Color chosen' },
      { key: '{{quantity}}', desc: 'Quantity' },
    ],
  },
  {
    name: 'Ticket / Contact',
    icon: 'MessageSquare',
    items: [
      { key: '{{ticket_number}}', desc: 'Ticket reference' },
      { key: '{{ticket_subject}}', desc: 'Ticket subject line' },
      { key: '{{ticket_message}}', desc: 'Original message' },
      { key: '{{reply_time_estimate}}', desc: 'Expected reply time' },
      { key: '{{ticket_status}}', desc: 'Ticket status' },
      { key: '{{ticket_url}}', desc: 'View ticket URL' },
    ],
  },
  {
    name: 'Business / Misc',
    icon: 'Sparkles',
    items: [
      { key: '{{discount_code}}', desc: 'Discount code' },
      { key: '{{gift_message}}', desc: 'Gift message text' },
      { key: '{{loyalty_points}}', desc: 'Loyalty points balance' },
      { key: '{{estimated_delivery}}', desc: 'Estimated delivery' },
      { key: '{{admin_name}}', desc: 'Admin/agent name' },
      { key: '{{support_signature}}', desc: 'Support signature' },
      { key: '{{terms_url}}', desc: 'Terms of service URL' },
      { key: '{{privacy_url}}', desc: 'Privacy policy URL' },
      { key: '{{returns_url}}', desc: 'Returns policy URL' },
    ],
  },
];

export const TEMPLATE_DEFAULTS: Record<string, Partial<EmailTemplate>> = {
  'account-verification': {
    name: 'Account Verification',
    trigger_key: 'account-verification',
    subject: 'Verify your LayerLoot account',
    preheader: 'Complete your account setup and start exploring LayerLoot.',
    title: 'Verify Your Account',
    body: 'Hello {{customer_name}},\n\nWelcome to {{site_name}}.\nPlease confirm your email address to activate your account and securely access your profile, orders, and custom requests.',
    cta_text: 'Verify my account',
    cta_url: '{{verification_url}}',
    footer_text: 'If you did not create an account, you can safely ignore this email.',
  },
  'forgot-password': {
    name: 'Forgot Password',
    trigger_key: 'forgot-password',
    subject: 'Reset your LayerLoot password',
    preheader: 'We received a request to reset your password.',
    title: 'Reset Your Password',
    body: 'Hello {{customer_name}},\n\nWe received a request to reset the password for your {{site_name}} account.\nClick the button below to choose a new password.',
    cta_text: 'Reset password',
    cta_url: '{{reset_url}}',
    highlight_box: 'If you did not request this, you can ignore this email. Your password will remain unchanged.',
  },
  'welcome': {
    name: 'Welcome / Account Created',
    trigger_key: 'welcome',
    subject: 'Welcome to LayerLoot',
    preheader: 'Your account is ready — start exploring custom and printed creations.',
    title: 'Welcome to LayerLoot!',
    body: 'Hello {{customer_name}},\n\nYour account has been successfully created at {{site_name}}.\n\nYou can now:\n• View your orders and track delivery\n• Submit custom 3D printing requests\n• Save your preferences for future orders\n• Browse and save your favorite creations',
    cta_text: 'Go to my account',
    cta_url: '{{site_url}}/account',
  },
  'order-confirmation': {
    name: 'Order Confirmation',
    trigger_key: 'order-confirmation',
    subject: 'Your LayerLoot order {{order_number}} is confirmed',
    preheader: 'We have received your order and will begin processing it soon.',
    title: 'Order Confirmed',
    subtitle: 'Order #{{order_number}}',
    body: 'Hello {{customer_name}},\n\nThank you for your order from {{site_name}}.\n\nOrder number: {{order_number}}\nOrder date: {{order_date}}\nPayment method: {{payment_method}}\nShipping method: {{shipping_method}}\nOrder total: {{order_total}}\n\n{{order_items_table}}',
    cta_text: 'View my order',
    cta_url: '{{site_url}}/account',
    highlight_box: 'We will keep you updated as your order moves through the next steps:\nReceived → Printing → Finishing → Shipped',
  },
  'order-receipt': {
    name: 'Receipt / Invoice',
    trigger_key: 'order-receipt',
    subject: 'Your receipt for order {{order_number}}',
    preheader: 'Here is your payment confirmation and order summary.',
    title: 'Payment Receipt',
    subtitle: 'Invoice #{{invoice_number}}',
    body: 'Hello {{customer_name}},\n\nThank you for your purchase.\n\nInvoice number: {{invoice_number}}\nInvoice date: {{invoice_date}}\nOrder number: {{order_number}}\n\nSubtotal: {{subtotal}}\nDiscount: {{discount_amount}}\nShipping: {{shipping_amount}}\nTax: {{tax_amount}}\n\nTotal: {{grand_total}}',
    cta_text: 'View order',
    cta_url: '{{site_url}}/account',
  },
  'custom-order-confirmation': {
    name: 'Custom Request Confirmation',
    trigger_key: 'custom-order-confirmation',
    subject: 'We received your custom request {{request_number}}',
    preheader: 'Your LayerLoot custom request is now under review.',
    title: 'Custom Request Received',
    subtitle: 'Request #{{request_number}}',
    body: 'Hello {{customer_name}},\n\nThank you for submitting your custom request to {{site_name}}.\n\nRequest number: {{request_number}}\nRequest date: {{request_date}}\nRequest type: {{request_type}}\nRequest fee: {{request_fee}}\n\n{{custom_request_summary}}\n{{uploaded_files}}\n{{customer_note}}',
    cta_text: 'View my request',
    cta_url: '{{site_url}}/account',
    highlight_box: 'The 100 kr custom request fee will later be deducted from the final quoted price if you continue with the order.\nIf you decide not to continue with the order for any reason after the review/quotation stage, the custom request fee is not refunded.',
  },
  'contact-auto-reply': {
    name: 'Contact / Ticket Auto Reply',
    trigger_key: 'contact-auto-reply',
    subject: 'We received your message {{ticket_number}}',
    preheader: 'Our team will review your request and get back to you as soon as possible.',
    title: 'Message Received',
    subtitle: 'Ticket #{{ticket_number}}',
    body: 'Hello {{customer_name}},\n\nThank you for contacting {{site_name}}.\n\nTicket number: {{ticket_number}}\nSubject: {{ticket_subject}}\n\nYour message:\n{{ticket_message}}\n\nEstimated response time: {{reply_time_estimate}}',
    cta_text: 'Visit LayerLoot',
    cta_url: '{{site_url}}',
  },
  'quote-sent': {
    name: 'Quote Sent',
    trigger_key: 'quote-sent',
    subject: 'Your quote for request {{request_number}} is ready',
    preheader: 'We have reviewed your custom request and prepared a quote.',
    title: 'Your Quote is Ready',
    subtitle: 'Request #{{request_number}}',
    body: 'Hello {{customer_name}},\n\nWe have reviewed your custom request and prepared a quote.\n\nRequest: {{request_number}}\nQuoted price: {{quoted_price}}\nMaterial: {{material}}\nColor: {{color}}\nDimensions: {{dimensions}}',
    cta_text: 'View quote & respond',
    cta_url: '{{custom_order_link}}',
  },
  'payment-confirmation': {
    name: 'Payment Confirmation',
    trigger_key: 'payment-confirmation',
    subject: 'Payment received for order {{order_number}}',
    preheader: 'Your payment has been successfully processed.',
    title: 'Payment Confirmed',
    body: 'Hello {{customer_name}},\n\nWe have successfully received your payment.\n\nOrder: {{order_number}}\nAmount: {{grand_total}}\nPayment method: {{payment_method}}',
    cta_text: 'View order',
    cta_url: '{{site_url}}/account',
  },
  'shipping-update': {
    name: 'Shipping Update',
    trigger_key: 'shipping-update',
    subject: 'Your order {{order_number}} has shipped!',
    preheader: 'Your order is on its way.',
    title: 'Order Shipped',
    subtitle: 'Order #{{order_number}}',
    body: 'Hello {{customer_name}},\n\nGreat news! Your order has been shipped.\n\nOrder: {{order_number}}\nEstimated delivery: {{estimated_delivery}}',
    cta_text: 'Track shipment',
    cta_url: '{{tracking_url}}',
  },
  'delivered': {
    name: 'Order Delivered',
    trigger_key: 'delivered',
    subject: 'Your order {{order_number}} has been delivered',
    preheader: 'Your order has arrived!',
    title: 'Order Delivered',
    body: 'Hello {{customer_name}},\n\nYour order {{order_number}} has been delivered.\nWe hope you love it!',
    cta_text: 'View order',
    cta_url: '{{site_url}}/account',
  },
  'gift-card': {
    name: 'Gift Card',
    trigger_key: 'gift-card',
    subject: 'You received a LayerLoot gift card!',
    preheader: 'Someone special sent you a gift.',
    title: 'You Got a Gift!',
    body: 'Hello {{customer_name}},\n\n{{gift_message}}\n\nYou have received a LayerLoot gift card worth {{grand_total}}.',
    cta_text: 'Claim gift card',
    cta_url: '{{site_url}}/account',
  },
};
