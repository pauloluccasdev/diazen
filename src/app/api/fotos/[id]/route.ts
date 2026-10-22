import { apiAccount } from "@/lib/api-account";
import { isId } from "@/lib/domain";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;if(!isId(id))return new Response(null,{status:404});
  const account=await apiAccount();if(!account)return new Response(null,{status:401,headers:{'Cache-Control':'no-store'}});
  const {data:photo,error}=await account.client.from('photos').select('*').eq('id',id).maybeSingle();
  if(error||!photo)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  const thumbnail=new URL(request.url).searchParams.get('miniatura')==='1';
  const {data,error:downloadError}=await account.client.storage.from('body-photos').download(thumbnail?photo.thumbnail_key:photo.storage_key);
  if(downloadError||!data)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(data,{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="${id}.webp"`}});
}
