import { apiAccount } from "@/lib/api-account";
export const runtime = "nodejs";
export async function GET() {
  const account = await apiAccount();
  if (!account)
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: account.user.id, email: account.user.email },
    format_version: 1,
  };
  for (const table of [
    "projects",
    "water_goals",
    "water_entries",
    "weights",
    "measurements",
    "activities",
    "garmin_imports",
    "garmin_sync_settings",
    "garmin_sleep_settings",
    "sleep_records",
    "meal_items",
    "meal_days",
    "food_library",
    "diet_plans",
    "food_copy_requests",
    "photos",
  ]) {
    const all: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await account.client
        .from(table)
        .select(
          table === "garmin_sleep_settings"
            ? "user_id,enabled,enabled_at,last_attempt_at,last_success_at,last_error_at"
            : table === "garmin_sync_settings"
              ? "user_id,enabled,auto_after,last_success_at"
              : "*",
        )
        .order(
          table === "garmin_sleep_settings"
            ? "user_id,enabled,enabled_at,last_attempt_at,last_success_at,last_error_at"
            : table === "garmin_sync_settings"
              ? "user_id"
              : table === "garmin_imports"
                ? "external_id"
                : "id",
        )
        .range(offset, offset + 499);
      if (error)
        return Response.json(
          { message: "Não foi possível exportar. Tente novamente." },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      all.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    result[table] = all;
  }
  return Response.json(result, {
    headers: {
      "Content-Disposition": 'attachment; filename="diazen-dados.json"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
