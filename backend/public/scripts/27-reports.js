let reportPeriod='week';
let reportDivisionId=null;

function pageReports(){
  if(!can('ADMINISTRADOR') && !reportDivisionId) return emptyState('🔒','Acesse um relatório pela sua divisão ou use uma conta administrativa.');
  return `<div class="dpe-module-page reports-page">
    <section class="module-hero module-hero-compact module-hero-reports">
      <div class="module-hero-copy"><span class="module-kicker">GESTÃO / RELATÓRIOS</span><h1>Relatórios <strong>automáticos</strong></h1><p>Resumo operacional semanal ou mensal com dados reais de efetivo, horas, aulas, escalas, presença, afastamentos e ocorrências.</p></div>
      <div class="module-hero-emblem"><span>📊</span><b>RELATÓRIOS</b><small>WEEKLY / MONTHLY</small></div>
      <div class="module-hero-code">DPE // AUTOMATED REPORTING</div>
    </section>

    <section class="card report-controls">
      <header><div><span>PERÍODO E ESCOPO</span><h2>Gerar relatório</h2></div><div class="report-control-actions"><button class="btn ghost small active" data-report-period="week">Semana</button><button class="btn ghost small" data-report-period="month">Mês</button><button class="btn small" id="reportExport">Exportar CSV</button></div></header>
      <div class="report-filter-row">
        ${can('ADMINISTRADOR')?`<label>Divisão<select class="input" id="reportDivision"><option value="">Toda a corporação</option>${state.divisions.map(d=>`<option value="${d.id}" ${Number(reportDivisionId)===Number(d.id)?'selected':''}>${escapeHtml(d.sig)} — ${escapeHtml(d.name)}</option>`).join('')}</select></label>`:''}
        <div class="report-period-label" id="reportPeriodLabel">Carregando período...</div>
        <button class="btn ghost small" id="reportRefresh">Atualizar</button>
      </div>
    </section>

    <section class="report-kpis" id="reportKpis"><article><span>Carregando...</span></article></section>

    <section class="card report-table-card">
      <header><div><span>DETALHAMENTO</span><h2>Desempenho por militar</h2></div></header>
      <div class="report-table-wrap"><table class="report-table"><thead><tr><th>Militar</th><th>Divisão</th><th>Horas</th><th>Turnos</th><th>Aulas</th><th>Promoções</th><th>Ocorrências</th><th>Afast.</th><th>Escalas</th><th>Pres.</th><th>Faltas</th><th>Just.</th><th>%</th></tr></thead><tbody id="reportRows"><tr><td colspan="13">Carregando...</td></tr></tbody></table></div>
    </section>

    <section class="card report-divisions-card">
      <header><div><span>VISÃO POR DIVISÃO</span><h2>Comparativo interno</h2></div></header>
      <div id="reportDivisions" class="report-division-grid"></div>
    </section>
  </div>`;
}
function reportParams(){
  const p=new URLSearchParams({period:reportPeriod});
  const select=$('#reportDivision');
  const division=select?.value||reportDivisionId;
  if(division)p.set('divisionId',division);
  return p;
}
function reportKpi(label,value,sub=''){return `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(sub)}</span></article>`;}
async function loadReports(){
  const rows=$('#reportRows');if(!rows)return;
  try{
    const data=await apiFetch('/reports?'+reportParams());
    const s=data.summary||{};
    $('#reportPeriodLabel').textContent=new Date(data.from).toLocaleDateString('pt-BR')+' → '+new Date(new Date(data.to).getTime()-1).toLocaleDateString('pt-BR');
    $('#reportKpis').innerHTML=[
      reportKpi('EFETIVO',s.members,'militares'),
      reportKpi('HORAS',s.hours+'h','no período'),
      reportKpi('TURNOS',s.shifts,'registrados'),
      reportKpi('AULAS',s.lessons,'ministradas'),
      reportKpi('PROMOÇÕES',s.promotions,'registradas'),
      reportKpi('OCORRÊNCIAS',s.occurrences,'envolvimentos'),
      reportKpi('AFASTAMENTOS',s.approvedLeaves,'aprovados'),
      reportKpi('PRESENÇA',s.attendanceRate+'%',s.present+' pres. / '+s.absent+' faltas')
    ].join('');
    rows.innerHTML=data.members.length?data.members.map(r=>`<tr><td><button class="text-link" data-report-member="${r.memberId}">${escapeHtml(r.nick)}</button><small>${escapeHtml(r.rank)}</small></td><td>${escapeHtml(r.division)}</td><td>${r.hours}h</td><td>${r.shifts}</td><td>${r.lessons}</td><td>${r.promotions}</td><td>${r.occurrences}</td><td>${r.approvedLeaves}</td><td>${r.schedules}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.justified}</td><td><b>${r.attendanceRate}%</b></td></tr>`).join(''):'<tr><td colspan="13">Nenhum dado no período.</td></tr>';
    $$('[data-report-member]',rows).forEach(b=>b.onclick=()=>{const m=state.members.find(x=>x.id==b.dataset.reportMember);if(m)viewMemberProfile(m);});
    $('#reportDivisions').innerHTML=data.divisions.length?data.divisions.map(d=>`<article><small>${escapeHtml(d.division)}</small><strong>${d.hours}h</strong><span>${d.members} militares • ${d.shifts} turnos • ${d.lessons} aulas</span></article>`).join(''):'<p class="muted">Sem dados por divisão.</p>';
  }catch(e){
    rows.innerHTML='<tr><td colspan="13">'+escapeHtml(e.message)+'</td></tr>';
    $('#reportKpis').innerHTML='<article><span>'+escapeHtml(e.message)+'</span></article>';
  }
}
async function exportReportCsv(){
  try{
    const token=store.get('token')||sessionStorage.getItem('dcc_token');
    const response=await fetch('/api/reports/export.csv?'+reportParams(),{headers:{Authorization:'Bearer '+token}});
    if(!response.ok){let message='Falha ao exportar.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
    const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='dpe-relatorio-'+reportPeriod+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Relatório exportado.');
  }catch(e){toast(e.message);}
}
function bindReportsPage(){
  if(state.route!=='reports'||!$('#reportRows'))return;
  $$('[data-report-period]').forEach(btn=>btn.onclick=()=>{reportPeriod=btn.dataset.reportPeriod;$$('[data-report-period]').forEach(x=>x.classList.toggle('active',x===btn));loadReports();});
  const division=$('#reportDivision');if(division)division.onchange=()=>{reportDivisionId=division.value?Number(division.value):null;loadReports();};
  $('#reportRefresh').onclick=loadReports;$('#reportExport').onclick=exportReportCsv;loadReports();
}