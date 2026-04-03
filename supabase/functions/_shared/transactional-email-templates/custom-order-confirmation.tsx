/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  requestNumber?: string
  requestDate?: string
  requestType?: string
  requestFee?: string
  description?: string
  customerNote?: string
}

const CustomOrderConfirmationEmail = ({ name, requestNumber, requestDate, requestType, requestFee, description, customerNote }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your LayerLoot custom request is now under review.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>We received your custom request {requestNumber || ''}</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Thank you for submitting your custom request to {SITE_NAME}. Our team has received your request and will review the details, files, and notes you provided.</Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Request number</Text><Text style={detailValue}>{requestNumber || '—'}</Text>
            <Text style={detailLabel}>Request date</Text><Text style={detailValue}>{requestDate || '—'}</Text>
            <Text style={detailLabel}>Request type</Text><Text style={detailValue}>{requestType || 'Custom 3D Print'}</Text>
            <Text style={detailLabel}>Request fee</Text><Text style={detailValue}>{requestFee || '100 DKK'}</Text>
          </Section>

          {description && <><Text style={detailLabel}>Description</Text><Text style={text}>{description}</Text></>}
          {customerNote && <><Text style={detailLabel}>Your note</Text><Text style={text}>{customerNote}</Text></>}

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ <strong>Important:</strong> The 100 kr custom request fee will later be deducted from the final quoted price if you continue with the order.
              If you decide not to continue with the order for any reason after the review/quotation stage, the custom request fee is not refunded.
            </Text>
          </Section>

          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me/account">View my custom request</Button></Section>
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
  component: CustomOrderConfirmationEmail,
  subject: (data: Record<string, any>) => `We received your custom request ${data.requestNumber || ''}`,
  displayName: 'Custom Order Confirmation',
  previewData: { name: 'Jane', requestNumber: 'CR-2025-042', requestDate: '3 April 2025', requestType: 'Custom 3D Print', requestFee: '100 DKK', description: 'A personalized lithophane lamp based on uploaded photo', customerNote: 'Please use warm white filament if possible' },
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
const warningBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const warningText = { fontSize: '13px', color: '#92400e', lineHeight: '1.5', margin: '0' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
