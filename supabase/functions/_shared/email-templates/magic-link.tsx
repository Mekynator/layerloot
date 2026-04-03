/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props { siteName: string; confirmationUrl: string }
export const MagicLinkEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your login link for LayerLoot</Preview>
    <Body style={main}><Container style={wrapper}>
      <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
      <Section style={content}>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>Click the button below to log in to {siteName}. This link will expire shortly.</Text>
        <Section style={btnWrap}><Button style={btn} href={confirmationUrl}>Log In</Button></Section>
        <Text style={muted}>If you didn't request this link, you can safely ignore this email.</Text>
      </Section>
      <Hr style={hr} /><Section style={foot}><Text style={footText}>LayerLoot — Custom 3D printed creations</Text></Section>
    </Container></Body>
  </Html>
)
export default MagicLinkEmail
const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const muted = { fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
