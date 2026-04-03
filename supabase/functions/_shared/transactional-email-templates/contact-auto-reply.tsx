/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  ticketNumber?: string
  ticketSubject?: string
  ticketMessage?: string
  replyTimeEstimate?: string
}

const ContactAutoReplyEmail = ({ name, ticketNumber, ticketSubject, ticketMessage, replyTimeEstimate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Our team will review your request and get back to you as soon as possible.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>We received your message {ticketNumber || ''}</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Thank you for contacting {SITE_NAME}. We have received your message and created the following reference:</Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Reference number</Text><Text style={detailValue}>{ticketNumber || '—'}</Text>
            <Text style={detailLabel}>Subject</Text><Text style={detailValue}>{ticketSubject || '—'}</Text>
          </Section>

          {ticketMessage && (
            <Section style={messageBox}>
              <Text style={detailLabel}>Your message</Text>
              <Text style={messageText}>{ticketMessage}</Text>
            </Section>
          )}

          <Text style={text}>Our team will review it and respond as soon as possible.</Text>
          <Text style={text}>Estimated response time: <strong>{replyTimeEstimate || '1-2 business days'}</strong></Text>

          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me">Visit LayerLoot</Button></Section>
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
  component: ContactAutoReplyEmail,
  subject: (data: Record<string, any>) => `We received your message ${data.ticketNumber || ''}`,
  displayName: 'Contact Auto-Reply',
  previewData: { name: 'Jane', ticketNumber: 'TK-2025-099', ticketSubject: 'Question about custom print', ticketMessage: 'I would like to know if you can print a large vase in PLA', replyTimeEstimate: '1-2 business days' },
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
const messageBox = { backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const messageText = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '8px 0 0', fontStyle: 'italic' as const }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
