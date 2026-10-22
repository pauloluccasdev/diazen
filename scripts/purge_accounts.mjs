import {createClient} from '@supabase/supabase-js';
import {purgeAccount,cleanPhotoJobs} from '../src/lib/privacy.ts';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key)throw new Error('Configure URL e chave administrativa no ambiente local.');
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
try {
  const jobs=await cleanPhotoJobs(admin);
  let accounts=0;
  while(true){
    const {data,error}=await admin.from('account_deletions').select('user_id').limit(100);
    if(error)throw new Error('Falha ao consultar solicitações');
    if(!data?.length)break;
    for(const row of data)if(await purgeAccount(admin,row.user_id))accounts++;
  }
  console.log(JSON.stringify({event:'privacy_cleanup_completed',accounts,photoJobs:jobs}));
}catch{console.error(JSON.stringify({event:'privacy_cleanup_failed'}));process.exitCode=1;}
