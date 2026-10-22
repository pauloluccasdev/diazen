import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeAuth(
  request: NextRequest,
  destination: "/painel" | "/nova-senha",
) {
  const origin = siteUrl();
  if (!origin) return new Response("Acesso indisponível.", { status: 503 });
  const code = request.nextUrl.searchParams.get("code");
  const client = await createSupabaseServerClient();
  let target: string = "/entrar?link=invalido";
  if (
    client &&
    code &&
    code.length <= 2048 &&
    !request.nextUrl.searchParams.has("error")
  ) {
    try {
      // O código exige o verificador guardado no navegador que iniciou o fluxo.
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) target = destination;
    } catch {
      // Falhas não revelam código ou sessão e sempre permanecem nesta origem.
    }
  }
  const response = NextResponse.redirect(new URL(target, origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
