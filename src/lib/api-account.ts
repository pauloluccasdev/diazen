import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
export async function apiAccount() {
  const client=await createSupabaseServerClient();if(!client)return null;
  const {data:{user}}=await client.auth.getUser();if(!user)return null;
  const {data:available,error}=await client.rpc('account_available');
  if(error||!available)return null;
  return {client,user};
}
