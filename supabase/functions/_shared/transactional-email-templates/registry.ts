/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as orderReceipt } from './order-receipt.tsx'
import { template as customOrderConfirmation } from './custom-order-confirmation.tsx'
import { template as contactAutoReply } from './contact-auto-reply.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcomeEmail,
  'order-confirmation': orderConfirmation,
  'order-receipt': orderReceipt,
  'custom-order-confirmation': customOrderConfirmation,
  'contact-auto-reply': contactAutoReply,
}
