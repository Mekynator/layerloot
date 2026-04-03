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
    title: 'Confirm your email address',
    subtitle: 'Activate your account securely and get access to your orders, profile, and custom requests.',
    body: 'Hello {{customer_name}},\n\nWelcome to {{site_name}}.\n\nPlease confirm your email address to activate your account and securely access your profile, orders, saved preferences, and custom requests.\n\nIf you did not create an account, you can safely ignore this email.',
    cta_text: 'Verify my account',
    cta_url: '{{verification_url}}',
    secondary_cta_text: 'Visit LayerLoot',
    secondary_cta_url: '{{site_url}}',
    support_block: 'If you need help, contact us at {{support_email}}.',
    footer_text: '© {{year}} {{site_name}} — Custom 3D printed creations',
  },
  'forgot-password': {
    name: 'Forgot Password',
    trigger_key: 'forgot-password',
    subject: 'Reset your LayerLoot password',
    preheader: 'We received a request to reset your password.',
    title: 'Password reset request',
    subtitle: 'Choose a new password securely for your LayerLoot account.',
    body: 'Hello {{customer_name}},\n\nWe received a request to reset the password for your {{site_name}} account.\n\nClick the button below to choose a new password.\n\nIf you did not request this, you can ignore this email. Your password will remain unchanged.',
    cta_text: 'Reset password',
    cta_url: '{{reset_url}}',
    secondary_cta_text: 'Go to login',
    secondary_cta_url: '{{login_url}}',
    highlight_box: 'Security notice: This link expires in 1 hour. If you did not request a password reset, no action is needed — your account remains secure.',
    support_block: 'For account support, contact {{support_email}}.',
  },
  'welcome': {
    name: 'Welcome / Account Created',
    trigger_key: 'welcome',
    subject: 'Welcome to LayerLoot',
    preheader: 'Your account is ready — start exploring custom and printed creations.',
    title: 'Your account is ready',
    subtitle: 'Welcome to LayerLoot and thank you for joining us.',
    body: 'Hello {{customer_name}},\n\nYour account has been successfully created at {{site_name}}.\n\nYou can now:\n• View and track your orders\n• Manage your account details\n• Submit custom 3D printing requests\n• Save your preferences for future orders\n• Explore personalized creations and gift ideas\n\nWe are excited to have you with us.',
    cta_text: 'Go to my account',
    cta_url: '{{site_url}}/account',
    secondary_cta_text: 'Explore products',
    secondary_cta_url: '{{site_url}}/products',
  },
  'order-confirmation': {
    name: 'Order Confirmation',
    trigger_key: 'order-confirmation',
    subject: 'Your LayerLoot order {{order_number}} is confirmed',
    preheader: 'We have received your order and will begin processing it soon.',
    title: 'Order confirmed',
    subtitle: 'Thank you for your order. We have successfully received it.',
    body: 'Hello {{customer_name}},\n\nThank you for shopping with {{site_name}}.\n\nWe have successfully received your order and will begin processing it shortly.\n\n━━━ Order details ━━━\n\nOrder number: {{order_number}}\nOrder date: {{order_date}}\nPayment method: {{payment_method}}\nShipping method: {{shipping_method}}\nOrder status: {{order_status}}\nTotal: {{order_total}}\n\n{{order_items_table}}\n\nShipping address:\n{{shipping_address}}\n\nBilling address:\n{{billing_address}}',
    cta_text: 'View my order',
    cta_url: '{{site_url}}/account',
    secondary_cta_text: 'Visit LayerLoot',
    secondary_cta_url: '{{site_url}}',
    highlight_box: 'We will keep you updated as your order moves through the following steps:\n\n✓ Received → ⚙️ Printing → ✨ Finishing → 📦 Shipped',
  },
  'order-receipt': {
    name: 'Receipt / Invoice',
    trigger_key: 'order-receipt',
    subject: 'Your receipt for order {{order_number}}',
    preheader: 'Here is your payment confirmation and invoice summary.',
    title: 'Receipt / Invoice',
    subtitle: 'Your payment has been confirmed. Here is your order summary.',
    body: 'Hello {{customer_name}},\n\nThank you for your purchase from {{site_name}}.\n\nBelow is your receipt / invoice summary.\n\n━━━ Invoice details ━━━\n\nInvoice number: {{invoice_number}}\nInvoice date: {{invoice_date}}\nOrder number: {{order_number}}\nPayment method: {{payment_method}}\n\nVAT number: {{vat_number}}\nCurrency: {{currency}}\n\n━━━ Financial summary ━━━\n\nSubtotal: {{subtotal}}\nDiscount: {{discount_amount}}\nShipping: {{shipping_amount}}\nTax: {{tax_amount}}\n\nTotal: {{grand_total}}\n\nBilling address:\n{{billing_address}}\n\nShipping address:\n{{shipping_address}}',
    cta_text: 'Download invoice',
    cta_url: '{{invoice_download_url}}',
    secondary_cta_text: 'View order',
    secondary_cta_url: '{{site_url}}/account',
    show_legal: true,
    footer_text: '© {{year}} {{site_name}} — Custom 3D printed creations\nTerms: {{terms_url}} | Privacy: {{privacy_url}}',
  },
  'custom-order-confirmation': {
    name: 'Custom Request Confirmation',
    trigger_key: 'custom-order-confirmation',
    subject: 'We received your custom request {{request_number}}',
    preheader: 'Your LayerLoot custom request is now under review.',
    title: 'Custom request received',
    subtitle: 'Thank you for submitting your custom request to LayerLoot.',
    body: 'Hello {{customer_name}},\n\nWe have received your request and our team will review the details, uploaded files, and notes you provided.\n\n━━━ Request details ━━━\n\nRequest number: {{request_number}}\nRequest date: {{request_date}}\nRequest type: {{request_type}}\nRequest fee: {{request_fee}}\nStatus: {{custom_order_status}}\n\n━━━ Request summary ━━━\n\n{{custom_request_summary}}\n\nUploaded files:\n{{uploaded_files}}\n\nYour notes:\n{{customer_note}}',
    cta_text: 'View my custom request',
    cta_url: '{{custom_order_link}}',
    secondary_cta_text: 'Visit LayerLoot',
    secondary_cta_url: '{{site_url}}',
    highlight_box: 'Important: The 100 kr custom request fee will later be deducted from the final quoted price if you continue with the order.\n\nIf you decide not to continue with the order for any reason after the review/quotation stage, the custom request fee is not refunded.',
  },
  'quote-sent': {
    name: 'Quote Sent',
    trigger_key: 'quote-sent',
    subject: 'Your LayerLoot quote for request {{request_number}}',
    preheader: 'Your custom request has been reviewed and a quote is now available.',
    title: 'Your quote is ready',
    subtitle: 'We reviewed your request and prepared a quote for you.',
    body: 'Hello {{customer_name}},\n\nYour custom request has been reviewed and we are happy to share your quote.\n\n━━━ Quote details ━━━\n\nRequest number: {{request_number}}\nRequest type: {{request_type}}\nQuoted price: {{quoted_price}}\nStatus: {{custom_order_status}}\n\n━━━ Specifications ━━━\n\nMaterial: {{material}}\nColor: {{color}}\nDimensions: {{dimensions}}\nQuantity: {{quantity}}\n\nReview notes:\n{{review_notes}}',
    cta_text: 'Review my quote',
    cta_url: '{{custom_order_link}}',
    secondary_cta_text: 'Contact support',
    secondary_cta_url: 'mailto:{{support_email}}',
    highlight_box: 'The 100 kr request fee will be deducted from the final quoted price if you continue with the order.',
  },
  'payment-confirmation': {
    name: 'Payment Confirmation',
    trigger_key: 'payment-confirmation',
    subject: 'Payment confirmed for order {{order_number}}',
    preheader: 'Your payment has been received successfully.',
    title: 'Payment confirmed',
    subtitle: 'Thank you. Your payment was completed successfully.',
    body: 'Hello {{customer_name}},\n\nWe have received your payment for order {{order_number}}.\n\n━━━ Payment details ━━━\n\nOrder number: {{order_number}}\nPayment method: {{payment_method}}\nTotal paid: {{grand_total}}\nPayment date: {{order_date}}',
    cta_text: 'View order',
    cta_url: '{{site_url}}/account',
    secondary_cta_text: 'Continue shopping',
    secondary_cta_url: '{{site_url}}/products',
  },
  'shipping-update': {
    name: 'Shipping Update',
    trigger_key: 'shipping-update',
    subject: 'Your LayerLoot order {{order_number}} has shipped',
    preheader: 'Good news — your order is on the way.',
    title: 'Your order has been shipped',
    subtitle: 'Your LayerLoot order is now on its way to you.',
    body: 'Hello {{customer_name}},\n\nYour order has been shipped.\n\n━━━ Shipping details ━━━\n\nOrder number: {{order_number}}\nShipping method: {{shipping_method}}\nEstimated delivery: {{estimated_delivery}}\n\nShipping address:\n{{shipping_address}}',
    cta_text: 'Track my order',
    cta_url: '{{tracking_url}}',
    secondary_cta_text: 'View my order',
    secondary_cta_url: '{{site_url}}/account',
  },
  'delivered': {
    name: 'Order Delivered',
    trigger_key: 'delivered',
    subject: 'Your LayerLoot order {{order_number}} was delivered',
    preheader: 'Your order has been delivered successfully.',
    title: 'Order delivered',
    subtitle: 'We hope you enjoy your LayerLoot order.',
    body: 'Hello {{customer_name}},\n\nYour order {{order_number}} has been marked as delivered.\n\nWe hope everything arrived safely and that you are happy with your purchase.\n\nIf you have any questions or concerns about your order, please do not hesitate to reach out to our support team.\n\nWe would love to hear your feedback — feel free to leave a review or share your creation with the LayerLoot community.',
    cta_text: 'View my order',
    cta_url: '{{site_url}}/account',
    secondary_cta_text: 'Shop again',
    secondary_cta_url: '{{site_url}}/products',
  },
  'contact-auto-reply': {
    name: 'Contact / Ticket Auto Reply',
    trigger_key: 'contact-auto-reply',
    subject: 'We received your message {{ticket_number}}',
    preheader: 'Our team will review your request and respond as soon as possible.',
    title: 'We received your message',
    subtitle: 'Your request has been registered successfully.',
    body: 'Hello {{customer_name}},\n\nThank you for contacting {{site_name}}.\n\nWe have received your message and created a reference for it.\n\n━━━ Ticket details ━━━\n\nTicket number: {{ticket_number}}\nSubject: {{ticket_subject}}\nStatus: {{ticket_status}}\nEstimated reply time: {{reply_time_estimate}}\n\nYour message:\n{{ticket_message}}',
    cta_text: 'Visit LayerLoot',
    cta_url: '{{site_url}}',
    secondary_cta_text: 'Contact support',
    secondary_cta_url: 'mailto:{{support_email}}',
  },
  'gift-card': {
    name: 'Gift Card',
    trigger_key: 'gift-card',
    subject: 'You received a gift from LayerLoot',
    preheader: 'A gift card has been sent to you.',
    title: 'You received a gift card',
    subtitle: 'A gift has been sent to you through LayerLoot.',
    body: 'Hello {{customer_name}},\n\nYou have received a gift card from {{site_name}}.\n\n━━━ Gift details ━━━\n\nGift message: {{gift_message}}\n\nDiscount code / card reference: {{discount_code}}\n\nTo redeem your gift card, simply enter the code at checkout when placing your order.',
    cta_text: 'Use my gift card',
    cta_url: '{{site_url}}',
    secondary_cta_text: 'Explore products',
    secondary_cta_url: '{{site_url}}/products',
  },
  'admin-notification': {
    name: 'Admin Internal Notification',
    trigger_key: 'admin-notification',
    subject: 'New activity on LayerLoot',
    preheader: 'A new event requires admin attention.',
    title: 'New admin notification',
    subtitle: 'A new event was created in the system.',
    body: 'This is an internal LayerLoot notification.\n\n━━━ Event details ━━━\n\nCustomer: {{customer_name}} ({{customer_email}})\nOrder: {{order_number}}\nRequest: {{request_number}}\nTicket: {{ticket_number}}\nStatus: {{order_status}}\n\n{{custom_request_summary}}\n\nReview notes:\n{{review_notes}}',
    cta_text: 'Open admin panel',
    cta_url: '{{site_url}}/admin',
    secondary_cta_text: '',
    secondary_cta_url: '',
    accent_color: '#6366f1',
  },
};
