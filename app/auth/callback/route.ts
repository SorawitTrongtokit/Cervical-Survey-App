import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  loginUrl.searchParams.set("reason", "unauthorized");

  return NextResponse.redirect(loginUrl);
}
