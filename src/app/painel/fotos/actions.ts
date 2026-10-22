"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isId } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormResult } from "@/components/forms/action-form";
export async function deletePhoto(_state:FormResult,form:FormData):Promise<FormResult> {
  const {client}=await requireAccount();
  const id=String(form.get('id')),admin=createAdminClient();
  if(!admin)return {error:'Exclusão de fotos temporariamente indisponível.',message:''};
  if(!isId(id)||form.get('confirm')!=='on')return {error:'Confirme a exclusão da foto.',message:''};
  // Remover o registro sob lock do ACTIVE antes de limpar o Storage. Uma falha
  // posterior deixa fila administrativa e jamais torna o arquivo acessível.
  const {data,error}=await client.from('photos').delete().eq('id',id).select('*');
  if(error||!data?.length)return {error:'Não foi possível excluir. Projetos encerrados são somente leitura.',message:''};
  const {error:storageError}=await admin.storage.from('body-photos').remove([data[0].storage_key,data[0].thumbnail_key]);
  if(!storageError)await admin.from('photo_cleanup').delete().eq('photo_id',id);
  revalidatePath('/painel','layout');
  return {error:'',message:'Foto removida da galeria.'};
}
