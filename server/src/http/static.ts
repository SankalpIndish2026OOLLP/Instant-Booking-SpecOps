import { resolve, sep } from "node:path";
import { PAGE_SECURITY_HEADERS } from "./security.js";

const HTTP_NOT_FOUND = 404;

function notFound(): Response {
  return new Response("Not found", { status: HTTP_NOT_FOUND, headers: PAGE_SECURITY_HEADERS });
}

function decodePath(pathname: string): string | undefined {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
}

/**
 * Serves the prebuilt client from `publicDir` with the page security headers (RQ-WEB-001, RQ-WEB-005).
 * Paths that leave `publicDir` and files that do not exist give 404.
 */
export function createStaticHandler(publicDir: string): (request: Request) => Promise<Response> {
  const root = resolve(publicDir);
  return async (request) => {
    const decoded = decodePath(new URL(request.url).pathname);
    if (decoded === undefined) return notFound();
    const relative = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
    const filePath = resolve(root, `.${relative}`);
    if (!filePath.startsWith(root + sep)) return notFound();
    const file = Bun.file(filePath);
    if (!(await file.exists())) return notFound();
    return new Response(file, { headers: PAGE_SECURITY_HEADERS });
  };
}
