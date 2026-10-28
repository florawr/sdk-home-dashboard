/* OpenWrap SDK version health: sample data, status labels, the dashboard widget, and the
   Update OpenWrap SDK modal. Shared by dashboard-v2.html (all apps) and apps.html (one app).
   The page sets window.OW = {apps, appIcon, platIcon, closeAll} before loading this file. */
(function(){
  var OW=window.OW, apps=OW.apps, appIcon=OW.appIcon, platIcon=OW.platIcon, closeAll=OW.closeAll;

  // Recommended thresholds are placeholders; production should read them from config.
  var REC_RULE={minPubs:25,minSessM:100,maxRate:1.0};
  // caps = new capabilities in that release (sample count)
  // life: S supported · O limited support (superseded, support ending) · U sunset (past end of support). rate = SDK-attributed crashes per 10k sessions.
  var VERS={
    'v11.1.0':{life:'S',rel:'Oct 20, 2026',pubs:4,sessM:9,sessL:'9M',rate:0.4,p0:false,os:'Android 8.0 or iOS 13'},
    'v11.0.3':{life:'S',rel:'Sep 8, 2026',pubs:38,sessM:420,sessL:'420M',rate:0.6,p0:false,os:'Android 7.0 or iOS 12',caps:3},
    'v11.0.1':{life:'S',rel:'Jul 14, 2026',pubs:61,sessM:1100,sessL:'1.1B',rate:0.9,p0:false,os:'Android 7.0 or iOS 12'},
    'v10.6.1':{life:'O',rel:'Apr 2, 2026',until:'Jan 15, 2027',pubs:142,sessM:3400,sessL:'3.4B',rate:2.1,p0:false,os:'Android 6.0 or iOS 12'},
    'v10.4.0':{life:'U',rate:2.8},'v10.2.0':{life:'U',rate:3.9},'v10.0.2':{life:'U',rate:4.6}
  };
  // Issue names are for ad ops; stack frames are for developers. c = events per app, last 7 days.
  var ISS=[
    {n:'Freezes while loading ad settings',fr:'POBCacheManager.requestProfileConfiguration',fix:'v10.6.1',c:{'Puzzle Quest':9400,'Weather Today':8800,'Finance Now':5200}},
    {n:'Freezes when starting network requests',fr:'POBVolley.newRequestQueue',fix:'v11.0.1',c:{'Puzzle Quest':7100,'Weather Today':6000,'Finance Now':3300,'Bad Piggies':12600}},
    {n:'Freezes when checking connectivity',fr:'POBNetworkMonitor.registerNetworkListener',fix:'v11.0.1',c:{'Puzzle Quest':4800,'Weather Today':3900,'Finance Now':2700,'Bad Piggies':9100,'Kids Learn':3000}},
    {n:'Freezes at SDK startup',fr:'OpenWrapSDKInitializerImpl.initialize',fix:'v11.0.3',c:{'Puzzle Quest':4200,'Weather Today':3600,'Finance Now':2400,'Bad Piggies':8700,'Kids Learn':2600}},
    {n:'Freezes reading the advertising ID',fr:'POBAdvertisingIdClient.<init>',fix:'v11.1.0',c:{'Puzzle Quest':2900,'Weather Today':2500,'Finance Now':1900,'Bad Piggies':6200,'Kids Learn':1800}}
  ];
  // s = % of this publisher's sessions; r = this app's crashes per 10k sessions, last 7 days
  var SDK_APPS=[
    {a:'Angry Birds 2',p:'ios',v:'v11.0.3',s:24,r:0.5},{a:'Bad Piggies',p:'android',v:'v10.6.1',s:19,r:2.3},
    {a:'Puzzle Quest',p:'ios',v:'v10.2.0',s:12,r:4.1},{a:'Weather Today',p:'android',v:'v10.0.2',s:10,r:4.4},
    {a:'Recipe Radar',p:'ios',v:'v11.0.1',s:9,r:0.7},{a:'Finance Now',p:'android',v:'v10.4.0',s:8,r:2.9},
    {a:'Trail Maps',p:'ios',v:'v11.0.3',s:7,r:0.6},{a:'Kids Learn',p:'android',v:'v10.6.1',s:6,r:2.2},
    {a:'Photo Lab',p:'ios',v:'v11.0.3',s:3,r:0.6},{a:'Daily Zen',p:'android',v:'v11.0.1',s:2,r:0.8}
  ];
  function vcmp(a,b){ a=a.slice(1).split('.').map(Number); b=b.slice(1).split('.').map(Number);
    for(var i=0;i<3;i++){ if(a[i]!==b[i]) return a[i]-b[i]; } return 0; }
  function verified(v){ var x=VERS[v]; return x.life==='S'&&x.pubs>=REC_RULE.minPubs&&x.sessM>=REC_RULE.minSessM&&x.rate<=REC_RULE.maxRate&&!x.p0; }
  var REC=Object.keys(VERS).filter(verified).sort(vcmp).pop();
  var LIFE_ORDER={U:0,O:1,S:2};
  SDK_APPS.sort(function(x,y){ return LIFE_ORDER[VERS[x.v].life]-LIFE_ORDER[VERS[y.v].life]||y.s-x.s; });
  var NEED=SDK_APPS.filter(function(p){ return VERS[p.v].life!=='S'; });
  function findApp(name){ return SDK_APPS.filter(function(p){ return p.a===name; })[0]||null; }
  function kN(n){ return n>=1000?(Math.round(n/100)/10)+'k':String(n); }
  var TAG_IC={ok:'circle-checked',warn:'warning-1',err:'error-filled'};
  function tag(kind,text){ return '<span class="tag tag-'+kind+'">'+(TAG_IC[kind]?'<svg class="ic" aria-hidden="true"><use href="#i-'+TAG_IC[kind]+'"/></svg>':'')+text+'</span>'; }
  var LIFE={S:['ok','Supported'],O:['warn','Limited support'],U:['err','Sunset']};
  function lifeTag(v,short){ var x=VERS[v], L=LIFE[x.life]; return tag(L[0], L[1]+(x.life==='O'&&!short?' until '+x.until:'')); }
  var icoSeq=0;
  function sdkIcon(name){ var i=apps.map(function(a){ return a[0]; }).indexOf(name);
    return appIcon(i<0?0:i,name).replace(/(["#])ag(\d+)/g,'$1sdkag'+(icoSeq++)+'_$2'); }  // unique gradient ids per insertion
  function icon(id,cls,label){ return '<svg class="ic s16'+(cls?' '+cls:'')+'"'+(label?' aria-label="'+label+'"':' aria-hidden="true"')+'><use href="#i-'+id+'"/></svg>'; }

  // Impact of moving a set of apps (default: every app that needs an update) to version t
  function sdkCalc(t,list){
    list=list||NEED;
    var fixed=[], left=[];
    ISS.forEach(function(i){ var tot=0,n=0,lt=0,ln=0;
      list.forEach(function(p){ var c=i.c[p.a]; if(!c||vcmp(i.fix,p.v)<=0) return;
        if(vcmp(i.fix,t)<=0){ tot+=c; n++; } else { lt+=c; ln++; } });
      if(n) fixed.push({i:i,tot:tot,n:n}); if(ln) left.push({i:i,tot:lt,n:ln}); });
    var ss=list.reduce(function(a,p){ return a+p.s; },0),
        before=ss?list.reduce(function(a,p){ return a+p.r*p.s; },0)/ss:0;
    return {t:t,fixed:fixed,left:left,ev:fixed.reduce(function(a,f){ return a+f.tot; },0),before:before,after:VERS[t].rate};
  }

  function renderSdkWidget(){
    var el=document.getElementById('sdkWidget'); if(!el) return;
    if(!NEED.length){
      el.innerHTML='<div class="sdk-kpi"><span class="l">Apps on supported SDK versions</span><span class="n">'+SDK_APPS.length+' of '+SDK_APPS.length+'</span>'+
        '<p class="sub">No SDK update is needed right now.</p></div>';
      return;
    }
    var un=NEED.filter(function(p){ return VERS[p.v].life==='U'; }), out=NEED.filter(function(p){ return VERS[p.v].life==='O'; }),
        share=un.reduce(function(a,p){ return a+p.s; },0), c=sdkCalc(REC);
    var sub=share+'% of your sessions run on sunset versions.'+
      (out.length?' '+(out.length===1?out[0].a+' has':out.length+' more apps have')+' limited support until '+VERS[out[0].v].until+'.':'');
    el.innerHTML=
      '<div class="sdk-kpi"><span class="l">Apps that need an SDK update</span><span class="n">'+NEED.length+' of '+SDK_APPS.length+'</span><p class="sub">'+sub+'</p></div>'+
      '<div class="sdk-mini">'+NEED.map(function(p){ return '<div class="sdk-mini-row">'+sdkIcon(p.a)+'<span class="nm">'+p.a+'</span><span class="v">'+p.v+'</span><span class="st">'+lifeTag(p.v,true)+'</span></div>'; }).join('')+'</div>'+
      '<div class="nbanner" role="note"><svg class="ic s16" aria-hidden="true"><use href="#i-information-filled"/></svg><span>Update to <b>'+REC+'</b> to fix '+c.fixed.length+' known issues'+(VERS[REC].caps?' and get '+VERS[REC].caps+' new capabilities':'')+'.</span></div>'+
      '<button class="btn-primary sdk-open" id="sdkOpen">View Recommended Version</button>';
    document.getElementById('sdkOpen').addEventListener('click',function(){ openSdk(this); });
  }

  /* ---- Update OpenWrap SDK modal ---- */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-wrap" id="sdkModalWrap" hidden>'+
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="sdkModalTitle">'+
        '<div class="m-dismiss"><button class="m-x" id="sdkClose" aria-label="Close"><svg class="ic s16"><use href="#i-close-small"/></svg></button></div>'+
        '<div class="m-scroll" id="sdkScroll">'+
          '<h2 class="m-title" id="sdkModalTitle">Update OpenWrap SDK Versions</h2>'+
          '<div class="m-app" id="sdkApp" hidden></div>'+
          '<section id="sdkRec" aria-label="Recommended version"></section>'+
          '<section><h3 class="m-sec-title" id="sdkCmpTitle">How it compares</h3><div class="m-tbl"><table class="cmp" id="sdkCmp"></table></div></section>'+
          '<section id="sdkAppsSec"><h3 class="m-sec-title">Apps to update</h3>'+
            '<div class="m-tbl"><table><thead><tr><th>App</th><th>Version</th><th>Status</th><th class="num">Sessions</th><th class="num">Crashes per 10k</th></tr></thead><tbody id="sdkRows"></tbody></table></div>'+
            '<div class="utd" id="sdkUpToDate"></div></section>'+
          '<div class="others" id="sdkOthers" hidden></div>'+
        '</div>'+
        '<div class="m-footer"><div class="m-actions"><button class="btn-primary" id="sdkDone">Done</button></div></div>'+
      '</div>'+
    '</div>');

  // mode.app set = opened from one app (Apps page drawer): numbers are for that app, the apps list collapses to one line
  var mode={app:null,onClose:null}, issOpen=false, utdOpen=false;
  function scope(){ return mode.app?[mode.app]:NEED; }

  // 0. Single-app header: which app, and where it's going
  function renderSdkApp(){
    var el=document.getElementById('sdkApp'), p=mode.app;
    document.getElementById('sdkModalTitle').textContent=p?'Update OpenWrap SDK Version':'Update OpenWrap SDK Versions';
    el.hidden=!p; if(!p){ el.innerHTML=''; return; }
    el.innerHTML='<span class="app-cell">'+sdkIcon(p.a)+'<b>'+p.a+'</b>'+platIcon(p.p)+'</span>'+
      '<span class="ver-to">'+p.v+'<svg class="ic s12" aria-label="to"><use href="#i-arrow-right"/></svg>'+REC+'</span>'+lifeTag(p.v);
  }

  // 1. Recommended version: crash-rate drop + known issues it fixes, for the apps in scope
  function renderSdkRec(){
    var list=scope(), c=sdkCalc(REC,list), y=VERS[REC], n=list.length, drop=Math.round((1-c.after/c.before)*100),
        who=mode.app?'this app':'your '+n+' app'+(n>1?'s':''),
        fixIn=c.left.map(function(f){ return f.i.fix; }).filter(function(v,i,a){ return a.indexOf(v)===i; });
    function byTot(a,b){ return b.tot-a.tot; }
    // What v11.0.3 fixes, then one muted line for what it doesn't (sets expectations without arguing for a newer version)
    var issHtml=c.fixed.slice().sort(byTot).map(function(f){ return '<li>'+icon('circle-checked','ok','Fixed')+'<span>'+f.i.n+'</span></li>'; }).join('')+
      (c.left.length?'<li class="iss-more">'+c.left.length+' more issue'+(c.left.length>1?'s are':' is')+' fixed in '+(fixIn.length===1?fixIn[0]:'newer versions')+'.</li>':'');
    var freezes=c.fixed.length?
      '<div class="rec-n"><span class="to">'+(c.ev>=1000?Math.round(c.ev/1000)+'k':c.ev)+' fewer a week</span></div>'+  // rounded: it's an estimate
      '<div class="rec-cap">Based on the last 7 days in '+(mode.app?'this app':'your apps')+'</div>'+
      '<button class="lnk" id="sdkIssBtn" aria-expanded="'+issOpen+'" aria-controls="sdkIssList">'+(issOpen?'Hide Issues':'Show Issues')+icon(issOpen?'chevron-up':'chevron-down')+'</button>'+
      '<ul class="iss-list" id="sdkIssList"'+(issOpen?'':' hidden')+'>'+issHtml+'</ul>'
      :'<div class="rec-n">No change</div><div class="rec-cap">No known freeze issues in '+(mode.app?'this app':'your apps')+'</div>';
    document.getElementById('sdkRec').innerHTML='<div class="rec">'+
      '<div class="rec-head"><span class="rec-ver">'+REC+'</span>'+tag('info','Recommended')+'<span class="rec-sub">Released '+y.rel+' · Requires '+y.os+'</span></div>'+
      '<div class="rec-grid">'+
        '<div class="rec-box"><div class="rec-l">Projected crashes</div>'+
          '<div class="rec-n"><span class="to">'+drop+'% fewer</span></div>'+
          '<div class="rec-cap">Crash rate <b>'+c.before.toFixed(1)+'</b>'+icon('arrow-right','','to')+'<b class="to">'+c.after.toFixed(1)+'</b>'+
            '<span class="tip-wrap"><button class="tip-btn" aria-label="About crash rate" aria-describedby="sdkRateTip">'+icon('information')+'</button>'+
            '<span class="tip" role="tooltip" id="sdkRateTip">Crashes per 10k sessions: '+who+' today vs. the '+REC+' average.</span></span></div></div>'+
        '<div class="rec-box"><div class="rec-l">Projected app freezes</div>'+freezes+'</div>'+
      '</div></div>';
    var b=document.getElementById('sdkIssBtn');
    if(b) b.addEventListener('click',function(){ issOpen=!issOpen; renderSdkRec(); document.getElementById('sdkIssBtn').focus(); });
  }

  // 2. The recommended version next to the other supported versions, scored against REC_RULE
  function renderSdkCompare(){
    var list=scope(), cols=Object.keys(VERS).filter(function(v){ return VERS[v].life==='S'; }).sort(vcmp).reverse(),
        rc=sdkCalc(REC,list), total=rc.fixed.length+rc.left.length;
    function td(v,html){ return '<td'+(v===REC?' class="is-rec"':'')+'>'+html+'</td>'; }
    function chk(ok,val){ return '<span class="chk'+(ok?'':' warn')+'">'+icon(ok?'circle-checked':'warning-1',ok?'ok':'warn',ok?'Meets the bar':'Below the bar')+val+'</span>'; }
    function row(label,sub,cell){ return '<tr><td><span class="cmp-l">'+label+'</span>'+(sub?'<span class="cmp-s">'+sub+'</span>':'')+'</td>'+cols.map(function(v){ return td(v,cell(v,VERS[v])); }).join('')+'</tr>'; }
    function verdict(v){
      if(v===REC) return '<span class="verdict">'+icon('circle-checked','ok')+'<span>Newest version that passes every check.</span></span>';
      if(!verified(v)) return '<span class="verdict">'+icon('warning-1','warn')+'<span>Too new to verify yet.</span></span>';
      var miss=rc.fixed.filter(function(f){ return vcmp(f.i.fix,v)>0; }), mt=miss.reduce(function(a,f){ return a+f.tot; },0);
      if(!miss.length) return '<span class="verdict">'+icon('circle-checked','ok')+'<span>Passes every check.</span></span>';
      return '<span class="verdict">'+icon('warning-1','warn')+'<span>'+'Misses '+miss.length+' fix'+(miss.length>1?'es':'')+' ('+kN(mt)+' freezes in 7 days).'+'</span></span>';
    }
    document.getElementById('sdkCmpTitle').textContent='How '+REC+' compares';
    document.getElementById('sdkCmp').innerHTML=
      '<thead><tr><th>Version</th>'+cols.map(function(v){ return '<th'+(v===REC?' class="is-rec"':'')+'>'+v+
        (v===REC?tag('info','Recommended'):!verified(v)?tag('neu','Too new to verify'):'')+'</th>'; }).join('')+'</tr></thead><tbody>'+
      row('Crash rate per 10k',REC_RULE.maxRate.toFixed(1)+' or lower',function(v,x){ return chk(x.rate<=REC_RULE.maxRate,x.rate.toFixed(1)); })+
      row('Publishers',REC_RULE.minPubs+' or more',function(v,x){ return chk(x.pubs>=REC_RULE.minPubs,String(x.pubs)); })+
      row('Sessions',REC_RULE.minSessM+'M or more',function(v,x){ return chk(x.sessM>=REC_RULE.minSessM,x.sessL); })+
      (total?row('Issues fixed',mode.app?'in this app':'in your apps',function(v){ var k=sdkCalc(v,list).fixed.length, m='';
        for(var i=0;i<total;i++) m+='<i'+(i<k?' class="on"':'')+'></i>';
        return k+' of '+total+'<span class="meter" aria-hidden="true">'+m+'</span>'; }):'')+
      '<tr class="v-row"><td><span class="cmp-l">Result</span></td>'+cols.map(function(v){ return td(v,verdict(v)); }).join('')+'</tr></tbody>';
  }

  // 3. Apps that need the update, plus a collapsed affirmation for apps already on supported versions
  function renderSdkRows(){
    var sec=document.getElementById('sdkAppsSec'), oth=document.getElementById('sdkOthers');
    if(mode.app){
      // One app in focus: the rest of the list becomes a single line with a way back to all apps
      var rest=NEED.filter(function(p){ return p!==mode.app; });
      sec.hidden=true; oth.hidden=!rest.length;
      oth.innerHTML=rest.length?
        '<span class="ico-stack" aria-hidden="true">'+rest.slice(0,4).map(function(p){ return sdkIcon(p.a); }).join('')+'</span>'+
        '<span class="others-txt"><b>'+rest.length+' other app'+(rest.length>1?'s':'')+' also need'+(rest.length>1?'':'s')+' this update.</b></span>'+
        '<button class="lnk" id="sdkAllApps">View All Apps</button>':'';
      var b=document.getElementById('sdkAllApps');
      if(b) b.addEventListener('click',function(){ mode.app=null; renderSdkModal(); document.getElementById('sdkScroll').scrollTop=0; document.getElementById('sdkModalTitle').focus(); });
      return;
    }
    sec.hidden=false; oth.hidden=true;
    var ok=SDK_APPS.filter(function(p){ return VERS[p.v].life==='S'; });
    document.getElementById('sdkRows').innerHTML=NEED.length?NEED.map(function(p){
      return '<tr><td><div class="app-cell">'+sdkIcon(p.a)+'<span>'+p.a+'</span>'+platIcon(p.p)+'</div></td>'+
        '<td><span class="ver-to">'+p.v+'<svg class="ic s12" aria-label="to"><use href="#i-arrow-right"/></svg>'+REC+'</span></td>'+
        '<td>'+lifeTag(p.v)+'</td>'+
        '<td class="num">'+p.s+'%</td><td class="num">'+p.r.toFixed(1)+'</td></tr>'; }).join('')
      :'<tr><td class="empty" colspan="5">All your apps are on supported versions.</td></tr>';
    var MAX=5, shown=ok.slice(0,MAX);
    document.getElementById('sdkUpToDate').innerHTML=ok.length?
      '<button class="utd-head" id="sdkUtdBtn" aria-expanded="'+utdOpen+'" aria-controls="sdkUtdList">'+
        '<span class="ico-stack" aria-hidden="true">'+shown.map(function(p){ return sdkIcon(p.a); }).join('')+(ok.length>MAX?'<span class="ico-more">+'+(ok.length-MAX)+'</span>':'')+'</span>'+
        '<span class="utd-txt"><b>'+ok.length+' app'+(ok.length===1?' is':'s are')+' on supported versions</b><span>No update needed right now.</span></span>'+
        '<span class="utd-tog">'+(utdOpen?'Hide Apps':'Show Apps')+icon(utdOpen?'chevron-up':'chevron-down')+'</span></button>'+
      '<div class="utd-list" id="sdkUtdList"'+(utdOpen?'':' hidden')+'>'+ok.map(function(p){
        return '<div class="utd-row"><span class="nm">'+sdkIcon(p.a)+'<span>'+p.a+'</span>'+platIcon(p.p)+'</span><span class="v">'+p.v+'</span>'+lifeTag(p.v,true)+'</div>'; }).join('')+'</div>':'';
    var u=document.getElementById('sdkUtdBtn');
    if(u) u.addEventListener('click',function(){ utdOpen=!utdOpen; renderSdkRows(); document.getElementById('sdkUtdBtn').focus(); });
  }
  function renderSdkModal(){ renderSdkApp(); renderSdkRec(); renderSdkCompare(); renderSdkRows(); }

  var sdkWrap=document.getElementById('sdkModalWrap'), sdkLastFocus=null;
  // opts.app: an app name to focus on; opts.onClose: runs instead of restoring focus (e.g. reopen the drawer it came from)
  function openSdk(from,opts){
    opts=opts||{};
    sdkLastFocus=from||document.activeElement; closeAll(null);
    mode.app=opts.app?findApp(opts.app):null; mode.onClose=opts.onClose||null;
    utdOpen=false; issOpen=false; renderSdkModal(); sdkWrap.hidden=false;
    document.getElementById('sdkScroll').scrollTop=0; document.getElementById('sdkClose').focus();
  }
  function closeSdk(){
    sdkWrap.hidden=true;
    if(mode.onClose){ var f=mode.onClose; mode.onClose=null; f(); }
    else if(sdkLastFocus&&sdkLastFocus.focus) sdkLastFocus.focus();
  }
  document.getElementById('sdkModalTitle').tabIndex=-1;
  document.getElementById('sdkClose').addEventListener('click',closeSdk);
  document.getElementById('sdkDone').addEventListener('click',closeSdk);
  sdkWrap.addEventListener('click',function(e){ if(e.target===sdkWrap) closeSdk(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!sdkWrap.hidden){ e.preventDefault(); closeSdk(); } });

  renderSdkWidget();
  window.SDK={VERS:VERS,REC:REC,NEED:NEED,SDK_APPS:SDK_APPS,findApp:findApp,lifeTag:lifeTag,tag:tag,open:openSdk};
})();
