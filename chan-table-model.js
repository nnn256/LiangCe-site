(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LiangceChanTable=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const states={candidate:'候选·未确认',confirmed:'历史规则确认',invalidated:'已失效记录',withdrawn:'已撤销记录'};
 const basisNames={none:'未复权',unadjusted:'未复权',qfq:'前复权',causal_split_hfq_verified_actions:'已核验转增·因果后复权',provider_unspecified:'复权口径未认证'};
 function stamp(s){return [s?.observed_at,s?.confirmed_at,s?.invalidated_at,s?.withdrawn_at].filter(Boolean).sort().at(-1)||'';}
 function signal(p,cls='all',state='all'){
  if(!p)return null;const pool=[p.latest,...Object.values(p.latest_by_state||{}),...Object.values(p.latest_by_class||{}),...Object.values(p.latest_by_class_state||{})].filter(Boolean);
  return pool.filter(s=>(cls==='all'||s.signal_class===cls)&&(!['candidate','confirmed','invalidated','withdrawn'].includes(state)||s.state===state)).sort((a,b)=>stamp(b).localeCompare(stamp(a)))[0]||null;
 }
 function day(value){return typeof value==='string'?value.slice(0,10):null;}
 function days(from,to){const a=Date.parse(day(from)),b=Date.parse(day(to));return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/86400000)):null;}
 function basis(p){return basisNames[p?.adjustment]||p?.adjustment||'口径未记录';}
 function choosePeriod(saved,live){return live&&(!saved?.as_of||String(live.as_of)>=String(saved.as_of))?live:saved;}
 function describe(p,s){
  const count=Object.values(p?.counts||{}).reduce((a,b)=>a+(Number(b)||0),0);
  if(!s)return {empty:p?.error?'该周期数据不足':count?'本筛选无匹配记录':'本样本无六类记录',count,scope:p?.scope||'saved_sample',basis:basis(p)};
  const buy=s.signal_class?.endsWith('_buy'),third=s.signal_class?.startsWith('third_');
  return {count,basis:basis(p),state:states[s.state]||s.state,anchorDate:day(s.anchor_time),observedDate:day(s.observed_at),confirmedDate:day(s.confirmed_at),
   observationDelay:days(s.anchor_time,s.observed_at),confirmationDelay:days(s.anchor_time,s.confirmed_at),eventAge:days(stamp(s),p.as_of),
   boundaryLabel:third?(buy?'中枢上沿 ZG':'中枢下沿 ZD'):'一/二类极值边界',boundaryRule:buy?'低点 ≤ 此价失效':'高点 ≥ 此价失效',
   warning:s.state==='candidate'?`缺少 ${s.missing?.length||0} 项确认条件`:'状态仅核验至 '+(day(p.as_of)||'未知日期')};
 }
 function quoteBoundary(p,s,q){
  if(!s||!['candidate','confirmed'].includes(s.state)||!q||q.stale||!Number.isFinite(q.price)||!Number.isFinite(s.invalidation))return null;
  if(!['none','unadjusted'].includes(p.adjustment))return {kind:'incomparable',text:'口径未对齐，现价不比较结构边界'};
  if(!q.market_time||day(q.market_time)<day(p.as_of))return null;
  const crossed=s.signal_class.endsWith('_buy')?q.price<=s.invalidation:q.price>=s.invalidation;
  return crossed?{kind:'crossed',text:'新报价已越过边界，需重算确认状态'}:null;
 }
 function compact(result){
  const brief=s=>Object.fromEntries(['id','label','signal_class','state','observed_at','confirmed_at','invalidated_at','withdrawn_at','anchor_time','price','invalidation','rank','missing'].map(k=>[k,s[k]??null]));
  const byState={},both={},byClass={};const list=[...(result.signals||[])].sort((a,b)=>stamp(a).localeCompare(stamp(b)));
  for(const s of list){byState[s.state]=brief(s);both[s.signal_class+':'+s.state]=brief(s);byClass[s.signal_class]=brief(s);}
  return {bar_count:result.bar_count,first:result.first,as_of:result.as_of,adjustment:result.adjustment,source:result.source,scope:'full_live_replay',counts:result.counts,states:result.states,
   latest:list.length?brief(list.at(-1)):null,latest_by_state:byState,latest_by_class:byClass,latest_by_class_state:both,certificate_errors:result.certificate_errors};
 }
 return {signal,describe,quoteBoundary,compact,stamp,days,basis,choosePeriod};
});
