/** Covers blueprint/analyze-visual screenshot base64 (4MB) plus JSON wrapper. */
export const MAX_API_REQUEST_BODY_BYTES = 5_242_880;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!request.body) {
    return new Uint8Array(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel errors after successful read
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_API_REQUEST_BODY_BYTES,
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number.parseInt(contentLength, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  const bytes = await readBodyWithLimit(request, maxBytes);
  if (bytes.byteLength === 0) {
    throw new Error("Request body is required.");
  }

  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function apiErrorStatus(error: unknown): number {
  return error instanceof RequestBodyTooLargeError ? 413 : 400;
}
