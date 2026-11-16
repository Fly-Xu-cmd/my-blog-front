import {it,expect,vi,afterAll} from 'vitest';
import jwt from 'jsonwebtoken';import {randomUUID} from 'crypto';
import {prisma} from '@/lib/prisma';
import {POST as createPost} from '@/app/api/posts/route';
import {POST as reorder} from '@/app/api/series/[id]/reorder/route';
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
afterAll(()=>prisma.$disconnect());
const req=(data:unknown)=>new Request('http://localhost/api/test',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({username:'test-admin'},process.env.JWT_SECRET!), 'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(data)});
it('concurrent series position claims produce one winner and reorder preserves all membership',async()=>{
 expect(process.env.DATABASE_URL).toContain('127.0.0.1:13316/blog_test');
 const series=await prisma.series.create({data:{name:'race '+randomUUID(),slug:'race-'+randomUUID()}});
 const responses=await Promise.all(Array.from({length:2},()=>createPost(req({title:randomUUID(),content:'body',seriesId:series.id,seriesOrder:1}))));
 expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
 const first=await prisma.post.findFirstOrThrow({where:{seriesId:series.id}}),second=await prisma.post.create({data:{title:'second',slug:randomUUID(),content:'body',seriesId:series.id,seriesOrder:2}});
 const ctx={params:Promise.resolve({id:String(series.id)})};
 expect((await reorder(req({postIds:[second.id]}),ctx)).status).toBe(409);
 expect((await prisma.post.findUniqueOrThrow({where:{id:first.id}})).seriesOrder).toBe(1);
 expect((await reorder(req({postIds:[second.id,first.id]}),ctx)).status).toBe(200);
 expect((await prisma.post.findUniqueOrThrow({where:{id:first.id}})).seriesOrder).toBe(2);
});

