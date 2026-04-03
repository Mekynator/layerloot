/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  requestNumber?: string
  quotedPrice?: string
  material?: string
  color?: string
  dimensions?: string
  reviewNotes?: string
}

const QuoteSentEmail = ({ name, requestNumber, quotedPrice, material, color, dimensions, reviewNotes }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your custom request has been reviewed and a quote is now available.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Your Quote is Ready</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>Your custom request has been reviewed and we are happy to share your quote.</Text>
          <Section style={card}>
            {requestNumber && <Text style={cardRow}><strong>Request:</strong> #{requestNumber}</Text>}
            {quotedPrice && <Text style={cardRow}><strong>Quoted Price:</strong> {quotedPrice}</Text>}
            {material && <Text style={cardRow}><strong>Material:</strong> {material}</Text>}
            {color && <Text style={cardRow}><strong>Color:</strong> {color}</Text>}
            {dimensions && <Text style={cardRow}><strong>Dimensions:</strong> {dimensions}</Text>}
          </Section>
          {reviewNotes && <Text style={text}><strong>Notes:</strong> {reviewNotes}</Text>}
          <Section style={highlight}>
            <Text style={highlightText}>The 100 kr request fee will be deducted from the final quoted price if you continue with the order.</Text>
          </Section>
          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me/account">Review My Quote</Button></Section>
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
  component: QuoteSentEmail,
  subject: (data: Record<string, any>) => `Your LayerLoot quote for request #${data.requestNumber || ''}`,
  displayName: 'Quote Sent',
  previewData: { name: 'Jane', requestNumber: 'A1B2C3', quotedPrice: '450 kr', material: 'PLA', color: 'White', dimensions: '15×10×8 cm', reviewNotes: 'Model looks great, minor supports needed.' },
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
const highlight = { backgroundColor: '#eff6ff', borderLeft: '4px solid #3B82F6', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const highlightText = { fontSize: '13px', color: '#1e40af', lineHeight: '1.5', margin: '0' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
