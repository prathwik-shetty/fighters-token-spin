import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getSessionCookieOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (session) {
      await createAuditLog({
        action: "ADMIN_LOGOUT",
        adminId: session.adminId,
        adminEmail: session.email,
        ipAddress,
      });
    }

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({ success: true });
    response.cookies.delete(cookieOpts.name);
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
