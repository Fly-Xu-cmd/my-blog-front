import {it,expect,vi,afterAll} from 'vitest';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'crypto';
import {prisma} from '@/lib/prisma';
import {POST} from '@/app/api/posts/route';
import {GET as detail} from '@/app/api/posts/[slug]/route';
import {POST as upload} from '@/app/api/upload-qiniu/route';
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
afterAll(()=>prisma.$disconnect());
it('rejects anonymous writes and uploads before parsing or side effects',async()=>{for(const handler of [POST,upload])expect((await handler(new Request('http://localhost/api/test',{method:'POST'}))).status).toBe(401);});
it('private detail is invisible and same-key concurrent creation replays a stable receipt',async()=>{
 expect(process.env.DATABASE_URL).toContain('127.0.0.1:13316/blog_test');
 const token=jwt.sign({username:'test-admin'},process.env.JWT_SECRET!,{algorithm:'HS256'}),key=randomUUID();
 const request=()=>new Request('http://localhost/api/posts',{method:'POST',headers:{Authorization:'Bearer '+token,'Idempotency-Key':key,'Content-Type':'application/json'},body:JSON.stringify({title:'smoke '+randomUUID(),content:'body'})});
 const initial=request(),body=await initial.text();
 const responses=await Promise.all(Array.from({length:3},()=>POST(new Request(initial.url,{method:'POST',headers:initial.headers,body}))));
 expect(responses.every(r=>r.status===200)).toBe(true);
 const rows=await Promise.all(responses.map(r=>r.json()));expect(new Set(rows.map(r=>r.data.id)).size).toBe(1);
 expect((await detail(new Request('http://localhost/api/posts/'+rows[0].data.slug),{params:Promise.resolve({slug:rows[0].data.slug})})).status).toBe(404);
});

