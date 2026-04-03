/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props { token: string }
export const ReauthenticationEmail = ({ token }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your LayerLoot verification code</Preview>
    <Body style={main}><Container style={wrapper}>
      <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
      <Section style={content}>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={muted}>This code will expire shortly. If you didn't request this, you can safely ignore this email.</Text>
      </Section>
      <Hr style={hr} /><Section style={foot}><Text style={footText}>LayerLoot — Custom 3D printed creations</Text></Section>
    </Container></Body>
  </Html>
)
export default ReauthenticationEmail
const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#3B82F6', margin: '0 0 24px', textAlign: 'center' as const, letterSpacing: '6px' }
const muted = { fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
