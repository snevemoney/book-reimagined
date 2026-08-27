import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type Caller = { kind: "service" } | { kind: "user"; userId: string };

export function createServiceClient(): {
  supabase: SupabaseClient;
  supabaseUrl: string;
  serviceKey: string;
} {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service credentials are not configured");
  }
  return {
    supabase: createClient(supabaseUrl, serviceKey),
    supabaseUrl,
    serviceKey,
  };
}

export function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function authenticateCaller(
  req: Request,
  supabase: SupabaseClient,
  serviceKey: string,
): Promise<Caller | { error: string; status: number }> {
  const token = bearerToken(req);
  if (!token) {
    return { error: "Missing Authorization bearer token", status: 401 };
  }

  if (token === serviceKey) {
    return { kind: "service" };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: "Unauthorized", status: 401 };
  }

  return { kind: "user", userId: data.user.id };
}

export function assertBookOwner(
  caller: Caller,
  bookUserId: string | null | undefined,
): { error: string; status: number } | null {
  if (caller.kind === "service") return null;
  if (!bookUserId || bookUserId !== caller.userId) {
    return { error: "Forbidden", status: 403 };
  }
  return null;
}
