import { z } from "zod";
import type { User } from "../../types";
import { all, ApiError, batch, json, now, one, statement, uid } from "../db";
import { admin } from "../security";
import { body, catalogDataSchemas, catalogSchema } from "../validation";
const audit = (u: User, action: string, entity: string) =>
  statement(
    "INSERT INTO audit (id,workspace_id,actor_id,action,entity,created_at) VALUES (?,?,?,?,?,?)",
    uid(),
    u.workspace_id,
    u.id,
    action,
    entity,
    now(),
  );
export async function adminRoute(
  req: Request,
  path: string,
  u: User,
): Promise<Response | null> {
  if (!path.startsWith("admin/")) return null;
  admin(u);
  if (path === "admin/overview" && req.method === "GET") {
    const [users, stats, kinds, usage, audits, issues, devices] =
      await Promise.all([
        all(
          "SELECT id,name,email,role,status,demo,created_at FROM users WHERE workspace_id=?",
          u.workspace_id,
        ),
        one(
          "SELECT COUNT(*) sessions,COALESCE(SUM(w.duration),0) duration,AVG(w.score) score FROM workouts w JOIN users u ON u.id=w.user_id WHERE u.workspace_id=?",
          u.workspace_id,
        ),
        all(
          "SELECT kind,COUNT(*) n FROM catalog WHERE workspace_id=? AND active=1 GROUP BY kind",
          u.workspace_id,
        ),
        all(
          "SELECT substr(w.performed_at,1,10) date,COUNT(*) sessions FROM workouts w JOIN users u ON w.user_id=u.id WHERE u.workspace_id=? GROUP BY substr(w.performed_at,1,10) ORDER BY date DESC LIMIT 28",
          u.workspace_id,
        ),
        all(
          "SELECT a.*,u.name actor FROM audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 50",
          u.workspace_id,
        ),
        all(
          "SELECT * FROM issues WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
          u.workspace_id,
        ),
        all(
          "SELECT id,name,exercise,mode,active,user_id FROM devices WHERE workspace_id=?",
          u.workspace_id,
        ),
      ]);
    return json({
      users,
      stats,
      kinds,
      usage: usage.reverse(),
      audits,
      issues,
      devices,
    });
  }
  if (path === "admin/users" && req.method === "GET") {
    const url = new URL(req.url),
      search = (url.searchParams.get("q") ?? "").slice(0, 100),
      status = url.searchParams.get("status") ?? "",
      page = Math.max(1, Number(url.searchParams.get("page")) || 1),
      values = [u.workspace_id, `%${search}%`, `%${search}%`, status, status];
    const where =
      "workspace_id=? AND (name LIKE ? OR email LIKE ?) AND (?='' OR status=?)";
    return json({
      items: await all(
        `SELECT id,name,email,role,status,demo,created_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT 10 OFFSET ?`,
        ...values,
        (page - 1) * 10,
      ),
      total: (
        await one(`SELECT COUNT(*) n FROM users WHERE ${where}`, ...values)
      ).n,
      page,
    });
  }
  if (path.startsWith("admin/users/") && req.method === "PATCH") {
    const id = path.split("/")[2],
      d = await body(
        req,
        z.object({ status: z.enum(["active", "suspended"]) }),
      );
    if (id === u.id)
      throw new ApiError(
        400,
        "You cannot suspend your own administrator account.",
      );
    if (
      !(await one(
        "SELECT id FROM users WHERE id=? AND workspace_id=?",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "User not found.");
    await batch([
      statement(
        "UPDATE users SET status=? WHERE id=? AND workspace_id=?",
        d.status,
        id,
        u.workspace_id,
      ),
      statement("DELETE FROM sessions WHERE user_id=?", id),
      audit(u, `User ${d.status}`, id),
    ]);
    return json({ ok: true });
  }
  if (path === "admin/catalog" && req.method === "GET") {
    const kind = new URL(req.url).searchParams.get("kind") ?? "exercises";
    return json({
      items: (
        await all(
          "SELECT * FROM catalog WHERE workspace_id=? AND kind=? ORDER BY name",
          u.workspace_id,
          kind,
        )
      ).map((x) => ({ ...x, data: JSON.parse(x.data) })),
    });
  }
  if (
    (path === "admin/catalog" && req.method === "POST") ||
    (path.startsWith("admin/catalog/") && req.method === "PUT")
  ) {
    const d = await body(req, catalogSchema);
    d.data = catalogDataSchemas[d.kind].parse(d.data);
    const id = req.method === "POST" ? uid() : path.split("/")[2];
    if (
      req.method === "PUT" &&
      !(await one(
        "SELECT id FROM catalog WHERE id=? AND workspace_id=?",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "Content not found.");
    await batch([
      req.method === "POST"
        ? statement(
            "INSERT INTO catalog (id,workspace_id,kind,name,description,data,active,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            id,
            u.workspace_id,
            d.kind,
            d.name,
            d.description,
            JSON.stringify(d.data),
            d.active,
            now(),
          )
        : statement(
            "UPDATE catalog SET kind=?,name=?,description=?,data=?,active=?,updated_at=? WHERE id=? AND workspace_id=?",
            d.kind,
            d.name,
            d.description,
            JSON.stringify(d.data),
            d.active,
            now(),
            id,
            u.workspace_id,
          ),
      audit(
        u,
        req.method === "POST" ? "Content created" : "Content updated",
        `${d.kind}:${id}`,
      ),
    ]);
    return json({ id });
  }
  if (path.startsWith("admin/catalog/") && req.method === "DELETE") {
    const id = path.split("/")[2];
    if (
      !(await one(
        "SELECT id FROM catalog WHERE id=? AND workspace_id=?",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "Content not found.");
    await batch([
      statement(
        "UPDATE catalog SET active=0,updated_at=? WHERE id=? AND workspace_id=?",
        now(),
        id,
        u.workspace_id,
      ),
      audit(u, "Content archived", id),
    ]);
    return json({ ok: true });
  }
  if (path === "admin/notifications" && req.method === "POST") {
    const d = await body(
        req,
        z.object({
          title: z.string().trim().min(2).max(100),
          body: z.string().trim().min(3).max(1000),
        }),
      ),
      recipients = await all(
        "SELECT id FROM users WHERE workspace_id=? AND status='active'",
        u.workspace_id,
      );
    await batch([
      ...recipients.map((r) =>
        statement(
          "INSERT INTO notifications (id,user_id,title,body,kind,created_at) VALUES (?,?,?,?,?,?)",
          uid(),
          r.id,
          d.title,
          d.body,
          "announcement",
          now(),
        ),
      ),
      audit(u, "Announcement sent", `${recipients.length} recipients`),
    ]);
    return json({ count: recipients.length });
  }
  if (path.startsWith("admin/issues/") && req.method === "PATCH") {
    const id = path.split("/")[2],
      d = await body(req, z.object({ status: z.enum(["open", "resolved"]) }));
    if (
      !(await one(
        "SELECT id FROM issues WHERE id=? AND workspace_id=?",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "Issue not found.");
    await batch([
      statement(
        "UPDATE issues SET status=? WHERE id=? AND workspace_id=?",
        d.status,
        id,
        u.workspace_id,
      ),
      audit(u, `Issue ${d.status}`, id),
    ]);
    return json({ ok: true });
  }
  if (path.startsWith("admin/devices/") && req.method === "PATCH") {
    const id = path.split("/")[2],
      d = await body(req, z.object({ active: z.boolean() }));
    if (
      !(await one(
        "SELECT id FROM devices WHERE id=? AND workspace_id=?",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "Device not found.");
    await batch([
      statement(
        "UPDATE devices SET active=? WHERE id=? AND workspace_id=?",
        d.active ? 1 : 0,
        id,
        u.workspace_id,
      ),
      audit(u, "Device status changed", id),
    ]);
    return json({ ok: true });
  }
  throw new ApiError(404, "Admin action not found.");
}
