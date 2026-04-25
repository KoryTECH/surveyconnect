import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	let profile: { role?: string | null; is_admin?: boolean | null } | null =
		null;
	if (user) {
		const { data } = await supabase
			.from("profiles")
			.select("role, is_admin")
			.eq("id", user.id)
			.single();

		profile = data;
	}

	if (
		!user &&
		!request.nextUrl.pathname.startsWith("/login") &&
		!request.nextUrl.pathname.startsWith("/signup") &&
		!request.nextUrl.pathname.startsWith("/api/paystack") &&
		request.nextUrl.pathname !== "/"
	) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	if (
		user &&
		(request.nextUrl.pathname.startsWith("/login") ||
			request.nextUrl.pathname.startsWith("/signup"))
	) {
		if (profile?.role === "client") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/client";
			return NextResponse.redirect(url);
		}

		if (profile?.role === "professional") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/professional";
			return NextResponse.redirect(url);
		}
	}

	if (request.nextUrl.pathname.startsWith("/dashboard/client")) {
		if (profile?.role !== "client") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/professional";
			return NextResponse.redirect(url);
		}
	}

	if (request.nextUrl.pathname.startsWith("/dashboard/professional")) {
		if (profile?.role !== "professional") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/client";
			return NextResponse.redirect(url);
		}
	}

	if (request.nextUrl.pathname.startsWith("/payments/")) {
		if (profile?.role !== "client") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/professional";
			return NextResponse.redirect(url);
		}
	}

	if (request.nextUrl.pathname.startsWith("/verification")) {
		if (profile?.role !== "professional") {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/client";
			return NextResponse.redirect(url);
		}
	}

	if (request.nextUrl.pathname.startsWith("/admin")) {
		if (!profile?.is_admin) {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard/client";
			return NextResponse.redirect(url);
		}
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
