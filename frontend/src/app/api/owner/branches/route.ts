import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";
import {
  createBranchForOwner,
  getBranchesWithStatus,
} from "@/src/app/lib/owner";
import { getBranchActivationStatus } from "@/src/app/lib/activation";

export async function GET() {
  try {
    const session = await requireOwner();
    const ownerId = session.user.id;
    const branches = await getBranchesWithStatus(ownerId);

    const withActivation = await Promise.all(
      branches.map(async (b) => {
        const activation = await getBranchActivationStatus(b.id);
        return {
          ...b,
          activationStatus: activation.status,
          isActivated: activation.isActivated,
          activeTerminalCount: activation.terminals.length,
        };
      })
    );

    return NextResponse.json(withActivation);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load branches" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : "";
    const address = typeof body.address === "string" ? body.address : "";

    if (!name.trim()) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    const branch = await createBranchForOwner(
      session.user.id,
      name,
      address
    );

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      message === "Branch name is required" ||
      message === "A branch with this name already exists"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
