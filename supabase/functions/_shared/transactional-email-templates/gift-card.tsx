/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "LayerLoot"

interface Props {
  name?: string
  giftMessage?: string
  discountCode?: string
  senderName?: string
}

const GiftCardEmail = ({ name, giftMessage, discountCode, senderName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A gift card has been sent to you from LayerLoot.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>You Received a Gift Card 🎁</Heading>
          <Text style={text}>{name ? `Hello ${name},` : 'Hello,'}</Text>
          <Text style={text}>
            {senderName ? `${senderName} has sent you` : 'You have received'} a gift card from {SITE_NAME}!
          </Text>
          {giftMessage && (
            <Section style={messageBox}>
              <Text style={messageText}>"{giftMessage}"</Text>
            </Section>
          )}
          {discountCode && (
            <Section style={codeBox}>
              <Text style={codeLabel}>Your Gift Code</Text>
              <Text style={codeText}>{discountCode}</Text>
            </Section>
          )}
          <Section style={btnWrap}><Button style={btn} href="https://layerloot.neuraltune.me">Use My Gift Card</Button></Section>
        </Section>
        <Hr style={hr} />
        <Section style={foot}>
          <Text style={footText}><Link href="https://layerloot.neuraltune.me" style={footLink}>{SITE_NAME}</Link> — Custom 3D printed creations</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GiftCardEmail,
  subject: 'You received a gift from LayerLoot 🎁',
  displayName: 'Gift Card',
  previewData: { name: 'Jane', senderName: 'John', giftMessage: 'Happy birthday! Enjoy something special.', discountCode: 'GIFT-ABC123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px' }
const messageBox = { backgroundColor: '#fef3c7', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const messageText = { fontSize: '15px', color: '#92400e', fontStyle: 'italic' as const, margin: '0', textAlign: 'center' as const }
const codeBox = { backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px 20px', margin: '16px 0', textAlign: 'center' as const }
const codeLabel = { fontSize: '12px', color: '#16a34a', fontWeight: '600' as const, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const codeText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#15803d', margin: '0', letterSpacing: '2px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
