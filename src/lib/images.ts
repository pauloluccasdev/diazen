import sharp from "sharp";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export async function optimizePhoto(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Imagem muito grande.");
  const image=sharp(bytes,{limitInputPixels:40_000_000,failOn:"error",animated:false});
  const metadata=await image.metadata();
  if(!["jpeg","png","webp"].includes(metadata.format??"")||(metadata.pages??1)>1)throw new Error("Formato não suportado.");
  const full=await image.rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer();
  const thumbnail=await sharp(full).resize({width:360,height:360,fit:"inside",withoutEnlargement:true}).webp({quality:76}).toBuffer();
  if(full.length>MAX_IMAGE_BYTES)throw new Error("Imagem muito grande.");
  return {full,thumbnail};
}
