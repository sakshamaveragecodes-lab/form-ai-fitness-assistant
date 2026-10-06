import { z } from "zod";
import {
  ApiError,
  batch,
  json,
  now,
  one,
  run,
  runtime,
  statement,
  uid,
} from "../db";
import {
  authenticate,
  cleanupLimits,
  cookie,
  cookieToken,
  digest,
  equal,
  hashPassword,
  newSession,
  randomToken,
  rateLimit,
  safeUser,
  verifyPassword,
} from "../security";
import { seedWorkspace } from "../seed";
import { body, emailSchema, passwordSchema } from "../validation";
export async function authRoute(
  req: Request,
  path: string,
): Promise<Response | null> {
  if (!path.startsWith("auth/")) return null;
  const ip = req.headers.get("cf-connecting-ip") ?? "local";
  if (req.method === "GET" && path === "auth/me") {
    return json({ user: await authenticate(req) });
  }
  if (req.method !== "POST") throw new ApiError(405, "Method not supported.");
  if (path === "auth/register" || path === "auth/demo") {
    const demo = path === "auth/demo";
    if (demo && runtime().DEMO_MODE === "false")
      throw new ApiError(403, "Demonstration accounts are disabled.");
    await rateLimit(`signup:${ip}`, 50);
    await cleanupLimits();
    const data = demo
      ? await body(req, z.object({ admin: z.boolean().default(false) }))
      : await body(
          req,
          z.object({
            name: z.string().trim().min(2).max(80),
            email: emailSchema,
            password: passwordSchema,
          }),
        );
    const adminMode = demo && "admin" in data && data.admin;
    const id = uid(),
      workspace = uid(),
      email = demo
        ? `demo-${id}@example.invalid`
        : "email" in data
          ? data.email
          : "",
      name = demo
        ? adminMode
          ? "Studio Admin"
          : "Alex Morgan"
        : "name" in data
          ? data.name
          : "";
    if (!demo && (await one("SELECT id FROM users WHERE email=?", email)))
      throw new ApiError(
        409,
        "An account with this email already exists. Sign in or use your recovery key.",
      );
    const recovery = randomToken(),
      password = demo ? randomToken() : "password" in data ? data.password : "";
    const passHash = await hashPassword(password),
      recoveryHash = await digest(recovery),
      time = now();
    await batch([
      statement(
        "INSERT INTO workspaces (id,created_at) VALUES (?,?)",
        workspace,
        time,
      ),
      statement(
        "INSERT INTO users (id,workspace_id,email,name,password_hash,recovery_hash,role,status,demo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        id,
        workspace,
        email,
        name,
        passHash,
        recoveryHash,
        adminMode ? "admin" : "user",
        "active",
        demo ? 1 : 0,
        time,
      ),
    ]);
    try {
      await seedWorkspace(id, workspace, demo, adminMode);
    } catch (error) {
      await run("DELETE FROM workspaces WHERE id=?", workspace);
      throw error;
    }
    const user = safeUser(await one("SELECT * FROM users WHERE id=?", id)),
      token = await newSession(id);
    return json({ user, recoveryKey: demo ? null : recovery }, 201, {
      "Set-Cookie": cookie(req, token),
    });
  }
  if (path === "auth/login") {
    const data = await body(
      req,
      z.object({ email: emailSchema, password: z.string().max(128) }),
    );
    await rateLimit(`login:${ip}:${data.email}`, 10);
    const u = await one("SELECT * FROM users WHERE email=?", data.email);
    const valid = u
      ? await verifyPassword(data.password, u.password_hash)
      : (await hashPassword(data.password), false);
    if (!u || !valid || u.status !== "active")
      throw new ApiError(
        401,
        "Email or password is incorrect, or the account is unavailable.",
      );
    return json({ user: safeUser(u) }, 200, {
      "Set-Cookie": cookie(req, await newSession(u.id)),
    });
  }
  if (path === "auth/reset") {
    const data = await body(
      req,
      z.object({
        email: emailSchema,
        recoveryKey: z.string().regex(/^[a-f0-9]{64}$/),
        password: passwordSchema,
      }),
    );
    await rateLimit(`reset:${ip}:${data.email}`, 5);
    const u = await one("SELECT * FROM users WHERE email=?", data.email);
    if (!u || !equal(await digest(data.recoveryKey), u.recovery_hash) || u.demo)
      throw new ApiError(
        400,
        "The email and recovery key could not be verified.",
      );
    const recovery = randomToken();
    await batch([
      statement(
        "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=?",
        await hashPassword(data.password),
        await digest(recovery),
        u.id,
      ),
      statement("DELETE FROM sessions WHERE user_id=?", u.id),
    ]);
    return json(
      {
        message: "Password reset. Save your new recovery key and sign in.",
        recoveryKey: recovery,
      },
      200,
      { "Set-Cookie": cookie(req, "", 0) },
    );
  }
  if (path === "auth/logout") {
    await run(
      "DELETE FROM sessions WHERE token_hash=?",
      await digest(cookieToken(req)),
    );
    return json({ ok: true }, 200, { "Set-Cookie": cookie(req, "", 0) });
  }
  if (path === "auth/refresh") {
    const u = await authenticate(req);
    await run(
      "DELETE FROM sessions WHERE token_hash=?",
      await digest(cookieToken(req)),
    );
    return json({ ok: true }, 200, {
      "Set-Cookie": cookie(req, await newSession(u.id)),
    });
  }
  if (path === "auth/password") {
    const u = await authenticate(req),
      data = await body(
        req,
        z.object({
          currentPassword: z.string().max(128),
          password: passwordSchema,
        }),
      );
    await rateLimit(`password:${u.id}`, 5);
    if (u.demo)
      throw new ApiError(400, "Create a personal account to set a password.");
    const full = await one("SELECT password_hash FROM users WHERE id=?", u.id);
    if (!(await verifyPassword(data.currentPassword, full.password_hash)))
      throw new ApiError(400, "Your current password is incorrect.");
    const recovery = randomToken();
    await batch([
      statement(
        "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=?",
        await hashPassword(data.password),
        await digest(recovery),
        u.id,
      ),
      statement("DELETE FROM sessions WHERE user_id=?", u.id),
    ]);
    return json({ ok: true, recoveryKey: recovery }, 200, {
      "Set-Cookie": cookie(req, await newSession(u.id)),
    });
  }
  throw new ApiError(404, "That authentication action does not exist.");
}
