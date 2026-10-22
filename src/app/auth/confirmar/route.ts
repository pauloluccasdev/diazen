import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const origin = siteUrl();
  if (!origin) return new Response("Acesso indisponível.", { status: 503 });
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = await createSupabaseServerClient();
  let target = "/entrar?link=invalido";
  if (
    client &&
    token &&
    token.length <= 2048 &&
    (type === "email" || type === "recovery")
  ) {
    const { error } = await client.auth.verifyOtp({ token_hash: token, type });
    if (!error) target = type === "recovery" ? "/nova-senha" : "/painel";
  }
  const response = NextResponse.redirect(new URL(target, origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
