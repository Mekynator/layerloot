/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  eventType?: string
  summary?: string
  customerName?: string
  customerEmail?: string
  orderNumber?: string
  requestNumber?: string
  ticketSubject?: string
  ticketMessage?: string
}

const AdminNotificationEmail = ({ eventType, summary, customerName, customerEmail, orderNumber, requestNumber, ticketSubject, ticketMessage }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A new event requires admin attention on {SITE_NAME}.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT — ADMIN</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>{eventType || 'New Admin Notification'}</Heading>
          {summary && <Text style={text}>{summary}</Text>}
          <Section style={card}>
            {customerName && <Text style={cardRow}><strong>Customer:</strong> {customerName}</Text>}
            {customerEmail && <Text style={cardRow}><strong>Email:</strong> {customerEmail}</Text>}
            {orderNumber && <Text style={cardRow}><strong>Order:</strong> #{orderNumber}</Text>}
            {requestNumber && <Text style={cardRow}><strong>Request:</strong> #{requestNumber}</Text>}
            {ticketSubject && <Text style={cardRow}><strong>Subject:</strong> {ticketSubject}</Text>}
          </Section>
          {ticketMessage && (
            <Section style={messageBlock}>
              <Text style={messageLabel}>Message:</Text>
              <Text style={messageText}>{ticketMessage}</Text>
            </Section>
          )}
          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me/admin">Open Admin Panel</Button></Section>
        </Section>
        <Hr style={hr} />
        <Section style={foot}>
          <Text style={footText}>This is an internal {SITE_NAME} notification.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const adminEmail = Deno.env.get('CONTACT_TO_EMAIL') || undefined

export const template = {
  component: AdminNotificationEmail,
  subject: (data: Record<string, any>) => `[LayerLoot Admin] ${data.eventType || 'New activity'}`,
  displayName: 'Admin Notification',
  to: adminEmail,
  previewData: { eventType: 'New Contact Message', summary: 'A customer submitted a contact form.', customerName: 'Jane Doe', customerEmail: 'jane@example.com', ticketSubject: 'Question about custom order', ticketMessage: 'Hi, I wanted to ask about lead times for a large custom order.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#64748b', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px' }
const card = { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const cardRow = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 6px' }
const messageBlock = { margin: '16px 0' }
const messageLabel = { fontSize: '13px', fontWeight: '600' as const, color: '#64748b', margin: '0 0 4px' }
const messageText = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#475569', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0', textAlign: 'center' as const }
