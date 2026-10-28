const COURSE_LABELS = {
  'INFORMÁTICA': 'Informática',
  'INOVAÇÃO TECNOLOGICA (ROBOTICA)': 'Inovação Tecnológica (Robótica)',
  'VENDAS ONLINE': 'Vendas Online',
  'CONHECENDO O CELULAR': 'Conhecendo o Celular',
  'PACOTE OFFICE': 'Pacote Office',
};
const COURSE_ORDER = ['INFORMÁTICA','INOVAÇÃO TECNOLOGICA (ROBOTICA)','VENDAS ONLINE','CONHECENDO O CELULAR','PACOTE OFFICE'];
const FAIXA_ORDER = ['Até 18','19 a 30','31 a 45','46 a 60','61+','Não informado'];
const RACA_ORDER = ['Preta','Parda','Branca','Amarela','Indígena','Negra','Não informado'];
const RACA_SLOT = {
  'Preta':'--slot1','Parda':'--slot2','Branca':'--slot3','Amarela':'--slot4',
  'Indígena':'--slot5','Negra':'--slot6','Não informado':'__muted',
};

function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function isDarkMode(){
  const t = document.documentElement.getAttribute('data-theme');
  if(t === 'dark') return true;
  if(t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function palette(){
  return {
    surface: cssVar('--bg-surface'),
    text: cssVar('--text-primary'),
    textSecondary: cssVar('--text-secondary'),
    muted: cssVar('--text-muted'),
    grid: cssVar('--grid'),
    baseline: cssVar('--baseline'),
    slot1: cssVar('--slot1'), slot2: cssVar('--slot2'), slot3: cssVar('--slot3'),
    slot4: cssVar('--slot4'), slot5: cssVar('--slot5'), slot6: cssVar('--slot6'),
    slot7: cssVar('--slot7'), slot8: cssVar('--slot8'),
  };
}
function stripAccents(s){ return s.normalize('NFD').replace(/\p{Diacritic}/gu,''); }
function norm(s){ return stripAccents((s||'').toString()).toLowerCase(); }
let RAW = { people: [], enrollments: [] };
let selectedFontes = new Set();
let searchText = '';
const charts = {};

async function boot(){
  const res = await fetch('data.json');
  RAW = await res.json();
  selectedFontes = new Set(RAW.people.map(p => p.fonte));
  buildChips();
  document.getElementById('searchInput').addEventListener('input', e => {
    searchText = norm(e.target.value);
    renderTable(getFiltered().people);
  });
  render();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyThemeToCharts);
  new MutationObserver(applyThemeToCharts).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
}

function buildChips(){
  const order = [...new Set(RAW.people.map(p => p.fonte))];
  const counts = {};
  order.forEach(f => counts[f] = RAW.people.filter(p => p.fonte === f).length);
  const box = document.getElementById('fonteChips');
  box.innerHTML = '';
  order.forEach(f => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.setAttribute('aria-pressed', 'true');
    chip.innerHTML = f + ' <span class="n">' + counts[f] + '</span>';
    chip.addEventListener('click', () => {
      if(selectedFontes.has(f)){
        if(selectedFontes.size > 1) selectedFontes.delete(f);
      } else {
        selectedFontes.add(f);
      }
      chip.setAttribute('aria-pressed', String(selectedFontes.has(f)));
      render();
    });
    box.appendChild(chip);
  });
}

function getFiltered(){
  const people = RAW.people.filter(p => selectedFontes.has(p.fonte));
  const ids = new Set(people.map(p => p.id));
  const enrollments = RAW.enrollments.filter(e => ids.has(e.personId));
  return { people, enrollments };
}

function render(){
  const { people, enrollments } = getFiltered();
  renderKpis(people, enrollments);
  renderCharts(people, enrollments);
  renderTable(people);
}

function renderKpis(people, enrollments){
  const bairros = new Set(people.map(p => p.bairro));
  const ages = people.map(p => p.idade).filter(a => a !== null && a !== undefined);
  const avgAge = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0) / ages.length) : 0;
  const comNecessidade = people.filter(p => p.necessidadeEspecifica === 'Sim').length;
  const pctNecessidade = people.length ? Math.round(comNecessidade / people.length * 100) : 0;

  const items = [
    { label:'Inscritos', value: people.length, sub: 'pessoas únicas no filtro atual' },
    { label:'Inscrições em cursos', value: enrollments.length, sub: 'somando todos os cursos' },
    { label:'Bairros atendidos', value: bairros.size, sub: 'bairros distintos' },
    { label:'Idade média', value: avgAge || '—', sub: 'anos, entre os informados' },
    { label:'Necessidade específica', value: pctNecessidade + '%', sub: comNecessidade + ' pessoa(s) sinalizaram' },
  ];
  const box = document.getElementById('kpis');
  box.innerHTML = '';
  items.forEach(it => {
    const el = document.createElement('div');
    el.className = 'kpi';
    el.innerHTML = '<p class="label">'+it.label+'</p><p class="value">'+it.value+'</p><p class="sub">'+it.sub+'</p>';
    box.appendChild(el);
  });
}

function countBy(arr, fn){
  const m = new Map();
  arr.forEach(x => { const k = fn(x); m.set(k, (m.get(k)||0)+1); });
  return m;
}

function renderCharts(people, enrollments){
  const pal = palette();
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = pal.textSecondary;

  // Bairros - top 10
  const bairroCounts = [...countBy(people, p => p.bairro).entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  upsertBar('chartBairros', {
    labels: bairroCounts.map(x=>x[0]),
    data: bairroCounts.map(x=>x[1]),
    color: pal.slot1,
    horizontal: true,
  });

  // Raça / Etnia - donut, fixed identity colors
  const racaCounts = countBy(people, p => p.racaEtnia);
  const racaLabels = RACA_ORDER.filter(r => racaCounts.has(r));
  const racaColors = racaLabels.map(r => RACA_SLOT[r] === '__muted' ? pal.muted : pal[RACA_SLOT[r].replace('--','')]);
  upsertDonut('chartRaca', {
    labels: racaLabels,
    data: racaLabels.map(r => racaCounts.get(r)),
    colors: racaColors,
  });

  // Faixa etária
  const faixaCounts = countBy(people, p => p.faixaEtaria);
  upsertBar('chartFaixa', {
    labels: FAIXA_ORDER.filter(f => faixaCounts.has(f)),
    data: FAIXA_ORDER.filter(f => faixaCounts.has(f)).map(f => faixaCounts.get(f)),
    color: pal.slot1,
    horizontal: false,
  });

  // Como ficou sabendo - top channels
  const comoCounts = [...countBy(people, p => p.comoFicouSabendo).entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  upsertBar('chartComo', {
    labels: comoCounts.map(x=>x[0]),
    data: comoCounts.map(x=>x[1]),
    color: pal.slot2,
    horizontal: true,
  });

  // Cursos
  const cursoCounts = countBy(enrollments, e => e.curso);
  upsertBar('chartCursos', {
    labels: COURSE_ORDER.filter(c => cursoCounts.has(c)).map(c => COURSE_LABELS[c]),
    data: COURSE_ORDER.filter(c => cursoCounts.has(c)).map(c => cursoCounts.get(c)),
    color: pal.slot3,
    horizontal: true,
  });
}

function baseScales(pal, horizontal){
  const valueAxis = { beginAtZero:true, grid:{ color: pal.grid, drawBorder:false }, ticks:{ color: pal.muted, precision:0 } };
  const catAxis = { grid:{ display:false }, border:{ color: pal.baseline }, ticks:{ color: pal.textSecondary } };
  return horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis };
}

function upsertBar(id, { labels, data, color, horizontal }){
  const pal = palette();
  const canvas = document.getElementById(id);
  if(charts[id]){ charts[id].destroy(); }
  charts[id] = new Chart(canvas, {
    type:'bar',
    data:{ labels, datasets:[{ data, backgroundColor: color, borderRadius:4, maxBarThickness: 22 }] },
    options:{
      indexAxis: horizontal ? 'y' : 'x',
      maintainAspectRatio:false,
      responsive:true,
      plugins:{ legend:{ display:false }, tooltip:{ backgroundColor: pal.surface, titleColor: pal.text, bodyColor: pal.text, borderColor: pal.baseline, borderWidth:1 } },
      scales: baseScales(pal, horizontal),
    }
  });
}

function upsertDonut(id, { labels, data, colors }){
  const pal = palette();
  const canvas = document.getElementById(id);
  if(charts[id]){ charts[id].destroy(); }
  charts[id] = new Chart(canvas, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor: colors, borderColor: pal.surface, borderWidth:2 }] },
    options:{
      maintainAspectRatio:false,
      responsive:true,
      cutout:'60%',
      plugins:{
        legend:{ position:'bottom', labels:{ color: pal.textSecondary, boxWidth:10, boxHeight:10, padding:10, font:{ size:11 } } },
        tooltip:{ backgroundColor: pal.surface, titleColor: pal.text, bodyColor: pal.text, borderColor: pal.baseline, borderWidth:1 },
      },
    }
  });
}

function applyThemeToCharts(){
  const { people, enrollments } = getFiltered();
  renderCharts(people, enrollments);
}

function renderTable(people){
  const sorted = [...people].sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));
  const filtered = searchText
    ? sorted.filter(p => norm(p.nome).includes(searchText) || norm(p.bairro).includes(searchText) || norm(p.racaEtnia).includes(searchText) || norm(p.comoFicouSabendo).includes(searchText))
    : sorted;
  document.getElementById('tableCaption').textContent =
    filtered.length + ' de ' + people.length + ' inscritos · mais recentes primeiro';
  const body = document.getElementById('tableBody');
  body.innerHTML = '';
  if(filtered.length === 0){
    body.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum inscrito encontrado para essa busca.</td></tr>';
    return;
  }
  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>'+escapeHtml(p.nomeSocial || p.nome)+'</td>'+
      '<td>'+(p.idade ?? '—')+'</td>'+
      '<td>'+escapeHtml(p.bairro)+'</td>'+
      '<td>'+escapeHtml(p.racaEtnia)+'</td>'+
      '<td><span class="badge count">'+p.qtdCursos+'</span></td>'+
      '<td class="muted">'+escapeHtml(p.comoFicouSabendo)+'</td>'+
      '<td><span class="badge">'+escapeHtml(p.fonte)+'</span></td>';
    body.appendChild(tr);
  });
}

function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

boot();
