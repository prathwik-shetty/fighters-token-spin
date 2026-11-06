import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { authenticator } from "otplib";

export async function GET() {
  try {
    const secret = "JBSWY3DPEHPK3PXP";
    const otpauth = authenticator.keyuri(
      "admin@fighterstoken.com",
      "Fighters Token Spin",
      secret
    );
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({
      secret,
      qrDataUrl,
      otpauth,
    });
  } catch (error) {
    console.error("QR Code generation error:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
