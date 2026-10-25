import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("biblioteca, receitas e cópia atômica preservam isolamento, snapshots e idempotência", async () => {
  const db = new PGlite();
  const alice = "33333333-3333-4333-8333-333333333333",
    bob = "44444444-4444-4444-8444-444444444444";
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const user = async (id) =>
    db.exec(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  try {
    await db.exec(
      `create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;grant select on storage.objects to authenticated,anon;insert into auth.users values('${alice}'),('${bob}');`,
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const { today, yesterday } = (
      await query(
        "select (now() at time zone 'America/Sao_Paulo')::date::text as today,((now() at time zone 'America/Sao_Paulo')::date-1)::text as yesterday",
      )
    )[0];
    await user(alice);
    assert.equal(
      (
        await query(
          "select has_table_privilege('authenticated','food_library','TRUNCATE') as allowed",
        )
      )[0].allowed,
      false,
    );
    const food = (
      await query(
        "insert into food_library(name,unit,reference_amount,source,kcal,protein,carbs,fat) values('Aveia','g',100,'Rótulo fictício',100,10,0,0) returning id",
      )
    )[0].id;
    const unknown = (
      await query(
        "insert into food_library(name,unit,reference_amount,source,protein) values('Ingrediente incompleto','g',100,'Informado',0) returning id",
      )
    )[0].id;
    const recipe = (
      await query(
        "select save_recipe(gen_random_uuid(),'Receita de teste',2,$1::jsonb) as id",
        [
          JSON.stringify([
            { food_id: food, amount: 50 },
            { food_id: unknown, amount: 100 },
          ]),
        ],
      )
    )[0].id;
    const compiled = (
      await query("select * from food_library where id=$1", [recipe])
    )[0];
    assert.equal(compiled.kcal, null);
    assert.equal(Number(compiled.protein), 5);
    assert.equal(
      compiled.carbs,
      null,
      "zero conhecido não converte ingrediente desconhecido em zero",
    );
    assert.equal(compiled.ingredients.length, 2);
    const source = (
      await query("select create_project('Origem',$1,null,2000) as id", [
        yesterday,
      ])
    )[0].id;
    await query(
      "select add_library_food($1,null,$2,'breakfast',1,gen_random_uuid())",
      [recipe, yesterday],
    );
    await query(
      "update food_library set protein=99,favorite=true where id=$1",
      [food],
    );
    assert.equal(
      Number(
        (
          await query("select protein from food_library where id=$1", [recipe])
        )[0].protein,
      ),
      5,
      "editar alimento não recalcula receita salva",
    );
    await query("delete from food_library where id=$1", [unknown]);
    assert.equal(
      (
        await query("select ingredients from food_library where id=$1", [
          recipe,
        ])
      )[0].ingredients.length,
      2,
    );
    assert.equal(
      Number((await query("select protein from meal_items"))[0].protein),
      5,
    );
    // Mais de uma página: cópia SQL não se limita aos vinte itens visíveis.
    await query(
      "insert into meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal) select $1,'breakfast','Item '||i,100,'g',100,'Informado',0 from generate_series(1,22) i",
      [yesterday],
    );
    await query("update projects set status='COMPLETED' where id=$1", [source]);
    const target = (
      await query("select create_project('Destino',$1,null,2000) as id", [
        today,
      ])
    )[0].id;
    await query("insert into meal_days(logged_on,confirmed) values($1,true)", [
      today,
    ]);
    await query(
      "insert into meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal) values($1,'lunch','Existente',100,'g',100,'Informado',0)",
      [today],
    );
    await query("update meal_days set confirmed=true");
    const request = "55555555-5555-4555-8555-555555555555";
    const copy =
      "select copy_meal($1,$2,'breakfast',$3,'lunch',$4,true) as count";
    assert.equal(
      (await query(copy, [source, yesterday, today, request]))[0].count,
      23,
    );
    assert.equal(
      (await query(copy, [source, yesterday, today, request]))[0].count,
      23,
    );
    assert.equal(
      Number(
        (
          await query(
            "select count(*) as n from meal_items where project_id=$1",
            [target],
          )
        )[0].n,
      ),
      24,
    );
    assert.equal(
      (
        await query("select confirmed from meal_days where project_id=$1", [
          target,
        ])
      )[0].confirmed,
      false,
    );
    await assert.rejects(
      query(copy, [
        source,
        yesterday,
        yesterday,
        "66666666-6666-4666-8666-666666666666",
      ]),
      /vigência/,
    );
    await assert.rejects(
      query(
        "select copy_meal($1,$2,'breakfast',$3,'lunch',gen_random_uuid(),false)",
        [source, yesterday, today],
      ),
      /Confirme/,
    );
    const same = "77777777-7777-4777-8777-777777777777";
    const sameCopy =
      "select copy_meal($1,$2,'lunch',$2,'lunch',$3,true) as count";
    assert.equal((await query(sameCopy, [target, today, same]))[0].count, 24);
    assert.equal((await query(sameCopy, [target, today, same]))[0].count, 24);
    assert.equal(
      Number(
        (
          await query(
            "select count(*) as n from meal_items where project_id=$1",
            [target],
          )
        )[0].n,
      ),
      48,
      "replay para a própria origem não copia os itens da primeira cópia",
    );
    await user(bob);
    assert.equal((await query("select * from food_library")).length, 0);
    assert.equal((await query("select * from food_copy_requests")).length, 0);
    await assert.rejects(
      query(
        "select add_library_food($1,null,$2,'breakfast',1,gen_random_uuid())",
        [recipe, today],
      ),
      /indisponível/,
    );
    await assert.rejects(
      query("select save_recipe(gen_random_uuid(),'Inválida',1,$1::jsonb)", [
        JSON.stringify([{ food_id: food, amount: 1 }]),
      ]),
      /indisponível/,
    );
    assert.equal(
      (
        await query(
          "update food_library set favorite=false where id=$1 returning id",
          [food],
        )
      ).length,
      0,
    );
    await user(alice);
    await query("select request_account_deletion()");
    assert.equal((await query("select * from food_library")).length, 0);
    await assert.rejects(
      query(
        "insert into food_library(name,unit,reference_amount,source) values('Negado','g',100,'Informado')",
      ),
      /indisponível/,
    );
    await db.exec("reset role");
    await query("delete from auth.users where id=$1", [alice]);
    assert.equal((await query("select * from food_library")).length, 0);
    assert.equal((await query("select * from food_copy_requests")).length, 0);
  } finally {
    await db.close();
  }
});
