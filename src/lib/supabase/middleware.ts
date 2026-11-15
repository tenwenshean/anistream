import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./config";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  try {
    return await refreshSession(request);
  } catch (error) {
    // a bad Supabase setting or outage must not take every page down;
    // the visitor just isn't signed in for this request
    console.error("Supabase session refresh failed:", error);
    return NextResponse.next({ request });
  }
}

async function refreshSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims checks the login token locally (with Supabase's cached public
  // key) instead of asking Supabase on every page load like getUser did,
  // and still refreshes the token when it has expired
  await supabase.auth.getClaims();

  return supabaseResponse;
}
