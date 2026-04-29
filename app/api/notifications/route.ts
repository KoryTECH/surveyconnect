import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

function toLimit(input: string | null): number {
  const parsed = parseInt(input ?? "10", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkRateLimit(`notifications:get:${user.id}`, 30, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const limit = toLimit(searchParams.get("limit"));
    const filter = searchParams.get("filter") === "unread" ? "unread" : "all";

    let query = supabase
      .from("notifications")
      .select("id, title, message, type, link, is_read, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter === "unread") {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 },
      );
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkRateLimit(`notifications:patch:${user.id}`, 30, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (body?.markAll === true) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Failed to mark all notifications:", error);
        return NextResponse.json(
          { error: "Failed to update notifications" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json(
        { error: "Missing notification id" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: now })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update notification:", error);
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
