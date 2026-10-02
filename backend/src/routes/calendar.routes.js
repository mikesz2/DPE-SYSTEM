const router=require('express').Router();
const prisma=require('../config/prisma');
const {asyncRoute,HttpError,audit}=require('../utils/http');
const {requireAuth}=require('../middleware/auth');
const {requireRole}=require('../middleware/permissions');
router.use(requireAuth);

function parseRange(req){
  const from=req.query.from?new Date(req.query.from):new Date(Date.now()-7*86400000);
  const to=req.query.to?new Date(req.query.to):new Date(Date.now()+35*86400000);
  if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||to<=from)throw new HttpError(400,'Período inválido.');
  if(to-from>370*86400000)throw new HttpError(400,'Período máximo de 370 dias.');
  return {from,to};
}

router.get('/',asyncRoute(async(req,res)=>{
  const {from,to}=parseRange(req);
  const divisionId=req.query.divisionId?Number(req.query.divisionId):null;
  const [events,schedules,operations,leaves,lessons]=await prisma.$transaction([
    prisma.institutionalEvent.findMany({where:{AND:[{startsAt:{lt:to}},{OR:[{endsAt:null},{endsAt:{gt:from}}]},...(divisionId?[{OR:[{divisionId},{divisionId:null}]}]:[])]},include:{division:{select:{sig:true}},createdBy:{select:{habboName:true}}},orderBy:{startsAt:'asc'}}),
    prisma.dutySchedule.findMany({where:{startsAt:{lt:to},endsAt:{gt:from},...(divisionId?{member:{divisionId}}:{})},include:{member:{select:{id:true,habboName:true,division:{select:{sig:true}}}}},orderBy:{startsAt:'asc'}}),
    prisma.specialOperation.findMany({where:{startsAt:{lt:to},OR:[{endsAt:null},{endsAt:{gt:from}}]},select:{id:true,name:true,objective:true,location:true,status:true,startsAt:true,endsAt:true},orderBy:{startsAt:'asc'}}),
    prisma.leaveRequest.findMany({where:{status:{in:['APROVADO','ENCERRADO']},startsAt:{lt:to},endsAt:{gt:from},...(divisionId?{member:{divisionId}}:{})},include:{member:{select:{id:true,habboName:true,division:{select:{sig:true}}}}},orderBy:{startsAt:'asc'}}),
    prisma.lesson.findMany({where:{createdAt:{gte:from,lt:to},...(divisionId?{author:{divisionId}}:{})},include:{author:{select:{id:true,habboName:true,division:{select:{sig:true}}}}},orderBy:{createdAt:'asc'}}),
  ]);
  const items=[
    ...events.map(x=>({id:'event-'+x.id,source:'EVENT',type:x.type,title:x.title,description:x.description,startsAt:x.startsAt,endsAt:x.endsAt,division:x.division?.sig||null,owner:x.createdBy.habboName})),
    ...schedules.map(x=>({id:'schedule-'+x.id,source:'SCHEDULE',type:'ESCALA',title:'Escala • '+x.member.habboName,description:x.note,startsAt:x.startsAt,endsAt:x.endsAt,division:x.member.division?.sig||null,memberId:x.member.id})),
    ...operations.map(x=>({id:'operation-'+x.id,source:'OPERATION',type:'OPERACAO',title:x.name,description:x.objective+(x.location?' • '+x.location:''),startsAt:x.startsAt,endsAt:x.endsAt,status:x.status})),
    ...leaves.map(x=>({id:'leave-'+x.id,source:'LEAVE',type:'AFASTAMENTO',title:'Afastamento • '+x.member.habboName,description:x.reason,startsAt:x.startsAt,endsAt:x.endsAt,division:x.member.division?.sig||null,memberId:x.member.id})),
    ...lessons.map(x=>({id:'lesson-'+x.id,source:'LESSON',type:'AULA',title:'Aula • '+x.author.habboName,description:x.description,startsAt:x.createdAt,endsAt:null,division:x.author.division?.sig||null,memberId:x.author.id})),
  ].sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
  res.set('Cache-Control','no-store');res.json({from,to,items});
}));

router.post('/',requireRole('MODERADOR'),asyncRoute(async(req,res)=>{
  const title=String(req.body?.title||'').trim().slice(0,160),type=String(req.body?.type||'EVENTO').trim().toUpperCase().slice(0,40),description=String(req.body?.description||'').trim().slice(0,1200),scope=String(req.body?.scope||'ALL').toUpperCase();
  const startsAt=new Date(req.body?.startsAt),endsAt=req.body?.endsAt?new Date(req.body.endsAt):null,divisionId=req.body?.divisionId?Number(req.body.divisionId):null;
  if(title.length<3||!Number.isFinite(startsAt.getTime()))throw new HttpError(400,'Informe título e início do evento.');
  if(endsAt&&(!Number.isFinite(endsAt.getTime())||endsAt<=startsAt))throw new HttpError(400,'Fim inválido.');
  if(scope==='DIVISION'&&!divisionId)throw new HttpError(400,'Informe a divisão.');
  if(divisionId&&!await prisma.division.findUnique({where:{id:divisionId},select:{id:true}}))throw new HttpError(400,'Divisão inválida.');
  const event=await prisma.institutionalEvent.create({data:{title,type,description,scope,divisionId:scope==='DIVISION'?divisionId:null,startsAt,endsAt,createdById:req.member.id}});
  await audit(req.member.id,'INSTITUTIONAL_EVENT_CREATED',{eventId:event.id,title,type,scope,divisionId,startsAt,endsAt});
  res.status(201).json({event});
}));

router.delete('/:id',requireRole('ADMINISTRADOR'),asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),event=await prisma.institutionalEvent.findUnique({where:{id}});
  if(!event)throw new HttpError(404,'Evento não encontrado.');
  await prisma.institutionalEvent.delete({where:{id}});
  await audit(req.member.id,'INSTITUTIONAL_EVENT_DELETED',{eventId:id,title:event.title});
  res.status(204).end();
}));

module.exports=router;