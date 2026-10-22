// Simulador local de Supabase Auth usado exclusivamente nos testes de navegador.
import { createServer } from "node:http";
import { createDatabase, rest } from "./database.mjs";
const user = { id: "00000000-0000-4000-8000-000000000001", email: "teste@example.test", aud: "authenticated", role: "authenticated", created_at: "2026-01-01T00:00:00Z" };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" })}.assinatura-de-teste`;

const users = [user,{...user,id:"00000000-0000-4000-8000-000000000002",email:"registros@example.test"},{...user,id:"00000000-0000-4000-8000-000000000003",email:"fotos@example.test"},{...user,id:"00000000-0000-4000-8000-000000000004",email:"privacidade@example.test"}];
const tokenFor = (u) => u.id===user.id?token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:u.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})}.assinatura-de-teste`;
const tokens = new Map(users.map(u=>[tokenFor(u),u]));
const files = new Map();
const db = await createDatabase(users.map(u=>u.id));
let queue = Promise.resolve();
createServer(async (request, response) => {
  const admin = request.headers.apikey === "chave-secreta-de-teste";
  const currentUser = tokens.get(String(request.headers.authorization).replace(/^Bearer /,""));
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  if (request.url === "/health") return response.end("{}");
  if (request.url?.startsWith('/rest/v1/')) {
    const uid = currentUser?.id ?? null;
    queue = queue.then(()=>rest(db,request,response,new URL(request.url,'http://localhost'),uid,admin));
    await queue; return;
  }
  if(request.url?.startsWith('/storage/v1/object/')) {
    const parts=decodeURIComponent(new URL(request.url,'http://localhost').pathname).split('/');
    const bucketIndex=parts.indexOf('body-photos'),path=parts.slice(bucketIndex+1).join('/');
    if(request.method==='POST'&&admin&&path) {
      const parts=[];for await(const part of request)parts.push(part);files.set(path,Buffer.concat(parts));
      queue=queue.then(async()=>{await db.exec('reset role');await db.query("insert into storage.objects(bucket_id,name) values('body-photos',$1)",[path]);});await queue;
      return response.end(JSON.stringify({Key:`body-photos/${path}`,Id:crypto.randomUUID()}));
    }
    if(request.method==='DELETE'&&admin) {
      let raw='';for await(const part of request)raw+=part;const {prefixes}=JSON.parse(raw);
      queue=queue.then(async()=>{await db.exec('reset role');for(const key of prefixes){files.delete(key);await db.query('delete from storage.objects where name=$1',[key]);}});await queue;
      return response.end(JSON.stringify(prefixes.map(name=>({name}))));
    }
    if(request.method==='GET'&&currentUser) {
      let allowed=false;
      queue=queue.then(async()=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[currentUser.id]);await db.exec('set role authenticated');allowed=(await db.query('select * from storage.objects where name=$1',[path])).rows.length>0;await db.exec('reset role');});await queue;
      if(allowed&&files.has(path)){response.setHeader('Content-Type','image/webp');return response.end(files.get(path));}
    }
    response.statusCode=404;return response.end('{}');
  }
  if (request.url === "/auth/v1/token?grant_type=password" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const credentials = JSON.parse(body);
    const account = users.find(u=>u.email===credentials.email);
    if (account && credentials.password === "senha-de-teste-123") {
      return response.end(JSON.stringify({ access_token: [...tokens.entries()].find(([,u])=>u.id===account.id)[0], refresh_token: "refresh-de-teste", token_type: "bearer", expires_in: 3600, user:account }));
    }
  }
  if (request.url?.startsWith("/auth/v1/signup") || request.url?.startsWith("/auth/v1/recover")) return response.end("{}");
  if (request.url === "/auth/v1/verify" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const data = JSON.parse(body);
    if (data.token_hash === "link-valido-de-teste") return response.end(JSON.stringify({ access_token: token, refresh_token: "refresh-de-teste", token_type: "bearer", expires_in: 3600, user }));
  }
  if (request.url === "/auth/v1/user" && currentUser) return response.end(JSON.stringify(currentUser));
  if (request.url?.startsWith("/auth/v1/logout") && request.method === "POST") { response.statusCode = 204; return response.end(); }
  response.statusCode = 400;
  response.end(JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }));
}).listen(54329, "127.0.0.1");
