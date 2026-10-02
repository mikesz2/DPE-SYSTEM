const router=require('express').Router();
const prisma=require('../config/prisma');
const {asyncRoute,HttpError,audit}=require('../utils/http');
const {requireAuth}=require('../middleware/auth');
const {roleAtLeast}=require('../middleware/permissions');
const {notifyMentions}=require('../services/mentions');
router.use(requireAuth);

async function isDivisionLeader(memberId,divisionId){
  return Boolean(await prisma.divisionLeader.findUnique({where:{divisionId_memberId:{divisionId,memberId}},select:{memberId:true}}));
}
async function canManageAnnouncement(member,scope,divisionId){
  if(roleAtLeast(member.role,'ADMINISTRADOR'))return true;
  return scope==='DIVISION'&&divisionId&&await isDivisionLeader(member.id,divisionId);
}

router.get('/',asyncRoute(async(req,res)=>{
  const now=new Date();
  const receipts=await prisma.announcementReceipt.findMany({
    where:{memberId:req.member.id,announcement:{OR:[{expiresAt:null},{expiresAt:{gte:now}}]}},
    include:{announcement:{include:{createdBy:{select:{habboName:true}},division:{select:{sig:true,name:true}}}}},
    orderBy:{announcement:{publishedAt:'desc'}},
    take:100,
  });
  res.set('Cache-Control','no-store');
  res.json({announcements:receipts.map(r=>({
    id:r.announcement.id,title:r.announcement.title,body:r.announcement.body,priority:r.announcement.priority,
    requireAck:r.announcement.requireAck,scope:r.announcement.scope,division:r.announcement.division,
    createdBy:r.announcement.createdBy.habboName,publishedAt:r.announcement.publishedAt,expiresAt:r.announcement.expiresAt,
    readAt:r.readAt,confirmedAt:r.confirmedAt,
  }))});
}));

router.post('/',asyncRoute(async(req,res)=>{
  const title=String(req.body?.title||'').trim().slice(0,160),body=String(req.body?.body||'').trim().slice(0,5000);
  const priority=String(req.body?.priority||'NORMAL').toUpperCase(),scope=String(req.body?.scope||'ALL').toUpperCase();
  const requireAck=Boolean(req.body?.requireAck),divisionId=req.body?.divisionId?Number(req.body.divisionId):null;
  if(title.length<3||body.length<5)throw new HttpError(400,'Informe título e conteúdo do comunicado.');
  if(!['NORMAL','IMPORTANTE','URGENTE'].includes(priority))throw new HttpError(400,'Prioridade inválida.');
  if(!['ALL','DIVISION'].includes(scope))throw new HttpError(400,'Escopo inválido.');
  if(scope==='DIVISION'&&(!Number.isInteger(divisionId)||divisionId<1))throw new HttpError(400,'Informe a divisão.');
  if(!await canManageAnnouncement(req.member,scope,divisionId))throw new HttpError(403,'Sem permissão para publicar neste escopo.');
  let expiresAt=null;
  if(req.body?.expiresAt){expiresAt=new Date(req.body.expiresAt);if(!Number.isFinite(expiresAt.getTime()))throw new HttpError(400,'Validade inválida.');}
  const recipients=await prisma.member.findMany({
    where:{status:{notIn:['EXPULSO','DESLIGADO']},registrationPending:false,...(scope==='DIVISION'?{divisionId}:{})},
    select:{id:true},
  });
  if(!recipients.length)throw new HttpError(400,'Nenhum destinatário elegível.');
  const announcement=await prisma.$transaction(async tx=>{
    const row=await tx.announcement.create({data:{title,body,priority,requireAck,scope,divisionId:scope==='DIVISION'?divisionId:null,createdById:req.member.id,expiresAt}});
    await tx.announcementReceipt.createMany({data:recipients.map(m=>({announcementId:row.id,memberId:m.id}))});
    await tx.notification.createMany({data:recipients.filter(m=>m.id!==req.member.id).map(m=>({memberId:m.id,icon:priority==='URGENTE'?'🚨':'📢',title:priority==='URGENTE'?'Comunicado urgente':'Novo comunicado',text:title}))});
    await notifyMentions(body, req.member, 'em um comunicado oficial', {tx});
    return row;
  });
  await audit(req.member.id,'ANNOUNCEMENT_PUBLISHED',{announcementId:announcement.id,title,scope,divisionId,requireAck,recipients:recipients.length});
  res.status(201).json({announcement});
}));

router.post('/:id/read',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id);
  const receipt=await prisma.announcementReceipt.findUnique({where:{announcementId_memberId:{announcementId:id,memberId:req.member.id}}});
  if(!receipt)throw new HttpError(404,'Comunicado não encontrado.');
  if(!receipt.readAt)await prisma.announcementReceipt.update({where:{announcementId_memberId:{announcementId:id,memberId:req.member.id}},data:{readAt:new Date()}});
  res.json({ok:true});
}));

router.post('/:id/confirm',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),receipt=await prisma.announcementReceipt.findUnique({where:{announcementId_memberId:{announcementId:id,memberId:req.member.id}},include:{announcement:true}});
  if(!receipt)throw new HttpError(404,'Comunicado não encontrado.');
  if(!receipt.announcement.requireAck)throw new HttpError(409,'Este comunicado não exige confirmação.');
  const now=new Date();
  await prisma.announcementReceipt.update({where:{announcementId_memberId:{announcementId:id,memberId:req.member.id}},data:{readAt:receipt.readAt||now,confirmedAt:receipt.confirmedAt||now}});
  await audit(req.member.id,'ANNOUNCEMENT_ACKNOWLEDGED',{announcementId:id});
  res.json({ok:true});
}));

router.get('/:id/receipts',asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),announcement=await prisma.announcement.findUnique({where:{id},select:{id:true,scope:true,divisionId:true,createdById:true,title:true,requireAck:true}});
  if(!announcement)throw new HttpError(404,'Comunicado não encontrado.');
  const allowed=roleAtLeast(req.member.role,'ADMINISTRADOR')||announcement.createdById===req.member.id||(announcement.divisionId&&await isDivisionLeader(req.member.id,announcement.divisionId));
  if(!allowed)throw new HttpError(403,'Sem permissão para consultar ciência.');
  const receipts=await prisma.announcementReceipt.findMany({where:{announcementId:id},include:{member:{select:{id:true,habboName:true,rank:{select:{name:true}},division:{select:{sig:true}}}}},orderBy:{member:{habboName:'asc'}}});
  res.set('Cache-Control','no-store');
  res.json({announcement,summary:{total:receipts.length,read:receipts.filter(r=>r.readAt).length,confirmed:receipts.filter(r=>r.confirmedAt).length,pending:receipts.filter(r=>announcement.requireAck?!r.confirmedAt:!r.readAt).length},receipts:receipts.map(r=>({member:{id:r.member.id,nick:r.member.habboName,rank:r.member.rank?.name||'—',division:r.member.division?.sig||'DPE'},readAt:r.readAt,confirmedAt:r.confirmedAt}))});
}));

module.exports=router;