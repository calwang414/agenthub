import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminClient = createAdminClient();
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return jsonResponse(error("密码不能为空"), 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      id,
      { password }
    );

    if (updateError) {
      return jsonResponse(error(updateError.message), 500);
    }

    return jsonResponse(success({ updated: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
