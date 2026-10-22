"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate,isId,today } from "@/lib/domain";
import { isModule,modules,measurements,modalities,categories,units } from "@/lib/records";
import type { FormResult } from "@/components/forms/action-form";
const ok = (message:string):FormResult=>({error:"",message});
const fail = (error:string):FormResult=>({error,message:""});
export async function saveRecord(_state:FormResult,form:FormData):Promise<FormResult> {
  const {client} = await requireAccount();
  const kind=String(form.get("module")), date=String(form.get("logged_on"));
  if(!isModule(kind) || !isDate(date) || date>today()) return fail("Confira a data do registro.");
  const id=String(form.get("id")??"");
  if(id && !isId(id)) return fail("Registro inválido.");
  const n=(key:string)=>{const raw=String(form.get(key)??"").trim(); return raw ? Number(raw.replace(",",".")) : null;};
  const text=(key:string,max:number)=>String(form.get(key)??"").trim().slice(0,max);
  let data:Record<string,string|number|null>={logged_on:date};
  if(kind==='agua') {
    const volume=n('volume_ml'), time=text('logged_time',8);
    if(volume===null || !Number.isInteger(volume) || volume<1 || volume>5000 || (time && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time))) return fail('Informe um volume entre 1 e 5000 ml e horário válido.');
    data={...data,volume_ml:volume,logged_time:time||null,container_label:text('container_label',60)||null};
  } else if(kind==='peso') {
    const kg=n('kg');
    if(kg===null || !Number.isFinite(kg) || kg<20 || kg>500) return fail('Informe um peso entre 20 e 500 kg.');
    const {error}=await client.rpc('save_weight',{p_date:date,p_kg:kg});
    if(error) return fail('Não foi possível salvar. Confira a vigência e se já existe peso nesta data em um projeto encerrado.');
    revalidatePath('/painel','layout');return ok('Peso salvo. O valor anterior dessa data foi substituído, quando existente.');
  } else if(kind==='medidas' && !id) {
    const values:Record<string,number>={};
    for(const key of Object.keys(measurements)) { const value=n(key); if(value!==null){if(!Number.isFinite(value)||value<1||value>300)return fail('As medidas devem estar entre 1 e 300 cm.');values[key]=value;} }
    if(!Object.keys(values).length)return fail('Informe pelo menos uma medida.');
    const {error}=await client.rpc('save_measurements',{p_date:date,p_values:values});
    if(error)return fail('Não foi possível salvar as medidas. Confira as datas e o estado do projeto.');
    revalidatePath('/painel','layout');return ok('Medidas salvas. Valores da mesma data e tipo foram substituídos.');
  } else if(kind==='medidas') {
    const type=text('measurement_type',30),value=n('value_cm');
    if(!(Object.hasOwn(measurements,type))||value===null||!Number.isFinite(value)||value<1||value>300)return fail('Confira a medida em centímetros.');
    data={...data,measurement_type:type,value_cm:value};
  } else if(kind==='atividades') {
    const modality=text('modality',20),duration=n('duration_min'),distance=n('distance_km');
    if(!(Object.hasOwn(modalities,modality))||duration===null||!Number.isFinite(duration)||duration<=0||duration>1440|| (modality!=='strength'&&distance===null) || (distance!==null&&(!Number.isFinite(distance)||distance<=0||distance>1000))) return fail('Confira modalidade, duração e distância. Corrida, ciclismo e natação exigem distância.');
    data={...data,modality,duration_min:duration,distance_km:distance,notes:text('notes',1000)||null};
  } else if(kind==='alimentacao') {
    const category=text('category',30),unit=text('unit',20),name=text('name',120),source=text('source',200),amount=n('amount'),reference=n('reference_amount');
    if(!(Object.hasOwn(categories,category))||!(Object.hasOwn(units,unit))||!name||!source||amount===null||reference===null||![amount,reference].every(v=>Number.isFinite(v)&&v>0&&v<=100000)) return fail('Confira alimento, categoria, quantidade, referência e fonte.');
    data={...data,category,unit,name,source,amount,reference_amount:reference};
    for(const key of ['kcal','protein','carbs','fat']) {const v=n(key);if(v!==null&&(!Number.isFinite(v)||v<0||v>100000))return fail('Valores nutricionais devem ser positivos ou zero. Deixe em branco o que não souber.');data[key]=v;}
  }
  let error;
  if(id) {const response=await client.from(modules[kind].table).update(data).eq('id',id).select('id');error=response.error||!response.data?.length;}
  else {
    const requestId=String(form.get('entry_id')??'');
    if(!isId(requestId))return fail('Recarregue a página para iniciar um novo registro.');
    const response=await client.from(modules[kind].table).insert({...data,id:requestId});error=response.error;
  }
  if(error)return fail('Não foi possível salvar. Confira os valores, a vigência do projeto ativo e se o registro já foi salvo.');
  revalidatePath('/painel','layout');return ok(id?'Registro atualizado.':'Registro adicionado.');
}
export async function deleteRecord(_state:FormResult,form:FormData):Promise<FormResult> {
  const {client}=await requireAccount();
  const kind=String(form.get('module')),id=String(form.get('id'));
  if(!isModule(kind)||!isId(id)||form.get('confirm')!=='on')return fail('Confirme a exclusão do registro.');
  const {data,error}=await client.from(modules[kind].table).delete().eq('id',id).select('id');
  if(error||!data?.length)return fail('Não foi possível excluir. Projetos encerrados são somente leitura.');
  revalidatePath('/painel','layout');return ok('Registro excluído.');
}
export async function confirmMealDay(_state:FormResult,form:FormData):Promise<FormResult> {
  const {client}=await requireAccount();
  const date=String(form.get('logged_on'));
  if(!isDate(date)||date>today())return fail('Data inválida.');
  const {data:active}=await client.from('projects').select('id').eq('status','ACTIVE').maybeSingle();
  if(!active)return fail('Ative um projeto para continuar.');
  const {error}=await client.from('meal_days').upsert({project_id:active.id,logged_on:date,confirmed:form.get('confirmed')==='true'},{onConflict:'project_id,logged_on'});
  if(error)return fail('Não foi possível alterar a confirmação do dia.');
  revalidatePath('/painel','layout');return ok('Confirmação atualizada. Concluído não significa aderência nutricional.');
}
