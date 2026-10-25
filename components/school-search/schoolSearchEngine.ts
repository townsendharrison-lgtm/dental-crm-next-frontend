/* eslint-disable */
// @ts-nocheck
/**
 * School Search engine.
 *
 * Framework-agnostic UI for the dental school research feature (Browse, All Schools,
 * Map, Compare, My Schools). It renders into a shadow root supplied by
 * `SchoolSearchView` and keeps per-user state (saved schools, compare list, profile,
 * tracker progress) in localStorage.
 */
export interface SchoolSearchData { schools: any[]; columns: any; geo: any; }
export interface SchoolSearchOptions { scrollToTop: () => void; }

export function mountSchoolSearch(ROOT: ShadowRoot, DATA: SchoolSearchData, OPTS: SchoolSearchOptions): () => void {
  const LISTENERS: [EventTarget, string, any, any][] = [];
  const TIMERS: Record<string, any> = {};
  const onDoc = (type, fn, o) => { document.addEventListener(type, fn, o); LISTENERS.push([document, type, fn, o]); };
  const onWin = (type, fn, o) => { window.addEventListener(type, fn, o); LISTENERS.push([window, type, fn, o]); };
const S = DATA.schools;
const $ = (s, r=ROOT) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---- regions & states ---- */
const REG = {
  West:['Arizona','California','Colorado','Nevada','Oregon','Utah','Washington','Idaho','Montana','New Mexico','Hawaii','Alaska','Wyoming'],
  Midwest:['Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri','Nebraska','Ohio','Wisconsin','North Dakota','South Dakota'],
  South:['Alabama','Arkansas','Florida','Georgia','Kentucky','Louisiana','Mississippi','North Carolina','Oklahoma','South Carolina','Tennessee','Texas','Virginia','West Virginia','Maryland','District of Columbia','Delaware'],
  Northeast:['Connecticut','Maine','Massachusetts','New Jersey','New York','Pennsylvania','Rhode Island','Vermont','New Hampshire'],
};
const RCOL = {West:'var(--r-west)',Midwest:'var(--r-midwest)',South:'var(--r-south)',Northeast:'var(--r-northeast)',Canada:'var(--r-canada)','Puerto Rico':'var(--r-pr)'};
const RHEX = {West:'#ff7a45',Midwest:'#2fd3c5',South:'#bf5af2',Northeast:'#3d8bff',Canada:'#ff375f','Puerto Rico':'#ffb340'};
const RHUE = {West:[18,340,30],Midwest:[174,200,150],South:[282,320,250],Northeast:[214,235,190],Canada:[350,10,330],'Puerto Rico':[38,18,55]};
const ABBR = {Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE','District of Columbia':'DC',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY','Puerto Rico':'PR',
  'British Columbia':'BC',Alberta:'AB',Saskatchewan:'SK',Manitoba:'MB',Ontario:'ON',Quebec:'QC','New Brunswick':'NB','Nova Scotia':'NS','Prince Edward Island':'PE','Newfoundland and Labrador':'NL'};
const NAME_OF = Object.fromEntries(Object.entries(ABBR).map(([n,a])=>[a,n]));
const CA_PROV = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL'];
function region(loc){
  if(/Canada/.test(loc)) return 'Canada';
  if(loc==='Puerto Rico') return 'Puerto Rico';
  for(const k in REG) if(REG[k].includes(loc)) return k;
  return 'Other';
}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function shortName(n){
  const m={'Dalhousie University Faculty of Dentistry':'Dal','McGill University Faculty of Dental Medicine and Oral Health Sciences':'McGill',
    'The University of British Columbia Faculty of Dentistry':'UBC','Université de Montréal Faculté de Médecine Dentaire':'UdeM',
    'Université Laval Faculté de Médecine Dentaire':'Laval','University of Alberta School of Dentistry':'UAlberta',
    'University of Manitoba Dr. Gerald Niznick College of Dentistry':'UManitoba','University of Saskatchewan College of Dentistry':'USask',
    'University of Toronto Faculty of Dentistry':'UofT','Western University Schulich School of Medicine & Dentistry':'Schulich'};
  return m[n] || n.split(/\s+/).filter(w=>/^[A-Z]/.test(w)).map(w=>w[0]).join('').slice(0,5);
}
const pnum = v => { if(v==null||v==='') return null; const n=parseFloat(String(v).replace(/[$,%\s]/g,'')); return isNaN(n)?null:n; };
const DATCONV=[["Old Score", "AA", "SNS", "BIO", "GCH", "OCH", "PAT", "QRT", "RCT"], ["1", "200", "200", "200", "200", "200", "200", "200", "200"], ["2", "200", "200", "200", "200", "200", "200", "200", "200"], ["3", "210", "210", "200", "200", "200", "200", "200", "200"], ["4", "220", "210", "200", "200", "200", "200", "200", "200"], ["5", "220", "210", "200", "200", "200", "200", "200", "210"], ["6", "230", "220", "200", "200", "200", "200", "200", "210"], ["7", "240", "220", "200", "200", "200", "200", "200", "210"], ["8", "240", "230", "200", "200", "200", "200", "200", "220"], ["9", "250", "230", "200", "200", "200", "200", "200", "220"], ["10", "250", "240", "210", "200", "220", "200", "210", "220"], ["11", "260", "240", "210", "240", "260", "210", "240", "220"], ["12", "270", "270", "260", "280", "300", "210", "270", "230"], ["13", "290", "300", "290", "310", "320", "250", "300", "260"], ["14", "310", "320", "320", "330", "330", "280", "320", "280"], ["15", "330", "340", "340", "350", "350", "310", "340", "300"], ["16", "350", "360", "360", "360", "370", "340", "360", "320"], ["17", "370", "380", "370", "380", "380", "360", "380", "340"], ["18", "390", "400", "390", "400", "400", "390", "400", "360"], ["19", "410", "410", "410", "410", "410", "410", "420", "370"], ["20", "420", "430", "420", "430", "430", "430", "430", "390"], ["21", "440", "450", "440", "440", "450", "450", "450", "410"], ["22", "460", "460", "460", "460", "470", "470", "460", "430"], ["23", "470", "480", "470", "470", "480", "500", "480", "450"], ["24", "490", "500", "490", "490", "490", "520", "500", "470"], ["25", "510", "520", "500", "510", "510", "550", "510", "490"], ["26", "520", "530", "520", "530", "530", "580", "520", "510"], ["27", "540", "550", "550", "550", "550", "580", "540", "550"], ["28", "560", "560", "580", "570", "560", "590", "580", "550"], ["29", "580", "580", "590", "580", "570", "600", "590", "560"], ["30", "600", "600", "600", "600", "590", "600", "600", "580"]];
function oldToNew(v,col=1){ const n=parseFloat(v); if(isNaN(n)||n<1||n>30) return null; const lo=Math.floor(n), hi=Math.ceil(n), a=+DATCONV[lo][col], b=+DATCONV[hi][col]; return Math.round((a+(b-a)*(n-lo))/10)*10; }
const COURSES=['Biology','General/Inorganic Chemistry','Organic Chemistry','Physics','Biochemistry','Anatomy','Physiology','Microbiology','Cell Biology','Histology','Immunology','Molecular Biology/Genetics','Zoology','Composition/English','Calculus','Humanities','Economics'];

/* ---- school colors (primary, secondary) ---- */
const COLORS = {
'A.T. Still University of Arizona':['#00386b','#b49759'],'A.T. Still University of Missouri':['#00386b','#b49759'],
'Dental College of Georgia at Augusta University':['#1c4e9d','#8a9399'],'Boston University':['#cc0000','#5b5b5b'],
'California Northstate University':['#003366','#c69214'],'Case Western Reserve University':['#0a304e','#7a8b9b'],
'Columbia University':['#1d4f91','#b9d9eb'],'Creighton University':['#005ca9','#00235d'],'East Carolina University':['#592a8a','#fdc82f'],
'Harvard University':['#a51c30','#5e5e5e'],'Herman Ostrow School of Dentistry, USC':['#990000','#ffcc00'],'Howard University':['#003a63','#e51937'],
'Indiana University':['#990000','#d6c9b5'],'Kansas City University':['#00205b','#5b9bd5'],'Louisiana State University (New Orleans)':['#461d7c','#fdd023'],
'Lake Erie College of Osteopathic Medicine':['#002b5c','#c99700'],'Lincoln Memorial University':['#002d72','#a2aaad'],'Loma Linda University':['#00447c','#d2a64d'],
'Marquette University':['#003366','#ffcc00'],'Medical University of South Carolina':['#00467f','#c99700'],'Meharry Medical College':['#7a1f2b','#c5a572'],
'Midwestern University (AZ)':['#9e1b32','#6d6e71'],'Midwestern University (IL)':['#9e1b32','#6d6e71'],'New York University':['#57068c','#8900e1'],
'Nova Southeastern University':['#003893','#8a9bb0'],'Ohio State University':['#ba0c2f','#a7b1b7'],'Oregon Health & Science University':['#005596','#8db4e2'],
'Ponce Health Sciences University':['#00529b','#f2a900'],'Roseman University':['#003d79','#b1953a'],'Rutgers':['#cc0033','#5f6a72'],
'Southern Illinois University':['#720000','#b5a99a'],'Stony Brook University':['#990000','#16243e'],'Temple University':['#9d2235','#a7a9ac'],
'Texas A&M University':['#500000','#d6d3c4'],'Texas Tech University':['#cc0000','#2b2b2b'],'Touro - New York Medical College':['#003a70','#a28d5b'],
'Tufts University':['#3172ae','#5d4037'],'University of Texas (San Antonio)':['#ec6b2d','#0c2340'],'University of Buffalo':['#005bbb','#002f56'],
'University of Alabama at Birmingham':['#1e6b52','#f4c300'],'University of California, Los Angeles':['#2774ae','#ffd100'],'University of California, San Francisco':['#052049','#18a3ac'],
'University of Colorado':['#cfb87c','#3a3a3a'],'University of Connecticut':['#000e2f','#7c878e'],'University of Detroit Mercy':['#a5093e','#002d72'],
'University of Florida':['#fa4616','#0021a5'],'University of Illinois at Chicago':['#001e62','#d50032'],'The University of Iowa':['#ffcd00','#3a3a3a'],
'University of Kentucky':['#0033a0','#6caddf'],'University of Louisville':['#ad0000','#2b2b2b'],'University of Maryland':['#e21833','#ffd200'],
'University of Michigan':['#00274c','#ffcb05'],'University of Minnesota':['#7a0019','#ffcc33'],'University of Mississippi':['#ce1126','#14213d'],
'University of Missouri - Kansas City':['#0067b1','#ffd200'],'University of Nebraska':['#d00000','#e8dfcf'],'University of Nevada, Las Vegas':['#b10202','#666666'],
'University of New England':['#00416a','#8ab7e9'],'University of North Carolina at Chapel Hill':['#7bafd4','#13294b'],'University of Oklahoma':['#841617','#e9dcc0'],
'University of Pennsylvania':['#011f5b','#990000'],'University of Pittsburgh':['#003594','#ffb81c'],'University of Puerto Rico':['#00704a','#c8a200'],
'University of Tennessee':['#ff8200','#4b4b4b'],'University of Texas (Houston)':['#bf5700','#13294b'],'University of Utah':['#be0000','#3a3a3a'],
'University of Washington':['#4b2e83','#b7a57a'],'University of the Pacific':['#f47920','#2b2b2b'],'Virginia Commonwealth University':['#ffb300','#2b2b2b'],
'Western University':['#005a43','#c2a56f'],'West Virginia University':['#002855','#eaaa00'],'High Point University':['#330072','#b2a4cf'],
'Pacific Northwest University':['#006272','#8cc63f'],'University of Pikeville':['#e35205','#2b2b2b'],'Yeshiva University':['#003da5','#9ea2a2'],
'Larkin University':['#003b71','#00a3e0'],'Lyon College':['#003da5','#d4a017'],
'Dalhousie University Faculty of Dentistry':['#ffd400','#3a3a3a'],'McGill University Faculty of Dental Medicine and Oral Health Sciences':['#ed1b2f','#a6192e'],
'The University of British Columbia Faculty of Dentistry':['#002145','#f2a900'],'Université de Montréal Faculté de Médecine Dentaire':['#0b2d5b','#3ba9e0'],
'Université Laval Faculté de Médecine Dentaire':['#e30513','#ffc103'],'University of Alberta School of Dentistry':['#007c41','#ffdb05'],
'University of Manitoba Dr. Gerald Niznick College of Dentistry':['#4d3417','#ffbf00'],'University of Saskatchewan College of Dentistry':['#006937','#a5a5a5'],
'University of Toronto Faculty of Dentistry':['#1e3765','#8db2e0'],'Western University Schulich School of Medicine & Dentistry':['#4f2683','#807f83'],
};
function hexHsl(hex){const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
  if(mx===mn) return [0,0,l*100]; const d=mx-mn, s=l>.5?d/(2-mx-mn):d/(mx+mn); let h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; return [h*60,s*100,l*100];}

S.forEach((s,i)=>{
  s.id=i; s.region=region(s.loc||''); s.place=(s.loc||'').replace(', Canada','');
  s.st=ABBR[s.place]||null;
  s.isNew = s.datreq==='New School' || (!s.acc && !s.gpa && s.c==='US');
  if(!s.abbr) s.abbr = shortName(s.name);
  const h=hash(s.name), base=RHUE[s.region]||[220,260,200];
  let [c1,c2]=COLORS[s.name]||['#1e3a8a','#64d2ff'];
  if(hexHsl(c1)[2]>55 && hexHsl(c2)[2]<hexHsl(c1)[2]) [c1,c2]=[c2,c1];
  const H1=hexHsl(c1), H2=hexHsl(c2), hu1=H1[1]<12?base[0]:Math.round(H1[0]), hu2=H2[1]<15?hu1+24:Math.round(H2[0]);
  s.art = {c1,c2,len:Math.max(2,s.abbr.length),h1:hu1,h2:hu2,h3:hu1,
    x1:20+((h>>3)&40)+'%',y1:15+((h>>7)&35)+'%',x2:55+((h>>11)&35)+'%',y2:40+((h>>15)&40)+'%',x3:((h>>19)&60)+'%',y3:70+((h>>23)&25)+'%'};
  const F=(g,sub,lab)=>{const sec=s.s.find(x=>x[0]===g); if(!sec) return null; const f=sec[1].find(x=>x[0]===sub&&x[1]===lab); return f?f[2]:null;};
  s.aaLo=pnum(F('DAT','AA','Min (5%)')); s.aaHi=pnum(F('DAT','AA','Max (95%)'));
  if(s.aaLo!=null&&s.aaHi!=null) s.aar=`${s.aaLo} - ${s.aaHi}`;
  const gr=F('GPA','Total GPA','Min (5%) - Max(95%) Combined Graduate and Undergraduate'), gm=gr&&gr.match(/([\d.]+)\D+([\d.]+)/);
  if(gm){s.gpaLo=+gm[1]; s.gpaHi=+gm[2];}
  const sr=F('GPA','Science GPA','Min (5%) - Max(95%) Combined Graduate and Undergraduate'), sm=sr&&sr.match(/([\d.]+)\D+([\d.]+)/);
  if(sm){s.sgpaLo=+sm[1];}
  const A='Applicant & Entering-Class Data';
  s.inOdds=pnum(F(A,'Residency: In-State','Acceptance Odds/Rate')); s.outOdds=pnum(F(A,'Residency: Out-of-State','Acceptance Odds/Rate')); s.intlOdds=pnum(F(A,'Residency: International','Acceptance Odds/Rate'));
  s.prefStates=F(A,'Residency: Out-of-State','States that Buys Seats at the School or States that are given preference - #');
  const P='Preparation & Prerequisite Coursework';
  s.req=COURSES.filter(c=>F(P,c,'Required')); s.recd=COURSES.filter(c=>!F(P,c,'Required')&&F(P,c,'Recommended'));
  const sh=s.shadow||'';
  const hm=sh.match(/(\d[\d,]*)\s*\+?\s*(hours|hrs|hour)/i)||sh.match(/^\D{0,40}?(\d[\d,]*)/);
  s.shadowHrs=hm?parseInt(hm[1].replace(',','')):null;
  s.shadowReq=/^required|mandatory|must/i.test(sh) && !/no required number/i.test(sh);
  s.fees=pnum(F('School Information & Finances','','Fees, books, supplies, etc.'));
  s.ivFormat=F('Interviews','','Format');
  s.oos=pnum(F('Quick Facts','','% of Accepted Class That is Out-of-State')); s.intlS=pnum(F('Quick Facts','','% of Accepted Class That is International'));
  const enr=pnum(F(A,'Totals','Total # Enrolled')), men=pnum(F(A,'Totals','Total # of Men Enrolled')), wh=pnum(F(A,'Race: White','Total Enrolled'));
  s.maleShare=enr&&men!=null?men/enr*100:null; s.whiteShare=enr&&wh!=null?wh/enr*100:null;
  s.idgTrad=F('International Dental Graduate Programs','','Traditional predoctoral program open to IDGs?');
  s.intlFriendly=(s.intlS!=null&&s.intlS>0)||/^yes/i.test(s.idgTrad||'')||/^yes/i.test(s.idg||'');
});

/* ---- formatting ---- */
const pct = v => v==null ? '—' : (v<10? (+v).toFixed(1) : Math.round(v)) + '%';
const money = v => v==null ? '—' : '$' + (v>=1000 ? Math.round(v/1000)+'k' : Math.round(v));
const moneyFull = v => v==null ? '—' : '$' + Math.round(v).toLocaleString();
const fx = (v,d=2) => v==null ? '—' : (+v).toFixed(d);
const na = v => v==null ? ' na' : '';

/* ---- store: per-person state, synced to the account when available ---- */
const STAGES=[['research','Researching','#8e8e93'],['applying','Applying','#64d2ff'],['submitted','Submitted','#2997ff'],['interview','Interview','#bf5af2'],['accepted','Accepted','#30d158'],['closed','Not this year','#ff6961']];
const STAGE_NAME=Object.fromEntries(STAGES.map(([k,l])=>[k,l]));
const STEPS=[['primary','Primary'],['secondary','Secondary'],['letters','Letters'],['interview','Interview']];
let state={list:{},profile:{},compare:[]};
function normalize(j){
  j=j&&typeof j==='object'?j:{};
  const list={}; if(j.list&&typeof j.list==='object') for(const [k,v] of Object.entries(j.list)) if(S.some(s=>s.name===k)) list[k]={stage:STAGE_NAME[v&&v.stage]?v.stage:'research',notes:String((v&&v.notes)||'').slice(0,4000),steps:(v&&typeof v.steps==='object'&&v.steps)||{},added:(v&&v.added)||Date.now()};
  const p=j.profile&&typeof j.profile==='object'?j.profile:{};
  const num=(v,lo,hi)=>{const n=parseFloat(v);return isNaN(n)||n<lo||n>hi?null:n;};
  const profile={gpa:num(p.gpa,0,4.3),sgpa:num(p.sgpa,0,4.3),aa:num(p.aa,1,600),shadow:num(p.shadow,0,10000),home:typeof p.home==='string'?p.home:'',gender:['men','women'].includes(p.gender)?p.gender:'',eth:typeof p.eth==='string'&&p.eth.length<80?p.eth:'',courses:Array.isArray(p.courses)?p.courses.filter(c=>COURSES.includes(c)):null};
  const compare=Array.isArray(j.compare)?j.compare.filter(n=>S.some(s=>s.name===n)).slice(0,4):[];
  return {list,profile,compare};
}
try{
  const j=JSON.parse(localStorage.getItem('dsa-state')||'null');
  if(j) state=normalize(j);
  else{
    const old=JSON.parse(localStorage.getItem('dsa-list')||'[]'); const me=JSON.parse(localStorage.getItem('dsa-me')||'{}');
    state=normalize({list:Object.fromEntries((Array.isArray(old)?old:[]).map(n=>[n,{stage:'research'}])),profile:me});
  }
}catch(e){}
let dbRef=null, lastSynced='', saveTimer=null, synced=false;
function save(){
  const js=JSON.stringify(state);
  try{localStorage.setItem('dsa-state',js);}catch(e){}
  if(!dbRef) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{ lastSynced=js; dbRef.set(JSON.parse(js)).then(()=>setSync(true),()=>setSync(false)); },600);
}
function setSync(on){ synced=on; const b=$('#syncBadge'); if(b){ b.classList.toggle('on',on); b.lastChild.textContent=on?'Synced to your account':'Saved in this browser'; } }
async function connectDb(){
  try{
    if(!window.claude||typeof window.claude.use!=='function') return;
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    dbRef=db.doc('data/users/'+id+'/atlas');
    let first=true;
    dbRef.onSnapshot(snap=>{
      if(snap.exists){
        const remote=normalize(snap.data()), js=JSON.stringify(remote);
        if(first && !Object.keys(remote.list).length && Object.keys(state.list).length){ save(); }
        else if(js!==lastSynced && js!==JSON.stringify(state)){ lastSynced=js; state=remote; try{localStorage.setItem('dsa-state',js);}catch(e){} applyState(); }
      } else if(first){ save(); }
      first=false; setSync(true);
    },()=>setSync(false));
  }catch(e){}
}

/* ---- saved / list ---- */
const isSaved = n => !!state.list[n];
const saved = {has:isSaved, get size(){return Object.keys(state.list).length;}};
function toggleSave(name){
  if(state.list[name]) delete state.list[name]; else state.list[name]={stage:'research',notes:'',steps:{},added:Date.now()};
  save(); applyState();
}
const heartSVG = on => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${on?'<path d="M5 12l5 5L20 7"/>':'<path d="M12 5v14M5 12h14"/>'}</svg>`;
const cmpSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/></svg>';
function toggleCompare(name){
  const i=state.compare.indexOf(name);
  if(i>=0) state.compare.splice(i,1);
  else { if(state.compare.length>=4) state.compare.shift(); state.compare.push(name); }
  save(); applyState();
}

/* ---- chances ---- */
const hasProfile = () => { const p=state.profile; return p.gpa!=null || p.aa!=null; };
let CH=new Map();
function computeChances(){
  CH=new Map(); if(!hasProfile()) return;
  S.forEach(s=>CH.set(s.id,chance(s)));
}
function chance(s){
  const p=state.profile, reasons=[];
  if(s.gpa==null && s.aa==null) return {tier:'unknown',score:-9,reasons:[{ok:null,t:'Not enough admissions data in the sheet yet'}],missing:[],shadowGap:null};
  const zs=[];
  if(p.gpa!=null && s.gpa!=null){ const sd=s.gpaLo!=null?Math.max(.06,(s.gpa-s.gpaLo)/1.645):.2; const z=(p.gpa-s.gpa)/sd; zs.push([z,1]);
    reasons.push({ok:z>=-.25,t:`Student's GPA ${p.gpa.toFixed(2)} vs. their mean ${s.gpa.toFixed(2)}`}); }
  if(p.sgpa!=null && s.sgpa!=null){ const sd=s.sgpaLo!=null?Math.max(.06,(s.sgpa-s.sgpaLo)/1.645):.22; const z=(p.sgpa-s.sgpa)/sd; zs.push([z,.6]);
    reasons.push({ok:z>=-.25,t:`Student's science GPA ${p.sgpa.toFixed(2)} vs. ${s.sgpa.toFixed(2)}`}); }
  if(p.aa!=null && s.aa!=null){ const sd=s.aaLo!=null?Math.max(6,(s.aa-s.aaLo)/1.645):25; const z=(p.aa-s.aa)/sd; zs.push([z,1.2]);
    reasons.push({ok:z>=-.25,t:`Student's DAT AA ${p.aa} vs. their mean ${s.aa}`}); }
  const w=zs.reduce((a,[,x])=>a+x,0), z=w?zs.reduce((a,[v,x])=>a+v*x,0)/w:0;
  let odds=null, pool='';
  if(p.home==='INTL'){ odds=s.intlOdds; pool='International'; }
  else if(p.home && s.st===p.home){ odds=s.inOdds; pool='In-state'; }
  else if(p.home){ odds=s.outOdds; pool='Out-of-state'; }
  if(odds!=null) reasons.push({ok:odds>=6,t:`${pool} applicants: ${pct(odds)} acceptance odds`});
  if(p.home && p.home!=='INTL' && s.prefStates && new RegExp('\\b'+(NAME_OF[p.home]||'~')+'\\b').test(s.prefStates)) reasons.push({ok:true,t:`${NAME_OF[p.home]} is a preferred or seat-buying state here`});
  const score = z + (odds!=null ? Math.log10(Math.max(odds,.3)/6)*1.2 : 0);
  const tier = score>=.7?'likely':score>=-.5?'target':'reach';
  const missing = p.courses ? s.req.filter(c=>!p.courses.includes(c)) : [];
  const shadowGap = (s.shadowHrs && p.shadow!=null && p.shadow<s.shadowHrs) ? s.shadowHrs-p.shadow : null;
  return {tier,score,z,odds,pool,reasons,missing,shadowGap};
}
const TIER_LABEL={likely:'Likely',target:'Target',reach:'Reach',unknown:'No data'};
const tierPill = (c,big) => c ? `<span class="tier ${c.tier}${big?' big':''}">${TIER_LABEL[c.tier]}</span>` : '';

/* ---- art ---- */
function artStyle(s){const a=s.art;return `--c1:${a.c1};--c2:${a.c2};--len:${a.len};--h1:${a.h1};--h2:${a.h2};--h3:${a.h3};--x1:${a.x1};--y1:${a.y1};--x2:${a.x2};--y2:${a.y2};--x3:${a.x3};--y3:${a.y3}`}
function artHTML(s){return `<div class="art" style="${artStyle(s)}"><span class="mono">${esc(s.abbr)}</span></div>`}
const miniHTML = s => `<span class="mini">${artHTML(s)}</span>`;

/* ---- card ---- */
function cardHTML(s){
  const on=isSaved(s.name), cm=state.compare.includes(s.name), c=CH.get(s.id);
  return `<button class="card" data-id="${s.id}" style="--rc:${RCOL[s.region]};--glow:hsl(${s.art.h1} 90% 55% / .55)" aria-label="${esc(s.name)}, open details">
    <div class="poster">${artHTML(s)}<div class="gloss"></div>
      <div class="tag"><span class="pill"><span class="d"></span>${esc(s.c==='CA'?s.place:s.region)}</span>${s.isNew?'<span class="pill new">New</span>':''}${c?tierPill(c):''}</div>
      <span class="ctrls"><span class="cbtn${cm?' on':''}" data-cmp="${esc(s.name)}" data-tip="${cm?'In Compare':'Compare'}">${cmpSVG}</span><span class="heart cbtn${on?' on':''}" data-heart="${esc(s.name)}" data-tip="${on?'In My Schools':'Add to My Schools'}">${heartSVG(on)}</span></span>
    </div>
    <div class="card-body">
      <div class="card-sub">${esc([s.place, s.type, s.size? s.size+' seats':null].filter(Boolean).join(' · '))}</div>
      <div class="card-title">${esc(s.name)}</div>
      <div class="card-stats">
        <div class="cs"><div class="v${na(s.acc)}">${pct(s.acc)}</div><div class="l">Accept</div></div>
        <div class="cs"><div class="v${na(s.aa)}">${s.aa??'—'}</div><div class="l">DAT AA</div></div>
        <div class="cs"><div class="v${na(s.gpa)}">${fx(s.gpa)}</div><div class="l">GPA</div></div>
      </div>
    </div>
  </button>`;
}

/* ---- detailed card (All Schools) ---- */
const ETH_SHORT={'American Indian or Alaska Native':'American Indian / Alaska Native','Native Hawaiian or Other Pacific Islander':'Native Hawaiian / Pacific Islander','Black or African American':'Black','Hispanic or Latino':'Hispanic / Latino','Two or More Races':'Two or more races','Unkown':'Unknown race'};
function myGroup(){ const p=state.profile; return {gender:p.gender||F.gender||'', eth:p.eth||F.eth||''}; }
function groupMeters(s){
  const {gender,eth}=myGroup(), E=s.enr||{}, rows=[];
  const row=(label,share,acc)=>`<div class="gm"><span>${esc(label)}</span><div class="tr"><i style="width:${share??0}%"></i></div><b>${share!=null?Math.round(share)+'%':'—'}</b><em>${acc!=null?pct(acc)+' accepted':'no rate'}</em></div>`;
  if(gender){ const n=E[gender], share=E.total&&n!=null?n/E.total*100:null; rows.push(row(gender==='men'?'Men':'Women',share,s.grp&&s.grp.all?s.grp.all[gender]:null)); }
  if(eth){ const n=E.race?E.race[eth]:null, share=E.total&&n!=null?n/E.total*100:null; rows.push(row(ETH_SHORT[eth]||eth,share,s.grp&&s.grp[eth]?s.grp[eth].all:null)); }
  if(!rows.length) return `<div class="dmeters"><span class="gm-empty">Add your student's gender and ethnicity in <span class="linkbtn" data-profile="1">Student Profile</span> to see their group's share of the class and acceptance rate here.</span></div>`;
  return `<div class="dmeters"><div class="gm-h"><span>Student's group</span><span>% of class</span></div>${rows.join('')}</div>`;
}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDeadline(v){ if(!v) return null; const m=String(v).match(/^(\d{1,2})\/(\d{1,2})/); if(m) return `${MON[+m[1]-1]} ${+m[2]}`; return String(v).length>18?String(v).slice(0,18)+'…':String(v); }
function dcardHTML(s){
  const on=isSaved(s.name), cm=state.compare.includes(s.name), c=CH.get(s.id), p=state.profile;
  const cell=(v,d)=>v==null?'<td class="na">—</td>':`<td>${d?(+v).toFixed(d):v}</td>`;
  const you=(v,mean)=>v!=null&&mean!=null?(v>=mean?' up':' dn'):'';
  const ins=s.instate, oos=s.oos, intl=s.intlS, dl=fmtDeadline(s.deadline), nd=nextDeadline(s);
  return `<button class="card dcard" data-id="${s.id}" style="--rc:${RCOL[s.region]};--glow:hsl(${s.art.h1} 90% 55% / .55)" aria-label="${esc(s.name)}, open details">
    <div class="poster">${artHTML(s)}<div class="gloss"></div>
      <div class="tag"><span class="pill"><span class="d"></span>${esc(s.c==='CA'?s.place:s.region)}</span>${s.isNew?'<span class="pill new">New</span>':''}${c?tierPill(c):''}</div>
      <span class="ctrls"><span class="cbtn${cm?' on':''}" data-cmp="${esc(s.name)}" data-tip="${cm?'In Compare':'Compare'}">${cmpSVG}</span><span class="heart cbtn${on?' on':''}" data-heart="${esc(s.name)}" data-tip="${on?'In My Schools':'Add to My Schools'}">${heartSVG(on)}</span></span>
    </div>
    <div class="card-body">
      <div class="card-sub">${esc([s.place, s.size? s.size+' seats':null].filter(Boolean).join(' · '))}</div>
      <div class="card-title">${esc(s.name)}</div>
      <div class="mchips">${s.type?`<span class="mchip ${/^Public/.test(s.type)?'pub':'pri'}">${esc(s.type.replace('Private State-related','State-related'))}</span>`:''}${s.intlFriendly?'<span class="mchip intl">Int’l friendly</span>':''}${s.housing==='Yes'?'<span class="mchip">Housing</span>':''}${s.rub?'<span class="mchip rub">Scoring rubric</span>':''}</div>
      <table class="sgrid"><thead><tr><th></th><th>GPA</th><th>sGPA</th><th>DAT AA</th></tr></thead><tbody>
        <tr><th>Avg</th><td class="${you(p.gpa,s.gpa)}">${s.gpa!=null?s.gpa.toFixed(2):'—'}</td><td class="${you(p.sgpa,s.sgpa)}">${s.sgpa!=null?s.sgpa.toFixed(2):'—'}</td><td class="${you(p.aa,s.aa)}">${s.aa??'—'}</td></tr>
        <tr class="lo"><th>Low 5%</th>${cell(s.gpaLo,2)}${cell(s.sgpaLo,2)}${cell(s.aaLo)}</tr>
      </tbody></table>
      <div class="dstats">
        <div><span class="l">${groupLabel()?'Accept · '+esc(groupLabel()):'Acceptance'}</span><b>${pct(groupRate(s))}</b></div>
        <div><span class="l">Interview</span><b>${pct(s.intv)}</b></div>
        <div><span class="l">Deadline</span><b>${dl?esc(dl):'—'}</b>${nd&&nd.days<=45?`<em>${nd.days}d left</em>`:''}</div>
      </div>
      <div class="dmix">
        <div class="mhead"><span>Entering class</span><span><b style="color:var(--accent)">${pct(ins)}</b> in-state · <b style="color:#da8fff">${pct(oos)}</b> out-of-state${intl?` · <b style="color:var(--r-pr)">${pct(intl)}</b> int’l`:''}</span></div>
        <div class="split">${ins!=null?`<i style="width:${ins}%;background:var(--accent)"></i><i style="width:${oos||0}%;background:var(--r-south)"></i><i style="width:${intl||0}%;background:var(--r-pr)"></i>`:''}</div>
        ${groupMeters(s)}
      </div>
      <span class="dmore">Full details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></span>
    </div>
  </button>`;
}
let gridMode='detail';
try{ gridMode=localStorage.getItem('dsa-grid')||'detail'; }catch(e){}

/* ---- hero ---- */
const featured = S.filter(s=>s.acc && s.aa && s.gpa && s.res).sort((a,b)=>hash(a.name+'f')-hash(b.name+'f')).slice(0,6);
let heroI=0, heroTimer=null;
function renderHero(i){
  heroI=i; const s=featured[i];
  const art=$('#heroArt'); art.setAttribute('style',artStyle(s)); art.innerHTML=`<span class="mono">${esc(s.abbr)}</span>`;
  const eb=$('#heroEyebrow'); eb.style.setProperty('--rc',RCOL[s.region]); eb.lastElementChild.textContent=`Featured · ${s.region}`;
  $('#heroTitle').textContent=s.name;
  const c=CH.get(s.id);
  $('#heroMeta').innerHTML=[c?tierPill(c,true):null,esc(s.place),esc(s.type),esc(s.deg),s.size?`<b>${s.size}</b> seats`:null,s.start?`Starts ${esc(s.start)}`:null].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
  $('#heroStats').innerHTML=[[pct(s.acc),'Acceptance'],[pct(s.intv),'Interview rate'],[s.aa,'Mean AA'],[fx(s.gpa),'Mean GPA'],[money(s.res),'Resident tuition']]
    .map(([v,l])=>`<div class="hero-stat"><div class="v num">${v}</div><div class="l">${l}</div></div>`).join('');
  $('#heroDots').innerHTML=featured.map((f,k)=>`<button aria-label="Show ${esc(f.name)}" aria-current="${k===i}" data-k="${k}"></button>`).join('');
  renderHeroSave();
}
function renderHeroSave(){const s=featured[heroI];const on=isSaved(s.name);const b=$('#heroSave');b.classList.toggle('saved',on);
  b.innerHTML=`${heartSVG(on).replace(/#fff/g,'currentColor')}${on?'In My Schools':'My Schools'}`}
function startHero(){ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; clearInterval(heroTimer); heroTimer=TIMERS.hero=setInterval(()=>renderHero((heroI+1)%featured.length),8000); }
$('#heroDots').addEventListener('click',e=>{const b=e.target.closest('button');if(b){renderHero(+b.dataset.k);startHero();}});
$('#heroOpen').addEventListener('click',()=>openSheet(featured[heroI]));
$('#heroSave').addEventListener('click',()=>toggleSave(featured[heroI].name));

/* ---- shelves ---- */
const withV = k => S.filter(s=>s[k]!=null);
const shelves = [
  {t:'Top 10 Most Applied To', d:'Total applicants last cycle', ranked:true, items: withV('apps').sort((a,b)=>b.apps-a.apps).slice(0,10)},
  {t:'Best Acceptance Odds', d:'Highest total acceptance rate', items: withV('acc').sort((a,b)=>b.acc-a.acc).slice(0,14), sort:'acc-d'},
  {t:'Best Interview Odds', d:'Share of applicants invited to interview', items: withV('intv').sort((a,b)=>b.intv-a.intv).slice(0,14), sort:'intv-d'},
  {t:'Lowest In-State Tuition', d:'Resident tuition per year', items: withV('res').sort((a,b)=>a.res-b.res).slice(0,14), sort:'res-a'},
  {t:'Friendliest to Out-of-State', d:'Lowest non-resident tuition', items: withV('non').sort((a,b)=>a.non-b.non).slice(0,14), sort:'non-a'},
  {t:'Most Selective', d:'Lowest total acceptance rate', items: withV('acc').sort((a,b)=>a.acc-b.acc).slice(0,14), sort:'acc-a'},
  {t:'Largest Classes', d:'Seats in the entering class', items: withV('size').sort((a,b)=>b.size-a.size).slice(0,14), sort:'size-d'},
  {t:'The West', region:'West'}, {t:'The Midwest', region:'Midwest'}, {t:'The South', region:'South'}, {t:'The Northeast', region:'Northeast'},
  {t:'Canada', d:'Canadian faculties of dentistry', region:'Canada'},
  {t:'New & Opening Soon', d:'Programs without a full admissions cycle of data yet', items: S.filter(s=>s.isNew)},
];
shelves.forEach(sh=>{ if(sh.region){ sh.items=S.filter(s=>s.region===sh.region || (sh.region==='South' && s.region==='Puerto Rico')).sort((a,b)=>a.name.localeCompare(b.name)); sh.d=sh.d||`${sh.items.length} schools`; } });

function railHTML(items, ranked){
  return `<div class="rail-wrap"><button class="rail-btn l" aria-label="Scroll left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg></button>
  <div class="rail${ranked?' ranked':''}">${items.map((s,i)=>ranked?`<div class="ranked-item${i>=9?' wide':''}"><span class="rank${i>=9?' two':''}" aria-hidden="true">${i+1}</span>${cardHTML(s)}</div>`:cardHTML(s)).join('')}</div>
  <button class="rail-btn r" aria-label="Scroll right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button></div>`;
}
function bestFits(){ return S.filter(s=>CH.get(s.id)&&CH.get(s.id).tier!=='unknown').sort((a,b)=>CH.get(b.id).score-CH.get(a.id).score); }
function renderShelves(){
  const scroll=[...ROOT.querySelectorAll('#shelves .rail')].map(r=>r.scrollLeft);
  let top='';
  if(hasProfile()){
    const bf=bestFits();
    const likely=bf.filter(s=>CH.get(s.id).tier==='likely'), target=bf.filter(s=>CH.get(s.id).tier==='target');
    top+=`<section class="shelf"><div class="shelf-head"><h2>Best Fits for Your Student</h2><p>Ranked by your student's stats and residency</p><button class="more" data-fit="all">See all</button></div>${railHTML(bf.slice(0,14))}</section>`;
    if(target.length) top+=`<section class="shelf"><div class="shelf-head"><h2>Your Student's Targets</h2><p>${target.length} schools where your student looks competitive</p><button class="more" data-fit="target">See all</button></div>${railHTML(target.slice(0,14))}</section>`;
  }
  const list=S.filter(s=>isSaved(s.name));
  if(list.length) top+=`<section class="shelf"><div class="shelf-head"><h2>My Schools</h2><p>${list.length} saved</p><button class="more" data-goto="board">Open tracker</button></div>${railHTML(list)}</section>`;
  $('#shelves').innerHTML = top + shelves.map((sh,i)=>`<section class="shelf">
    <div class="shelf-head"><h2>${esc(sh.t)}</h2><p>${esc(sh.d||'')}</p><button class="more" data-shelf="${i}">See all</button></div>${railHTML(sh.items, sh.ranked)}</section>`).join('');
  wireRails($('#shelves'));
  ROOT.querySelectorAll('#shelves .rail').forEach((r,i)=>{ if(scroll[i]) r.scrollLeft=scroll[i]; });
  $('#ctaSlot').innerHTML = hasProfile() ? '' : `<div class="cta"><div><h3>See your student’s chances at every school</h3><p>Add your student’s GPA, DAT and home state once. Every card then shows whether it’s a Reach, Target or Likely for them, plus any missing prerequisites.</p></div>
    <div class="tiers"><span class="tier reach">Reach</span><span class="tier target">Target</span><span class="tier likely">Likely</span></div><button class="btn btn-primary" data-profile="1">Set up Student Profile</button></div>`;
}
function wireRails(root){
  root.querySelectorAll('.rail-wrap').forEach(w=>{
    const r=w.querySelector('.rail'), L=w.querySelector('.l'), R=w.querySelector('.r');
    const upd=()=>{L.disabled=r.scrollLeft<8;R.disabled=r.scrollLeft+r.clientWidth>=r.scrollWidth-8};
    L.onclick=()=>r.scrollBy({left:-r.clientWidth*.85,behavior:'smooth'});
    R.onclick=()=>r.scrollBy({left:r.clientWidth*.85,behavior:'smooth'});
    r.addEventListener('scroll',upd,{passive:true}); upd();
  });
}

/* ---- filters / grid ---- */
const F = {regions:new Set(), types:new Set(), flags:new Set(), fit:new Set(), courses:new Set(), loc:'', gpa:0, sgpa:0, dat:0, acc:0, is:0, oos:0, tuition:130000, tuMode:'res', can:false, cc:false, cdat:false, gender:'', eth:'', sort:'name', q:'', only:null};
const REGIONS=['West','Midwest','South','Northeast','Puerto Rico','Canada'];
const TYPES=['Public','Private','Private State-related'];
const FLAGS={};
const RACES=['American Indian or Alaska Native','Asian','Black or African American','Hispanic or Latino','Native Hawaiian or Other Pacific Islander','White','Two or More Races','International','Unkown'];
S.forEach(s=>{
  const A='Applicant & Entering-Class Data';
  const g=(sub,lab)=>{const sec=s.s.find(x=>x[0]===A); const f=sec&&sec[1].find(x=>x[0]===sub&&x[1]===lab); return f?pnum(f[2]):null;};
  s.grp={all:{all:s.acc,men:g('Totals','Male Acceptance Rate'),women:g('Totals','Female Acceptance Rate')}};
  RACES.forEach(r=>{ s.grp[r]={all:g('Race: '+r,'Total Acceptance Rate'),men:g('Race: '+r,'Male Acceptance Rate'),women:g('Race: '+r,'Female Acceptance Rate')}; });
  s.enr={total:g('Totals','Total # Enrolled'),men:g('Totals','Total # of Men Enrolled'),women:g('Totals','Total # of Women Enrolled'),race:Object.fromEntries(RACES.map(r=>[r,g('Race: '+r,'Total Enrolled')]))};
  const sec=(G,sub,lab)=>{const x=s.s.find(y=>y[0]===G); const f=x&&x[1].find(y=>y[0]===sub&&y[1]===lab); return f?f[2]:'';};
  s.cdat=sec('DAT','Canadian DAT accepted and how it is treated if accepted','Canadian DAT accepted and how it is treated if accepted');
  s.ccPre=sec('Preparation & Prerequisite Coursework','Community College & AP Credits','Prerequistes\nCommunity College Accepted');
  s.intlEnr=pnum(sec(A,'Residency: International','# Enrolled'));
  s.okCanadians = s.c==='CA' || (s.intlEnr!=null && s.intlEnr>0) || (s.intlS!=null && s.intlS>0);
  s.okCC = /^yes|credit is accepted/i.test(s.ccPre);
  s.okCdat = /^yes|canadian dat only/i.test(s.cdat);
});
function groupRate(s){ if(!F.gender && !F.eth) return s.acc; const g=s.grp[F.eth||'all']; return g?g[F.gender||'all']:null; }
function groupLabel(){ const r=F.eth?F.eth.replace('Unkown','Unknown race'):''; const gd={men:'men',women:'women'}[F.gender]||''; return [r,gd].filter(Boolean).join(', ')||''; }

$('#fRegion').innerHTML=REGIONS.map(r=>`<button class="chip" aria-pressed="false" data-r="${r}" style="--rc:${RCOL[r]}"><span class="d"></span>${r} <span style="opacity:.55">${S.filter(s=>s.region===r).length}</span></button>`).join('');
$('#fFit').innerHTML=['likely','target','reach'].map(k=>`<button class="chip" aria-pressed="false" data-fit-chip="${k}"><span class="tdot ${k}"></span>${TIER_LABEL[k]}</button>`).join('');
$('#fCourses').innerHTML=COURSES.map(c=>`<button class="chip" aria-pressed="false" data-course-f="${esc(c)}">${esc(c)}</button>`).join('');
const locs=[...new Set(S.map(s=>s.loc).filter(Boolean))].sort((a,b)=>(/Canada/.test(a)-/Canada/.test(b))||a.localeCompare(b));
$('#fLoc').innerHTML=`<option value="">All locations</option>`+locs.map(l=>`<option value="${esc(l)}">${esc(l)} (${S.filter(s=>s.loc===l).length})</option>`).join('');
$('#fTypeSel').innerHTML=`<option value="">All types</option>`+TYPES.map(t=>`<option value="${t}">${t.replace('Private State-related','State-related')}</option>`).join('');
$('#fEth').innerHTML=`<option value="">Any</option>`+RACES.map(r=>`<option value="${esc(r)}">${esc(r.replace('Unkown','Unknown'))}</option>`).join('');

function chipToggle(container,attr,set){container.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const v=b.dataset[attr];set.has(v)?set.delete(v):set.add(v);b.setAttribute('aria-pressed',set.has(v));F.only=null;renderGrid();})}
chipToggle($('#fRegion'),'r',F.regions); chipToggle($('#fFit'),'fitChip',F.fit); chipToggle($('#fCourses'),'courseF',F.courses);
$('#fLoc').addEventListener('change',e=>{F.loc=e.target.value;renderGrid();});
$('#fTypeSel').addEventListener('change',e=>{F.types.clear(); if(e.target.value) F.types.add(e.target.value); renderGrid();});
$('#fGender').addEventListener('change',e=>{F.gender=e.target.value;renderGrid();});
$('#fEth').addEventListener('change',e=>{F.eth=e.target.value;renderGrid();});
[['fCan','can'],['fCC','cc'],['fCdat','cdat']].forEach(([id,k])=>$('#'+id).addEventListener('change',e=>{F[k]=e.target.checked;renderGrid();}));
$('#fTuMode').addEventListener('click',e=>{const b=e.target.closest('[data-tu]'); if(!b) return; F.tuMode=b.dataset.tu; $('#fTuMode').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderGrid();});
$('#fCoursesFill').addEventListener('click',()=>{ (state.profile.courses||[]).forEach(c=>F.courses.add(c)); syncChips(); renderGrid(); });
$('#fCoursesClear').addEventListener('click',()=>{ F.courses.clear(); syncChips(); renderGrid(); });

/* sliders */
const bindRange=(id,key,fmt)=>{const el=$('#'+id),o=$('#o'+id.slice(1));const u=()=>{F[key]=+el.value;o.textContent=fmt(+el.value,el);paintRange(el);};el.addEventListener('input',()=>{u();renderGrid()});u();};
function paintRange(el){ const p=(el.value-el.min)/(el.max-el.min)*100; el.style.setProperty('--p',p+'%'); }
bindRange('fAcc','acc',v=>v?v+'%+':'Any');
bindRange('fIs','is',v=>v?v+'%+':'Any');
bindRange('fOos','oos',v=>v?v+'%+':'Any');
bindRange('fTuition','tuition',(v,el)=>v>=+el.max?'Any':moneyFull(v));
/* score slider + number pairs */
function bindScore(key,rid,nid,fmt,parse){
  const r=$('#'+rid), n=$('#'+nid), o=$('#o'+rid.slice(1));
  const show=()=>{o.textContent=F[key]?fmt(F[key]):'Any'; paintRange(r);};
  r.addEventListener('input',()=>{F[key]=+r.value; n.value=F[key]?fmt(F[key]):''; show(); renderGrid();});
  n.addEventListener('input',()=>{const v=parse(n.value); F[key]=v||0; r.value=F[key]; show(); renderGrid();});
  show();
}
bindScore('gpa','fGpa','fGpaN',v=>(+v).toFixed(2),v=>{const x=parseFloat(v);return isNaN(x)?0:Math.min(4,Math.max(0,x));});
bindScore('sgpa','fSgpa','fSgpaN',v=>(+v).toFixed(2),v=>{const x=parseFloat(v);return isNaN(x)?0:Math.min(4,Math.max(0,x));});
bindScore('dat','fDat','fDatN',v=>String(Math.round(v)),v=>{const x=parseFloat(v); if(isNaN(x)) return 0; if(x>=1&&x<=30) return oldToNew(x)||0; return Math.min(600,Math.max(0,x));});
$('#fScoresFill').addEventListener('click',()=>{ const p=state.profile; const set=(rid,v)=>{ if(v==null) return; const r=$('#'+rid); r.value=v; r.dispatchEvent(new Event('input')); };
  set('fGpa',p.gpa); set('fSgpa',p.sgpa); set('fDat',p.aa); });

$('#fSort').addEventListener('change',e=>{F.sort=e.target.value;renderGrid()});
$('#resetF').addEventListener('click',resetFilters);
$('#gridMode').addEventListener('click',e=>{const b=e.target.closest('[data-mode]'); if(!b) return; gridMode=b.dataset.mode; try{localStorage.setItem('dsa-grid',gridMode);}catch(err){} renderGrid();});
function setVal(id,v){const el=$('#'+id); el.value=v; el.dispatchEvent(new Event('input'));}
function resetFilters(){
  F.regions.clear();F.types.clear();F.flags.clear();F.fit.clear();F.courses.clear();F.only=null;
  Object.assign(F,{loc:'',gender:'',eth:'',can:false,cc:false,cdat:false,tuMode:'res'});
  ['fLoc','fTypeSel','fGender','fEth'].forEach(id=>$('#'+id).value='');
  ['fCan','fCC','fCdat'].forEach(id=>$('#'+id).checked=false);
  $('#fTuMode').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.tu==='res'));
  [['fAcc',0],['fIs',0],['fOos',0],['fTuition',130000],['fGpa',0],['fSgpa',0],['fDat',0]].forEach(([id,v])=>setVal(id,v));
  syncChips(); $('#fSort').value='name';F.sort='name';renderGrid();
}
function matches(s){
  if(F.only && !F.only.has(s.id)) return false;
  if(F.q){const q=F.q.toLowerCase(); if(![s.name,s.abbr,s.loc,s.region,s.addr,s.st].join(' ').toLowerCase().includes(q)) return false;}
  if(F.regions.size && !F.regions.has(s.region)) return false;
  if(F.loc && s.loc!==F.loc) return false;
  if(F.types.size && !F.types.has(s.type)) return false;
  if(F.fit.size){ const c=CH.get(s.id); if(!c || !F.fit.has(c.tier)) return false; }
  if(F.gpa && !(s.gpaLo!=null && s.gpaLo<=F.gpa)) return false;
  if(F.sgpa && !(s.sgpaLo!=null && s.sgpaLo<=F.sgpa)) return false;
  if(F.dat && !(s.aaLo!=null && s.aaLo<=F.dat)) return false;
  const gr=groupRate(s);
  if((F.gender||F.eth) && gr==null) return false;
  if(F.acc && !(gr!=null && gr>=F.acc)) return false;
  if(F.is && !(s.instate!=null && s.instate>=F.is)) return false;
  if(F.oos && !(s.oos!=null && s.oos>=F.oos)) return false;
  if(F.tuition<130000){ const t=F.tuMode==='res'?s.res:s.non; if(!(t!=null && t<=F.tuition)) return false; }
  if(F.can && !s.okCanadians) return false;
  if(F.cc && !s.okCC) return false;
  if(F.cdat && !s.okCdat) return false;
  if(F.courses.size && s.req.some(c=>!F.courses.has(c))) return false;
  return true;
}
function sorter(k){
  const [f,dir]=k.split('-'); if(f==='name') return (a,b)=>a.name.localeCompare(b.name);
  const val = f==='fit' ? (s=>{const c=CH.get(s.id);return c&&c.tier!=='unknown'?c.score:null;}) : f==='grp' ? groupRate : (s=>s[f]);
  return (a,b)=>{const x=val(a),y=val(b); if(x==null&&y==null) return a.name.localeCompare(b.name); if(x==null) return 1; if(y==null) return -1; return dir==='d'?y-x:x-y;};
}
function updateFbar(){
  const chips=[];
  F.regions.forEach(r=>chips.push(['r',r,r]));
  if(F.loc) chips.push(['loc','',F.loc]);
  F.types.forEach(t=>chips.push(['t',t,t.replace('Private State-related','State-related')]));
  F.fit.forEach(t=>chips.push(['fit',t,TIER_LABEL[t]]));
  if(F.gpa) chips.push(['gpa','','My GPA '+F.gpa.toFixed(2)]); if(F.sgpa) chips.push(['sgpa','','My sGPA '+F.sgpa.toFixed(2)]); if(F.dat) chips.push(['dat','','My DAT '+F.dat]);
  if(F.acc) chips.push(['acc','',(groupLabel()?'Acceptance for '+groupLabel():'Acceptance')+' ≥ '+F.acc+'%']);
  if(F.is) chips.push(['is','','In-state ≥ '+F.is+'%']); if(F.oos) chips.push(['oos','','Out-of-state ≥ '+F.oos+'%']);
  if(F.tuition<130000) chips.push(['tu','',(F.tuMode==='res'?'Resident':'Non-resident')+' tuition ≤ '+money(F.tuition)]);
  if(F.can) chips.push(['can','','Accepts Canadians']); if(F.cc) chips.push(['cc','','Accepts CC credits']); if(F.cdat) chips.push(['cdat','','Accepts Canadian DAT']);
  if(F.gender) chips.push(['gender','',F.gender==='men'?'Men':'Women']); if(F.eth) chips.push(['eth','',F.eth.replace('Unkown','Unknown')]);
  if(F.courses.size) chips.push(['courses','',`Prereqs met with ${F.courses.size} class${F.courses.size===1?'':'es'}`]);
  if(F.only) chips.push(['only','','From a Browse row']);
  $('#ftCount').textContent=chips.length?chips.length+' active':''; $('#ftClear').hidden=!chips.length;
  $('#activeF').innerHTML=chips.length?chips.map(([k,v,l])=>`<button class="achip" data-af="${k}" data-v="${esc(v)}">${esc(l)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg></button>`).join('')+`<button class="linkbtn" data-af="all">Clear all</button>`:'';
  $('#oAccLab').textContent=groupLabel()?`Min acceptance for ${groupLabel()}`:'Min acceptance';
  const mc=$('#fMoreCount'); const n=(F.gender?1:0)+(F.eth?1:0)+(F.courses.size?1:0); mc.textContent=n?n+' on':'';
}
function syncChips(){
  ROOT.querySelectorAll('#fRegion .chip').forEach(c=>c.setAttribute('aria-pressed',F.regions.has(c.dataset.r)));
  ROOT.querySelectorAll('#fFit .chip').forEach(c=>c.setAttribute('aria-pressed',F.fit.has(c.dataset.fitChip)));
  ROOT.querySelectorAll('#fCourses .chip').forEach(c=>c.setAttribute('aria-pressed',F.courses.has(c.dataset.courseF)));
}
$('#ftClear').addEventListener('click',resetFilters);
$('#activeF').addEventListener('click',e=>{const c=e.target.closest('[data-af]'); if(!c) return; const k=c.dataset.af, v=c.dataset.v;
  if(k==='all'){resetFilters();return;}
  if(k==='r') F.regions.delete(v); else if(k==='fit') F.fit.delete(v); else if(k==='only') F.only=null; else if(k==='courses') F.courses.clear();
  else if(k==='t'){F.types.clear(); $('#fTypeSel').value='';} else if(k==='loc'){F.loc=''; $('#fLoc').value='';}
  else if(k==='gender'){F.gender=''; $('#fGender').value='';} else if(k==='eth'){F.eth=''; $('#fEth').value='';}
  else if(['can','cc','cdat'].includes(k)){F[k]=false; $('#'+{can:'fCan',cc:'fCC',cdat:'fCdat'}[k]).checked=false;}
  else { const map={gpa:['fGpa',0],sgpa:['fSgpa',0],dat:['fDat',0],acc:['fAcc',0],is:['fIs',0],oos:['fOos',0],tu:['fTuition',130000]}; const m=map[k]; if(m){ setVal(m[0],m[1]); if(['gpa','sgpa','dat'].includes(k)) $('#'+m[0]+'N').value=''; } }
  syncChips(); renderGrid();});

function renderGrid(){
  $('#fFitWrap').hidden=!hasProfile();
  $('#fScoresFill').hidden=!hasProfile(); $('#fCoursesFill').hidden=!(state.profile.courses&&state.profile.courses.length);
  updateFbar();
  const list=S.filter(matches).sort(sorter(F.sort));
  $('#resultN').innerHTML=`<b>${list.length}</b> of ${S.length} schools`+(F.only?' · from shelf':'')+(gridMode==='detail'&&hasProfile()?' · <span style="color:#5de38a">Green</span> scores: your student is at or above the school’s average; <span style="color:#ffd60a">yellow</span>: below':'');
  $('#grid').classList.toggle('detail',gridMode==='detail');
  ROOT.querySelectorAll('#gridMode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===gridMode));
  $('#grid').innerHTML = list.length ? list.map(gridMode==='detail'?dcardHTML:cardHTML).join('') :
    `<div class="empty"><h3>No schools match</h3><p>Loosen a filter or clear the search to see more schools.</p></div>`;
}

/* ---- views ---- */
let view='browse';
const VIEWS=['browse','all','map','compare','board'];
function setView(v){
  view=v;
  ROOT.querySelectorAll('.tab,.mtab').forEach(t=>t.setAttribute('aria-selected',t.dataset.view===v));
  VIEWS.forEach(x=>{$('#view-'+x).hidden = x!==v;});
  renderView(); renderTray();
  OPTS.scrollToTop();
}
function renderView(){
  if(view==='all') renderGrid();
  if(view==='map') renderMap();
  if(view==='compare') renderCompare();
  if(view==='board') renderBoard();
}
ROOT.querySelectorAll('.tab,.mtab').forEach(t=>t.addEventListener('click',()=>{F.only=null;setView(t.dataset.view)}));
$('#q').addEventListener('input',e=>{F.q=e.target.value.trim(); if(F.q && view!=='all') setView('all'); else renderGrid();});

/* ---- apply state everywhere ---- */
function applyState(){
  computeChances();
  const n=Object.keys(state.list).length; $('#listCount').textContent=n||''; $('#cmpCount').textContent=state.compare.length||'';
  const mL=$('#mListCount'), mC=$('#mCmpCount'); if(mL) mL.textContent=n||''; if(mC) mC.textContent=state.compare.length||'';
  renderMeBtn(); renderHero(heroI); renderShelves();
  if(view==='board'){ const a=ROOT.activeElement; if(!(a && a.closest && a.closest('#board') && a.tagName==='TEXTAREA')) renderBoard(); }
  else renderView();
  renderTray();
  if(current){ renderSheetSave(); renderSheetCmp(); }
  if(!$('#pmBg').hidden) renderProfileSummary();
}
function renderMeBtn(){
  const b=$('#meBtn'), p=state.profile;
  if(!hasProfile()){ b.classList.add('empty'); $('#meLbl').textContent='Student Profile'; b.style.removeProperty('--l'); return; }
  const cs=[...CH.values()].filter(c=>c.tier!=='unknown'), L=cs.filter(c=>c.tier==='likely').length, T=cs.filter(c=>c.tier==='target').length, tot=cs.length||1;
  b.classList.remove('empty'); b.style.setProperty('--l',(L/tot*100)+'%'); b.style.setProperty('--t',((L+T)/tot*100)+'%');
  $('#meLbl').innerHTML=`Student Profile <small>${[p.gpa!=null?fx(p.gpa):null,p.aa!=null?p.aa+' AA':null].filter(Boolean).join(' · ')}</small>`;
}

/* ---- compare tray + view ---- */
function renderTray(){
  const t=$('#tray'), list=state.compare.map(n=>S.find(s=>s.name===n)).filter(Boolean);
  t.hidden = !list.length || view==='compare' || !!current;
  if(t.hidden) return;
  t.innerHTML=`<span class="lbl">Compare</span><span class="minis">${list.map(miniHTML).join('')}</span><button class="btn btn-primary" data-goto="compare">Compare ${list.length}</button><button class="x" data-cmp-clear="1" aria-label="Clear compare">Clear</button>`;
}

/* ---- visual compare ---- */
let vcCost='auto';
function visualCompare(list){
  const p=state.profile;
  const col=s=>`color-mix(in oklab, ${s.art.c1} 70%, white 30%)`;
  const name=s=>`<span class="vc-n"><i style="background:${col(s)}"></i>${esc(s.abbr)}</span>`;
  // 1. score ranges
  const scoreChart=(title,key,lo,hi,you,dec,floor,ceil)=>{
    const vals=list.flatMap(s=>[s[lo],s[hi],s[key]]).filter(v=>v!=null); if(you!=null) vals.push(you);
    if(!vals.length) return `<div class="vc-card"><h4>${title}</h4><p class="empty-b">No data for these schools.</p></div>`;
    const span=(Math.max(...vals)-Math.min(...vals))||1;
    let mn=Math.max(floor,Math.min(...vals)-span*.12), mx=Math.min(ceil,Math.max(...vals)+span*.12);
    const P=v=>((v-mn)/(mx-mn)*100).toFixed(2)+'%', f=v=>dec?(+v).toFixed(2):Math.round(v);
    const ticks=[0,1,2,3,4].map(i=>mn+(mx-mn)*i/4);
    return `<div class="vc-card"><div class="vc-h"><h4>${title}</h4><span>Bar = middle 90% of admitted · dot = average${you!=null?' · <b class="you">yellow line = you</b>':''}</span></div>
      <div class="vc-rows">${list.map(s=>`<div class="vc-row">${name(s)}<div class="vc-track">
        ${s[lo]!=null&&s[hi]!=null?`<div class="vc-band" style="left:${P(s[lo])};width:calc(${P(s[hi])} - ${P(s[lo])});background:${col(s)}"></div>`:''}
        ${s[key]!=null?`<div class="vc-mean" style="left:${P(s[key])}"><span>${f(s[key])}</span></div>`:'<span class="vc-na">No data</span>'}
        ${you!=null?`<div class="vc-you" style="left:${P(you)}"></div>`:''}</div></div>`).join('')}</div>
      <div class="vc-axis">${ticks.map(t=>`<span style="left:${P(t)}">${f(t)}</span>`).join('')}</div></div>`;
  };
  // 2. odds
  const pool=!p.home?null:p.home==='INTL'?'intl':'res';
  const myPool=s=>pool==='intl'?'intlOdds':pool==='res'?(s.st===p.home?'inOdds':'outOdds'):null;
  const series=[['acc','Overall acceptance'],['inOdds','In-state odds'],['outOdds','Out-of-state odds']];
  const oddsMax=Math.max(1,...list.flatMap(s=>series.map(([k])=>s[k]||0)));
  const odds=`<div class="vc-card vc-wide"><div class="vc-h"><h4>Acceptance odds</h4><span>${pool?'<b class="you">Gold outline = your student’s residency pool</b>':'Add your student’s home state in Student Profile to highlight their odds'}</span></div>
    <div class="vc-legend">${series.map(([k,l],i)=>`<span><i class="o${i}"></i>${l}</span>`).join('')}</div>
    <div class="vc-odds">${list.map(s=>`<div class="vc-og">${name(s)}<div class="vc-bars">${series.map(([k],i)=>{const v=s[k]; const mine=myPool(s)===k;
      return `<div class="vc-bw"><div class="vc-b o${i}${mine?' mine':''}" style="height:${v!=null?Math.max(2,v/oddsMax*100):0}%"></div><span class="vc-bv${mine?' mine':''}">${v!=null?pct(v):'—'}</span></div>`;}).join('')}</div></div>`).join('')}</div></div>`;
  // 3. cost
  const resFor=s=> vcCost==='res'?true: vcCost==='non'?false: (p.home&&p.home!=='INTL'&&s.st===p.home);
  const parts=s=>{const t=resFor(s)?s.res:s.non; return {t,fe:s.fees||0,rn:s.rent?s.rent*12:0,total:t!=null?t+(s.fees||0)+(s.rent?s.rent*12:0):null,yrs:s.len?s.len/12:4};};
  const C=list.map(s=>({s,...parts(s)}));
  const cmax=Math.max(1,...C.map(c=>c.total||0));
  const cheapest=Math.min(...C.filter(c=>c.total!=null).map(c=>c.total*c.yrs));
  const cost=`<div class="vc-card vc-wide"><div class="vc-h"><h4>Cost per year</h4>
      <span class="seg2" role="group" aria-label="Tuition type"><button data-vccost="auto" aria-pressed="${vcCost==='auto'}">For student</button><button data-vccost="res" aria-pressed="${vcCost==='res'}">Resident</button><button data-vccost="non" aria-pressed="${vcCost==='non'}">Non-resident</button></span></div>
    <div class="vc-legend"><span><i class="c0"></i>Tuition</span><span><i class="c1"></i>Fees, books, supplies</span><span><i class="c2"></i>Rent (12 × median 1-bed)</span></div>
    <div class="vc-rows">${C.map(c=>`<div class="vc-row vc-crow">${name(c.s)}<div class="vc-stack">${c.total==null?'<span class="vc-na">Tuition not in the sheet</span>':`
      <i class="c0" style="width:${c.t/cmax*100}%" title="Tuition ${moneyFull(c.t)}"></i><i class="c1" style="width:${c.fe/cmax*100}%" title="Fees ${moneyFull(c.fe)}"></i><i class="c2" style="width:${c.rn/cmax*100}%" title="Rent ${moneyFull(c.rn)}"></i>`}</div>
      <div class="vc-tot">${c.total!=null?`<b>${moneyFull(c.total)}</b><small>${moneyFull(c.total*c.yrs)} over ${Math.round(c.yrs*10)/10} yrs</small>${c.total*c.yrs===cheapest&&C.filter(x=>x.total!=null).length>1?'<em>Cheapest</em>':''}`:'<b>—</b>'}</div></div>`).join('')}</div>
    <p class="cap" style="margin:10px 0 0">${vcCost==='auto'?(p.home?'“For student” uses resident tuition at schools in your student’s home state and non-resident tuition elsewhere.':'Set your student’s home state in Student Profile for “For student”; until then it uses non-resident tuition.'):''} Totals are estimates from the sheet’s tuition, fees and rent.</p></div>`;
  return `<div class="pad vc"><div class="vc-title"><h2>Visual compare</h2><p>Scores, odds and cost at a glance. The full table is below.</p></div>
    <div class="vc-grid">${scoreChart('DAT Academic Average','aa','aaLo','aaHi',p.aa,false,200,600)}${scoreChart('Overall GPA','gpa','gpaLo','gpaHi',p.gpa,true,2,4)}${odds}${cost}</div></div>`;
}
ROOT.addEventListener('click',e=>{const b=e.target.closest('[data-vccost]'); if(b){ vcCost=b.dataset.vccost; renderCompare(); }});
function renderCompare(){
  const list=state.compare.map(n=>S.find(s=>s.name===n)).filter(Boolean);
  const listN=Object.keys(state.list).length;
  $('#cmpActs').innerHTML = list.length ? `<button class="btn btn-glass" data-cmp-clear="1">Clear all</button>` : '';
  if(!list.length){
    $('#cmpBody').innerHTML=`<div class="empty-big"><h3>Pick schools to compare</h3><p>Tap the compare icon on any card, or the Compare button inside a school, to add it here. Up to four at a time.</p>
      ${listN?`<button class="btn btn-primary" data-cmp-fill="list">Compare my first ${Math.min(4,listN)} saved schools</button>`:''}
      ${hasProfile()?`<button class="btn btn-glass" data-cmp-fill="fit" style="margin-left:8px">Compare my top 4 fits</button>`:''}</div>`;
    return;
  }
  const p=state.profile, me=s=>p.home && p.home!=='INTL' && s.st===p.home;
  const yearCost=s=>{const t=me(s)?s.res:(s.non??null); if(t==null) return null; return t+(s.fees||0)+(s.rent?s.rent*12:0);};
  const range=(s,mean,lo,hi,mn,mx,you)=>{ if(mean==null) return '<span class="v na">—</span>'; const P=v=>Math.max(0,Math.min(100,(v-mn)/(mx-mn)*100));
    return `<span class="v">${mean}</span>${lo!=null&&hi!=null?`<span style="color:var(--fg-3);font-size:12px"> · ${lo}–${hi}</span>`:''}<div class="mbar">${lo!=null&&hi!=null?`<i style="left:${P(lo)}%;width:${P(hi)-P(lo)}%"></i>`:''}<b style="left:${P(mean)}%"></b>${you!=null?`<u style="left:${P(you)}%"></u>`:''}</div>`; };
  const ROWS=[];
  if(hasProfile()) ROWS.push(['sec','Student’s chances'],
    ['Fit for student',s=>{const c=CH.get(s.id);return c?tierPill(c):'—';},s=>{const c=CH.get(s.id);return c?({likely:3,target:2,reach:1}[c.tier]??null):null;},'high'],
    ['Student’s acceptance odds',s=>{const c=CH.get(s.id); if(!p.home) return '<span class="v na">Add your student’s home state in Student Profile</span>'; return c&&c.odds!=null?`${pct(c.odds)} <span style="color:var(--fg-3);font-size:12px">${esc(c.pool.toLowerCase())}</span>`:'<span class="v na">No residency data</span>';},s=>{const c=CH.get(s.id);return c?c.odds:null;},'high'],
    ['Missing prerequisites',s=>{const c=CH.get(s.id); if(!p.courses) return '<span class="v na">Add courses in Student Profile</span>'; return c&&c.missing.length?`<span class="txt">${esc(c.missing.join(', '))}</span>`:'<span class="yes">None</span>';},s=>{const c=CH.get(s.id);return p.courses&&c?c.missing.length:null;},'low']);
  ROWS.push(['sec','Odds'],
    ['Acceptance rate',s=>pct(s.acc),s=>s.acc,'high'],['Interview rate',s=>pct(s.intv),s=>s.intv,'high'],
    ['In-state acceptance odds',s=>pct(s.inOdds),s=>s.inOdds,'high'],['Out-of-state acceptance odds',s=>pct(s.outOdds),s=>s.outOdds,'high'],
    ['In-state share of class',s=>pct(s.instate),null],['Applicants',s=>s.apps?Math.round(s.apps).toLocaleString():'—',null],['Class size',s=>s.size??'—',s=>s.size,'high'],
    ['sec','Scores'],
    ['DAT AA (mean · middle 90%)',s=>range(s,s.aa,s.aaLo,s.aaHi,300,600,p.aa),null],
    ['GPA (mean · middle 90%)',s=>range(s,s.gpa!=null?+s.gpa.toFixed(2):null,s.gpaLo,s.gpaHi,2.5,4,p.gpa),null],
    ['Science GPA',s=>fx(s.sgpa),null],
    ['sec','Cost'],
    ['Resident tuition',s=>s.resT?esc(s.resT):'—',s=>s.res,'low'],['Non-resident tuition',s=>s.nonT?esc(s.nonT):'—',s=>s.non,'low'],
    ['Fees, books, supplies',s=>moneyFull(s.fees),s=>s.fees,'low'],['Median rent (1-bed)',s=>s.rent?moneyFull(s.rent)+'/mo':'—',s=>s.rent,'low'],
    [p.home?'Est. yearly cost for student':'Est. yearly cost (non-resident)',s=>moneyFull(yearCost(s)),yearCost,'low'],
    ['sec','Program'],
    ['Institution',s=>esc(s.type||'—'),null],['Degree',s=>esc(s.deg||'—'),null],['Length',s=>s.len?s.len+' months':'—',null],['Starts',s=>esc(s.start||'—'),null],
    ['Application deadline',s=>esc(s.deadline||'—'),null],['Campus housing',s=>s.housing?(s.housing==='Yes'?'<span class="yes">Yes</span>':esc(s.housing)):'—',null],
    ['Interview format',s=>s.ivFormat?`<span class="txt">${esc(s.ivFormat)}</span>`:'—',null],
    ['sec','Requirements'],
    ['Shadowing',s=>s.shadow?`<span class="txt">${esc(s.shadow.length>110?s.shadow.slice(0,110)+'…':s.shadow)}</span>`:'—',s=>s.shadowHrs,'low'],
    ['Required courses',s=>s.req.length||'—',s=>s.req.length||null,'low']);
  const union=COURSES.filter(c=>list.some(s=>s.req.includes(c)||s.recd.includes(c)));
  union.forEach(c=>ROWS.push([c,s=>s.req.includes(c)?'<span class="yes">Required</span>':s.recd.includes(c)?'<span class="rec">Recommended</span>':'<span class="v na">—</span>',null]));
  const cols=list.length;
  let h=`<div class="cmp-wrap"><div class="cmp" style="grid-template-columns:minmax(150px,190px) repeat(${cols},minmax(220px,280px))">`;
  h+=`<div class="c rl hd"></div>`+list.map(s=>`<div class="c hd"><button class="card" data-id="${s.id}" style="--rc:${RCOL[s.region]};--glow:hsl(${s.art.h1} 90% 55% / .55)" aria-label="${esc(s.name)}, open details"><div class="poster">${artHTML(s)}<div class="gloss"></div>${CH.get(s.id)?`<div class="tag">${tierPill(CH.get(s.id))}</div>`:''}</div></button>
    <div class="nm">${esc(s.name)}</div><div class="sub">${esc(s.place===s.region?s.place:s.place+' · '+s.region)}</div><div class="row"><button data-id-open="${s.id}">Details</button><button data-cmp="${esc(s.name)}">Remove</button></div></div>`).join('');
  for(const r of ROWS){
    if(r[0]==='sec'){ h+=`<div class="sec">${esc(r[1])}</div>`; continue; }
    const [label,show,num,better]=r;
    let best=null;
    if(num && cols>1){ const vals=list.map(num).filter(v=>v!=null); if(vals.length>1 && new Set(vals).size>1) best=better==='high'?Math.max(...vals):Math.min(...vals); }
    h+=`<div class="c rl">${esc(label)}</div>`+list.map(s=>{const v=num?num(s):null; return `<div class="c${best!=null&&v===best?' best':''}"><span class="v">${show(s)}</span></div>`;}).join('');
  }
  h+=`<div class="c rl">Links</div>`+list.map(s=>`<div class="c">${[[s.web,'Website'],[s.yt,'Video tour']].filter(([u])=>/^https?:/.test(u||'')).map(([u,l])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${l} ↗</a>`).join(' · ')||'—'}</div>`).join('');
  h+=`</div></div>`;
  $('#cmpBody').innerHTML=visualCompare(list)+'<div class="pad vc-title" style="margin-top:34px"><h2>Full comparison</h2><p>Every field side by side. Green marks the best value in each row.</p></div>'+h;
}

/* ---- map ---- */
const GEO = DATA.geo;
let mapSel=null, mapMetric='count', mapHover=null;
const TIERC={likely:'#30d158',target:'#ffd60a',reach:'#ff6961',unknown:'#8e8e93'};
const GOLD='#f6d43f';
/* spread overlapping dots (same city) into a small ring */
(function spread(){
  const pts=S.map(s=>({s,p:GEO.pts[s.name]?[...GEO.pts[s.name]]:null})).filter(x=>x.p);
  const used=new Set();
  pts.forEach((a,i)=>{ if(used.has(i)) return; const grp=[i]; pts.forEach((b,j)=>{ if(j!==i&&!used.has(j)&&Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])<9) grp.push(j); });
    if(grp.length>1){ const cx=grp.reduce((t,k)=>t+pts[k].p[0],0)/grp.length, cy=grp.reduce((t,k)=>t+pts[k].p[1],0)/grp.length, r=5+grp.length*1.6;
      grp.forEach((k,n)=>{ const ang=-Math.PI/2+n*2*Math.PI/grp.length; pts[k].p=[cx+r*Math.cos(ang),cy+r*Math.sin(ang)]; used.add(k); }); }
  });
  pts.forEach(({s,p})=>{ s.mx=p[0]; s.my=p[1]; });
})();
const METRICS={
  count:{label:'Number of schools',val:l=>l.length||null,fmt:v=>v+(v===1?' school':' schools'),lo:'#1b2d55',hi:'#5aa8ff',good:'high'},
  acc:{label:'Average acceptance rate',val:l=>avgOf(l,'acc'),fmt:v=>pct(v),lo:'#4a1730',hi:'#30d158',good:'high'},
  tuition:{label:'Average resident tuition',val:l=>avgOf(l,'res'),fmt:v=>money(v),lo:'#30d158',hi:'#5a1a2a',good:'low'},
  instate:{label:'In-state share of class',val:l=>avgOf(l,'instate'),fmt:v=>pct(v),lo:'#2a1f55',hi:'#bf5af2',good:'high'},
  chances:{label:'Student’s best chance',val:l=>{const t=l.map(s=>CH.get(s.id)).filter(c=>c&&c.tier!=='unknown').map(c=>({reach:1,target:2,likely:3}[c.tier])); return t.length?Math.max(...t):null;},fmt:v=>['','Reach','Target','Likely'][v],tier:true},
};
function avgOf(l,k){const v=l.map(s=>s[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
function mix(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((x,i)=>Math.round(x+(B[i]-x)*t).toString(16).padStart(2,'0')).join('');}
function schoolsIn(ab){ return S.filter(s=>s.st===ab); }
function stateFill(ab){
  const l=schoolsIn(ab); const M=METRICS[mapMetric];
  if(!l.length) return null;
  const v=M.val(l); if(v==null) return '#1a1e2a';
  if(M.tier) return {1:'#6b2a2a',2:'#6b5a12',3:'#1d5a30'}[v];
  const all=Object.keys(GEO.states).map(a=>{const x=schoolsIn(a); return x.length?M.val(x):null;}).filter(x=>x!=null);
  const mn=Math.min(...all), mx=Math.max(...all), t=mx>mn?(v-mn)/(mx-mn):1;
  return mix(M.lo,M.hi,t);
}
function legendHTML(){
  const M=METRICS[mapMetric];
  if(M.tier) return hasProfile()?`<span class="lg-t"><i style="background:#1d5a30"></i>Likely</span><span class="lg-t"><i style="background:#6b5a12"></i>Target</span><span class="lg-t"><i style="background:#6b2a2a"></i>Reach</span>`:`<span class="lg-note">Set up a Student Profile to color the map by your student’s odds.</span>`;
  const all=Object.keys(GEO.states).map(a=>{const x=schoolsIn(a); return x.length?M.val(x):null;}).filter(x=>x!=null);
  const mn=Math.min(...all), mx=Math.max(...all);
  return `<span class="lg-v">${M.fmt(mn)}</span><span class="lg-bar" style="background:linear-gradient(90deg,${M.lo},${M.hi})"></span><span class="lg-v">${M.fmt(mx)}</span><span class="lg-note">${M.good==='low'?'Green = cheaper':'Brighter = higher'}</span>`;
}
function arcsHTML(){
  const h=state.profile.home; if(!h||h==='INTL'||!GEO.states[h]) return '';
  const H=GEO.states[h], list=S.filter(s=>isSaved(s.name)&&s.mx!=null);
  return list.map((s,i)=>{ const dx=s.mx-H.cx, dy=s.my-H.cy, dist=Math.hypot(dx,dy); if(dist<6) return '';
    const mx=(H.cx+s.mx)/2, my=(H.cy+s.my)/2 - dist*.28;
    return `<path class="arc" d="M${H.cx} ${H.cy} Q${mx.toFixed(1)} ${my.toFixed(1)} ${s.mx.toFixed(1)} ${s.my.toFixed(1)}" style="--len:${Math.round(dist*1.25)};animation-delay:${i*90}ms"/>`; }).join('');
}
function renderMap(){
  if(!mapSel){ const h=state.profile.home; mapSel = h && schoolsIn(h).length ? h : 'CA'; }
  const home=state.profile.home, prefRe = home && home!=='INTL' && NAME_OF[home] ? new RegExp('\\b('+NAME_OF[home]+'|'+home+')\\b') : null;
  $('#mapMetric').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.metric===mapMetric));
  const st=Object.entries(GEO.states).map(([ab,v])=>{ const f=stateFill(ab); const n=schoolsIn(ab).length;
    return `<path class="stp${n?' has':''}${mapSel===ab?' sel':''}${home===ab?' home':''}" data-st="${ab}" d="${v.d}" style="fill:${f||(v.c==='CA'?'#120f16':'#0e1119')}"><title>${esc(v.n)}${n?` · ${n} school${n===1?'':'s'}`:''}</title></path>`; }).join('');
  const dots=S.filter(s=>s.mx!=null).map(s=>{ const c=CH.get(s.id), col=c?TIERC[c.tier]:GOLD, r=s.size?Math.max(3.2,Math.min(7.5,Math.sqrt(s.size)*.55)):3.4, d=nextDeadline(s), urgent=d&&d.days<=30&&!s.isNew;
    const pref=prefRe && s.prefStates && prefRe.test(s.prefStates);
    return `<g class="dot${isSaved(s.name)?' saved':''}${pref?' pref':''}" data-dot="${s.id}" transform="translate(${s.mx.toFixed(1)} ${s.my.toFixed(1)})" style="--c:${col}" tabindex="0" role="button" aria-label="${esc(s.name)}">
      ${urgent?`<circle class="pulse" r="${r}"/>`:''}<circle class="halo" r="${r*2.6}"/><circle class="core" r="${r}"/>${isSaved(s.name)?`<circle class="ring" r="${r+3}"/>`:''}</g>`; }).join('');
  const H=home&&GEO.states[home];
  const I=GEO.inset;
  $('#geoMap').innerHTML=`<defs><radialGradient id="dotHalo"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="arcG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path class="others" d="${GEO.others}"/>
    <g class="states">${st}</g>
    <rect class="inset" x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}" rx="10"/><text class="inset-l" x="${I.x+10}" y="${I.y+14}">PUERTO RICO</text>
    <g class="arcs">${arcsHTML()}</g>
    ${H?`<g class="homemk" transform="translate(${H.cx} ${H.cy})"><circle r="11" class="hm1"/><circle r="4.5" class="hm2"/><text y="-16">HOME</text></g>`:''}
    <g class="dots" filter="url(#glow)">${dots}</g>`;
  $('#mapLegend').innerHTML=`<span class="lg-h">${esc(METRICS[mapMetric].label)}</span>${legendHTML()}`;
  const mine=S.filter(s=>isSaved(s.name)).length;
  $('#mapHint').innerHTML = !home ? `<button class="linkbtn" data-profile="1">Set your student’s home state</button> to see arcs to their schools and in-state glow.` :
    home==='INTL' ? 'Arcs need a US state or Canadian province as your student’s home.' :
    mine ? `Arcs connect ${esc(NAME_OF[home]||home)} to your student’s ${mine} saved school${mine===1?'':'s'}. Gold-ringed dots give ${esc(NAME_OF[home]||home)} residents preference.` : `Add schools to My Schools to draw arcs from ${esc(NAME_OF[home]||home)}.`;
  renderMapSide();
}
function renderMapSide(){
  const list=schoolsIn(mapSel).sort((a,b)=>a.name.localeCompare(b.name));
  const nm=NAME_OF[mapSel]||mapSel;
  const M=METRICS[mapMetric], v=list.length?M.val(list):null;
  $('#mapSide').innerHTML=`<div class="side-h"><h2>${esc(nm)}</h2>${state.profile.home===mapSel?'<span class="tier likely" style="background:#fff;color:#000">Home</span>':''}</div>
    <div class="sub">${list.length} school${list.length===1?'':'s'}${v!=null&&mapMetric!=='count'?` · ${esc(M.label.toLowerCase())}: <b>${esc(M.fmt(v))}</b>`:''}</div>
    <div class="slist">${list.length?list.map(s=>{const c=CH.get(s.id),d=nextDeadline(s);return `<button class="srow" data-id-open="${s.id}">${miniHTML(s)}<span class="t"><b>${esc(s.name)}</b><span>${esc([s.type,s.size?s.size+' seats':null,s.resT?s.resT+' res.':null].filter(Boolean).join(' · '))}</span></span><span class="r">${c?tierPill(c):`<b>${pct(s.acc)}</b>accept`}${d&&d.days<=30?`<em class="soon">Due in ${d.days}d</em>`:''}</span></button>`;}).join(''):'<p class="empty-b">No dental schools here yet.</p>'}</div>
    ${list.length?`<button class="btn btn-glass" style="margin-top:14px" data-map-grid="${mapSel}">Show in All Schools</button>`:''}`;
}
function mapTip(s,ev){
  const t=$('#mapTip'); if(!s){ t.hidden=true; return; }
  const c=CH.get(s.id), d=nextDeadline(s);
  t.innerHTML=`<div class="mt-art">${artHTML(s)}</div><div class="mt-b"><b>${esc(s.name)}</b><span>${esc(s.loc||'')}</span>
    <div class="mt-s"><div><i>Accept</i>${pct(s.acc)}</div><div><i>DAT AA</i>${s.aa??'—'}</div><div><i>Tuition</i>${money(s.res)}</div></div>
    <div class="mt-f">${c?tierPill(c):''}${d?`<span class="${d.days<=30?'soon':''}">Due ${d.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})}${d.days<=30?` · ${d.days}d`:''}</span>`:''}</div></div>`;
  t.hidden=false;
  const box=$('#mapStage').getBoundingClientRect(), tw=t.offsetWidth, th=t.offsetHeight;
  let x=ev.clientX-box.left+16, y=ev.clientY-box.top+16; if(x+tw>box.width) x=ev.clientX-box.left-tw-16; if(y+th>box.height) y=ev.clientY-box.top-th-16;
  t.style.transform=`translate(${Math.max(0,x)}px,${Math.max(0,y)}px)`;
}
$('#geoMap').addEventListener('pointermove',e=>{ const g=e.target.closest('[data-dot]'); mapTip(g?S[+g.dataset.dot]:null,e); });
$('#geoMap').addEventListener('pointerleave',()=>mapTip(null));
$('#geoMap').addEventListener('click',e=>{ const g=e.target.closest('[data-dot]'); if(g){ mapTip(null); openSheet(S[+g.dataset.dot]); return; }
  const p=e.target.closest('[data-st]'); if(p){ mapSel=p.dataset.st; $('#geoMap').querySelectorAll('.stp.sel').forEach(x=>x.classList.remove('sel')); p.classList.add('sel'); renderMapSide(); } });
$('#geoMap').addEventListener('keydown',e=>{ const g=e.target.closest('[data-dot]'); if(g&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); openSheet(S[+g.dataset.dot]); } });
$('#mapMetric').addEventListener('click',e=>{ const b=e.target.closest('[data-metric]'); if(!b) return; mapMetric=b.dataset.metric; renderMap(); });

/* ---- board ---- */
function nextDeadline(s){
  const v=String(s.deadline||''); let m=v.match(/^(\d{1,2})\/(\d{1,2})/), mo, d;
  if(m){mo=+m[1]-1; d=+m[2];}
  else { const mm=v.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*(\d{1,2})/i); if(!mm) return null; mo=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(mm[1].toLowerCase()); d=+mm[2]; }
  const now=new Date(); now.setHours(0,0,0,0); let dt=new Date(now.getFullYear(),mo,d); if(dt<now) dt=new Date(now.getFullYear()+1,mo,d);
  return {date:dt, days:Math.round((dt-now)/864e5)};
}
function renderBoard(){
  const entries=Object.entries(state.list).map(([n,v])=>({s:S.find(x=>x.name===n),v})).filter(e=>e.s);
  const dls=entries.filter(e=>!['submitted','interview','accepted','closed'].includes(e.v.stage)).map(e=>({e,d:nextDeadline(e.s)})).filter(x=>x.d).sort((a,b)=>a.d.days-b.d.days);
  const nd=dls[0];
  const stepsDone=entries.reduce((a,e)=>a+STEPS.filter(([k])=>e.v.steps&&e.v.steps[k]).length,0), stepsAll=entries.length*STEPS.length;
  $('#boardKpis').innerHTML = entries.length ? `<div class="kpi"><div class="l">Schools</div><div class="v">${entries.length}</div></div>
    <div class="kpi"><div class="l">Submitted+</div><div class="v">${entries.filter(e=>['submitted','interview','accepted'].includes(e.v.stage)).length}</div></div>
    <div class="kpi"><div class="l">Interviews</div><div class="v">${entries.filter(e=>e.v.stage==='interview').length}</div></div>
    <div class="kpi"><div class="l">Accepted</div><div class="v" style="color:var(--good)">${entries.filter(e=>e.v.stage==='accepted').length}</div></div>
    <div class="kpi"><div class="l">Steps done</div><div class="v">${stepsAll?Math.round(stepsDone/stepsAll*100):0}<small>%</small></div></div>
    ${nd?`<div class="kpi" style="flex:1;min-width:220px"><div class="l">Next deadline</div><div class="v" style="font-size:17px;letter-spacing:-.01em">${esc(nd.e.s.abbr)} · ${nd.d.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})} <small>in ${nd.d.days} days</small></div></div>`:''}` : '';
  if(!entries.length){ $('#board').innerHTML=`<div class="empty-big" style="grid-column:1/-1;margin:0"><h3>No schools tracked yet</h3><p>Tap + on any school card to add it here. It starts in Researching; drag it along as the application moves.</p>${hasProfile()?'<button class="btn btn-primary" data-track-fits="1">Add my top 8 fits</button>':'<button class="btn btn-primary" data-goto="all">Browse schools</button>'}</div>`; return; }
  $('#board').innerHTML=STAGES.map(([k,l,c])=>{const items=entries.filter(e=>e.v.stage===k).sort((a,b)=>(nextDeadline(a.s)?.days??999)-(nextDeadline(b.s)?.days??999));
    return `<section class="col" data-stage="${k}"><div class="col-h" style="--c:${c}"><i></i>${l}<span>${items.length}</span></div><div class="col-b">${items.length?items.map(tcardHTML).join(''):'<div class="col-empty">Drop a school here</div>'}</div></section>`;}).join('');
}
function tcardHTML({s,v}){
  return `<article class="tcard tcard-d" draggable="true" data-card="${esc(s.name)}">
    ${dcardHTML(s)}
    <div class="bd"><div class="bd-l">Application progress</div>
      <div class="prog">${STEPS.map(([k,l])=>`<button aria-pressed="${!!(v.steps&&v.steps[k])}" data-step="${k}" title="${l}">${l}</button>`).join('')}</div>
      <div class="foot"><select aria-label="Stage for ${esc(s.name)}" data-stage-sel="1">${STAGES.map(([k,l])=>`<option value="${k}"${k===v.stage?' selected':''}>${l}</option>`).join('')}</select><button class="ib" data-notes="1">${v.notes?'Notes •':'Notes'}</button><button class="ib" data-untrack="1" aria-label="Remove ${esc(s.name)}">✕</button></div>
      <textarea data-note-area="1" placeholder="Notes: contacts, essay prompts, interview dates…" ${v.notes?'':'hidden'}>${esc(v.notes)}</textarea>
    </div></article>`;
}
const boardEl=$('#board');
boardEl.addEventListener('dragstart',e=>{const c=e.target.closest('.tcard'); if(!c) return; e.dataTransfer.setData('text/plain',c.dataset.card); e.dataTransfer.effectAllowed='move'; c.classList.add('dragging');});
boardEl.addEventListener('dragend',e=>{const c=e.target.closest('.tcard'); if(c) c.classList.remove('dragging'); ROOT.querySelectorAll('.col.over').forEach(x=>x.classList.remove('over'));});
boardEl.addEventListener('dragover',e=>{const col=e.target.closest('.col'); if(!col) return; e.preventDefault(); ROOT.querySelectorAll('.col.over').forEach(x=>x!==col&&x.classList.remove('over')); col.classList.add('over');});
boardEl.addEventListener('drop',e=>{const col=e.target.closest('.col'); if(!col) return; e.preventDefault(); const n=e.dataTransfer.getData('text/plain'); if(state.list[n]){ state.list[n].stage=col.dataset.stage; save(); renderBoard(); }});
boardEl.addEventListener('change',e=>{ if(!e.target.matches('[data-stage-sel]')) return; const n=e.target.closest('.tcard').dataset.card; state.list[n].stage=e.target.value; save(); renderBoard(); });
boardEl.addEventListener('input',e=>{ if(!e.target.matches('[data-note-area]')) return; const n=e.target.closest('.tcard').dataset.card; state.list[n].notes=e.target.value.slice(0,4000); save(); });
boardEl.addEventListener('click',e=>{
  const card=e.target.closest('.tcard'); if(!card) return; const n=card.dataset.card, v=state.list[n];
  const st=e.target.closest('[data-step]'); if(st){ v.steps=v.steps||{}; v.steps[st.dataset.step]=!v.steps[st.dataset.step]; st.setAttribute('aria-pressed',!!v.steps[st.dataset.step]); save(); renderBoard(); return; }
  if(e.target.closest('[data-notes]')){ const t=card.querySelector('textarea'); t.hidden=!t.hidden; if(!t.hidden) t.focus(); return; }
  if(e.target.closest('[data-untrack]')){ delete state.list[n]; save(); applyState(); }
});

/* ---- 3D tilt ---- */
if(matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  let raf=0;
  ROOT.addEventListener('pointermove',e=>{ const p=e.target.closest&&e.target.closest('.card .poster'); if(!p) return; cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{const r=p.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
      p.style.setProperty('--ry',((x-.5)*11).toFixed(2)+'deg'); p.style.setProperty('--rx',((.5-y)*9).toFixed(2)+'deg');
      p.style.setProperty('--mx',Math.round(x*100)+'%'); p.style.setProperty('--my',Math.round(y*100)+'%');});},{passive:true});
  ROOT.addEventListener('pointerout',e=>{const p=e.target.closest&&e.target.closest('.card .poster'); if(p && !p.contains(e.relatedTarget)){['--rx','--ry'].forEach(k=>p.style.removeProperty(k));}});
}
function countUp(root){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-count]').forEach(el=>{
    const end=parseFloat(el.dataset.count), dec=+(el.dataset.dec||0), t0=performance.now(), dur=900;
    if(isNaN(end)) return; const fmt=v=>dec?v.toFixed(dec):Math.round(v).toLocaleString();
    const step=t=>{const k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3); el.textContent=fmt(end*e); if(k<1) requestAnimationFrame(step); else el.textContent=fmt(end);};
    requestAnimationFrame(step);
  });
}


/* ---- opening animation ---- */
function playIntro(force){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(!force){ try{ if(sessionStorage.getItem('dsa-intro')) return; sessionStorage.setItem('dsa-intro','1'); }catch(e){ return; } }
  ROOT.querySelector('.intro')?.remove();
  const pool=[...S].sort((a,b)=>hash(a.name+'i')-hash(b.name+'i'));
  const tiles=[]; for(let i=0;i<60;i++) tiles.push(pool[i%pool.length]);
  const word='Dental School Guide';
  const el=document.createElement('div'); el.className='intro'; el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="intro-wall">${tiles.map((s,i)=>`<div class="it" style="--d:${(Math.floor(i/10)*60+(i%10)*35+((i*37)%7)*20)}ms">${artHTML(s)}</div>`).join('')}</div>
    <div class="intro-logo"><div class="intro-mark brand-logo"></div>
      <div class="intro-word">${[...word].map((c,i)=>`<span style="--d:${650+i*32}ms">${c===' '?'&nbsp;':esc(c)}</span>`).join('')}</div>
      <div class="intro-sub">Research · Compare · Apply</div></div>
    <div class="intro-skip">Click anywhere to skip</div>`;
  ROOT.appendChild(el);
  document.body.style.overflow='hidden';
  let done=false;
  const finish=()=>{ if(done) return; done=true; el.classList.add('out'); document.body.style.overflow=''; revealPage(); setTimeout(()=>el.remove(),500); document.removeEventListener('keydown',finish); };
  el.addEventListener('click',finish); onDoc('keydown',finish,{once:true});
  setTimeout(finish,2450);
}
function revealPage(){
  ROOT.querySelectorAll('.hero-copy > *').forEach((c,k)=>c.style.setProperty('--k',k));
  ROOT.querySelectorAll('#shelves .shelf').forEach((sh,i)=>{ sh.style.setProperty('--i',Math.min(i,4)); sh.querySelectorAll('.rail > *').forEach((c,j)=>c.style.setProperty('--j',Math.min(j,7))); });
  ROOT.host.classList.remove('intro-run'); void ROOT.host.offsetWidth; ROOT.host.classList.add('intro-run');
  clearTimeout(revealPage.t); revealPage.t=setTimeout(()=>ROOT.host.classList.remove('intro-run'),2600);
}
ROOT.addEventListener('click',e=>{ if(e.target.closest('[data-replay]')){ setView('browse'); OPTS.scrollToTop(); playIntro(true); } });

/* ---- profile modal ---- */
let pmCloseT=null;
function openProfile(){
  clearTimeout(pmCloseT);
  const p=state.profile;
  const homes=[['','Choose…'],...Object.entries(ABBR).filter(([n,a])=>!CA_PROV.includes(a)).sort((a,b)=>a[0].localeCompare(b[0])).map(([n,a])=>[a,n]),...CA_PROV.map(a=>[a,NAME_OF[a]+' (Canada)']),['INTL','International applicant']];
  $('#pm').innerHTML=`<button class="close" id="pmClose" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="pm-h"><span class="eyebrow"><span class="dot" style="--rc:var(--good)"></span><span>Student Profile</span></span><h2 id="pmTitle">Your student’s profile</h2>
    <p>Enter what you know about your student. Every school gets a Reach, Target or Likely label from its GPA and DAT averages and the odds for their residency.</p></div>
    <div class="pm-b">
      <div class="pf">
        <label for="pGpa">Overall GPA<input id="pGpa" type="number" inputmode="decimal" step="0.01" min="0" max="4.3" placeholder="3.60" value="${p.gpa??''}"></label>
        <label for="pSgpa">Science GPA<input id="pSgpa" type="number" inputmode="decimal" step="0.01" min="0" max="4.3" placeholder="3.50" value="${p.sgpa??''}"></label>
        <label for="pAa">DAT AA<input id="pAa" type="number" inputmode="numeric" step="10" min="200" max="600" placeholder="450" value="${p.aa??''}"></label>
        <label for="pOld">Old DAT AA (1–30)<input id="pOld" type="number" inputmode="decimal" step="0.1" min="1" max="30" placeholder="19.5"></label>
        <label for="pShadow">Shadowing hours<input id="pShadow" type="number" inputmode="numeric" step="5" min="0" placeholder="80" value="${p.shadow??''}"></label>
        <label for="pGender">Gender<select id="pGender"><option value="">Prefer not to say</option><option value="men"${p.gender==='men'?' selected':''}>Man</option><option value="women"${p.gender==='women'?' selected':''}>Woman</option></select></label>
        <label for="pEth">Ethnicity<select id="pEth"><option value="">Prefer not to say</option>${RACES.filter(r=>r!=='Unkown').map(r=>`<option value="${esc(r)}"${p.eth===r?' selected':''}>${esc(r)}</option>`).join('')}</select></label>
        <label for="pHome" style="grid-column:span 2">Home state or province<select id="pHome">${homes.map(([v,l])=>`<option value="${v}"${p.home===v?' selected':''}>${esc(l)}</option>`).join('')}</select></label>
      </div>
      <div><div class="bt" style="margin-bottom:10px">Courses your student has completed or will finish before matriculating</div>
        <div class="chips" id="pCourses">${COURSES.map(c=>`<button class="chip" aria-pressed="${!!(p.courses&&p.courses.includes(c))}" data-course="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="pm-sum" id="pmSum"></div>
      <div class="pm-foot"><span class="note2">Saved ${dbRef?'to your account, so it follows you across devices':'in this browser'}. Only you can see it. A rough guide from the sheet’s averages, not a prediction.</span>
        <button class="btn btn-glass" id="pmClear">Clear profile</button><button class="btn btn-primary" id="pmDone">See matching schools</button></div>
    </div>`;
  const bg=$('#pmBg'); bg.hidden=false; document.body.style.overflow='hidden'; requestAnimationFrame(()=>bg.classList.add('open'));
  renderProfileSummary();
  const read=()=>{const g=id=>{const v=parseFloat($('#'+id).value);return isNaN(v)?null:v;};
    Object.assign(state.profile,{gpa:g('pGpa'),sgpa:g('pSgpa'),aa:g('pAa'),shadow:g('pShadow'),home:$('#pHome').value,gender:$('#pGender').value,eth:$('#pEth').value});
    state.profile=normalize({profile:state.profile}).profile; save(); applyState();};
  let t; $('#pm').addEventListener('input',e=>{ if(e.target.matches('input,select')){ clearTimeout(t); t=setTimeout(read,300);} });
  $('#pHome').addEventListener('change',read); $('#pGender').addEventListener('change',read); $('#pEth').addEventListener('change',read);
  $('#pOld').addEventListener('input',()=>{ const v=oldToNew($('#pOld').value); if(v!=null){ $('#pAa').value=v; clearTimeout(t); t=setTimeout(read,300);} });
  $('#pCourses').addEventListener('click',e=>{const b=e.target.closest('[data-course]'); if(!b) return; const c=b.dataset.course; const cs=new Set(state.profile.courses||[]); cs.has(c)?cs.delete(c):cs.add(c); state.profile.courses=[...cs]; b.setAttribute('aria-pressed',cs.has(c)); save(); applyState();});
  $('#pmClose').onclick=closeProfile;
  $('#pmDone').onclick=()=>{ read(); closeProfile(); if(hasProfile()){ resetFilters(); F.sort='fit-d'; $('#fSort').value='fit-d'; setView('all'); } };
  $('#pmClear').onclick=()=>{ state.profile=normalize({}).profile; save(); applyState(); openProfile(); };
  $('#pGpa').focus({preventScroll:true});
}
function renderProfileSummary(){
  const el=$('#pmSum'); if(!el) return;
  if(!hasProfile()){ el.innerHTML='<div class="kpi" style="flex:1"><div class="l">Status</div><div class="v" style="font-size:16px">Add a GPA or DAT score to see their labels</div></div>'; return; }
  const cs=[...CH.values()], k=t=>cs.filter(c=>c.tier===t).length;
  el.innerHTML=[['likely','Likely'],['target','Target'],['reach','Reach']].map(([t,l])=>`<div class="kpi"><div class="l">${l}</div><div class="v" style="color:${TIERC[t]}">${k(t)}<small> schools</small></div></div>`).join('')+`<div class="kpi"><div class="l">No data yet</div><div class="v" style="color:var(--fg-3)">${k('unknown')}</div></div>`;
}
function closeProfile(){ const bg=$('#pmBg'); bg.classList.remove('open'); if(!current) document.body.style.overflow=''; clearTimeout(pmCloseT); pmCloseT=setTimeout(()=>{bg.hidden=true;},300); if(current) openSheet(current); }
$('#pmBg').addEventListener('click',e=>{if(e.target.id==='pmBg')closeProfile();});
$('#meBtn').addEventListener('click',openProfile);

/* ---- global clicks ---- */
ROOT.addEventListener('click',e=>{
  const h=e.target.closest('[data-heart]'); if(h){e.preventDefault();e.stopPropagation();toggleSave(h.dataset.heart);return;}
  const cm=e.target.closest('[data-cmp]'); if(cm){e.preventDefault();e.stopPropagation();toggleCompare(cm.dataset.cmp);return;}
  if(e.target.closest('[data-cmp-clear]')){state.compare=[];save();applyState();return;}
  const cf=e.target.closest('[data-cmp-fill]'); if(cf){ state.compare = cf.dataset.cmpFill==='list' ? Object.keys(state.list).slice(0,4) : bestFits().slice(0,4).map(s=>s.name); save(); applyState(); return; }
  if(e.target.closest('[data-profile]')){openProfile();return;}
  if(e.target.closest('[data-track-fits]')){ bestFits().slice(0,8).forEach(s=>{ if(!state.list[s.name]) state.list[s.name]={stage:'research',notes:'',steps:{},added:Date.now()}; }); save(); applyState(); return; }
  const op=e.target.closest('[data-id-open]'); if(op){openSheet(S[+op.dataset.idOpen]);return;}
  const c=e.target.closest('.card'); if(c){vtSource=c.querySelector('.poster'); openSheet(S[+c.dataset.id]);return;}
  const m=e.target.closest('[data-shelf]'); if(m){const sh=shelves[+m.dataset.shelf]; resetFilters(); F.only=new Set(sh.items.map(s=>s.id)); if(sh.sort){F.sort=sh.sort;$('#fSort').value=sh.sort;} setView('all'); return;}
  const ft=e.target.closest('[data-fit]'); if(ft){ resetFilters(); if(ft.dataset.fit!=='all'){ F.fit.add(ft.dataset.fit); ROOT.querySelector(`[data-fit-chip="${ft.dataset.fit}"]`).setAttribute('aria-pressed','true'); } F.sort='fit-d'; $('#fSort').value='fit-d'; setView('all'); return; }
  const mg=e.target.closest('[data-map-grid]'); if(mg){ resetFilters(); F.only=new Set(S.filter(s=>s.st===mg.dataset.mapGrid).map(s=>s.id)); setView('all'); return; }
  const g=e.target.closest('[data-goto]'); if(g){ if(current) closeSheet(); setView(g.dataset.goto);return;}
});

/* ---- detail sheet ---- */
let current=null, lastFocus=null;
const isURL = v => /^https?:\/\//.test(v||'');
const pn = v => { if(v==null) return null; const n=parseFloat(String(v).replace(/[$,%\s]/g,'')); return isNaN(n)?null:n; };
const I = {
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  flask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>',
  dollar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 6.5C16 5 14.3 4.5 12 4.5c-3 0-4.5 1.5-4.5 3.3 0 4.5 9.5 2.4 9.5 7.6 0 2-1.8 3.6-5 3.6-2.4 0-4.2-.8-5.2-2.4"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};
const NICE = {
  'CODA Accredited':'CODA accredited','Mean Age of Enrollees':'Mean age of enrollees',
  'Is it Required?':'DAT required','DAT must be takin within how many years of application?':'Score must be within','How repeated attempts are treated':'Repeat attempts',
  'Canadian DAT accepted and how it is treated if accepted':'Canadian DAT','Stated Minimum DAT to Apply':'Minimum DAT to apply','Most Weighted DAT Sections':'Most weighted sections',
  'Stated Minimum GPA to Apply':'Minimum GPA to apply','Stated Minimum sGPA to Apply':'Minimum science GPA','Required Minimum Grade (required classes only)':'Minimum grade in prereqs',
  'Classes Expire within how many years of applying?':'Course expiration','How masters or post-bacc GPA is treated':'Master’s / post-bacc GPA','How course rigor is treated':'Course rigor',
  'How GPA trend is treated':'GPA trend','Additional information':'Additional information',
  'Traditional predoctoral program open to IDGs?':'Traditional DDS/DMD open to international dentists','Advanced standing program offered for IDGs?':'Advanced standing program for international dentists',
  'Format':'Interview format','Scoring Rubric Information':'Scoring rubric','Online Coursework Accepted':'Online coursework','Online Labs Accepted':'Online labs','Additional comments':'Additional comments',
  'Grading System':'Grading system','Type of Institution':'Institution','Start Month':'Start month','Length of Program (months)':'Program length','Doctoral Dental Degree Offered':'Degree','Campus Housing':'Campus housing',
};
const LVL = s => /very/i.test(s)?'v':/moder/i.test(s)?'m':'';

function makeGet(s){
  const m=new Map();
  s.s.forEach(([g,f])=>f.forEach(([sub,lab,v])=>m.set(g+'|'+sub+'|'+lab,{g,sub,lab,v,used:false})));
  return {
    get(g,sub,lab){const e=m.get(g+'|'+sub+'|'+lab); if(!e) return null; e.used=true; return e.v;},
    all(g,test){return [...m.values()].filter(e=>e.g===g && test(e));},
    left(gs){return [...m.values()].filter(e=>!e.used && gs.includes(e.g));},
    use(list){list.forEach(e=>e.used=true); return list;},
    count:m.size,
  };
}
function yn(v){ if(/^yes/i.test(v)) return `<span class="ic y">${I.check}</span>`; if(/^no\b/i.test(v)) return `<span class="ic n">${I.x}</span>`; return ''; }
function valHTML(v){
  if(isURL(v)) return `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])} ↗</a>`;
  return esc(v);
}
function factLabel(e){
  if(NICE[e.lab]) return NICE[e.lab];
  if(/What are they looking/.test(e.lab)) return e.sub;
  if(e.sub && e.sub!==e.lab) return `${e.sub} · ${e.lab}`;
  return e.lab;
}
function linkify(t){ return esc(t).replace(/https?:\/\/[^\s<)]+/g,u=>`<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]} ↗</a>`); }
function datTable(){
  return `<details class="more"><summary>Old DAT score conversion table (1–30 → 200–600)</summary><div class="tbl-wrap"><table><thead><tr>${DATCONV[0].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${DATCONV.slice(1).map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="cap">AA Academic Average · SNS Survey of Natural Sciences · BIO Biology · GCH General Chemistry · OCH Organic Chemistry · PAT Perceptual Ability · QRT Quantitative Reasoning · RCT Reading Comprehension. From the sheet’s DAT_Conversion tab.</p></details>`;
}
function facts(list){
  if(!list.length) return '';
  return `<div class="facts">${list.map(e=>{const v=e.v, wide=v.length>90; return `<div class="fact${wide?' wide':''}"><div class="k">${esc(factLabel(e))}</div><div class="v">${wide?'':yn(v)}<span>${valHTML(v)}</span></div></div>`;}).join('')}</div>`;
}
function leftover(G, gs, title='More from the sheet'){
  const l=G.left(gs); G.use(l);
  return l.length ? `<div class="sect-title"><h3>${title}</h3><p>${l.length} more value${l.length>1?'s':''}</p></div>${facts(l)}` : '';
}
function rankAmong(key, v, higherIsBetter=true){
  const vals=S.map(x=>x[key]).filter(x=>x!=null); if(v==null||vals.length<2) return null;
  const below=vals.filter(x=>x<v).length; return Math.round(below/(vals.length-1)*100);
}
const oneIn = p => p ? `1 in ${Math.max(1,Math.round(100/p))}` : '';
const fmtN = v => v==null ? '—' : Math.round(v).toLocaleString();

/* ---------- tabs ---------- */
const TABS = [
  ['overview','Overview',['Quick Facts']],
  ['admissions','Admissions',['Applicant & Entering-Class Data']],
  ['scores','DAT & GPA',['DAT','GPA']],
  ['prereqs','Prerequisites',['Preparation & Prerequisite Coursework']],
  ['experience','Experience & Interview',['Experiences','Letters of Recommendation','Interviews','International Dental Graduate Programs']],
  ['costs','Cost & Contact',['School Information & Finances']],
  ['record','Full record',[]],
];
const COLS = DATA.columns;
let recHideEmpty=false;
function tabRecord(s){
  const cols=COLS[s.c]||COLS.US, have=new Map();
  s.s.forEach(([g,f])=>f.forEach(([sub,lab,v])=>have.set(g+'|'+sub+'|'+lab,v)));
  const groups=[]; cols.forEach(([g,sub,lab])=>{ let G=groups.find(x=>x.g===g); if(!G){G={g,rows:[]};groups.push(G);} G.rows.push([sub,lab,have.get(g+'|'+sub+'|'+lab)]); });
  const filled=cols.filter(([g,sub,lab])=>have.has(g+'|'+sub+'|'+lab)).length;
  const R=s.rub, rubN=R?[R.appFormat,R.ivFormat,...R.app.flat(),...R.iv.flat()].filter(Boolean).length:0;
  let h=`<div class="bento"><div class="b"><div class="bt">${I.book}Every column in the sheet<span class="r"><label class="rec-toggle"><input type="checkbox" id="recHide" ${recHideEmpty?'checked':''}> Hide empty</label></span></div>
    <div class="big">${filled}<small>of ${cols.length} fields filled</small></div>
    <div class="cap">Every column from the ${s.c==='CA'?'Canadian Schools':'Sheet1'} tab, in sheet order, exactly as written. Empty cells show as “Not in sheet”.${R?` Plus ${rubN} entries from the Scoring Rubrics tab.`:' The Scoring Rubrics tab has no entries for this school yet.'}</div></div></div>`;
  groups.forEach(G=>{
    const n=G.rows.filter(r=>r[2]!=null).length;
    const subs=[]; G.rows.forEach(r=>{ let S_=subs.find(x=>x.sub===r[0]); if(!S_){S_={sub:r[0],rows:[]};subs.push(S_);} S_.rows.push(r); });
    h+=`<details class="recgrp" ${n?'open':''}><summary><span>${esc(G.g)}</span><em>${n} of ${G.rows.length} filled</em></summary><div class="recbody">${subs.map(S_=>`
      ${S_.sub&&S_.rows.some(r=>r[1]!==S_.sub)?`<div class="recsub">${esc(S_.sub)}</div>`:''}
      ${S_.rows.map(([sub,lab,v])=>`<div class="recrow${v==null?' blank':''}"><span class="k">${esc(lab===sub||!sub||S_.rows.every(r=>r[1]!==S_.sub)?lab:lab)}${lab===sub&&sub?'':''}</span><span class="v">${v==null?'Not in sheet':valHTML(v)}</span></div>`).join('')}`).join('')}</div></details>`;
  });
  h+=`<details class="recgrp" ${R?'open':''}><summary><span>Scoring Rubrics tab</span><em>${R?rubN+' entries':'No entries yet'}</em></summary><div class="recbody">${R?`
    <div class="recsub">Application scoring</div>${R.appFormat?`<div class="recrow"><span class="k">Format</span><span class="v">${linkify(R.appFormat)}</span></div>`:'<div class="recrow blank"><span class="k">Format</span><span class="v">Not in sheet</span></div>'}
    ${R.app.map(x=>`<div class="recrow"><span class="k">${esc(x[0]||'—')}${x[2]?` · ${esc(x[2])}`:''}</span><span class="v">${linkify(x[1]||'')}</span></div>`).join('')}
    <div class="recsub">Interview scoring</div>${R.ivFormat?`<div class="recrow"><span class="k">Format</span><span class="v">${linkify(R.ivFormat)}</span></div>`:'<div class="recrow blank"><span class="k">Format</span><span class="v">Not in sheet</span></div>'}
    ${R.iv.map(x=>`<div class="recrow"><span class="k">${esc(x[0]||'—')}${x[2]?` · ${esc(x[2])}`:''}</span><span class="v">${linkify(x[1]||'')}</span></div>`).join('')}`
    :'<div class="recrow blank"><span class="k">Application and interview scoring</span><span class="v">The Scoring Rubrics tab has a column for this school, but it is blank.</span></div>'}</div></details>`;
  return h;
}

function tabOverview(s,G){
  const Q='Quick Facts', A='Applicant & Entering-Class Data';
  ['School','Abbreviation','Location','Class Size','Total Acceptance Rate','Total Interview Rate','Male Acceptance Rate','Female Accetance Rate'].forEach(l=>G.get(Q,'',l));
  const inS=pn(G.get(Q,'','% of Accepted Class That is In-State')), outS=pn(G.get(Q,'','% of Accepted Class That is Out-of-State')), intl=pn(G.get(Q,'','% of Accepted Class That is International'));
  const age=G.get(Q,'','Mean Age of Enrollees'), appD=G.get(Q,'','Application Filing Deadline'), datD=G.get(Q,'','DAT Deadline');
  const aaR=rankAmong('aa',s.aa), gR=rankAmong('gpa',s.gpa);
  const T=(k)=>pn(G.get(A,'Totals',k));
  const apps=T('Total # of Applicants'), intv=T('Total # Interviewed'), enr=T('Total # Enrolled');
  let h='';
  const ch=CH.get(s.id);
  if(ch){
    const pos={reach:.17,target:.5,likely:.83,unknown:.5}[ch.tier], ang=Math.PI*(1-pos), cx=65+52*Math.cos(ang), cy=66-52*Math.sin(ang);
    const items=[...ch.reasons.map(r=>`<li>${r.ok===null?'':`<span class="ic ${r.ok?'y':'w'}">${r.ok?I.check:'!'}</span>`}<span>${esc(r.t)}</span></li>`),
      ...(ch.missing.length?[`<li><span class="ic w">!</span><span>Missing required courses: <b>${esc(ch.missing.join(', '))}</b></span></li>`]:state.profile.courses&&s.req.length?[`<li><span class="ic y">${I.check}</span><span>You meet all ${s.req.length} required courses</span></li>`]:[]),
      ...(ch.shadowGap?[`<li><span class="ic w">!</span><span>${ch.shadowGap} more shadowing hours to reach their ${s.shadowHrs}</span></li>`]:[])];
    h+=`<div class="bento" style="margin-bottom:12px"><div class="b glow"><div class="bt">${I.star}Student’s chances<span class="r"><button class="linkbtn" data-profile="1">Edit profile</button></span></div>
      <div class="chance"><div class="gauge"><svg viewBox="0 0 130 76"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#ff6961"/><stop offset=".5" stop-color="#ffd60a"/><stop offset="1" stop-color="#30d158"/></linearGradient></defs>
        <path d="M13 66 A52 52 0 0 1 117 66" fill="none" stroke="url(#gg)" stroke-width="10" stroke-linecap="round" opacity="${ch.tier==='unknown'?.25:1}"/>${ch.tier==='unknown'?'':`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8" fill="#fff" stroke="#0b0c12" stroke-width="3"/>`}</svg>
        <div class="lbl">${TIER_LABEL[ch.tier]}</div></div>
        <ul class="reasons">${items.join('')}</ul></div>
      <div class="cap" style="margin-top:12px">A rough guide from this school’s averages and residency odds in the sheet, not a prediction.</div></div></div>`;
  } else {
    h+=`<div class="bento" style="margin-bottom:12px"><div class="b"><div class="exp-hero"><div style="flex:1;min-width:220px"><div class="bt" style="margin-bottom:6px">${I.star}Student’s chances</div><div class="cap" style="margin:0">Add your student’s GPA, DAT and home state to see whether this school is a Reach, Target or Likely for them.</div></div><button class="btn btn-primary" data-profile="1">Set up Student Profile</button></div></div></div>`;
  }
  h+=`<div class="bento">
    <div class="b s3 glow stat"><div class="bt">Acceptance</div><div class="big">${s.acc!=null?`<span data-count="${s.acc}" data-dec="2">${fx(s.acc,2)}</span>`:'—'}<small>%</small></div><div class="cap">${s.acc?`About <b>${oneIn(s.acc)}</b> applicants enrolled`:'No acceptance data yet'}</div></div>
    <div class="b s3 stat"><div class="bt">Interview rate</div><div class="big">${s.intv!=null?`<span data-count="${s.intv}" data-dec="2">${fx(s.intv,2)}</span>`:'—'}<small>%</small></div><div class="cap">${s.intv?`<b>${oneIn(s.intv)}</b> applicants got an interview`:'No interview data yet'}</div></div>
    <div class="b s3 stat"><div class="bt">Mean DAT AA</div><div class="big">${s.aa!=null?`<span data-count="${s.aa}">${s.aa}</span>`:'—'}</div><div class="cap">${s.aar?`Middle 90%: <b>${esc(s.aar)}</b>`:'&nbsp;'}</div>${aaR!=null?`<span class="rank"><i></i>${aaR===0?'Lowest in the sheet':aaR===100?'Highest in the sheet':`Higher than ${aaR}% of schools`}</span>`:''}</div>
    <div class="b s3 stat"><div class="bt">Mean GPA</div><div class="big">${s.gpa!=null?`<span data-count="${s.gpa}" data-dec="2">${fx(s.gpa)}</span>`:'—'}</div><div class="cap">${s.sgpa?`Science GPA <b>${fx(s.sgpa)}</b>`:'&nbsp;'}</div>${gR!=null?`<span class="rank"><i></i>${gR===0?'Lowest in the sheet':gR===100?'Highest in the sheet':`Higher than ${gR}% of schools`}</span>`:''}</div>`;
  if(apps){
    const W=v=>Math.max(0.6,v/apps*100);
    h+=`<div class="b s7"><div class="bt">${I.users}Admissions funnel<span class="r">last cycle</span></div><div class="funnel">
      <div class="fun-row"><span class="lbl">Applied</span><div class="fun-track"><i style="width:100%;background:linear-gradient(90deg,hsl(${s.art.h3} 70% 40%),hsl(${s.art.h1} 85% 55%))"></i></div><span class="n">${fmtN(apps)}</span></div>
      ${intv!=null?`<div class="fun-conv">${I.arrow}<b>${pct(intv/apps*100)}</b> invited to interview</div>
      <div class="fun-row"><span class="lbl">Interviewed</span><div class="fun-track"><i style="width:${W(intv)}%;background:hsl(${s.art.h1} 90% 60%)"></i></div><span class="n">${fmtN(intv)}</span></div>`:''}
      ${enr!=null?`<div class="fun-conv">${I.arrow}<b>${intv?pct(enr/intv*100):'—'}</b> of interviewees enrolled</div>
      <div class="fun-row"><span class="lbl">Enrolled</span><div class="fun-track"><i style="width:${W(enr)}%;background:#fff"></i></div><span class="n">${fmtN(enr)}</span></div>`:''}
    </div></div>`;
  } else h+=`<div class="b s7"><div class="bt">${I.users}Admissions funnel</div><p class="empty-b">The sheet has no applicant counts for this school yet.</p></div>`;
  // class makeup
  h+=`<div class="b s5"><div class="bt">${I.map}Entering class</div>
    ${inS!=null||outS!=null?`<div class="big">${s.size??'—'}<small>seats</small></div>
    <div class="split" style="margin-top:16px"><i style="width:${inS||0}%;background:var(--accent)"></i><i style="width:${outS||0}%;background:var(--r-south)"></i><i style="width:${intl||0}%;background:var(--r-pr)"></i></div>
    <div class="legend"><span style="--c:var(--accent)">In-state <b class="num">${pct(inS)}</b></span><span style="--c:var(--r-south)">Out-of-state <b class="num">${pct(outS)}</b></span><span style="--c:var(--r-pr)">International <b class="num">${pct(intl)}</b></span></div>`
    :`<div class="big">${s.size??'—'}<small>seats</small></div><p class="cap">No residency breakdown in the sheet yet.</p>`}
    ${age?`<div class="cap" style="margin-top:14px">Mean age of enrollees <b>${esc(age)}</b></div>`:''}</div>`;
  // dates
  const cal=(v)=>{const m=String(v||'').match(/^(\d{1,2})\/(\d{1,2})/); const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    if(m) return `<div class="cal"><div class="m">${MON[+m[1]-1]||''}</div><div class="d">${+m[2]}</div></div>`;
    const mm=String(v||'').match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s*(\d{1,2})?/i);
    if(mm) return `<div class="cal${mm[2]?'':' txt'}"><div class="m">${mm[1].toUpperCase()}</div><div class="d">${mm[2]||'—'}</div></div>`;
    return `<div class="cal txt"><div class="m">DATE</div><div class="d">${v?'See note':'—'}</div></div>`;};
  const dates=[['Application deadline',appD],['DAT deadline',datD],['Classes start',s.start],['Program length',s.len?`${s.len} months`:null]].filter(([,v])=>v);
  const span=dates.length?Math.max(3,12/dates.length|0):3;
  if(dates.length) h+=dates.map(([k,v])=>`<div class="b s${span}"><div class="date">${k==='Program length'?`<div class="cal txt"><div class="m">LENGTH</div><div class="d">${Math.round(s.len/12*10)/10} yrs</div></div>`:k==='Classes start'?`<div class="cal txt"><div class="m">START</div><div class="d">${esc(String(v).slice(0,3).toUpperCase())}</div></div>`:cal(v)}<div><div class="k">${k}</div><div class="v">${esc(v)}</div></div></div></div>`).join('');
  h+=`</div>`;
  h+=leftover(G,['Quick Facts']);
  return h;
}

function residencyCard(G,name,color){
  const A='Applicant & Entering-Class Data', sub='Residency: '+name;
  const list=G.all(A,e=>e.sub===sub); if(!list.length) return '';
  const g=l=>{const e=list.find(x=>x.lab===l||x.lab.startsWith(l)); if(e){e.used=true; return e.v;} return null;};
  const pctClass=g('% of Accepted Class'), ap=g('# of Applicants'), iv=g('# Interviewed'), en=g('# Enrolled');
  const io=pn(g('Interview Odds/Rate')), ao=pn(g('Odds of Acceptance Once Interviewed')), ac=pn(g('Acceptance Odds/Rate'));
  const states=g('States that Buys Seats');
  const m=(l,v)=>v==null?'':`<div class="meter" style="--c:${color}"><div class="top"><span>${l}</span><b>${pct(v)}</b></div><div class="tr"><i style="width:${Math.max(1.5,Math.min(100,v))}%"></i></div></div>`;
  G.use(list);
  return `<div class="b s4"><div class="bt"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${name}</div>
    <div class="res-pct">${pctClass?esc(pctClass):'—'}<small>of the class</small></div>
    ${m('Interview odds',io)}${m('Accepted once interviewed',ao)}${m('Overall acceptance odds',ac)}
    <div class="counts"><div><b>${ap?fmtN(pn(ap)):'—'}</b>applied</div><div><b>${iv?fmtN(pn(iv)):'—'}</b>interviewed</div><div><b>${en?fmtN(pn(en)):'—'}</b>enrolled</div></div>
    ${states?`<div class="cap" style="margin-top:12px">Seat-buying or preferred states</div><div class="cap" style="color:var(--fg);margin-top:4px">${esc(states)}</div>`:''}
  </div>`;
}

function tabAdmissions(s,G){
  const A='Applicant & Entering-Class Data', Q='Quick Facts';
  const T=k=>{const v=G.get(A,'Totals',k); return v;};
  let h='';
  // residency
  const rc=['In-State','Out-of-State','International'].map((n,i)=>residencyCard(G,n,['var(--accent)','var(--r-south)','var(--r-pr)'][i])).join('');
  if(rc) h+=`<div class="sect-title"><h3>Odds by residency</h3><p>Interview and acceptance odds for each applicant pool</p></div><div class="bento">${rc}</div>`;
  // gender
  const mA=pn(T('Total # of Men Applicants')), wA=pn(T('Total # of Women Applicants')), uA=pn(T('Total # of Applicants Who\'s Gender Was Unkown'));
  const mE=pn(T('Total # of Men Enrolled')), wE=pn(T('Total # of Women Enrolled')), uE=pn(T('Total # Enrolled Who\'s Gender Was Unkown'));
  const mR=T('Male Acceptance Rate'), wR=T('Female Acceptance Rate'); G.get(Q,'','Male Acceptance Rate'); G.get(Q,'','Female Accetance Rate');
  ['Total # of Applicants','Total # Interviewed','Total Inteview Rate','Total # Enrolled','Total Acceptance Rate'].forEach(T);
  if(mA!=null||wA!=null||mE!=null||wE!=null){
    const tA=(mA||0)+(wA||0)+(uA||0), tE=(mE||0)+(wE||0)+(uE||0);
    const sp=(a,b,c,t)=>t?`<div class="split"><i style="width:${a/t*100}%;background:#64d2ff"></i><i style="width:${b/t*100}%;background:#ff6482"></i>${c?`<i style="width:${c/t*100}%;background:var(--fg-3)"></i>`:''}</div>`:'';
    h+=`<div class="sect-title"><h3>Men and women</h3><p>Who applied and who enrolled</p></div><div class="bento"><div class="b">
      <div class="splitlbl"><span>Applicants · ${fmtN(tA)}</span><span>${tA?Math.round((wA||0)/tA*100):0}% women</span></div>${sp(mA||0,wA||0,uA||0,tA)}
      <div class="splitlbl" style="margin-top:12px"><span>Enrolled · ${fmtN(tE)}</span><span>${tE?Math.round((wE||0)/tE*100):0}% women</span></div>${sp(mE||0,wE||0,uE||0,tE)}
      <div class="gcols">
        <div class="gcol" style="--c:#64d2ff"><div class="h"><i></i>Men</div><div class="rate">${esc(mR||'—')}</div><div class="sm">acceptance · ${fmtN(mA)} applied · ${fmtN(mE)} enrolled</div></div>
        <div class="gcol" style="--c:#ff6482"><div class="h"><i></i>Women</div><div class="rate">${esc(wR||'—')}</div><div class="sm">acceptance · ${fmtN(wA)} applied · ${fmtN(wE)} enrolled</div></div>
      </div>${uA||uE?`<div class="cap">Gender not reported: ${fmtN(uA)} applied, ${fmtN(uE)} enrolled</div>`:''}</div></div>`;
  }
  // race
  const raceEntries=G.all(A,e=>/^Race/.test(e.sub)); G.use(raceEntries);
  const races=[...new Set(raceEntries.map(e=>e.sub))].map(sub=>{const f=l=>(raceEntries.find(e=>e.sub===sub&&e.lab===l)||{}).v||'';
    return {n:sub.replace('Race: ','').replace('Unkown','Unknown'),ap:pn(f('Total # of Applicants')),en:pn(f('Total Enrolled')),r:pn(f('Total Acceptance Rate')),
      raw:[f('Total # of Applicants'),f('Male Applicants'),f('Female Applicants'),f("Applicants Who's Gender Was Unkown"),f('Total Enrolled'),f('Men Enrolled'),f('Women Enrolled'),f("Enrolled Who's Gender Was Unkown"),f('Total Acceptance Rate'),f('Male Acceptance Rate'),f('Female Acceptance Rate')]};});
  if(races.length){
    const max=Math.max(1,...races.map(r=>r.r||0));
    const sorted=[...races].sort((a,b)=>(b.ap||0)-(a.ap||0));
    h+=`<div class="sect-title"><h3>By race and ethnicity</h3><p>Acceptance rate, sorted by number of applicants</p></div><div class="bento"><div class="b">
      <div class="hbars">${sorted.map(r=>`<div class="hb"><div class="nm">${esc(r.n)}<small>${fmtN(r.ap)} applied · ${fmtN(r.en)} enrolled</small></div><div class="tr"><i style="width:${r.r?Math.max(1.5,r.r/max*100):0}%"></i></div><div class="pv">${r.r!=null?pct(r.r):'—'}</div></div>`).join('')}</div>
      <details class="more"><summary>Full breakdown</summary><div class="tbl-wrap"><table><thead><tr><th>Group</th><th>Applied</th><th>Men</th><th>Women</th><th>Unknown</th><th>Enrolled</th><th>Men</th><th>Women</th><th>Unknown</th><th>Rate</th><th>Men</th><th>Women</th></tr></thead>
      <tbody>${races.map(r=>`<tr><td>${esc(r.n)}</td>${r.raw.map(v=>`<td${v?'':' class="muted"'}>${esc(v||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
    </div></div>`;
  }
  if(!h) h=`<p class="empty-b">The sheet has no applicant data for this school yet.</p>`;
  h+=leftover(G,[A]);
  return h;
}

function scoreRow(name,full,mean,lo,hi,min,max,you,decimals){
  if(mean==null && lo==null) return '';
  const P=v=>Math.max(0,Math.min(100,(v-min)/(max-min)*100));
  let verdict='';
  if(you!=null && mean!=null){
    const d=you-mean, step=decimals?0.1:15;
    verdict = d>=0 ? `<span class="verdict good">${I.check}At or above the mean</span>` : (lo!=null && you>=lo) ? `<span class="verdict mid">Within the middle 90%</span>` : `<span class="verdict low">Below the middle 90%</span>`;
  }
  const ticks=[]; for(let i=0;i<=4;i++) ticks.push(min+(max-min)*i/4);
  return `<div class="score"><div class="hd"><div class="nm">${name}<small>${full}</small></div><div class="mean">${mean!=null?(decimals?mean.toFixed(2):mean):'—'}</div></div>
    <div class="scale" aria-label="${name}: mean ${mean}, middle 90% ${lo} to ${hi}">
      <div class="srail"></div>
      ${lo!=null&&hi!=null?`<div class="band" style="left:${P(lo)}%;width:${P(hi)-P(lo)}%"></div><div class="rl" style="left:${P(lo)}%">${decimals?lo.toFixed(2):lo}</div><div class="rl" style="left:${P(hi)}%">${decimals?hi.toFixed(2):hi}</div>`:''}
      ${mean!=null?`<div class="mk" style="left:${P(mean)}%"></div>`:''}
      ${you!=null?`<div class="you" style="left:${P(you)}%"><span>STUDENT</span></div>`:''}
    </div>${verdict}</div>`;
}
function tabScores(s,G){
  const me=state.profile;
  const D='DAT', GP='GPA';
  const dat=k=>{ const mean=pn(G.get(D,k,'Mean')); let lo=pn(G.get(D,k,'Min (5%)')), hi=pn(G.get(D,k,'Max (95%)'));
    const rng=G.get(D,k,'Min (5%) - Max (95%)')||G.get(D,k,'Min (5%) and Max (95%)'); if(rng){const m=rng.match(/([\d.]+)\D+([\d.]+)/); if(m){lo=+m[1];hi=+m[2];}} return [mean,lo,hi]; };
  const gpa=k=>{ const mean=pn(G.get(GP,k,'Mean (Combined Graduate & Undergraduate)')); const r=G.get(GP,k,'Min (5%) - Max(95%) Combined Graduate and Undergraduate'); const m=r&&r.match(/([\d.]+)\D+([\d.]+)/); return [mean,m?+m[1]:null,m?+m[2]:null]; };
  const AA=dat('AA'), PAT=dat('PAT'), SNS=dat('SNS'), TS=dat('TS'), TG=gpa('Total GPA'), SG=gpa('Science GPA');
  const isCA = s.c==='CA' && [AA,PAT,TS].some(x=>x[0]!=null && x[0]<=30);
  const dmin=isCA?1:300, dmax=isCA?30:600;
  const datRows = scoreRow('Academic Average','AA · overall',AA[0],AA[1],AA[2],dmin,dmax,me.aa,false)
    + scoreRow('Perceptual Ability','PAT',PAT[0],PAT[1],PAT[2],dmin,dmax,null,false)
    + scoreRow('Survey of Natural Sciences','SNS',SNS[0],SNS[1],SNS[2],dmin,dmax,null,false)
    + scoreRow('Total Science','TS',TS[0],TS[1],TS[2],dmin,dmax,null,false);
  const gpaRows = scoreRow('Overall GPA','Cumulative, grad + undergrad',TG[0],TG[1],TG[2],2.5,4.0,me.gpa,true)
    + scoreRow('Science GPA','Biology, chemistry, physics, math',SG[0],SG[1],SG[2],2.5,4.0,null,true);
  let h=`<div class="bento">
    <div class="b"><div class="bt">${I.star}Student’s stats</div>
      <div class="mystats">${hasProfile()?`<span class="cap" style="margin:0">Yellow markers show your student’s <b>${me.gpa!=null?'GPA '+fx(me.gpa):''}${me.gpa!=null&&me.aa!=null?' and ':''}${me.aa!=null?'DAT AA '+me.aa:''}</b> against this school's admitted class.</span>`:`<span class="cap" style="margin:0">Add your student’s GPA and DAT in Student Profile to see where they land against this school's admitted class.</span>`}
      <button class="btn btn-glass" data-profile="1" style="margin-left:auto;padding:7px 14px;font-size:13px">${hasProfile()?'Edit Student Profile':'Set up Student Profile'}</button></div></div>
    <div class="b s6"><div class="bt">${I.chart}DAT scores<span class="r">white dot = mean · bar = middle 90%</span></div>${datRows||'<p class="empty-b">No DAT score data in the sheet yet.</p>'}</div>
    <div class="b s6"><div class="bt">${I.chart}GPA<span class="r">white dot = mean · bar = middle 90%</span></div>${gpaRows||'<p class="empty-b">No GPA data in the sheet yet.</p>'}</div>
  </div>`;
  // levels of consideration
  const lv=[...G.all(D,e=>/Levels of Consideration/.test(e.sub)),...G.all(GP,e=>/Level of Consideration/.test(e.sub))]; G.use(lv);
  if(lv.length) h+=`<div class="sect-title"><h3>How much each score matters</h3></div><div class="b"><div class="levels">${lv.map(e=>`<div class="lvl ${LVL(e.v)}"><span class="cap" style="margin:0">${esc(e.lab)}</span><b>${esc(e.v)}</b></div>`).join('')}</div></div>`;
  h+=`<div class="b" style="margin-top:12px"><div class="bt">${I.chart}Old DAT scores</div><div class="cap" style="margin:0">Took the DAT on the old 1–30 scale? Convert it with the table below, or enter it in Student Profile.</div>${datTable()}</div>`;
  const pol=G.left([D,GP]); G.use(pol);
  if(pol.length) h+=`<div class="sect-title"><h3>Policies</h3><p>How this school treats a student’s scores and grades</p></div>${facts(pol)}`;
  return h;
}

function tabPrereqs(s,G){
  const P='Preparation & Prerequisite Coursework';
  const KEYS=['Required','Recommended','Lab Required','Credits (Semester/Quarter)'];
  const ents=G.all(P,()=>true);
  const subs=[...new Set(ents.map(e=>e.sub))];
  const courses=subs.filter(sub=>{const l=ents.filter(e=>e.sub===sub&&KEYS.includes(e.lab)); return l.length;}).map(sub=>{
    const f=l=>{const e=ents.find(x=>x.sub===sub&&x.lab===l); if(e){e.used=true; return e.v;} return '';};
    return {n:sub,req:f('Required'),rec:f('Recommended'),lab:f('Lab Required'),cr:f('Credits (Semester/Quarter)')};});
  const notes=ents.find(e=>e.lab==='Notes'); if(notes) notes.used=true;
  courses.sort((a,b)=>(b.req?1:0)-(a.req?1:0));
  let h='';
  const nReq=courses.filter(c=>c.req).length, nRec=courses.filter(c=>!c.req&&c.rec).length;
  if(courses.length){
    h+=`<div class="sect-title"><h3>Courses</h3><p>${nReq} required · ${nRec} recommended</p></div>
    <div class="courses">${courses.map(c=>{const req=!!c.req, labYes=/^yes/i.test(c.lab);
      const tag=req?(/see notes/i.test(c.req)?'Required*':'Required'):c.rec?'Recommended':'Listed';
      const crm=String(c.cr).match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
      return `<div class="course${req?' req':''}"><div class="top"><span class="badge">${tag}</span>${labYes?`<span class="lab">${I.flask}Lab</span>`:(c.lab&&!/^no/i.test(c.lab)?`<span class="lab">${esc(c.lab)}</span>`:'')}</div>
        <div class="nm">${esc(c.n)}</div>
        <div class="cr">${c.cr?(crm?`<b>${crm[1]}</b><span>sem</span><b style="font-size:16px;color:var(--fg-2)">${crm[2]}</b><span>qtr hrs</span>`:`<b style="font-size:15px;letter-spacing:0">${esc(c.cr)}</b>`):'<span>No credit amount listed</span>'}</div>
        ${req&&!/^yes$/i.test(c.req)?`<span class="cap" style="margin:0;color:var(--fg)">${esc(c.req)}</span>`:''}${!req&&c.rec&&!/^yes$/i.test(c.rec)?`<span class="cap" style="margin:0;color:var(--fg)">${esc(c.rec)}</span>`:''}
        ${req&&c.rec?`<span class="cap" style="margin:0">Also marked recommended: ${esc(c.rec)}</span>`:''}</div>`;}).join('')}</div>
    ${courses.some(c=>/see notes/i.test(c.req))?'<p class="cap">* Required with conditions. See the notes below.</p>':''}`;
  }
  if(notes) h+=`<div class="sect-title"><h3>Notes from the school</h3></div><div class="b"><div class="quote">${esc(notes.v)}</div></div>`;
  // degree + hours + credits
  const bac=G.get(P,'# of enrollees whose highest degree is:','Baccalaureate'), bacP=pn(G.get(P,'# of enrollees whose highest degree is:',"% of Accepted Class with just a Bachelor's Degree"));
  const mas=G.get(P,'# of enrollees whose highest degree is:',"Master's Degree or Beyond"), masP=pn(G.get(P,'# of enrollees whose highest degree is:',"% of Accepted Class with a Master's Degree or Beyond"));
  const semH=G.get(P,'Formal Minimum Preparation','In Semester Hours'), qH=G.get(P,'Formal Minimum Preparation','In Quarter Hours');
  const cc=[['Prereqs: AP credit','Prerequistes\nAP Credit Accepted'],['Prereqs: community college','Prerequistes\nCommunity College Accepted'],['Electives: AP credit','Electives\nAP Credit Accepted'],['Electives: community college','Electives\nCommunity College Accepted']]
    .map(([n,l])=>[n,G.get(P,'Community College & AP Credits',l)]).filter(([,v])=>v);
  h+=`<div class="sect-title"><h3>Background of admitted students</h3></div><div class="bento">`;
  h+=`<div class="b s4"><div class="bt">${I.book}Minimum preparation</div><div class="big">${semH?esc(semH):'—'}<small>semester hrs</small></div><div class="cap">${qH?`or <b>${esc(qH)}</b> quarter hours`:'No quarter-hour figure listed'}</div></div>`;
  if(bac||mas) h+=`<div class="b s8"><div class="bt">${I.users}Highest degree of enrollees</div>
    <div class="split"><i style="width:${bacP??0}%;background:var(--accent)"></i><i style="width:${masP??0}%;background:#64d2ff"></i></div>
    <div class="gcols"><div class="gcol" style="--c:var(--accent)"><div class="h"><i></i>Bachelor’s</div><div class="rate">${bacP!=null?pct(bacP):'—'}</div><div class="sm">${bac?esc(bac)+' students':''}</div></div>
    <div class="gcol" style="--c:#64d2ff"><div class="h"><i></i>Master’s or beyond</div><div class="rate">${masP!=null?pct(masP):'—'}</div><div class="sm">${mas?esc(mas)+' students':''}</div></div></div></div>`;
  if(cc.length) h+=`<div class="b"><div class="bt">${I.check}AP &amp; community college credit</div><div class="checks">${cc.map(([n,v])=>`<div class="chk">${yn(v)||`<span class="ic n">?</span>`}<div class="t">${n}<b>${esc(v)}</b></div></div>`).join('')}</div></div>`;
  h+=`</div>`;
  h+=leftover(G,[P],'Other coursework details');
  return h;
}

function tabExperience(s,G){
  const E='Experiences';
  let h='';
  const sh=G.get(E,'Shadowing','# of Required Shadowing Hours'), shW=G.get(E,'Shadowing','What are they looking for/Importance');
  if(sh){
    const hrs=(sh.match(/(\d[\d,]*)\s*(\+)?\s*(hours|hrs|hour)/i)||sh.match(/^\D*(\d[\d,]*)/)||[])[1];
    const st=/^not|not required|no required|^none/i.test(sh)?'no':/^required|mandatory|must/i.test(sh)?'req':'rec';
    const stL={req:'Required',rec:'Recommended',no:'Not required'}[st];
    const n=hrs?parseInt(hrs.replace(',','')):null, frac=n?Math.min(1,n/150):0, C=2*Math.PI*52;
    h+=`<div class="bento"><div class="b glow"><div class="bt">${I.users}Shadowing</div><div class="exp-hero">
      <div class="ringbox"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(${s.art.h1} 90% 60%)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C*frac} ${C}"/></svg>
        <div class="c"><div><b>${n??'—'}</b><span>hours</span></div></div></div>
      <div style="flex:1;min-width:220px"><span class="status ${st}">${stL}</span><div class="quote">${esc(sh)}</div>${shW?`<div class="cap" style="margin-top:10px">${esc(shW)}</div>`:''}</div>
    </div>${n?`<div class="cap">Ring fills at 150 hours.</div>`:''}</div></div>`;
  }
  const others=G.all(E,e=>!e.used); G.use(others);
  if(others.length) h+=`<div class="sect-title"><h3>What they look for</h3></div><div class="facts">${others.map(e=>`<div class="fact wide"><div class="k">${esc(e.sub||e.lab)}</div><div class="v"><span>${esc(e.v)}</span></div></div>`).join('')}</div>`;
  const ivF=G.get('Interviews','','Format'), ivR=G.get('Interviews','','Scoring Rubric Information');
  if(ivF||ivR) h+=`<div class="sect-title"><h3>Interview</h3></div><div class="bento"><div class="b${ivR?' s6':''}"><div class="bt">${I.chat}Format</div><div style="font-size:17px;font-weight:650;line-height:1.4">${esc(ivF||'—')}</div></div>${ivR?`<div class="b s6"><div class="bt">${I.star}Scoring rubric</div><div class="quote">${esc(ivR)}</div></div>`:''}</div>`;
  const t=G.get('International Dental Graduate Programs','','Traditional predoctoral program open to IDGs?'), a=G.get('International Dental Graduate Programs','','Advanced standing program offered for IDGs?');
  if(s.rub){
    const R=s.rub, row=(x,third)=>`<div class="rrow"><div class="rcat">${esc(x[0]||'—')}${x[2]?`<span class="rw">${esc(x[2])}</span>`:''}</div><div class="rwhat">${linkify(x[1]||'')}</div></div>`;
    h+=`<div class="sect-title"><h3>How they score you</h3><p>From the sheet’s Scoring Rubrics tab</p></div><div class="bento">`;
    if(R.appFormat||R.app.length) h+=`<div class="b"><div class="bt">${I.star}Application scoring<span class="r">${R.app.length} categor${R.app.length===1?'y':'ies'}</span></div>${R.appFormat?`<div class="quote" style="margin-bottom:12px">${linkify(R.appFormat)}</div>`:''}<div class="rlist">${R.app.map(x=>row(x)).join('')}</div></div>`;
    if(R.ivFormat||R.iv.length) h+=`<div class="b"><div class="bt">${I.chat}Interview scoring<span class="r">${R.iv.length} categor${R.iv.length===1?'y':'ies'}</span></div>${R.ivFormat?`<div class="quote" style="margin-bottom:12px">${linkify(R.ivFormat)}</div>`:''}<div class="rlist">${R.iv.map(x=>row(x)).join('')}</div></div>`;
    h+=`</div>`;
  }
  if(!s.rub) h+=`<div class="sect-title"><h3>How they score you</h3><p>From the sheet’s Scoring Rubrics tab</p></div><div class="b"><p class="empty-b" style="margin:0">The Scoring Rubrics tab has a column for ${esc(s.name)}, but it hasn’t been filled in yet.</p></div>`;
  if(t||a) h+=`<div class="sect-title"><h3>International dentists</h3><p>Options for graduates of dental schools outside the US and Canada</p></div><div class="bento">
    ${[['Traditional program',t],['Advanced standing',a]].map(([k,v])=>`<div class="b s6"><div class="bt">${I.globe}${k}</div><div class="fact" style="background:none;border:0;padding:0"><div class="v" style="font-size:16px">${v?yn(v):''}<span>${v?valHTML(v):'Not listed'}</span></div></div></div>`).join('')}</div>`;
  h+=leftover(G,['Experiences','Letters of Recommendation','Interviews','International Dental Graduate Programs']);
  if(!h) h='<p class="empty-b">The sheet has no experience or interview details for this school yet.</p>';
  return h;
}

let costMode='res';
function tabCosts(s,G){
  const F_='School Information & Finances';
  const g=l=>G.get(F_,'',l);
  const resT=g('$ Resident Tuition'), nonT=g('$ Nonresident Tuition'), fees=g('Fees, books, supplies, etc.'), rent=g('Median Rent (1 Bedroom)');
  const facts_=[['Institution',g('Type of Institution')],['Degree',g('Doctoral Dental Degree Offered')],['Starts',g('Start Month')],['Length',g('Length of Program (months)')?g('Length of Program (months)')+' months':null],['Campus housing',g('Campus Housing')],['Grading',g('Grading System')]].filter(([,v])=>v);
  const phone=g('School Phone Number'), email=g('School Email'), addr=g('Mailing Address');
  const web=g('School Website'), yt=g('link to youtube tour of school'), pod=g('DSG Podcast with Admissions Member'), d1=g('D1 Schedule');
  let h='<div class="bento">';
  const rT=pn(resT), nT=pn(nonT), fe=pn(fees), rn=pn(rent);
  const okRes=rT!=null&&rT>=1000, okNon=nT!=null&&nT>=1000;
  if(okRes||okNon||fe||rn){
    h+=`<div class="b s7 glow" id="costCard"></div>`;
  }
  if(facts_.length) h+=`<div class="b ${okRes||okNon||fe||rn?'s5':''}"><div class="bt">${I.book}Program</div><div class="facts" style="grid-template-columns:repeat(2,minmax(0,1fr))">${facts_.map(([k,v])=>`<div class="fact"><div class="k">${k}</div><div class="v">${yn(v)}<span>${esc(v)}</span></div></div>`).join('')}</div></div>`;
  h+='</div>';
  const links=[[web,'Website','Admissions page',I.link,'var(--accent)'],[yt,'Video tour','Watch on YouTube',I.play,'#ff375f'],[pod,'DSG podcast','Admissions interview',I.mic,'#30d158'],[d1,'D1 schedule','First-year schedule',I.cal,'#bf5af2']].filter(([u])=>isURL(u));
  if(links.length) h+=`<div class="sect-title"><h3>Explore</h3></div><div class="linkgrid">${links.map(([u,t,sub,ic,c])=>`<a class="lk" href="${esc(u)}" target="_blank" rel="noopener"><span class="ico" style="background:${c}">${ic}</span><div><b>${t}</b><span>${sub}</span></div></a>`).join('')}</div>`;
  if(phone||email||addr) h+=`<div class="sect-title"><h3>Contact</h3></div><div class="contact">
    ${[[phone,'Phone',I.phone],[email,'Email',I.mail],[addr,'Mailing address',I.map]].filter(([v])=>v).map(([v,k,ic])=>`<div class="crow"><span class="ico">${ic}</span><div class="t"><span>${k}</span><b>${esc(v)}</b></div><button class="copy" data-copy="${esc(v)}">Copy</button></div>`).join('')}</div>`;
  h+=leftover(G,[F_]);
  const costHTML=()=>{
    const t=costMode==='res'?(okRes?rT:null):(okNon?nT:null);
    const tLabel=costMode==='res'?resT:nonT;
    const yr=rn?rn*12:null, total=(t||0)+(fe||0)+(yr||0), years=s.len?s.len/12:null;
    const seg=(v,c)=>v&&total?`<i style="width:${v/total*100}%;background:${c}"></i>`:'';
    return `<div class="bt">${I.dollar}Estimated cost per year<span class="r"><span class="seg2" role="group" aria-label="Residency"><button data-cost="res" aria-pressed="${costMode==='res'}">Resident</button><button data-cost="non" aria-pressed="${costMode==='non'}">Non-resident</button></span></span></div>
      <div class="big">${total?moneyFull(total):'—'}</div>
      <div class="cap">${years&&total?`About <b>${moneyFull(total*years)}</b> over ${Math.round(years*10)/10} years, before interest and raises.`:'Not enough cost data in the sheet to estimate a total.'}</div>
      <div class="costbar">${seg(t,'var(--accent)')}${seg(fe,'#64d2ff')}${seg(yr,'var(--r-south)')}</div>
      <div class="costrows">
        <div class="costrow" style="--c:var(--accent)${costMode==='res'?'':';opacity:.5'}"><i></i><span>Resident tuition${costMode==='res'?'':' (not in total)'}</span><b>${okRes?moneyFull(rT):(resT?esc(resT)+' (as entered)':'Not listed')}</b></div>
        <div class="costrow" style="--c:var(--accent)${costMode==='non'?'':';opacity:.5'}"><i></i><span>Non-resident tuition${costMode==='non'?'':' (not in total)'}</span><b>${okNon?moneyFull(nT):(nonT?esc(nonT)+' (as entered)':'Not listed')}</b></div>
        <div class="costrow" style="--c:#64d2ff"><i></i><span>Fees, books, supplies</span><b>${fe?moneyFull(fe):'Not listed'}</b></div>
        <div class="costrow" style="--c:var(--r-south)"><i></i><span>Rent (12 × ${rn?moneyFull(rn):'—'} median 1-bed)</span><b>${yr?moneyFull(yr):'Not listed'}</b></div>
      </div>`;
  };
  return {html:h, costHTML};
}

let vtSource=null;
function quickFacts(s){
  const c=CH.get(s.id), d=nextDeadline(s);
  const cell=(l,v,sub,cls='')=>`<div class="qf${cls}"><span class="l">${l}</span><b>${v}</b>${sub?`<small>${sub}</small>`:''}</div>`;
  return `<div class="qfacts">
    ${cell('Deadline',d?d.date.toLocaleDateString(undefined,{month:'short',day:'numeric'}):(s.deadline?esc(fmtDeadline(s.deadline)):'—'),d?`${d.days} days away`:'',d&&d.days<=30?' urgent':'')}
    ${cell('Acceptance',s.acc!=null?pct(s.acc):'—',s.intv!=null?`${pct(s.intv)} interviewed`:'')}
    ${cell('In-state',s.instate!=null?pct(s.instate):'—','of the class')}
    ${cell('Resident tuition',s.res!=null?money(s.res):(s.resT?esc(s.resT):'—'),s.non!=null?`${money(s.non)} non-res.`:'')}
    ${cell('Avg DAT · GPA',`${s.aa??'—'} · ${fx(s.gpa)}`,s.sgpa!=null?`sGPA ${fx(s.sgpa)}`:'')}
    ${c?`<div class="qf qf-you" data-profile="1"><span class="l">Student</span>${tierPill(c,true)}<small>${c.odds!=null?`${pct(c.odds)} ${esc(c.pool.toLowerCase())} odds`:'Edit profile'}</small></div>`:`<button class="qf qf-you" data-profile="1"><span class="l">Student</span><b style="font-size:14px">Set up</b><small>See their label</small></button>`}
  </div>`;
}
function tabRubric(s){
  const R=s.rub;
  const block=(title,icon,fmt,rows,third)=>`<div class="sect-title"><h3>${title}</h3><p>${rows.length} categor${rows.length===1?'y':'ies'}</p></div>
    <div class="bento"><div class="b"><div class="bt">${icon}Format</div>${fmt?`<div class="quote">${linkify(fmt)}</div>`:'<p class="empty-b" style="margin:0">No format listed in the sheet.</p>'}</div></div>
    ${rows.length?`<div class="rub-tbl"><div class="rub-h"><span>Category</span><span>What specifically earns points / what they want</span><span>${third}</span></div>
      ${rows.map(x=>`<div class="rub-r"><div class="rub-c">${esc(x[0]||'—')}</div><div class="rub-w">${linkify(x[1]||'—')}</div><div class="rub-s">${x[2]?`<span class="rw">${esc(x[2])}</span>`:'<span class="empty-b">—</span>'}</div></div>`).join('')}</div>`:''}`;
  return `<div class="bento"><div class="b glow"><div class="bt">${I.star}Scoring rubric &amp; format</div>
      <div class="cap" style="margin:0">From the sheet’s Scoring Rubrics tab: how ${esc(s.name)} scores applications and interviews, with sources.</div></div></div>
    ${block('Application scoring',I.book,R.appFormat,R.app,'Probable weight')}
    ${block('Interview scoring',I.chat,R.ivFormat,R.iv,'Scoring')}`;
}
function openSheet(s){
  const src=vtSource; vtSource=null;
  if(true || !src || matchMedia('(prefers-reduced-motion: reduce)').matches || current){ openSheetNow(s); return; }
  const bg=$('#sheetBg');
  try{
    src.style.viewTransitionName='poster-morph'; bg.classList.add('vt');
    const t=document.startViewTransition(()=>{ src.style.viewTransitionName=''; openSheetNow(s,true); const a=$('#sheet .sheet-hero .art'); if(a) a.style.viewTransitionName='poster-morph'; });
    t.finished.finally(()=>{ const a=$('#sheet .sheet-hero .art'); if(a) a.style.viewTransitionName=''; bg.classList.remove('vt'); });
  }catch(e){ src.style.viewTransitionName=''; bg.classList.remove('vt'); openSheetNow(s); }
}
let sheetCloseT=null;
function openSheetNow(s,instant){
  clearTimeout(sheetCloseT);
  current=s; lastFocus=ROOT.activeElement;
  const G=makeGet(s);
  const panels={
    overview:tabOverview(s,G), admissions:tabAdmissions(s,G), scores:tabScores(s,G),
    prereqs:tabPrereqs(s,G), experience:tabExperience(s,G),
  };
  const cost=tabCosts(s,G); panels.costs=cost.html; panels.record=tabRecord(s);
  const TB = s.rub ? [...TABS,['rubric','Scoring rubric',[]]] : TABS; if(s.rub) panels.rubric=tabRubric(s);
  const left=G.left(s.s.map(([g])=>g)); G.use(left);
  const chips=[s.type,s.deg,s.housing==='Yes'?'Campus housing':null,s.grading,/^Yes/.test(s.idg||'')?'International dentist program':null].filter(Boolean);
  const links=[[s.web,'Website'],[s.yt,'Video tour']].filter(([u])=>isURL(u));
  $('#sheet').style.setProperty('--rc',RCOL[s.region]);
  $('#sheet').setAttribute('style',`--rc:${RCOL[s.region]};${artStyle(s)}`);
  $('#sheet').innerHTML=`
    <button class="close" id="closeSheet" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="sheet-hero">${artHTML(s)}<div class="sheet-hero-in">
      <span class="eyebrow"><span class="dot"></span><span>${esc(s.loc||s.place)}${s.region!=='Canada'&&s.region!==s.place?' · '+esc(s.region):''}${s.isNew?' · New program':''}</span></span>
      <h2 id="sheetTitle">${esc(s.name)}</h2>
      <div class="chips-row">${chips.map(c=>`<span class="pill">${esc(c)}</span>`).join('')}</div>
      <div class="hero-actions"><button class="btn btn-primary" id="sheetSave"></button><button class="btn btn-glass" id="sheetCmp"></button>${links.map(([u,l])=>`<a class="btn btn-glass" href="${esc(u)}" target="_blank" rel="noopener">${l}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>`).join('')}</div>
    </div></div>
    <div class="sheet-body">
      ${quickFacts(s)}
      <div class="tabbar-wrap"><div class="tabbar" role="tablist" aria-label="School sections"><span class="ind"></span>${TB.map(([id,l],i)=>`<button role="tab" id="t-${id}" aria-controls="p-${id}" aria-selected="${i===0}" data-tab="${id}">${l}</button>`).join('')}</div></div>
      ${TB.map(([id],i)=>`<div class="panel" role="tabpanel" id="p-${id}" aria-labelledby="t-${id}" ${i?'hidden':''}>${panels[id]}</div>`).join('')}
      ${left.length?`<div class="sect-title" style="margin-top:30px"><h3>Other values</h3></div>${facts(left)}`:''}
      <p class="note">Built from every non-empty cell for this school in the School Info sheet${s.c==='CA'?' (Canadian Schools tab)':''}: ${G.count} values. Empty cells are left out. Cost totals are estimates from the sheet’s tuition, fees and rent figures.</p>
    </div>`;
  const rh=$('#recHide'); if(rh) rh.addEventListener('change',()=>{recHideEmpty=rh.checked; $('#p-record').classList.toggle('hide-empty',recHideEmpty);}); $('#p-record').classList.toggle('hide-empty',recHideEmpty);
  const cc=$('#costCard'); const paintCost=()=>{ if(cc) cc.innerHTML=cost.costHTML(); }; paintCost();
  if(cc) cc.addEventListener('click',e=>{const b=e.target.closest('[data-cost]'); if(b){costMode=b.dataset.cost; paintCost();}});
  renderSheetSave();
  const bg=$('#sheetBg'); bg.hidden=false; bg.scrollTop=0; document.body.style.overflow='hidden';
  if(instant){ bg.classList.add('open'); requestAnimationFrame(moveInd); } else requestAnimationFrame(()=>{bg.classList.add('open'); moveInd();});
  countUp($('#p-overview'));
  $('#closeSheet').focus({preventScroll:true});
  $('#closeSheet').onclick=closeSheet;
  $('#sheetSave').onclick=()=>toggleSave(s.name);
  $('#sheetCmp').onclick=()=>toggleCompare(s.name);
  renderSheetCmp(); renderTray();
  const bar=$('#sheet .tabbar');
  function moveInd(){const b=bar.querySelector('[aria-selected="true"]'), ind=bar.querySelector('.ind'); if(!b) return; ind.style.width=b.offsetWidth+'px'; ind.style.transform=`translateX(${b.offsetLeft}px)`;}
  function selectTab(id){
    bar.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===id));
    TB.forEach(([t])=>{$('#p-'+t).hidden=t!==id;});
    moveInd(); bar.querySelector(`[data-tab="${id}"]`).scrollIntoView({block:'nearest',inline:'nearest'});
    const wrap=$('#sheet .tabbar-wrap'); const top=wrap.offsetTop + $('#sheet').offsetTop;
    if(bg.scrollTop>top) bg.scrollTo({top:top});
  }
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-tab]'); if(b) selectTab(b.dataset.tab);});
  bar.addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key))return;const ids=TB.map(t=>t[0]);const cur=ids.indexOf(bar.querySelector('[aria-selected="true"]').dataset.tab);
    const nx=ids[(cur+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length]; selectTab(nx); $('#t-'+nx).focus();});
  $('#sheet').addEventListener('click',e=>{const c=e.target.closest('[data-copy]'); if(!c) return; const v=c.dataset.copy;
    const done=()=>{c.textContent='Copied'; setTimeout(()=>c.textContent='Copy',1400);};
    try{ navigator.clipboard.writeText(v).then(done,()=>{selectText(c.previousElementSibling.querySelector('b'));}); }catch(err){ selectText(c.previousElementSibling.querySelector('b')); }});
  onWin('resize',moveInd);
}
function selectText(el){const r=document.createRange();r.selectNodeContents(el);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);}
function renderSheetSave(){const b=$('#sheetSave');if(!b||!current)return;const v=state.list[current.name];
  b.innerHTML=`${heartSVG(!!v).replace(/#fff/g,'currentColor')}${v?'Tracking · '+STAGE_NAME[v.stage]:'Add to My Schools'}`;}
function renderSheetCmp(){const b=$('#sheetCmp');if(!b||!current)return;const on=state.compare.includes(current.name);
  b.classList.toggle('saved',on); b.innerHTML=`${cmpSVG}${on?'In Compare':'Compare'}`;}
function closeSheet(){
  const bg=$('#sheetBg'); bg.classList.remove('open'); document.body.style.overflow='';
  current=null; clearTimeout(sheetCloseT); sheetCloseT=setTimeout(()=>{bg.hidden=true;},300); renderTray();
  if(lastFocus) lastFocus.focus({preventScroll:true});
}
$('#sheetBg').addEventListener('click',e=>{if(e.target.id==='sheetBg')closeSheet();});
onDoc('keydown',e=>{if(e.key==='Escape'){ if(!$('#pmBg').hidden) closeProfile(); else if(current) closeSheet(); } if(e.key==='/'&&(!document.activeElement||document.activeElement===document.body)){e.preventDefault();$('#q').focus();}});


/* ---- boot ---- */
computeChances(); applyState(); startHero(); setSync(false); playIntro(false);

  return () => {
    LISTENERS.forEach(([t, type, fn, o]) => t.removeEventListener(type, fn, o));
    Object.values(TIMERS).forEach((id) => clearInterval(id));
    clearInterval(heroTimer);
    document.body.style.overflow = "";
  };
}
