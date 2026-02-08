import { NextResponse } from "next/server";
import { getSessionById, addItemToSession } from "@/src/app/lib/sessions";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

// POST /sessions/:id/items → add item to session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getSessionById(id);

    if (!existing || existing.branchId !== branchId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (!body.serviceId || !body.price) {
      return NextResponse.json(
        { error: "serviceId and price are required" },
        { status: 400 }
      );
    }

    const session = await addItemToSession(id, {
      serviceId: body.serviceId,
      qty: body.qty || 1,
      price: body.price,
      materials: body.materials,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to add item";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
