import { ApiError, json, one } from "@/lib/server/db";
import { adminRoute } from "@/lib/server/routes/admin";
import { authRoute } from "@/lib/server/routes/auth";
import { buddyRoute } from "@/lib/server/routes/buddy";
import { deviceRoute, ingestDevice } from "@/lib/server/routes/devices";
import { fitnessRoute } from "@/lib/server/routes/fitness";
import { authenticate, csrf, rateLimit } from "@/lib/server/security";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
async function handle(req: Request) {
  const path = new URL(req.url).pathname
    .replace(/^\/api\//, "")
    .replace(/\/$/, "");
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 100000)
      throw new ApiError(413, "Request is too large.");
    if (path === "health" && req.method === "GET") {
      await one("SELECT 1 AS ok");
      return json({ status: "ok", database: "connected", version: "1.0.0" });
    }
    if (path === "iot/ingest" && req.method === "POST")
      return await ingestDevice(req);
    csrf(req);
    const auth = await authRoute(req, path);
    if (auth) return auth;
    const user = await authenticate(req);
    await rateLimit(`api:${user.id}`, 240, 60000);
    for (const handler of [fitnessRoute, buddyRoute, deviceRoute, adminRoute]) {
      const result = await handler(req, path, user);
      if (result) return result;
    }
    throw new ApiError(404, "The requested action was not found.");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: error.issues
            .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
            .join("; ")
            .slice(0, 800),
        },
        422,
      );
    if (error instanceof SyntaxError)
      return json({ error: "Send valid JSON data." }, 400);
    const id = crypto.randomUUID();
    console.error("FORM API failure", {
      id,
      path,
      type: error instanceof Error ? error.name : "unknown",
    });
    return json(
      {
        error: "We could not complete this request. Please try again.",
        reference: id,
      },
      500,
    );
  }
}
export const GET = handle,
  POST = handle,
  PUT = handle,
  PATCH = handle,
  DELETE = handle;
