
interface OTPEmailProps {
  name: string;
  code: string;
}

export function EmailTemplate({ name, code }: OTPEmailProps) {
  const digits = code.split("");

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify your email — FlowAI</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0a0a0a",
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#0a0a0a", padding: "48px 24px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ maxWidth: "520px" }}
                >
                  <tbody>
                    {/* Logo / Brand */}
                    <tr>
                      <td align="center" style={{ paddingBottom: "32px" }}>
                        <table cellPadding="0" cellSpacing="0">
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  background:
                                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                  borderRadius: "12px",
                                  padding: "10px 20px",
                                  display: "inline-block",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#ffffff",
                                    fontSize: "18px",
                                    fontWeight: "700",
                                    letterSpacing: "-0.3px",
                                  }}
                                >
                                  FlowAI
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Card */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#111111",
                          borderRadius: "20px",
                          border: "1px solid #222222",
                          padding: "48px 40px",
                        }}
                      >
                        <table width="100%" cellPadding="0" cellSpacing="0">
                          <tbody>
                            {/* Icon */}
                            <tr>
                              <td
                                align="center"
                                style={{ paddingBottom: "24px" }}
                              >
                                <div
                                  style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "14px",
                                    background:
                                      "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)",
                                    border: "1px solid rgba(99,102,241,0.3)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "26px",
                                    lineHeight: "56px",
                                    textAlign: "center" as const,
                                  }}
                                >
                                  🔐
                                </div>
                              </td>
                            </tr>

                            {/* Heading */}
                            <tr>
                              <td
                                align="center"
                                style={{ paddingBottom: "8px" }}
                              >
                                <h1
                                  style={{
                                    margin: 0,
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    color: "#ffffff",
                                    letterSpacing: "-0.5px",
                                  }}
                                >
                                  Verify your email
                                </h1>
                              </td>
                            </tr>

                            {/* Subtext */}
                            <tr>
                              <td
                                align="center"
                                style={{ paddingBottom: "36px" }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "15px",
                                    color: "#888888",
                                    lineHeight: "1.6",
                                  }}
                                >
                                  Hi {name}, use the code below to verify
                                  <br />
                                  your FlowAI account. It expires in{" "}
                                  <strong style={{ color: "#aaaaaa" }}>
                                    15 minutes
                                  </strong>
                                  .
                                </p>
                              </td>
                            </tr>

                            {/* OTP Digits */}
                            <tr>
                              <td
                                align="center"
                                style={{ paddingBottom: "36px" }}
                              >
                                <table cellPadding="0" cellSpacing="0">
                                  <tbody>
                                    <tr>
                                      {digits.map((d, i) => (
                                        <td
                                          key={i}
                                          style={{ padding: "0 4px" }}
                                        >
                                          <div
                                            style={{
                                              width: "52px",
                                              height: "64px",
                                              borderRadius: "12px",
                                              backgroundColor: "#1a1a1a",
                                              border: "1px solid #333333",
                                              display: "inline-block",
                                              textAlign: "center" as const,
                                              lineHeight: "64px",
                                              fontSize: "28px",
                                              fontWeight: "700",
                                              color: "#ffffff",
                                              fontVariantNumeric:
                                                "tabular-nums",
                                              letterSpacing: "-1px",
                                            }}
                                          >
                                            {d}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>

                            {/* Divider */}
                            <tr>
                              <td style={{ paddingBottom: "28px" }}>
                                <div
                                  style={{
                                    height: "1px",
                                    backgroundColor: "#1e1e1e",
                                  }}
                                />
                              </td>
                            </tr>

                            {/* Security note */}
                            <tr>
                              <td align="center">
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "#555555",
                                    lineHeight: "1.6",
                                  }}
                                >
                                  If you didn&apos;t create a FlowAI account,
                                  you can safely ignore this email.
                                  <br />
                                  Never share this code with anyone.
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td align="center" style={{ paddingTop: "32px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#444444",
                          }}
                        >
                          © {new Date().getFullYear()} FlowAI · All rights
                          reserved
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
