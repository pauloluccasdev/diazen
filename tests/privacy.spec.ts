import {expect,test} from '@playwright/test';
import sharp from 'sharp';
test('exclusão confirmada bloqueia acesso e remove dados e fotos de histórico',async({page,context,request})=>{
  test.setTimeout(90000);
  await page.goto('/entrar');await page.getByLabel('E-mail',{exact:true}).fill('privacidade@example.test');await page.getByLabel('Senha',{exact:true}).fill('senha-de-teste-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/painel/projetos');await page.getByLabel('Nome do projeto',{exact:true}).fill('Privacidade E2E');await page.getByLabel('Meta diária de água (ml)').fill('2000');await page.getByRole('button',{name:'Criar projeto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Projeto criado');
  const png=await sharp({create:{width:20,height:30,channels:3,background:'#FF9F24'}}).png().toBuffer();
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const upload=await page.request.post('/api/fotos',{headers:{Origin:'http://127.0.0.1:3100'},multipart:{logged_on:date,category:'front',file:{name:'teste.png',mimeType:'image/png',buffer:png}}});expect(upload.status()).toBe(201);
  await page.goto('/painel/fotos');const image=await page.getByRole('article').locator('img').getAttribute('src');
  await page.goto('/painel/projetos');const project=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Privacidade E2E',exact:true})});await project.getByLabel('Entendo que o projeto ficará somente leitura.').first().check();await project.getByRole('button',{name:'Concluir projeto',exact:true}).click();await expect(project.getByText('Concluído',{exact:true})).toBeVisible();
  const exported=await page.request.get('/api/exportar');expect(exported.status()).toBe(200);const data=await exported.json();expect(data.projects).toHaveLength(1);expect(data.projects[0].name).toBe('Privacidade E2E');expect(data.photos).toHaveLength(1);expect((await request.get('/api/exportar')).status()).toBe(401);
  const cookies=(await context.cookies()).map(c=>`${c.name}=${c.value}`).join('; ');
  await page.goto('/painel/perfil');await page.getByText('Solicitar exclusão da conta',{exact:true}).click();const form=page.locator('form').filter({has:page.getByRole('button',{name:'Excluir minha conta',exact:true})});await form.getByLabel('Senha atual',{exact:true}).fill('senha-incorreta');await form.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');await form.getByLabel('Entendo que meus dados e fotos serão excluídos e não poderei recuperá-los.').check();await form.getByRole('button',{name:'Excluir minha conta',exact:true}).click();await expect(form.getByRole('alert')).toContainText('Confira a senha');await form.getByLabel('Senha atual',{exact:true}).fill('senha-de-teste-123');await form.getByRole('button',{name:'Excluir minha conta',exact:true}).click();await expect(page).toHaveURL(/\/conta-excluida$/);
  expect((await page.request.get(image!,{headers:{Cookie:cookies}})).status()).toBe(401);
  await page.goto('/painel');await expect(page).toHaveURL(/\/entrar$/);
});
