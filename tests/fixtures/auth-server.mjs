// Simulador local de Supabase Auth usado exclusivamente nos testes de navegador.
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { createDatabase, rest } from "./database.mjs";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "teste@example.test",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })}.assinatura-de-teste`;

const users = [
  user,
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000012",
    email: "plano@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000011",
    email: "taco@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000010",
    email: "projetos-validacao@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000007",
    email: "resiliencia@example.test",
  },
  ...[8, 9].map((n) => ({
    ...user,
    id: `00000000-0000-4000-8000-00000000000${n}`,
    email: `concorrencia${n}@example.test`,
  })),
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000006",
    email: "alimentos@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000002",
    email: "registros@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000003",
    email: "fotos@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000004",
    email: "privacidade@example.test",
  },
  {
    ...user,
    id: "00000000-0000-4000-8000-000000000005",
    email: "acessibilidade@example.test",
  },
];
const tokenFor = (u) =>
  u.id === user.id
    ? token
    : `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: u.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })}.assinatura-de-teste`;
const tokens = new Map(users.map((u) => [tokenFor(u), u]));
const files = new Map();
const failPhotoReplies = new Set();
const failReads = new Set();
const closeOnProjectRead = new Set();
const emailLinks = new Map();
const emailTickets = new Map();
const authCodes = new Map();
const db = await createDatabase(users.map((u) => u.id));
let queue = Promise.resolve();
createServer(async (request, response) => {
  const admin = request.headers.apikey === "chave-secreta-de-teste";
  const currentUser = tokens.get(
    String(request.headers.authorization).replace(/^Bearer /, ""),
  );
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  if (request.url === "/health") return response.end("{}");
  if (request.url?.startsWith("/_test/close-on-project-read/")) {
    closeOnProjectRead.add(request.url.split("/").at(-1));
    return response.end("{}");
  }
  if (request.url?.startsWith("/_test/read-failure/")) {
    const path = request.url.split("/");
    if (path.at(-1) === "on") failReads.add(path.at(-2));
    else failReads.delete(path.at(-2));
    return response.end("{}");
  }
  if (request.url?.startsWith("/_test/email-link?")) {
    const email = new URL(request.url, "http://localhost").searchParams.get(
      "email",
    );
    return response.end(
      JSON.stringify({ link: emailLinks.get(email) ?? null }),
    );
  }
  if (request.url?.startsWith("/auth/v1/verify?") && request.method === "GET") {
    const ticket = new URL(request.url, "http://localhost").searchParams.get(
      "token",
    );
    const pending = emailTickets.get(ticket);
    if (pending) {
      emailTickets.delete(ticket);
      const code = randomUUID();
      authCodes.set(code, pending);
      const destination = new URL(pending.redirect);
      destination.searchParams.set("code", code);
      response.writeHead(302, { Location: destination.toString() });
      return response.end();
    }
  }
  if (
    request.url === "/auth/v1/token?grant_type=pkce" &&
    request.method === "POST"
  ) {
    let raw = "";
    for await (const part of request) raw += part;
    const body = JSON.parse(raw);
    const pending = authCodes.get(body.auth_code);
    const challenge = createHash("sha256")
      .update(body.code_verifier ?? "")
      .digest("base64url");
    if (pending && pending.challenge === challenge) {
      authCodes.delete(body.auth_code);
      return response.end(
        JSON.stringify({
          access_token: tokenFor(pending.user),
          refresh_token: "refresh-de-teste",
          token_type: "bearer",
          expires_in: 3600,
          user: pending.user,
        }),
      );
    }
    response.statusCode = 400;
    return response.end(
      JSON.stringify({
        code: "bad_code_verifier",
        msg: "Invalid code or verifier",
      }),
    );
  }
  if (request.url?.startsWith("/_test/photo-reply-status/"))
    return response.end(
      JSON.stringify({
        pending: failPhotoReplies.has(request.url.split("/").at(-1)),
      }),
    );
  if (request.url?.startsWith("/_test/fail-photo-reply/")) {
    failPhotoReplies.add(request.url.split("/").at(-1));
    return response.end("{}");
  }
  if (request.url?.startsWith("/rest/v1/")) {
    if (request.method === "GET" && failReads.has(currentUser?.id)) {
      response.statusCode = 503;
      return response.end(
        JSON.stringify({
          code: "TEST_UNAVAILABLE",
          message: "Synthetic read failure",
        }),
      );
    }
    const uid = currentUser?.id ?? null;
    queue = queue.then(async () => {
      await rest(
        db,
        request,
        response,
        new URL(request.url, "http://localhost"),
        uid,
        admin,
        () => failPhotoReplies.delete(uid),
      );
      const url = new URL(request.url, "http://localhost");
      if (
        request.method === "GET" &&
        url.pathname === "/rest/v1/projects" &&
        !url.searchParams.has("status") &&
        closeOnProjectRead.delete(uid)
      ) {
        // A committed concurrent closure between the list snapshot and the
        // subsequent ACTIVE query. The first response contains real old data.
        await db.exec("reset role; set role authenticated");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          uid,
        ]);
        await db.query(
          "update public.projects set status='COMPLETED' where user_id=$1 and status='ACTIVE'",
          [uid],
        );
      }
    });
    await queue;
    return;
  }
  if (request.url?.startsWith("/storage/v1/object/")) {
    const parts = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    ).split("/");
    const bucketIndex = parts.indexOf("body-photos"),
      path = parts.slice(bucketIndex + 1).join("/");
    if (parts.includes("list") && request.method === "POST" && admin) {
      let raw = "";
      for await (const part of request) raw += part;
      const { prefix = "", limit = 100, offset = 0 } = JSON.parse(raw);
      const entries = new Map();
      for (const key of files.keys())
        if (key.startsWith(prefix + "/")) {
          const remainder = key.slice(prefix.length + 1),
            name = remainder.split("/")[0];
          entries.set(name, { name, id: remainder.includes("/") ? null : key });
        }
      return response.end(
        JSON.stringify(
          [...entries.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(offset, offset + limit),
        ),
      );
    }
    if (request.method === "POST" && admin && path) {
      const parts = [];
      for await (const part of request) parts.push(part);
      files.set(path, Buffer.concat(parts));
      queue = queue.then(async () => {
        await db.exec("reset role");
        await db.query(
          "insert into storage.objects(bucket_id,name) values('body-photos',$1)",
          [path],
        );
      });
      await queue;
      return response.end(
        JSON.stringify({ Key: `body-photos/${path}`, Id: crypto.randomUUID() }),
      );
    }
    if (request.method === "DELETE" && admin) {
      let raw = "";
      for await (const part of request) raw += part;
      const { prefixes } = JSON.parse(raw);
      queue = queue.then(async () => {
        await db.exec("reset role");
        for (const key of prefixes) {
          files.delete(key);
          await db.query("delete from storage.objects where name=$1", [key]);
        }
      });
      await queue;
      return response.end(JSON.stringify(prefixes.map((name) => ({ name }))));
    }
    if (request.method === "GET" && currentUser) {
      let allowed = false;
      queue = queue.then(async () => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          currentUser.id,
        ]);
        await db.exec("set role authenticated");
        allowed =
          (
            await db.query("select * from storage.objects where name=$1", [
              path,
            ])
          ).rows.length > 0;
        await db.exec("reset role");
      });
      await queue;
      if (allowed && files.has(path)) {
        response.setHeader("Content-Type", "image/webp");
        return response.end(files.get(path));
      }
    }
    response.statusCode = 404;
    return response.end("{}");
  }
  if (
    request.url?.startsWith("/auth/v1/admin/users/") &&
    request.method === "DELETE" &&
    admin
  ) {
    const id = request.url.split("/").at(-1);
    queue = queue.then(async () => {
      await db.exec("reset role");
      await db.query("delete from auth.users where id=$1", [id]);
    });
    await queue;
    for (const [token, u] of tokens) if (u.id === id) tokens.delete(token);
    const index = users.findIndex((u) => u.id === id);
    const removed = users[index];
    if (index >= 0) users.splice(index, 1);
    return response.end(JSON.stringify({ user: removed }));
  }
  if (
    request.url === "/auth/v1/token?grant_type=password" &&
    request.method === "POST"
  ) {
    let body = "";
    for await (const chunk of request) body += chunk;
    const credentials = JSON.parse(body);
    const account = users.find((u) => u.email === credentials.email);
    if (account && credentials.password === "senha-de-teste-123") {
      return response.end(
        JSON.stringify({
          access_token: [...tokens.entries()].find(
            ([, u]) => u.id === account.id,
          )[0],
          refresh_token: "refresh-de-teste",
          token_type: "bearer",
          expires_in: 3600,
          user: account,
        }),
      );
    }
  }
  if (
    request.url?.startsWith("/auth/v1/signup") ||
    request.url?.startsWith("/auth/v1/recover")
  ) {
    let raw = "";
    for await (const part of request) raw += part;
    const body = JSON.parse(raw);
    const redirect = new URL(request.url, "http://localhost").searchParams.get(
      "redirect_to",
    );
    const account =
      users.find((u) => u.email === body.email) ??
      (request.url.startsWith("/auth/v1/signup") ? user : null);
    if (body.code_challenge && redirect && account) {
      const ticket = randomUUID();
      emailTickets.set(ticket, {
        challenge: body.code_challenge,
        redirect,
        user: account,
      });
      emailLinks.set(
        body.email,
        `http://127.0.0.1:54329/auth/v1/verify?token=${ticket}&type=${request.url.startsWith("/auth/v1/recover") ? "recovery" : "signup"}`,
      );
    }
    return response.end("{}");
  }
  if (request.url === "/auth/v1/user" && currentUser)
    return response.end(JSON.stringify(currentUser));
  if (request.url?.startsWith("/auth/v1/logout") && request.method === "POST") {
    response.statusCode = 204;
    return response.end();
  }
  response.statusCode = 400;
  response.end(
    JSON.stringify({
      code: "invalid_credentials",
      msg: "Invalid login credentials",
    }),
  );
}).listen(54329, "127.0.0.1");
