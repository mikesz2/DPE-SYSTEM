const router=require('express').Router();
const prisma=require('../config/prisma');
const {asyncRoute,HttpError,audit}=require('../utils/http');
const {requireAuth}=require('../middleware/auth');
const {requireRole,roleAtLeast}=require('../middleware/permissions');
router.use(requireAuth);
const METRICS=new Set(['HOURS','SHIFTS','LESSONS','SCHEDULE_ATTENDANCE']);
function parseDate(v,l){const d=new Date(v);if(!v||!Number.isFinite(d.getTime()))throw new HttpError(400,l+' inválida.');return d;}
async function metricValue(g){
 const from=g.startsAt,to=g.endsAt,id=g.memberId;
 if(g.metric==='HOURS'){const s=await prisma.shift.findMany({where:{memberId:id,startedAt:{gte:from,lte:to}},select:{startedAt:true,endedAt:true}});return s.reduce((a,x)=>a+Math.max(0,((new Date(x.endedAt||Date.now()))-new Date(x.startedAt))/3600000),0);}
 if(g.metric==='SHIFTS')return prisma.shift.count({where:{memberId:id,startedAt:{gte:from,lte:to}}});
 if(g.metric==='LESSONS')return prisma.lesson.count({where:{authorId:id,createdAt:{gte:from,lte:to}}});
 if(g.metric==='SCHEDULE_ATTENDANCE'){const sc=await prisma.dutySchedule.findMany({where:{memberId:id,startsAt:{gte:from,lte:to}},select:{startsAt:true,endsAt:true}});if(!sc.length)return 0;const sh=await prisma.shift.findMany({where:{memberId:id,startedAt:{lt:to},OR:[{endedAt:null},{endedAt:{gt:from}}]},select:{startedAt:true,endedAt:true}});let p=0;for(const s of sc)if(sh.some(x=>new Date(x.startedAt)<s.endsAt&&new Date(x.endedAt||Date.now())>s.startsAt))p++;return Math.round((p/sc.length)*1000)/10;}
 return 0;
}

router.get('/',asyncRoute(async(req,res)=>{
 const admin=roleAtLeast(req.member.role,'MODERADOR');
 const goals=await prisma.performanceGoal.findMany({where:admin?{}:{memberId:req.member.id},include:{member:{select:{id:true,habboName:true,rank:{select:{name:true}}}},createdBy:{select:{habboName:true}}},orderBy:[{active:'desc'},{endsAt:'asc'},{id:'desc'}],take:300});
 const enriched=[];
 for(const g of goals){const v=await metricValue(g);enriched.push({id:g.id,memberId:g.memberId,metric:g.metric,targetValue:g.targetValue,startsAt:g.startsAt,endsAt:g.endsAt,note:g.note,active:g.active,member:{id:g.member.id,nick:g.member.habboName,rank:g.member.rank?.name||'—'},createdBy:g.createdBy.habboName,progressValue:Math.round(v*10)/10,progressPercent:g.targetValue>0?Math.min(100,Math.round((v/g.targetValue)*1000)/10):0,completed:v>=g.targetValue});}
 res.set('Cache-Control','no-store');res.json({goals:enriched,metrics:[...METRICS]});
}));

router.post('/',requireRole('MODERADOR'),asyncRoute(async(req,res)=>{
 const memberId=Number(req.body?.memberId),metric=String(req.body?.metric||'').toUpperCase(),targetValue=Number(req.body?.targetValue);
 if(!Number.isInteger(memberId)||memberId<1)throw new HttpError(400,'Militar inválido.');
 if(!METRICS.has(metric))throw new HttpError(400,'Métrica inválida.');
 if(!Number.isFinite(targetValue)||targetValue<=0||targetValue>10000)throw new HttpError(400,'Meta inválida.');
 const startsAt=parseDate(req.body?.startsAt,'Data inicial'),endsAt=parseDate(req.body?.endsAt,'Data final');
 if(endsAt<=startsAt)throw new HttpError(400,'A data final deve ser posterior à inicial.');
 const note=String(req.body?.note||'').trim().slice(0,300);
 const member=await prisma.member.findUnique({where:{id:memberId},select:{id:true,habboName:true,status:true}});
 if(!member||['EXPULSO','DESLIGADO'].includes(member.status))throw new HttpError(400,'Militar indisponível para meta.');
 const goal=await prisma.performanceGoal.create({data:{memberId,createdById:req.member.id,metric,targetValue,startsAt,endsAt,note}});
 await prisma.notification.create({data:{memberId,icon:'🎯',title:'Nova meta definida',text:'Uma nova meta foi definida para o período informado.'}});
 await audit(req.member.id,'PERFORMANCE_GOAL_CREATED',{goalId:goal.id,targetId:memberId,targetNick:member.habboName,metric,targetValue,startsAt,endsAt});
 res.status(201).json({goal});
}));

router.patch('/:id',requireRole('MODERADOR'),asyncRoute(async(req,res)=>{
 const id=Number(req.params.id),current=await prisma.performanceGoal.findUnique({where:{id}});if(!current)throw new HttpError(404,'Meta não encontrada.');
 const data={};if(req.body?.targetValue!==undefined){const v=Number(req.body.targetValue);if(!Number.isFinite(v)||v<=0||v>10000)throw new HttpError(400,'Meta inválida.');data.targetValue=v;}if(req.body?.note!==undefined)data.note=String(req.body.note||'').trim().slice(0,300);if(req.body?.active!==undefined)data.active=Boolean(req.body.active);
 const goal=await prisma.performanceGoal.update({where:{id},data});await audit(req.member.id,'PERFORMANCE_GOAL_UPDATED',{goalId:id,targetId:current.memberId,active:goal.active,targetValue:goal.targetValue});res.json({goal});
}));

router.delete('/:id',requireRole('ADMINISTRADOR'),asyncRoute(async(req,res)=>{
 const id=Number(req.params.id),current=await prisma.performanceGoal.findUnique({where:{id}});if(!current)throw new HttpError(404,'Meta não encontrada.');await prisma.performanceGoal.delete({where:{id}});await audit(req.member.id,'PERFORMANCE_GOAL_DELETED',{goalId:id,targetId:current.memberId});res.status(204).end();
}));

module.exports=router;
