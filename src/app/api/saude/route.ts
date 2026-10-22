export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { status: "ok", service: "diazen", version: "0.1.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
