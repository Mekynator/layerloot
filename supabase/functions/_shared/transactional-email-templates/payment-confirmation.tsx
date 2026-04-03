/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  orderNumber?: string
  totalPaid?: string
  paymentMethod?: string
}

const PaymentConfirmationEmail = ({ name, orderNumber, totalPaid, paymentMethod }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your payment has been received successfully.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Payment Confirmed</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>We have received your payment. Thank you!</Text>
          <Section style={card}>
            {orderNumber && <Text style={cardRow}><strong>Order:</strong> #{orderNumber}</Text>}
            {totalPaid && <Text style={cardRow}><strong>Total Paid:</strong> {totalPaid}</Text>}
            {paymentMethod && <Text style={cardRow}><strong>Payment Method:</strong> {paymentMethod}</Text>}
          </Section>
          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me/account">View Order</Button></Section>
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
  component: PaymentConfirmationEmail,
  subject: (data: Record<string, any>) => `Payment confirmed for order #${data.orderNumber || ''}`,
  displayName: 'Payment Confirmation',
  previewData: { name: 'Jane', orderNumber: 'X9Y8Z7', totalPaid: '350 kr', paymentMethod: 'Card' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px' }
const card = { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const cardRow = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 6px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
