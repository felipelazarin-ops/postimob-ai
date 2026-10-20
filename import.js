const allowed = h => h === 'mybroker.com.br' || h === 'www.mybroker.com.br';
const decode = s => (s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/<[^>]*>/g,' ').trim();
export async function onRequestGet({request}) {
 try {
  const raw=new URL(request.url).searchParams.get('url');if(!raw)throw Error('Informe o link.');
  const u=new URL(raw);if(u.protocol!=='https:'||!allowed(u.hostname))throw Error('Somente links HTTPS da MyBroker são aceitos.');
  const res=await fetch(u.toString(),{headers:{'User-Agent':'Mozilla/5.0 (compatible; PostImobAI/1.0)','Accept':'text/html'}});
  if(!res.ok)throw Error('Site retornou HTTP '+res.status);
  const html=await res.text();if(html.length>4000000)throw Error('Página muito grande.');
  const meta=(key)=>{const patterns=[new RegExp('<meta[^>]*(?:property|name)=[\\x22\\x27]'+key+'[\\x22\\x27][^>]*content=[\\x22\\x27]([^\\x22\\x27]*)','i'),new RegExp('<meta[^>]*content=[\\x22\\x27]([^\\x22\\x27]*)[\\x22\\x27][^>]*(?:property|name)=[\\x22\\x27]'+key+'[\\x22\\x27]','i')];for(const p of patterns){const m=html.match(p);if(m)return decode(m[1])}return ''};
  let images=[];const add=x=>{if(!x)return;try{const a=new URL(x,u);if(a.protocol==='https:'&&!images.includes(a.href)&&!/(logo|icon|avatar|favicon|sprite)/i.test(a.pathname))images.push(a.href)}catch{}};
  add(meta('og:image'));add(meta('twitter:image'));
  const scripts=[...html.matchAll(/<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)];
  let title=meta('og:title')||meta('twitter:title'),description=meta('og:description')||meta('description'),price='',address='';
  const walk=(obj)=>{if(!obj||typeof obj!=='object')return;if(Array.isArray(obj)){obj.forEach(walk);return}
   if(obj.image){(Array.isArray(obj.image)?obj.image:[obj.image]).forEach(x=>add(typeof x==='string'?x:x?.url))}
   if(obj.name&&!title)title=obj.name;if(obj.description&&!description)description=obj.description;
   if(obj.offers?.price&&!price)price=String(obj.offers.price);
   if(obj.address?.streetAddress&&!address)address=[obj.address.streetAddress,obj.address.addressLocality].filter(Boolean).join(', ');
   Object.values(obj).forEach(v=>{if(typeof v==='object')walk(v)})};
  for(const s of scripts){try{walk(JSON.parse(s[1]))}catch{}}
  for(const m of html.matchAll(/(?:https?:\\/\\/|\\/)[^"'<>\\s\\\\]+?\\.(?:jpe?g|png|webp)(?:\\?[^"'<>\\s\\\\]*)?/gi))add(m[0].replace(/\\u002F/g,'/'));
  for(const m of html.matchAll(/<(?:img|source)[^>]+(?:src|data-src|srcset)=["']([^"']+)["']/gi)){for(const x of m[1].split(','))add(x.trim().split(/\\s+/)[0])}
  images=images.slice(0,80);
  if(!title&&!description&&!images.length)throw Error('A página não expôs informações públicas legíveis para importação.');
  return Response.json({title:decode(title),description:decode(description),price,address,images,source:u.toString()});
 }catch(e){return Response.json({error:e.message},{status:422})}
}