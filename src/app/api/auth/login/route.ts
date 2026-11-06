import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { createSessionToken, getSessionCookieOptions, verifyTotpToken } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, totpCode } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      await createAuditLog({
        action: "ADMIN_LOGIN_FAILED",
        adminEmail: email,
        details: { reason: "Admin not found" },
        ipAddress,
      });
      return NextResponse.json({ error: "Invalid credentials or 2FA code" }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      await createAuditLog({
        action: "ADMIN_LOGIN_FAILED",
        adminId: admin.id,
        adminEmail: admin.email,
        details: { reason: "Incorrect password" },
        ipAddress,
      });
      return NextResponse.json({ error: "Invalid credentials or 2FA code" }, { status: 401 });
    }

    // Check TOTP 2FA
    if (admin.totpEnabled && admin.totpSecret) {
      const totpValid = verifyTotpToken(totpCode, admin.totpSecret);
      if (!totpValid) {
        await createAuditLog({
          action: "ADMIN_LOGIN_FAILED",
          adminId: admin.id,
          adminEmail: admin.email,
          details: { reason: "Invalid TOTP code" },
          ipAddress,
        });
        return NextResponse.json(
          { error: "Invalid 2FA code. Please check your authenticator app." },
          { status: 401 }
        );
      }
    }

    // Create session token
    const token = await createSessionToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    await createAuditLog({
      action: "ADMIN_LOGIN",
      adminId: admin.id,
      adminEmail: admin.email,
      details: { method: "Password + TOTP 2FA" },
      ipAddress,
    });

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });

    response.cookies.set({
      name: cookieOpts.name,
      value: token,
      maxAge: cookieOpts.maxAge,
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
    });

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
