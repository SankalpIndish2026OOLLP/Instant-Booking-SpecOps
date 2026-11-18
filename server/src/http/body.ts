import { BadRequestError, PayloadTooLargeError } from "../errors/app-error.js";

function isJson(request: Request): boolean {
  return (request.headers.get("Content-Type") ?? "").toLowerCase().includes("application/json");
}

async function readLimited(body: ReadableStream<Uint8Array>, limitBytes: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.byteLength;
    if (total > limitBytes) throw new PayloadTooLargeError();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Reads a JSON request body before routing, as the API always has (RQ-API-002, RQ-API-004).
 * Non-JSON and empty bodies give `undefined`. A declared or streamed size over `limitBytes` gives 413;
 * invalid JSON gives 400 `INVALID_JSON`.
 */
export async function readJsonBody(request: Request, limitBytes: number): Promise<unknown> {
  if (!request.body || !isJson(request)) return undefined;
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > limitBytes) throw new PayloadTooLargeError();
  const text = new TextDecoder().decode(await readLimited(request.body, limitBytes));
  if (text.trim().length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError();
  }
}
