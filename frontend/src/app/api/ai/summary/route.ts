import OpenAI from "openai";

const apiKey = process.env.VANITY_OPENAI_DEV;
if (!apiKey) {
  throw new Error("Missing VANITY_OPENAI_DEV environment variable");
}

const client = new OpenAI({ apiKey });

async function run() {
  const response = await client.responses.create({
    model: "gpt-4.1",
    input: "Say 'AI is working' if this request succeeds.",
  });

  return response.output_text;
}

export async function POST() {
    try{
        const result = await run();
        return Response.json({ result });

    }catch (error) {
        console.error(error);
        return Response.json({ error: "Failed" }, { status: 500 })
    }
} 

// Allow browser hits to this route for quick verification.
export async function GET() {
  try {
    const result = await run();
    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}