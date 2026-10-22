// Simulador local de Supabase Auth usado exclusivamente nos testes de navegador.
import { createServer } from "node:http";
import { createDatabase, rest } from "./database.mjs";
const user = { id: "00000000-0000-4000-8000-000000000001", email: "teste@example.test", aud: "authenticated", role: "authenticated", created_at: "2026-01-01T00:00:00Z" };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })}.assinatura-de-teste`;

const db = await createDatabase([user.id]);
let queue = Promise.resolve();
createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  if (request.url === "/health") return response.end("{}");
  if (request.url?.startsWith('/rest/v1/')) {
    const uid = request.headers.authorization === `Bearer ${token}` ? user.id : null;
    queue = queue.then(()=>rest(db,request,response,new URL(request.url,'http://localhost'),uid));
    await queue; return;
  }
  if (request.url === "/auth/v1/token?grant_type=password" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const credentials = JSON.parse(body);
    if (credentials.email === user.email && credentials.password === "senha-de-teste-123") {
      return response.end(JSON.stringify({ access_token: token, refresh_token: "refresh-de-teste", token_type: "bearer", expires_in: 3600, user }));
    }
  }
  if (request.url?.startsWith("/auth/v1/signup") || request.url?.startsWith("/auth/v1/recover")) return response.end("{}");
  if (request.url === "/auth/v1/verify" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const data = JSON.parse(body);
    if (data.token_hash === "link-valido-de-teste") return response.end(JSON.stringify({ access_token: token, refresh_token: "refresh-de-teste", token_type: "bearer", expires_in: 3600, user }));
  }
  if (request.url === "/auth/v1/user" && request.headers.authorization === `Bearer ${token}`) return response.end(JSON.stringify(user));
  if (request.url?.startsWith("/auth/v1/logout") && request.method === "POST") { response.statusCode = 204; return response.end(); }
  response.statusCode = 400;
  response.end(JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }));
}).listen(54329, "127.0.0.1");
