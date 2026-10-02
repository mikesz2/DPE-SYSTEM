const router=require('express').Router();
const prisma=require('../config/prisma');
const {asyncRoute,HttpError,audit}=require('../utils/http');
const {requireAuth}=require('../middleware/auth');
const {requireRole,roleAtLeast}=require('../middleware/permissions');
router.use(requireAuth);

const TYPES=new Set(['VERBAL','ESCRITA','SUSPENSAO','PONTOS','OUTRA']);

router.get('/',asyncRoute(async(req,res)=>{
  const admin=roleAtLeast(req.member.role,'MODERADOR');
  const actions=await prisma.disciplinaryAction.findMany({
    where:admin?{}:{memberId:req.member.id},
    include:{member:{select:{id:true,habboName:true,rank:{select:{name:true}}}},createdBy:{select:{habboName:true}}},
    orderBy:{createdAt:'desc'},take:300,
  });
  const totals=new Map();
  for(const a of actions){if(a.active)totals.set(a.memberId,(totals.get(a.memberId)||0)+Number(a.points||0));}
  res.set('Cache-Control','no-store');
  res.json({actions:actions.map(a=>({id:a.id,type:a.type,points:a.points,reason:a.reason,evidence:a.evidence,startsAt:a.startsAt,endsAt:a.endsAt,active:a.active,createdAt:a.createdAt,member:{id:a.member.id,nick:a.member.habboName,rank:a.member.rank?.name||'—'},createdBy:a.createdBy.habboName,totalActivePoints:totals.get(a.memberId)||0}))});
}));

router.post('/',requireRole('MODERADOR'),asyncRoute(async(req,res)=>{
  const memberId=Number(req.body?.memberId),type=String(req.body?.type||'').toUpperCase(),reason=String(req.body?.reason||'').trim().slice(0,1500),evidence=String(req.body?.evidence||'').trim().slice(0,2000);
  const points=Number(req.body?.points||0),startsAt=req.body?.startsAt?new Date(req.body.startsAt):new Date(),endsAt=req.body?.endsAt?new Date(req.body.endsAt):null;
  if(!Number.isInteger(memberId)||memberId<1)throw new HttpError(400,'Militar inválido.');
  if(!TYPES.has(type))throw new HttpError(400,'Tipo de medida disciplinar inválido.');
  if(reason.length<5)throw new HttpError(400,'Informe o motivo da medida.');
  if(!Number.isInteger(points)||points<0||points>100)throw new HttpError(400,'Pontuação disciplinar inválida.');
  if(!Number.isFinite(startsAt.getTime())||(endsAt&&!Number.isFinite(endsAt.getTime())))throw new HttpError(400,'Período inválido.');
  if(endsAt&&endsAt<=startsAt)throw new HttpError(400,'O término deve ser posterior ao início.');
  const member=await prisma.member.findUnique({where:{id:memberId},select:{id:true,habboName:true,status:true}});
  if(!member||['EXPULSO','DESLIGADO'].includes(member.status))throw new HttpError(400,'Militar indisponível.');
  const action=await prisma.$transaction(async tx=>{
    const row=await tx.disciplinaryAction.create({data:{memberId,createdById:req.member.id,type,points,reason,evidence,startsAt,endsAt}});
    await tx.profilePost.create({data:{type:'PUNICAO',title:'Medida disciplinar: '+type,description:reason+(points?' • '+points+' ponto(s).':''),authorId:req.member.id,subjectId:memberId,lessonDate:startsAt.toISOString().slice(0,10)}});
    await tx.notification.create({data:{memberId,icon:'⚖️',title:'Medida disciplinar registrada',text:'Foi registrada uma medida do tipo '+type+' em seu histórico.'}});
    return row;
  });
  await audit(req.member.id,'DISCIPLINARY_ACTION_CREATED',{disciplinaryActionId:action.id,targetId:memberId,targetNick:member.habboName,type,points,reason,endsAt});
  res.status(201).json({action});
}));

router.post('/:id/close',requireRole('ADMINISTRADOR'),asyncRoute(async(req,res)=>{
  const id=Number(req.params.id),row=await prisma.disciplinaryAction.findUnique({where:{id},include:{member:true}});
  if(!row)throw new HttpError(404,'Medida disciplinar não encontrada.');
  if(!row.active)throw new HttpError(409,'Medida já encerrada.');
  await prisma.disciplinaryAction.update({where:{id},data:{active:false,endsAt:row.endsAt||new Date()}});
  await audit(req.member.id,'DISCIPLINARY_ACTION_CLOSED',{disciplinaryActionId:id,targetId:row.memberId,targetNick:row.member.habboName,type:row.type});
  res.json({ok:true});
}));

module.exports=router;