import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 이메일 인증 링크가 가리키는 주소: ?code=... 를 세션으로 교환하고 메인으로 이동
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
