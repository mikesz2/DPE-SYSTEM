const router=require('express').Router();
const prisma=require('../config/prisma');
const {asyncRoute,HttpError,audit}=require('../utils/http');
const {requireAuth}=require('../middleware/auth');
const {requireRole,roleAtLeast}=require('../middleware/permissions');
router.use(requireAuth);

async function isLeader(memberId,divisionId){
  return Boolean(await prisma.divisionLeader.findUnique({where:{divisionId_memberId:{divisionId,memberId}},select:{memberId:true}}));
}

router.get('/',asyncRoute(async(req,res)=>{
  const since30=new Date(Date.now()-30*86400000),onlineSince=new Date(Date.now()-5*60000);
  const divisions=await prisma.division.findMany({
    orderBy:{sig:'asc'},
    include:{
      leaders:{include:{member:{select:{id:true,habboName:true,rank:{select:{name:true}},lastSeenAt:true}}}},
      members:{select:{id:true,status:true,lastSeenAt:true}},
      _count:{select:{documents:true}},
    },
  });
  const ids=divisions.flatMap(d=>d.members.map(m=>m.id));
  const shifts=ids.length?await prisma.shift.findMany({where:{memberId:{in:ids},startedAt:{gte:since30}},select:{memberId:true,startedAt:true,endedAt:true}}):[];
  const hours=new Map();
  for(const s of shifts) hours.set(s.memberId,(hours.get(s.memberId)||0)+Math.max(0,(new Date(s.endedAt||Date.now())-new Date(s.startedAt))/3600000));
  res.set('Cache-Control','no-store');
  res.json({divisions:divisions.map(d=>({
    id:d.id,sig:d.sig,name:d.name,icon:d.icon,desc:d.desc,
    members:d.members.length,
    active:d.members.filter(m=>m.status==='ATIVO').length,
    away:d.members.filter(m=>m.status==='AFASTADO').length,
    online:d.members.filter(m=>m.lastSeenAt&&m.lastSeenAt>=onlineSince).length,
    hours30:Math.round(d.members.reduce((sum,m)=>sum+(hours.get(m.id)||0),0)*10)/10,
    documents:d._count.documents,
    leaders:d.leaders.map(l=>({id:l.member.id,nick:l.member.habboName,rank:l.member.rank?.name||'—',title:l.title,online:Boolean(l.member.lastSeenAt&&l.member.lastSeenAt>=onlineSince)})),
  }))});
}));

router.get('/:id',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)throw new HttpError(400,'Divisão inválida.');
  const since30=new Date(Date.now()-30*86400000),onlineSince=new Date(Date.now()-5*60000);
  const division=await prisma.division.findUnique({
    where:{id},
    include:{
      leaders:{include:{member:{select:{id:true,habboName:true,rank:{select:{name:true}},lastSeenAt:true}}}},
      members:{select:{id:true,habboName:true,status:true,lastSeenAt:true,lessonGuide:true,rank:{select:{name:true}},_count:{select:{medals:true}}}},
      documents:{select:{id:true,title:true,category:true,summary:true,icon:true,updatedAt:true},orderBy:{updatedAt:'desc'},take:20},
    },
  });
  if(!division)throw new HttpError(404,'Divisão não encontrada.');
  const memberIds=division.members.map(m=>m.id);
  const [shifts,goals,announcements]=await prisma.$transaction([
    prisma.shift.findMany({where:{memberId:{in:memberIds},startedAt:{gte:since30}},select:{memberId:true,startedAt:true,endedAt:true}}),
    prisma.performanceGoal.findMany({where:{memberId:{in:memberIds},active:true,endsAt:{gte:new Date()}},select:{id:true,memberId:true,metric:true,targetValue:true,endsAt:true}}),
    prisma.announcement.findMany({where:{divisionId:id},orderBy:{publishedAt:'desc'},take:10,select:{id:true,title:true,priority:true,requireAck:true,publishedAt:true}}),
  ]);
  const stats=new Map();
  for(const s of shifts){const v=stats.get(s.memberId)||{hours:0,shifts:0};v.hours+=Math.max(0,(new Date(s.endedAt||Date.now())-new Date(s.startedAt))/3600000);v.shifts++;stats.set(s.memberId,v);}
  res.set('Cache-Control','no-store');
  res.json({
    division:{id:division.id,sig:division.sig,name:division.name,icon:division.icon,desc:division.desc},
    canManage:roleAtLeast(req.member.role,'ADMINISTRADOR')||await isLeader(req.member.id,id),
    leaders:division.leaders.map(l=>({id:l.member.id,nick:l.member.habboName,rank:l.member.rank?.name||'—',title:l.title,online:Boolean(l.member.lastSeenAt&&l.member.lastSeenAt>=onlineSince)})),
    members:division.members.map(m=>({id:m.id,nick:m.habboName,status:m.status,rank:m.rank?.name||'—',online:Boolean(m.lastSeenAt&&m.lastSeenAt>=onlineSince),lessonGuide:m.lessonGuide,medals:m._count.medals,hours30:Math.round((stats.get(m.id)?.hours||0)*10)/10,shifts30:stats.get(m.id)?.shifts||0,activeGoals:goals.filter(g=>g.memberId===m.id).length})),
    documents:division.documents,
    announcements,
    summary:{members:division.members.length,online:division.members.filter(m=>m.lastSeenAt&&m.lastSeenAt>=onlineSince).length,away:division.members.filter(m=>m.status==='AFASTADO').length,hours30:Math.round([...stats.values()].reduce((a,v)=>a+v.hours,0)*10)/10,activeGoals:goals.length},
  });
}));

router.put('/:id/leaders',requireRole('ADMINISTRADOR'),asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),leaders=Array.isArray(req.body?.leaders)?req.body.leaders:[];
  if(!Number.isInteger(id)||id<1)throw new HttpError(400,'Divisão inválida.');
  if(leaders.length>10)throw new HttpError(400,'Uma divisão pode ter no máximo 10 líderes.');
  const clean=leaders.map(x=>({memberId:Number(x.memberId),title:String(x.title||'Liderança').trim().slice(0,80)})).filter(x=>Number.isInteger(x.memberId)&&x.memberId>0);
  const memberIds=[...new Set(clean.map(x=>x.memberId))];
  const valid=memberIds.length?await prisma.member.count({where:{id:{in:memberIds},divisionId:id,status:{notIn:['EXPULSO','DESLIGADO']}}}):0;
  if(valid!==memberIds.length)throw new HttpError(400,'Toda liderança precisa pertencer à própria divisão.');
  await prisma.$transaction(async tx=>{await tx.divisionLeader.deleteMany({where:{divisionId:id}});if(clean.length)await tx.divisionLeader.createMany({data:clean.map(x=>({divisionId:id,...x}))});});
  await audit(req.member.id,'DIVISION_LEADERS_UPDATED',{divisionId:id,leaders:clean});
  res.json({ok:true});
}));

router.post('/:id/documents/:documentId',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),documentId=Number(req.params.documentId);
  if(!Number.isInteger(id)||id<1||!Number.isInteger(documentId)||documentId<1)throw new HttpError(400,'Documento ou divisão inválidos.');
  const allowed=roleAtLeast(req.member.role,'ADMINISTRADOR')||await isLeader(req.member.id,id);
  if(!allowed)throw new HttpError(403,'Sem permissão para vincular documentos nesta divisão.');
  const [division,document]=await Promise.all([
    prisma.division.findUnique({where:{id},select:{id:true,sig:true}}),
    prisma.document.findUnique({where:{id:documentId},select:{id:true,title:true,divisionId:true}}),
  ]);
  if(!division||!document)throw new HttpError(404,'Divisão ou documento não encontrado.');
  const updated=await prisma.document.update({where:{id:documentId},data:{divisionId:id}});
  await audit(req.member.id,'DIVISION_DOCUMENT_LINKED',{divisionId:id,documentId,target:document.title});
  res.json({document:updated});
}));

router.delete('/:id/documents/:documentId',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),documentId=Number(req.params.documentId);
  const allowed=roleAtLeast(req.member.role,'ADMINISTRADOR')||await isLeader(req.member.id,id);
  if(!allowed)throw new HttpError(403,'Sem permissão para desvincular documentos nesta divisão.');
  const document=await prisma.document.findFirst({where:{id:documentId,divisionId:id}});
  if(!document)throw new HttpError(404,'Documento não vinculado a esta divisão.');
  await prisma.document.update({where:{id:documentId},data:{divisionId:null}});
  await audit(req.member.id,'DIVISION_DOCUMENT_UNLINKED',{divisionId:id,documentId,target:document.title});
  res.status(204).end();
}));

module.exports=router;