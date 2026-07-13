interface OTPEmailProps {
  name: string
  code: string
}

const colors = {
  bg: '#f4f5f8',
  card: '#ffffff',
  text: '#1a1a2e',
  muted: '#6b7280',
  border: '#e5e7eb',
  brand: '#5b4fe5',
  brandSoft: '#f0eefd',
}

export function OTPEmail({ name, code }: OTPEmailProps) {
  const digits = code.split('')
  const firstName = name?.trim().split(' ')[0] || 'there'

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        margin: 0,
        padding: '40px 16px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          backgroundColor: colors.card,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '32px 32px 0' }}>
          <table cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: colors.brand,
                      textAlign: 'center',
                      lineHeight: '32px',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    ⚡
                  </div>
                </td>
                <td style={{ paddingLeft: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, letterSpacing: '-0.01em' }}>
                    FlowAI
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px 8px' }}>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: 20,
              fontWeight: 700,
              color: colors.text,
              letterSpacing: '-0.01em',
            }}
          >
            Verify your email
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: '22px', color: colors.muted }}>
            Hi {firstName}, use the code below to confirm your email address and finish setting
            up your FlowAI account.
          </p>

          {/* OTP code */}
          <table cellPadding={0} cellSpacing={0} role="presentation" width="100%">
            <tbody>
              <tr>
                <td>
                  <div
                    style={{
                      backgroundColor: colors.brandSoft,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: '20px 0',
                      textAlign: 'center',
                    }}
                  >
                    <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '0 auto' }}>
                      <tbody>
                        <tr>
                          {digits.map((d, i) => (
                            <td key={i} style={{ padding: '0 4px' }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 44,
                                  lineHeight: '44px',
                                  textAlign: 'center',
                                  backgroundColor: '#ffffff',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: 8,
                                  fontSize: 22,
                                  fontWeight: 700,
                                  color: colors.brand,
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                }}
                              >
                                {d}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ margin: '20px 0 0', fontSize: 13, lineHeight: '20px', color: colors.muted, textAlign: 'center' }}>
            This code expires in <strong style={{ color: colors.text }}>15 minutes</strong>.
          </p>
        </div>

        {/* Divider */}
        <div style={{ margin: '28px 32px 0', borderTop: `1px solid ${colors.border}` }} />

        {/* Footer */}
        <div style={{ padding: '20px 32px 32px' }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: '18px', color: colors.muted }}>
            Didn&apos;t request this code? You can safely ignore this email — no changes will be
            made to your account.
          </p>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 20 }}>
        © {new Date().getFullYear()} FlowAI. All rights reserved.
      </p>
    </div>
  )
}

export default OTPEmail
