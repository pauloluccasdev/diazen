import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";

const alice = "00000000-0000-4000-8000-000000000081";
const bob = "00000000-0000-4000-8000-000000000082";
const charlie = "00000000-0000-4000-8000-000000000083";
const first = "00000000-0000-4000-8000-000000000088";
const second = "00000000-0000-4000-8000-000000000089";
const db = await createDatabase([alice, bob, charlie]);
after(() => db.close());
async function role(owner = alice, name = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec(`set role ${name}`);
}
async function row(sql, values = []) {
  return (await db.query(sql, values)).rows[0];
}
async function profile(owner = alice) {
  return row("select * from public.profiles where user_id=$1", [owner]);
}

test("perfil opcional da conta não depende de projeto; nome vazio torna-se ausente", async () => {
  await role();
  await db.query("select public.save_profile_name($1)", ["  Pessoa A  "]);
  assert.equal((await profile()).display_name, "Pessoa A");
  assert.equal((await profile()).avatar_key, null);
  await db.query("select public.save_profile_name(null)");
  assert.equal((await profile()).display_name, null);
  await db.query("select public.save_profile_name('   ')");
  assert.equal((await profile()).display_name, null);
});

test("nome e avatar atualizam atributos separados; caminho privado é gerado pelo banco", async () => {
  await role();
  await db.query("select public.save_profile_name('Pessoa A')");
  await db.query("select public.set_profile_avatar($1,$2)", [
    first,
    "Nome que não substitui o atual",
  ]);
  assert.equal((await profile()).avatar_key, `${alice}/avatars/${first}.webp`);
  assert.equal((await profile()).display_name, "Pessoa A");
  await db.query("select public.save_profile_name('Nome atualizado')");
  assert.equal((await profile()).avatar_id, first);
  await assert.rejects(
    db.query("update public.profiles set user_id=$1 where user_id=$2", [
      bob,
      alice,
    ]),
    /permission denied|Identidade imutável/,
  );
  await assert.rejects(
    db.query("update public.profiles set created_at=now() where user_id=$1", [
      alice,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    db.query("update public.profiles set avatar_key=$1 where user_id=$2", [
      `${bob}/avatars/${first}.webp`,
      alice,
    ]),
    { code: "428C9" },
  );
  await db.exec("reset role");
  await assert.rejects(
    db.query("update public.profiles set user_id=$1 where user_id=$2", [
      bob,
      alice,
    ]),
    /Identidade imutável/,
  );
});

test("RLS isola perfis e recusa inserção em nome de outro proprietário", async () => {
  await role(bob);
  await db.query("select public.save_profile_name('Pessoa B')");
  assert.deepEqual(
    (await db.query("select user_id from public.profiles")).rows,
    [{ user_id: bob }],
  );
  const changed = await db.query(
    "update public.profiles set display_name='Indevido' where user_id=$1 returning user_id",
    [alice],
  );
  assert.equal(changed.rows.length, 0);
  await assert.rejects(
    db.query(
      "insert into public.profiles(user_id,display_name) values($1,'Indevido')",
      [alice],
    ),
    /Conta indisponível|row-level security/,
  );
  await assert.rejects(
    db.query("select * from public.avatar_cleanup"),
    /permission denied/,
  );
  await role(alice);
  assert.equal((await profile()).display_name, "Nome atualizado");
});

test("avatar inicial conserva identidade conhecida sem ressuscitar nome removido", async () => {
  await role(charlie);
  await db.query("select public.set_profile_avatar($1,$2)", [
    first,
    "Nome já confirmado",
  ]);
  assert.equal((await profile(charlie)).display_name, "Nome já confirmado");
  await db.query("select public.save_profile_name(null)");
  await db.query("select public.set_profile_avatar($1,$2)", [
    second,
    "Não restaurar este nome",
  ]);
  assert.equal((await profile(charlie)).display_name, null);
  assert.equal((await profile(charlie)).avatar_id, second);
  await db.exec("reset role");
  await db.query("delete from auth.users where id=$1", [charlie]);
  assert.equal(
    Number(
      (
        await row(
          "select count(*) from public.avatar_cleanup where user_id=$1",
          [charlie],
        )
      ).count,
    ),
    0,
  );
});

test("storage permite somente avatar atual próprio; anônimo não consulta perfil nem RPC", async () => {
  await role(bob);
  await db.query("select public.set_profile_avatar($1)", [second]);
  await db.exec("reset role");
  const paths = [
    `${alice}/avatars/${first}.webp`,
    `${bob}/avatars/${second}.webp`,
    `${alice}/avatars/${second}.webp`,
  ];
  for (const path of paths)
    await db.query(
      "insert into storage.objects(bucket_id,name) values('body-photos',$1)",
      [path],
    );
  await role();
  assert.deepEqual((await db.query("select name from storage.objects")).rows, [
    { name: paths[0] },
  ]);
  await role(bob);
  assert.deepEqual((await db.query("select name from storage.objects")).rows, [
    { name: paths[1] },
  ]);
  await role(alice, "anon");
  await assert.rejects(
    db.query("select * from public.profiles"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select public.save_profile_name('Indevido')"),
    /permission denied/,
  );
  assert.equal(
    (await db.query("select name from storage.objects")).rows.length,
    0,
  );
});

test("validação de nome também é obrigatória no banco", async () => {
  await role();
  await assert.rejects(
    db.query("select public.save_profile_name($1)", ["x".repeat(81)]),
    /check constraint/,
  );
  await assert.rejects(
    db.query("select public.save_profile_name($1)", ["Nome\nquebrado"]),
    /check constraint/,
  );
  assert.equal((await profile()).display_name, "Nome atualizado");
});

test("confirmação antiga não remove avatar substituído por outra sessão", async () => {
  await role();
  assert.equal(
    (await row("select public.remove_profile_avatar($1) removed", [second]))
      .removed,
    false,
  );
  assert.equal((await profile()).avatar_id, first);
  assert.equal(
    (await row("select public.remove_profile_avatar($1) removed", [first]))
      .removed,
    true,
  );
  assert.equal((await profile()).avatar_id, null);
  assert.equal((await profile()).display_name, "Nome atualizado");
  await db.exec("reset role");
  await db.query("delete from public.avatar_cleanup where user_id=$1", [alice]);
  await role();
  await db.query("select public.set_profile_avatar($1)", [first]);
});

test("substituição e remoção enfileiram somente antigos e mantêm isolamento por proprietário", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.avatar_cleanup(user_id,avatar_id,available_after) values($1,$2,now()+interval '15 minutes')",
    [alice, first],
  );
  await role();
  await db.query("select public.set_profile_avatar($1)", [second]);
  assert.equal((await profile()).avatar_id, second);
  await db.exec("reset role");
  assert.equal(
    (
      await row(
        "select available_after<=now() ready from public.avatar_cleanup where user_id=$1 and avatar_id=$2",
        [alice, first],
      )
    ).ready,
    true,
  );
  await role();
  await db.query("select public.set_profile_avatar($1)", [second]);
  await db.query("select public.save_profile_name('Nome preservado')");
  await db.exec("reset role");
  assert.equal(
    Number((await row("select count(*) from public.avatar_cleanup")).count),
    1,
  );
  await role();
  await db.query("select public.set_profile_avatar(null)");
  assert.equal((await profile()).avatar_key, null);
  assert.equal((await profile()).display_name, "Nome preservado");
  await role(bob);
  await db.query("select public.set_profile_avatar(null)");
  await db.exec("reset role");
  assert.equal(
    Number(
      (
        await row(
          "select count(*) from public.avatar_cleanup where avatar_id=$1",
          [second],
        )
      ).count,
    ),
    2,
  );
});

test("solicitação de exclusão bloqueia perfil; cascade preserva outra conta e auditoria não copia conteúdo", async () => {
  await role();
  await db.query("select public.request_account_deletion()");
  assert.equal(
    (await db.query("select * from public.profiles")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.save_profile_name('Depois')"),
    /Conta indisponível/,
  );
  await assert.rejects(
    db.query("select public.set_profile_avatar($1)", [first]),
    /Conta indisponível/,
  );
  await db.exec("reset role");
  await db.query("delete from auth.users where id=$1", [alice]);
  assert.equal(
    Number(
      (
        await row("select count(*) from public.profiles where user_id=$1", [
          alice,
        ])
      ).count,
    ),
    0,
  );
  assert.equal(
    Number(
      (
        await row(
          "select count(*) from public.avatar_cleanup where user_id=$1",
          [alice],
        )
      ).count,
    ),
    0,
  );
  assert.equal((await profile(bob)).display_name, "Pessoa B");
  const audit = (
    await db.query(
      "select entity_id,project_id,previous_kg from public.audit_events where user_id=$1 and entity='profiles'",
      [bob],
    )
  ).rows;
  assert.ok(audit.length >= 2);
  assert.ok(
    audit.every(
      (event) =>
        event.entity_id === bob &&
        event.project_id === null &&
        event.previous_kg === null,
    ),
  );
});
