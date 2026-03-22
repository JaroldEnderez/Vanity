import { NextResponse } from "next/server";
import { requireOwner } from "@/src/app/lib/auth-utils";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "");

/**
 * Optional legacy proxy — only enabled when BACKEND_URL is set.
 * Owner-only + explicit URL to avoid authenticated SSRF to internal networks.
 */
async function proxy(request: Request, path: string[], method: string) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  await requireOwner();

  const url = `${BACKEND_URL}/${path.join("/")}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  try {
    return await proxy(request, path, "GET");
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  try {
    return await proxy(request, path, "POST");
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  try {
    return await proxy(request, path, "PUT");
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  try {
    return await proxy(request, path, "DELETE");
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
