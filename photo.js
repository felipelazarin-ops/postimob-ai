export async function onRequestGet({request}){
 try{
 const raw=new URL(request.url).searchParams.get('url');const u=new URL(raw);
 if(u.protocol!=='https:'||!/(^|\\.)mybroker\\.com\\.br$/.test(u.hostname))throw Error('Download permitido somente para imagens hospedadas no domínio MyBroker.');
 const r=await fetch(u.toString());if(!r.ok)throw Error('Imagem indisponível');
 const type=r.headers.get('content-type')||'';if(!type.startsWith('image/'))throw Error('Arquivo não é uma imagem.');
 return new Response(r.body,{headers:{'content-type':type,'content-disposition':'attachment; filename="imovel-mybroker.jpg"'}});
 }catch(e){return Response.json({error:e.message},{status:422})}
}