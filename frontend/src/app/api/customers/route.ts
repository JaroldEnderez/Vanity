import { NextResponse } from "next/server";
import { db } from "@/src/app/lib/db";
import { auth } from "@/src/app/lib/auth";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";

function getString(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = getString(url.searchParams, "q");
    const limitRaw = getString(url.searchParams, "limit");
    const limit = Math.max(1, Math.min(200, Number(limitRaw ?? 50) || 50));

    const customers = await db.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { fb: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        fb: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    const walkIn = customers.find((c) => c.id === WALK_IN_CUSTOMER_ID);
    const rest = customers.filter((c) => c.id !== WALK_IN_CUSTOMER_ID);
    const sorted = walkIn ? [walkIn, ...rest] : rest;

    return NextResponse.json(sorted);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch customers";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      name?: string;
      address?: string;
      phone?: string;
      fb?: string;
      dateOfBirth?: string | null;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() || undefined : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() || undefined : undefined;
    const fb = typeof body.fb === "string" ? body.fb.trim() || undefined : undefined;
    const dateOfBirth =
      body.dateOfBirth === null || body.dateOfBirth === ""
        ? undefined
        : typeof body.dateOfBirth === "string" && body.dateOfBirth.trim()
          ? new Date(body.dateOfBirth)
          : undefined;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (name.toLowerCase() === "walk-in") {
      return NextResponse.json(
        {
          error:
            'Use the built-in "Walk-in" customer for unnamed sales instead of creating a duplicate.',
        },
        { status: 400 }
      );
    }

    const created = await db.customer.create({
      data: { name, address, phone, fb, dateOfBirth },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        fb: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const e = error as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create customer";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
