/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  invoiceNumber?: string
  invoiceDate?: string
  orderNumber?: string
  subtotal?: string
  discountAmount?: string
  shippingAmount?: string
  taxAmount?: string
  grandTotal?: string
  invoiceDownloadUrl?: string
}

const OrderReceiptEmail = ({ name, invoiceNumber, invoiceDate, orderNumber, subtotal, discountAmount, shippingAmount, taxAmount, grandTotal, invoiceDownloadUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Here is your payment confirmation and order summary.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Your receipt for order {orderNumber || '#—'}</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Thank you for your purchase. Please find below the receipt summary for your order.</Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Invoice number</Text><Text style={detailValue}>{invoiceNumber || '—'}</Text>
            <Text style={detailLabel}>Invoice date</Text><Text style={detailValue}>{invoiceDate || '—'}</Text>
            <Text style={detailLabel}>Order number</Text><Text style={detailValue}>{orderNumber || '—'}</Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Subtotal</Text><Text style={detailValue}>{subtotal || '—'}</Text>
            {discountAmount && <><Text style={detailLabel}>Discount</Text><Text style={detailValue}>-{discountAmount}</Text></>}
            <Text style={detailLabel}>Shipping</Text><Text style={detailValue}>{shippingAmount || 'Free'}</Text>
            {taxAmount && <><Text style={detailLabel}>Tax</Text><Text style={detailValue}>{taxAmount}</Text></>}
            <Hr style={innerHr} />
            <Text style={detailLabel}>Total</Text><Text style={totalValue}>{grandTotal || '—'}</Text>
          </Section>

          <Section style={btnWrap}>
            <Button style={btn} href="https://layerloot.neuraltune.me/account">View my order</Button>
          </Section>
          {invoiceDownloadUrl && (
            <Section style={btnWrap}>
              <Button style={{...btn, backgroundColor: '#0f172a'}} href={invoiceDownloadUrl}>Download Invoice (PDF)</Button>
            </Section>
          )}
        </Section>
        <Hr style={hr} />
        <Section style={foot}>
          <Text style={footText}><Link href="https://layerloot.neuraltune.me" style={footLink}>{SITE_NAME}</Link> — Custom 3D printed creations</Text>
          <Text style={footText}>Need help? <Link href="mailto:layerloot.support@neuraltune.me" style={footLink}>layerloot.support@neuraltune.me</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderReceiptEmail,
  subject: (data: Record<string, any>) => `Your receipt for order ${data.orderNumber || ''}`,
  displayName: 'Receipt / Invoice',
  previewData: { name: 'Jane', invoiceNumber: 'INV-2025-001', invoiceDate: '3 April 2025', orderNumber: 'LL-20250403-001', subtotal: '299 DKK', shippingAmount: '50 DKK', grandTotal: '349 DKK' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const detailLabel = { fontSize: '12px', color: '#94a3b8', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue = { fontSize: '15px', color: '#0f172a', margin: '0 0 12px' }
const totalValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0' }
const innerHr = { borderColor: '#e2e8f0', margin: '8px 0' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
