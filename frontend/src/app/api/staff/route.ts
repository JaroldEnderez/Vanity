import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

/** Session branchId must exist on Branch or Prisma raises P2003 (FK) on Staff create. */
async function branchExists(branchId: string): Promise<boolean> {
  const row = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  return row !== null;
}

/** GET /api/staff — list staff for the current branch */
export async function GET() {
  try {
    const branchId = await getAuthBranchId();

    const staff = await db.staff.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch staff";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST /api/staff — create staff for the current branch */
export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const exists = await branchExists(branchId);
    if (!exists) {
      return NextResponse.json(
        {
          error:
            "No matching branch in the database for your account. The database may have been reset while your session still has an old branch id. Sign out and sign in again, run prisma migrate/seed, or ask the owner to recreate this branch.",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { name?: string; role?: string | null };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const role =
      body.role === null || body.role === undefined
        ? undefined
        : typeof body.role === "string"
          ? body.role.trim() || null
          : undefined;

    const created = await db.staff.create({
      data: {
        name,
        role: role ?? null,
        branchId,
      },
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const prisma = error as { code?: string };
    if (prisma.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Branch not found in database (foreign key). Sign out and back in, or align your database seed with your branch account.",
        },
        { status: 400 }
      );
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create staff";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
