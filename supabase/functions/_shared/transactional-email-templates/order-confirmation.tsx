/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  orderNumber?: string
  orderDate?: string
  orderTotal?: string
  paymentMethod?: string
  shippingMethod?: string
  itemsSummary?: string
}

const OrderConfirmationEmail = ({ name, orderNumber, orderDate, orderTotal, paymentMethod, shippingMethod, itemsSummary }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We have received your order and will begin processing it soon.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Your order {orderNumber || '#—'} is confirmed</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Thank you for your order from {SITE_NAME}. We have successfully received your order.</Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Order number</Text><Text style={detailValue}>{orderNumber || '—'}</Text>
            <Text style={detailLabel}>Order date</Text><Text style={detailValue}>{orderDate || '—'}</Text>
            <Text style={detailLabel}>Payment method</Text><Text style={detailValue}>{paymentMethod || '—'}</Text>
            <Text style={detailLabel}>Shipping method</Text><Text style={detailValue}>{shippingMethod || 'Standard'}</Text>
            <Text style={detailLabel}>Order total</Text><Text style={detailValue}><strong>{orderTotal || '—'}</strong></Text>
          </Section>

          {itemsSummary && <Text style={text}>{itemsSummary}</Text>}

          <Section style={infoBox}>
            <Text style={infoText}>📦 We will keep you updated as your order moves through the next steps: Received → Printing → Finishing → Shipped</Text>
          </Section>

          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me/account">View my order</Button></Section>
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
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) => `Your LayerLoot order ${data.orderNumber || ''} is confirmed`,
  displayName: 'Order Confirmation',
  previewData: { name: 'Jane', orderNumber: 'LL-20250403-001', orderDate: '3 April 2025', orderTotal: '349 DKK', paymentMethod: 'Stripe', shippingMethod: 'Standard Shipping' },
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
const infoBox = { backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const infoText = { fontSize: '13px', color: '#0369a1', lineHeight: '1.5', margin: '0' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
