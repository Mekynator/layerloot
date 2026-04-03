/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  orderNumber?: string
  trackingUrl?: string
  shippingMethod?: string
}

const ShippingUpdateEmail = ({ name, orderNumber, trackingUrl, shippingMethod }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Good news — your order is on the way.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Your Order Has Been Shipped</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Your order{orderNumber ? ` #${orderNumber}` : ''} has been shipped and is on its way to you.</Text>
          <Section style={card}>
            {orderNumber && <Text style={cardRow}><strong>Order:</strong> #{orderNumber}</Text>}
            {shippingMethod && <Text style={cardRow}><strong>Shipping:</strong> {shippingMethod}</Text>}
            {trackingUrl && <Text style={cardRow}><strong>Tracking:</strong> <Link href={trackingUrl} style={link}>View tracking</Link></Text>}
          </Section>
          <Section style={btnWrap}>
            <Button style={btn} href={trackingUrl || "https://layerloot.neuraltune.me/account"}>
              {trackingUrl ? 'Track My Order' : 'View My Order'}
            </Button>
          </Section>
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
  component: ShippingUpdateEmail,
  subject: (data: Record<string, any>) => `Your LayerLoot order #${data.orderNumber || ''} has shipped`,
  displayName: 'Shipping Update',
  previewData: { name: 'Jane', orderNumber: 'X9Y8Z7', trackingUrl: 'https://tracking.example.com/123', shippingMethod: 'PostNord' },
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
const link = { color: '#3B82F6', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
