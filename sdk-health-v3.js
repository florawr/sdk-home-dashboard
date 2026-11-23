/* Update OpenWrap SDK modal, v3 (built from publisher feedback): a today-vs-update table up top, details in tabs
   (What's New, Risk Evidence, Release Notes, Apps).
   Two scenarios, switched in the footer for the prototype: a publisher with several apps to update, or one app.
   Loads after sdk-health.js and replaces SDK.open for all-apps opens (single-app opens from the Apps page still use v2).
   Everything in the SAMPLE DATA block is placeholder data until it is wired to release notes and SDK telemetry. */
(function(){
  var S=window.SDK, OW=window.OW;
  var VERS=S.VERS, REC=S.REC, NEED=S.NEED, SDK_APPS=S.SDK_APPS, RULE=S.REC_RULE,
      sdkCalc=S.sdkCalc, vcmp=S.vcmp, verified=S.verified, tag=S.tag, lifeTag=S.lifeTag, icon=S.icon, sdkIcon=S.sdkIcon, kN=S.kN,
      platIcon=OW.platIcon, closeAll=OW.closeAll;

  /* ---------- SAMPLE DATA ---------- */
  // start = SDK startup, load = ad load time (seconds, median across publishers); dsp = demand partners that can bid
  var PERF={
    'v10.0.2':{start:1.7,load:1.02,dsp:18},'v10.2.0':{start:1.6,load:0.98,dsp:18},'v10.4.0':{start:1.5,load:0.95,dsp:18},
    'v10.6.1':{start:1.3,load:0.90,dsp:20},'v11.0.0':{start:1.0,load:0.89,dsp:26},'v11.0.1':{start:0.9,load:0.79,dsp:26},
    'v11.0.3':{start:0.5,load:0.74,dsp:26},'v11.1.0':{start:0.5,load:0.72,dsp:26}
  };
  var BASE_FMTS=['Banner','Interstitial','Rewarded video','Native'];
  // v = first version with the feature. kind: format | demand | speed. fit = apps it suits best (optional)
  var FEAT=[
    {v:'v11.0.3',kind:'format',ic:'rewarded-video',n:'Rewarded interstitial',d:'Reward users at natural breaks, like between game levels, without an opt-in button.',fit:['Puzzle Quest','Bad Piggies']},
    {v:'v11.0.0',kind:'demand',ic:'bid',n:'Server-side bidding',d:'6 more demand partners bid on every ad request, with no extra SDKs in your app.'},
    {v:'v11.0.0',kind:'format',ic:'in-feed-native',n:'Native video',d:'Run video ads in native placements, such as feeds and article lists.',fit:['Weather Today','Finance Now']},
    {v:'v11.0.3',kind:'speed',ic:'lazy-load',n:'Background startup',d:'The SDK starts off the main thread, so it no longer slows app launch.',gain:'Starts 0.4s sooner'}
  ];
  var KIND={format:'New format',demand:'More demand',speed:'Faster'};
  // Release notes. Changed = your developers may need to edit code; Req = new minimum requirement
  var NOTES={
    'v11.1.0':{rel:'Oct 20, 2026',items:[['New','Audio ads (beta)'],['Fixed','Freezes reading the advertising ID']]},
    'v11.0.3':{rel:'Sep 8, 2026',items:[['New','Rewarded interstitial ad format'],['New','Background startup: the SDK no longer blocks app launch'],['Fixed','Freezes at SDK startup']]},
    'v11.0.1':{rel:'Jul 14, 2026',items:[['New','Bid requests are 30% smaller'],['Fixed','Freezes when starting network requests'],['Fixed','Freezes when checking connectivity']]},
    'v11.0.0':{rel:'May 26, 2026',items:[['New','Server-side bidding with 6 more demand partners'],['New','Native video ads'],
      ['Changed','Initialize with OpenWrapSDK.initialize(config). It replaces setPublisherId().'],['Req','Minimum OS is now Android 7.0 or iOS 12.']]},
    'v10.6.1':{rel:'Apr 2, 2026',items:[['New','Open Measurement 1.5 viewability'],['Fixed','Freezes while loading ad settings']]},
    'v10.4.0':{rel:'Jan 12, 2026',items:[['Fixed','Banner refresh could stop after the app returns from the background']]},
    'v10.2.0':{rel:'Oct 6, 2025',items:[['Fixed','Interstitials could show twice on slow networks']]},
    'v10.0.2':{rel:'Aug 4, 2025',items:[]}
  };
  // Risk evidence for the recommended version, weekly for the last 8 weeks
  var EVID={pubs:[4,9,15,21,26,31,35,38],rate:[0.8,0.7,0.7,0.6,0.6,0.6,0.5,0.6],peers:11,peerType:'game apps',rollbacks:0,
    lift:[0.03,0.05],liftPubs:21,   // eCPM change (low, high) seen by publishers that moved from v10.x
    effort:'The startup call changed in v11.0.0. About 2 lines of code.',
    openIssues:{'v11.1.0':2}};   // known issues still being fixed, by version
  var ONE_APP='Puzzle Quest';   // the app used for the one-app scenario
  /* ---------- end sample data ---------- */

  function uniq(v,i,a){ return a.indexOf(v)===i; }
  function k(n){ return Math.round(n/1000)+'k'; }
  function money(n){ return n>=1e6?'$'+(n/1e6).toFixed(2)+'M':'$'+Math.round(n/1000)+'k'; }
  function range(a,b){ return money(a)+'–'+money(b).slice(1); }
  function pct(a,b){ return Math.round((1-b/a)*100); }
  function rev(name){ var r=OW.apps.filter(function(a){ return a[0]===name; })[0]; return r?r[1]:0; }  // net revenue, last 7 days
  function wavg(list,f){ var s=0,t=0; list.forEach(function(p){ s+=p.s; t+=f(p)*p.s; }); return s?t/s:0; }
  function fmtsAt(v){ return BASE_FMTS.concat(FEAT.filter(function(f){ return f.kind==='format'&&vcmp(f.v,v)<=0; }).map(function(f){ return f.n; })); }
  function listNames(a){ return a.length<3?a.join(' and '):a.slice(0,-1).join(', ')+' and '+a[a.length-1]; }
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  // Everything the modal shows, computed for the apps in scope
  function model(list){
    var c=sdkCalc(REC,list), vs=list.map(function(p){ return p.v; }).filter(uniq).sort(vcmp),
        un=list.filter(function(p){ return VERS[p.v].life==='U'; }).length,
        left=c.left.reduce(function(a,f){ return a+f.tot; },0),
        revB=list.reduce(function(a,p){ return a+rev(p.a); },0),
        dsp=list.map(function(p){ return PERF[p.v].dsp; });
    return {list:list,one:list.length===1,c:c,oldest:vs[0],range:vs.length>1?vs[0]+' – '+vs[vs.length-1]:vs[0],un:un,lim:list.length-un,
      rateB:c.before,rateA:c.after,frzB:c.ev+left,frzA:left,frzFixed:c.ev,
      startB:wavg(list,function(p){ return PERF[p.v].start; }),startA:PERF[REC].start,
      loadB:wavg(list,function(p){ return PERF[p.v].load; }),loadA:PERF[REC].load,
      fmtB:Math.min.apply(null,list.map(function(p){ return fmtsAt(p.v).length; })),fmtA:fmtsAt(REC).length,
      newFmts:fmtsAt(REC).filter(function(f){ return BASE_FMTS.indexOf(f)<0; }),
      dspB:[Math.min.apply(null,dsp),Math.max.apply(null,dsp)],dspA:PERF[REC].dsp,
      revB:revB,lo:revB*EVID.lift[0],hi:revB*EVID.lift[1],
      feats:FEAT.filter(function(f){ return vcmp(f.v,REC)<=0; }).map(function(f){
        return {f:f,apps:list.filter(function(p){ return vcmp(f.v,p.v)>0; })}; }).filter(function(x){ return x.apps.length; }),
      codeChanges:Object.keys(NOTES).filter(function(v){ return vcmp(v,vs[0])>0&&vcmp(v,REC)<=0; })
        .reduce(function(a,v){ return a.concat(NOTES[v].items.filter(function(it){ return it[0]==='Changed'; })); },[])};
  }

  var NT={New:['info','New'],Fixed:['ok','Fixed'],Changed:['warn','Code change'],Req:['neu','Requirement']};
  function noteTag(t){ var x=NT[t]; return '<span class="tag tag-'+x[0]+' v3-nt">'+x[1]+'</span>'; }

  /* ---------- version gap: releases between what's installed and the recommendation ---------- */
  function monthsSince(d){ return Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/(30.44*864e5))); }
  function gap(m){
    var rel=Object.keys(NOTES).sort(vcmp),
        behind=m.list.map(function(p){ return rel.filter(function(v){ return vcmp(v,p.v)>0&&vcmp(v,REC)<=0; }).length; }),
        lo=Math.min.apply(null,behind), hi=Math.max.apply(null,behind);
    return {track:rel.filter(function(v){ return vcmp(v,m.oldest)>=0&&vcmp(v,REC)<=0; }),
      txt:(lo===hi?hi:lo+'–'+hi)+' releases behind', age:monthsSince(NOTES[m.oldest].rel)};
  }
  var tipSeq=0;
  function tip(text,below){ var id='v3tip'+(tipSeq++);
    return '<span class="tip-wrap'+(below?' v3-tip-below':'')+'"><button class="tip-btn" aria-label="More info" aria-describedby="'+id+'">'+icon('information')+'</button><span class="tip" role="tooltip" id="'+id+'">'+text+'</span></span>'; }

  /* ---------- today vs. with the recommended version ---------- */
  // Change chip: the sign shows direction (no arrow); green means better, red means worse
  function chip(text,dir,good){ return '<span class="v3-chip '+(good?'is-good':'is-bad')+'">'+text+'</span>'; }
  function compareHtml(m){
    function lab(l,sub,t){ return '<span class="cmp-l">'+l+'</span>'+(sub||t?'<span class="v3-subline">'+(sub?'<span class="cmp-s">'+sub+'</span>':'')+(t||'')+'</span>':''); }
    function row(l,b,a,sub,t){ return '<tr><td>'+lab(l,sub,t)+'</td><td>'+b+'</td><td class="is-rec"><span class="v3-recval">'+a+'</span></td></tr>'; }
    // every cell: a value in a fixed-width slot, then an optional chip, so chips line up down the column
    function val(v,c){ return '<span class="v3-val">'+v+'</span>'+(c||''); }
    function less(b,a,fmt){ return val(fmt(a),chip('−'+pct(b,a)+'%',-1,true)); }   // lower is better
    // support status as icon + text (like the v2 comparison), not filled tags
    function st1(kind,text){ var ic={ok:'complete',warn:'warning-filled',err:'error-filled'}[kind]; return '<span class="v3-st '+kind+'">'+icon(ic)+text+'</span>'; }
    var life=m.one?VERS[m.list[0].v].life:null,
        support=m.one?(life==='U'?st1('err','Sunset'):st1('warn','Limited support'))
          :[m.un?st1('err',m.un+' sunset'):'',m.lim?st1('warn',m.lim+' limited'):''].filter(Boolean).join(''),
        dspB=m.dspB[0]===m.dspB[1]?String(m.dspB[0]):m.dspB[0]+'–'+m.dspB[1], g=gap(m);
    function s1(n){ return n.toFixed(1)+'s'; } function s2(n){ return n.toFixed(2)+'s'; }
    // top = shown by default; the rest appear with Show More
    var rows=[
      {top:true,h:row('Support',support,st1('ok','Supported'))},
      {top:true,h:row('Ad load time',s2(m.loadB),less(m.loadB,m.loadA,s2))},
      {h:row('Crash rate',m.rateB.toFixed(1),less(m.rateB,m.rateA,function(n){ return n.toFixed(1); }),'per 10k sessions')},
      {h:row('App freezes',k(m.frzB),less(m.frzB,m.frzA,k),'a week')},
      {h:row('SDK startup',s1(m.startB),less(m.startB,m.startA,s1))},
      {h:row('Ad formats',String(m.fmtB),val(m.fmtA,chip('+'+(m.fmtA-m.fmtB),1,true)))},
      {h:row('Demand partners',dspB,val(m.dspA,chip('+'+(m.dspA-m.dspB[1]),1,true)))}
    ], extra=rows.filter(function(r){ return !r.top; }).length;
    return '<h3 class="m-sec-title">Compared with '+(m.one?'your app':'your apps')+' today</h3><div class="m-tbl"><table class="v3-ba"><thead><tr><th></th>'+
        '<th>Installed '+(m.one?m.list[0].v:m.range)+'<span class="cmp-s">'+g.txt+'</span></th>'+
        '<th class="is-rec">Recommended '+REC+'</th></tr></thead><tbody>'+
      rows.filter(function(r){ return st.more||r.top; }).map(function(r){ return r.h; }).join('')+
      '</tbody></table></div>'+
      '<button class="lnk v3-more" data-act="more" aria-expanded="'+st.more+'">'+(st.more?'Show Less':'Show '+extra+' More')+icon(st.more?'chevron-up':'chevron-down')+'</button>';
  }
  // The newest version that isn't recommended yet, and why
  function newest(){ return Object.keys(VERS).filter(function(v){ return VERS[v].life==='S'&&vcmp(v,REC)>0; }).sort(vcmp).pop(); }
  function newestWhy(v){ var o=EVID.openIssues[v]; return o?'still has '+o+' open issue'+(o>1?'s':''):'is too new to verify'; }
  // The recommendation up front: one version and three reasons (new features, revenue, adoption)
  function recCardHtml(m){
    var y=VERS[REC], f=m.feats, lift=Math.round(EVID.lift[0]*100)+'–'+Math.round(EVID.lift[1]*100)+'%';
    function box(l,val,cap,good){ return '<div class="v3-why"><div class="rec-l">'+l+'</div>'+(val?'<div class="rec-n">'+(good?'<span class="to">'+val+'</span>':val)+'</div>':'')+(cap?'<div class="rec-cap">'+cap+'</div>':'')+'</div>'; }
    return '<section class="rec v3-rec" aria-label="Recommended version">'+
      '<div class="rec-head"><span class="rec-ver">'+REC+'</span>'+tag('info','Recommended')+'<span class="rec-sub">Released '+y.rel+' · Requires '+y.os+'</span></div>'+
      '<div class="v3-whys">'+
        box('New features','','<ul class="v3-flist">'+f.map(function(x){ return '<li>'+x.f.n+'</li>'; }).join('')+'</ul>')+
        box('Net revenue impact (estimate)'+
          tip('Estimate, not a guarantee. Assumes +'+lift+' eCPM, the middle range for '+EVID.liftPubs+' publishers that moved from v10.x, applied to '+(m.one?'this app’s':'your apps’')+' last 7 days.'),
          '+'+range(m.lo,m.hi)+'<span class="v3-per">/week</span>','')+
        box('Adoption',y.pubs+' publishers',y.sessL+' sessions a week')+
      '</div></section>';
  }
  // Summary under the title: why this version, in one or two sentences
  function verdictHtml(m){
    var y=VERS[REC], nv=newest(), n=m.c.fixed.length;
    return '<p class="v3-verdict">We recommend that you update to '+REC+' because it’s tried and tested by '+y.pubs+' publishers'+
      (n?' and fixes '+n+' known issue'+(n>1?'s':'')+' in '+(m.one?'this app':'your apps'):'')+'.'+
      (nv&&EVID.openIssues[nv]?' The newer '+nv+' still has open issues.':'')+'</p>';
  }

  /* ---------- tabs ---------- */
  // New features the app(s) don't have yet
  function featsHtml(m){
    return '<ul class="v3-feats">'+m.feats.map(function(x){
      var f=x.f, n=x.apps.length, fit=(f.fit||[]).filter(function(a){ return x.apps.some(function(p){ return p.a===a; }); }), meta=[];
      if(fit.length) meta.push(m.one?'Good fit for this app':'Good fit for '+listNames(fit));
      return '<li><span class="v3-fic">'+icon(f.ic)+'</span><div class="v3-ft">'+
        '<div class="v3-fn">'+f.n+tag('neu',f.gain||KIND[f.kind])+'</div><p>'+f.d+'</p>'+(meta.length?'<div class="v3-fit">'+meta.join(' · ')+'</div>':'')+'</div></li>'; }).join('')+'</ul>';
  }
  // Evidence that the recommended version is safe to adopt
  // Plain-text brief for Product and Engineering, grouped so they can weigh stability against revenue
  function summaryText(m){
    var c=m.c, g=gap(m), y=VERS[REC], nv=newest(), L=[], plat={ios:'iOS',android:'Android'};
    var from=m.one?m.list[0].a+' ('+plat[m.list[0].p]+') '+m.list[0].v:m.range+' ('+m.list.length+' apps)';
    var notes=Object.keys(NOTES).filter(function(v){ return vcmp(v,m.oldest)>0&&vcmp(v,REC)<=0; }), cnt={New:0,Fixed:0,Changed:0};
    notes.forEach(function(v){ NOTES[v].items.forEach(function(it){ if(cnt[it[0]]!=null) cnt[it[0]]++; }); });
    L.push('OpenWrap SDK update: '+from+' → '+REC+' (recommended)','');
    L.push('Why now');
    L.push('- '+(m.one?'This app is ':'Apps are ')+g.txt+'; '+(m.one?'its version':'the oldest version')+' is '+g.age+' months old.');
    if(m.one) L.push('- Support: '+(VERS[m.list[0].v].life==='U'?'sunset, so it no longer gets crash fixes.':'limited support until '+VERS[m.list[0].v].until+'.'));
    else { if(m.un) L.push('- '+m.un+' app'+(m.un>1?'s are':' is')+' on sunset versions that no longer get crash fixes.');
           if(m.lim) L.push('- '+m.lim+' app'+(m.lim>1?'s have':' has')+' limited support.'); }
    L.push('','Expected impact (estimates, not guarantees)');
    L.push('Stability');
    L.push('- Crash rate: '+m.rateB.toFixed(1)+' → '+m.rateA.toFixed(1)+' per 10k sessions ('+pct(m.rateB,m.rateA)+'% fewer)');
    if(m.frzFixed) L.push('- App freezes: '+k(m.frzFixed)+' fewer a week');
    L.push('Speed');
    L.push('- Ad load time: '+m.loadB.toFixed(2)+'s → '+m.loadA.toFixed(2)+'s ('+(m.loadB-m.loadA).toFixed(2)+'s faster)');
    L.push('- SDK startup: '+m.startB.toFixed(1)+'s → '+m.startA.toFixed(1)+'s ('+(m.startB-m.startA).toFixed(1)+'s faster)');
    L.push('Revenue and features');
    L.push('- Net revenue: +'+range(m.lo,m.hi)+' a week, assuming +'+Math.round(EVID.lift[0]*100)+'–'+Math.round(EVID.lift[1]*100)+'% eCPM (seen by '+EVID.liftPubs+' publishers that moved from v10.x)');
    m.feats.forEach(function(x){ L.push('- '+x.f.n+': '+x.f.d); });
    L.push('','Risk');
    L.push('- Tried and tested: '+y.pubs+' publishers, '+y.sessL+' sessions a week, steady crash rate for 8 weeks, '+(EVID.rollbacks?EVID.rollbacks+' rollbacks':'no rollbacks reported')+'.');
    if(c.fixed.length) L.push('- Fixes '+c.fixed.length+' of '+(c.fixed.length+c.left.length)+' known issues in '+(m.one?'this app':'your apps')+': '+
      c.fixed.slice().sort(function(a,b){ return b.tot-a.tot; }).map(function(f){ return f.i.n; }).join('; ')+'.');
    if(nv) L.push('- Newer '+nv+' isn’t recommended yet: it '+newestWhy(nv)+'.');
    L.push('','Engineering effort');
    L.push('- '+(m.codeChanges.length?m.codeChanges.length+' code change. '+EVID.effort:'No code changes. Drop-in update.'));
    L.push('- Requires '+y.os+'; '+(m.one?'this app meets':'all '+m.list.length+' apps meet')+' it.');
    L.push('','Release notes since '+m.oldest+': '+notes.length+' releases with '+cnt.New+' additions, '+cnt.Fixed+' fixes and '+cnt.Changed+' code change'+(cnt.Changed===1?'':'s')+'.');
    if(!m.one){ L.push('','Apps to update');
      m.list.forEach(function(p){ L.push('- '+p.a+' ('+plat[p.p]+'): '+p.v+' → '+REC+', '+(VERS[p.v].life==='U'?'sunset':'limited support')); }); }
    return L.join('\n');
  }
  function copyLegacy(t){
    return new Promise(function(res,rej){
      var a=document.createElement('textarea'); a.value=t; a.setAttribute('readonly',''); a.style.position='fixed'; a.style.opacity='0';
      document.getElementById('v3Wrap').appendChild(a); a.select(); var ok=false; try{ ok=document.execCommand('copy'); }catch(e){} a.remove(); ok?res():rej(); });
  }
  function copyText(t){   // Clipboard API first; older copy command if the browser blocks it
    if(navigator.clipboard&&window.isSecureContext) return navigator.clipboard.writeText(t).catch(function(){ return copyLegacy(t); });
    return copyLegacy(t);
  }

  // Release timeline, newest first, showing where the app(s) are today
  function timelineHtml(m){
    var vs=Object.keys(NOTES).filter(function(v){ return vcmp(v,m.oldest)>=0; }).sort(vcmp).reverse();
    return '<div class="v3-sh"><p class="v3-lead">Every release from '+(m.one?'your version':'your oldest version')+' to the newest.</p>'+
        '<a class="lnk v3-ext" href="#" data-act="ext">View Full Release Notes'+icon('external-link')+'</a></div>'+
      '<ol class="v3-tl">'+vs.map(function(v){
        var on=m.list.filter(function(p){ return p.v===v; }), isRec=v===REC;
        return '<li class="'+(isRec?'is-rec':on.length?'is-cur':'')+'"><span class="v3-dot" aria-hidden="true"></span>'+
          '<div class="v3-tlh"><b>'+v+'</b>'+(isRec?tag('info','Recommended'):'')+
            '<span class="v3-rnd">'+NOTES[v].rel+'</span>'+
            (on.length?'<span class="v3-here">'+(m.one?'Your app is on this version':on.map(function(p){ return '<span class="v3-hereapp">'+sdkIcon(p.a)+p.a+'</span>'; }).join('')+(on.length>1?'are':'is')+' on this version')+'</span>':'')+'</div>'+
          (NOTES[v].items.length?'<ul class="v3-notes">'+NOTES[v].items.map(function(it){ return '<li>'+noteTag(it[0])+'<span>'+esc(it[1])+'</span></li>'; }).join('')+'</ul>':'')+
        '</li>'; }).join('')+'</ol>';
  }
  // Apps that need the update, with the revenue estimate per app (several-apps scenario only)
  function appsHtml(m){
    var ok=SDK_APPS.filter(function(p){ return VERS[p.v].life==='S'; });
    return '<div class="m-tbl"><table><thead><tr><th>App</th><th>Version</th><th>Status</th><th class="num">Revenue, 7 days</th><th class="num">Est. uplift a week</th></tr></thead><tbody>'+
      m.list.map(function(p){ var r=rev(p.a);
        return '<tr><td><div class="app-cell">'+sdkIcon(p.a)+'<span>'+p.a+'</span>'+platIcon(p.p)+'</div></td>'+
          '<td><span class="ver-to">'+p.v+'<svg class="ic s12" aria-label="to"><use href="#i-arrow-right"/></svg>'+REC+'</span></td>'+
          '<td>'+lifeTag(p.v,true)+'</td><td class="num">'+money(r)+'</td><td class="num">+'+range(r*EVID.lift[0],r*EVID.lift[1])+'</td></tr>'; }).join('')+
      '</tbody></table></div>'+
      (ok.length&&!m.one?'<div class="utd"><button class="utd-head" data-act="utd" aria-expanded="'+st.utd+'">'+
        '<span class="ico-stack" aria-hidden="true">'+ok.slice(0,5).map(function(p){ return sdkIcon(p.a); }).join('')+'</span>'+
        '<span class="utd-txt"><b>'+ok.length+' app'+(ok.length===1?' is':'s are')+' on supported versions</b><span>No update needed right now.</span></span>'+
        '<span class="utd-tog">'+(st.utd?'Hide Apps':'Show Apps')+icon(st.utd?'chevron-up':'chevron-down')+'</span></button>'+
        '<div class="utd-list"'+(st.utd?'':' hidden')+'>'+ok.map(function(p){
          return '<div class="utd-row"><span class="nm">'+sdkIcon(p.a)+'<span>'+p.a+'</span>'+platIcon(p.p)+'</span><span class="v">'+p.v+'</span>'+lifeTag(p.v,true)+'</div>'; }).join('')+'</div></div>':'');
  }

  function renderBody(m){
    var rel=Object.keys(NOTES).filter(function(v){ return vcmp(v,m.oldest)>0&&vcmp(v,REC)<=0; }).length,
        tabs=[['new','What’s New',m.feats.length],['notes','Release Notes',rel],['apps','Apps',m.list.length]];
    if(!tabs.some(function(t){ return t[0]===st.tab; })) st.tab='new';
    var panel={new:featsHtml,notes:timelineHtml,apps:appsHtml}[st.tab](m);
    return recCardHtml(m)+'<div class="v3-cmp">'+compareHtml(m)+'</div>'+
      '<div class="v3-tabs" role="tablist" aria-label="Update details">'+tabs.map(function(t){
        return '<button role="tab" id="v3tab-'+t[0]+'" data-act="tab" data-tab="'+t[0]+'" aria-selected="'+(st.tab===t[0])+'" aria-controls="v3Panel" tabindex="'+(st.tab===t[0]?0:-1)+'">'+
          t[1]+(t[2]!=null?'<span class="v3-cnt">'+t[2]+'</span>':'')+'</button>'; }).join('')+'</div>'+
      '<div class="v3-panel" role="tabpanel" id="v3Panel" aria-labelledby="v3tab-'+st.tab+'">'+panel+'</div>';
  }

  /* ---------- modal shell ---------- */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-wrap" id="v3Wrap" hidden>'+
      '<div class="modal v3" role="dialog" aria-modal="true" aria-labelledby="v3Title">'+
        '<div class="m-dismiss"><button class="m-x" id="v3Close" aria-label="Close"><svg class="ic s16"><use href="#i-close-small"/></svg></button></div>'+
        '<div class="m-scroll" id="v3Scroll"><h2 class="m-title" id="v3Title" tabindex="-1">Update OpenWrap SDK Versions</h2><div class="v3-body" id="v3Body"></div></div>'+
        '<div class="m-footer">'+
          '<div class="v3-proto"><span>Prototype scenario</span><div class="v3-seg" role="group" aria-label="Prototype scenario">'+
            '<button data-apps="many">Several apps</button><button data-apps="one">One app</button></div></div>'+
          '<div class="m-actions"><button class="btn-secondary" id="v3Copy"><svg class="ic s16" aria-hidden="true"><use href="#i-copy"/></svg><span>Copy Summary</span></button>'+
            '<button class="btn-primary" id="v3Done">Done</button></div>'+
          '<span class="v3-sr" aria-live="polite" id="v3Live"></span>'+
        '</div>'+
      '</div>'+
    '</div>');

  var q=new URLSearchParams(location.search);
  var st={apps:q.get('apps')==='one'?'one':'many',tab:'new',utd:false,more:false};
  var wrap=document.getElementById('v3Wrap'), body=document.getElementById('v3Body'), last=null;
  function scope(){ return st.apps==='one'?NEED.filter(function(p){ return p.a===ONE_APP; }):NEED; }
  function render(focusSel){
    var m=model(scope());
    document.getElementById('v3Title').textContent=m.one?'Update OpenWrap SDK Version':'Update OpenWrap SDK Versions';
    body.innerHTML=renderBody(m);
    wrap.querySelectorAll('[data-apps]').forEach(function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-apps')===st.apps)); });
    if(focusSel){ var f=body.querySelector(focusSel); if(f) f.focus(); }
  }
  function open(from){
    last=from||document.activeElement; closeAll(null);
    st.tab='new'; st.utd=false; st.more=false; if(copyBtn) copyState(false);
    render(); wrap.hidden=false; document.getElementById('v3Scroll').scrollTop=0; document.getElementById('v3Close').focus();
  }
  function close(){ wrap.hidden=true; if(last&&last.focus) last.focus(); }

  body.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]'); if(!b) return;
    var a=b.getAttribute('data-act');
    if(a==='ext'){ e.preventDefault(); return; }   // release notes site: not part of the prototype
    if(a==='utd'){ st.utd=!st.utd; render('[data-act="utd"]'); }
    if(a==='tab'){ st.tab=b.getAttribute('data-tab'); render('[data-tab="'+st.tab+'"]'); }
    if(a==='more'){ st.more=!st.more; render('[data-act="more"]'); }
  });
  // arrow keys move between tabs
  body.addEventListener('keydown',function(e){
    var b=e.target.closest('[role="tab"]'); if(!b||(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')) return;
    var tabs=[].slice.call(body.querySelectorAll('[role="tab"]')), i=tabs.indexOf(b)+(e.key==='ArrowRight'?1:-1);
    st.tab=tabs[(i+tabs.length)%tabs.length].getAttribute('data-tab'); render('[data-tab="'+st.tab+'"]'); e.preventDefault();
  });
  wrap.querySelectorAll('[data-apps]').forEach(function(b){ b.addEventListener('click',function(){
    st.apps=b.getAttribute('data-apps'); copyState(false); render(); document.getElementById('v3Scroll').scrollTop=0;
    try{ var u=new URL(location.href); u.searchParams.set('apps',st.apps); u.searchParams.delete('opt'); history.replaceState(null,'',u); }catch(err){}
  }); });
  document.getElementById('v3Close').addEventListener('click',close);
  document.getElementById('v3Done').addEventListener('click',close);
  // Copy Summary: brief for Product and Engineering; the button confirms in place for a few seconds
  var copyBtn=document.getElementById('v3Copy');
  // Once copied, the button is disabled (Helios disabled secondary) until the content changes: another scenario or a reopen
  function copyState(done,fail){
    copyBtn.querySelector('use').setAttribute('href',done?'#i-complete':'#i-copy');
    copyBtn.querySelector('span').textContent=done?'Summary Copied':fail?'Copy Failed. Try Again':'Copy Summary';
    copyBtn.disabled=!!done;
    if(!done) document.getElementById('v3Live').textContent='';
  }
  copyBtn.addEventListener('click',function(){
    var t=summaryText(model(scope())); window.__v3Summary=t;   // exposed for prototype review
    copyText(t).then(function(){ copyState(true); document.getElementById('v3Live').textContent='Summary copied';
                       document.getElementById('v3Done').focus(); },   // the disabled button can't keep focus
                     function(){ copyState(false,true); });
  });
  wrap.addEventListener('click',function(e){ if(e.target===wrap) close(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!wrap.hidden){ e.preventDefault(); close(); } });

  // All-apps opens use v3; opens for one app (Apps page) keep the v2 modal
  var v2open=S.open;
  S.open=function(from,opts){ if(opts&&opts.app) return v2open(from,opts); open(from); };
  if(q.get('open')==='1') open(document.getElementById('sdkOpen'));
})();
