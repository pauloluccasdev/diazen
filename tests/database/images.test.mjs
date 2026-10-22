import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {optimizePhoto} from '../../src/lib/images.ts';

test('fotos preservam orientação, removem EXIF e geram miniatura',async()=>{
  const original=await sharp({create:{width:120,height:60,channels:3,background:'#FF9F24'}}).jpeg().withMetadata({orientation:6,exif:{IFD0:{Artist:'metadado sensível de teste'}}}).toBuffer();
  assert.ok((await sharp(original).metadata()).exif);
  const {full,thumbnail}=await optimizePhoto(original);
  const result=await sharp(full).metadata(),small=await sharp(thumbnail).metadata();
  assert.equal(result.format,'webp');assert.equal(result.width,60);assert.equal(result.height,120);
  assert.equal(result.exif,undefined);assert.equal(result.orientation,undefined);
  assert.ok(small.width<=360&&small.height<=360);
});
test('upload rejeita bytes inválidos e limite de tamanho',async()=>{
  await assert.rejects(optimizePhoto(Buffer.from('arquivo sem imagem')));
  await assert.rejects(optimizePhoto(new Uint8Array(3*1024*1024+1)),/grande/);
});
