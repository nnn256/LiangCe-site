(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LiangceChanLevels=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PERIODS={day:'日线',week:'周线',month:'月线','1m':'1分钟','5m':'5分钟','15m':'15分钟','30m':'30分钟','60m':'60分钟',quarter:'季线',year:'年线','5d':'5日线'};
 const ORDER=['1m','5m','15m','30m','60m','day','week','month','quarter','year'];
 const COLORS=['#778982','#ad6a14','#7252aa','#166e9e','#a04474','#24766d','#77602a','#515496','#8c513d'];
 function validRank(value){return Number.isInteger(value)&&value>=0&&value<=32;}
 function rank(value){return validRank(value)?'L'+value:'级别未记录';}
 function period(value){return PERIODS[value]||String(value||'周期未记录');}
 function color(value){return COLORS[validRank(value)?value%COLORS.length:0];}
 function label(timeframe,level){return `${period(timeframe)} · ${rank(level)}`;}
 function relation(level,reference){return level>reference?'大级别':level<reference?'小级别':'本级';}
 function levels(result){
  return [...new Set([...(result?.structure?.centers||[]).map(c=>c.rank),...(result?.signals||[]).map(s=>s.rank)].filter(n=>validRank(n)&&n>0))].sort((a,b)=>a-b);
 }
 function describe(result,reference=1){
  return [reference+1,reference,reference-1].map(level=>({rank:level,relation:relation(level,reference),label:label(result?.period,level),color:color(level),
   centers:(result?.structure?.centers||[]).filter(c=>c.rank===level).length,
   signals:(result?.signals||[]).filter(s=>s.rank===level).length,
   baseSegments:level===0?(result?.structure?.segments||[]).length:null,
   meaning:level===0?'L0 为当前引擎声明的基础线段':'中枢由 '+rank(level-1)+' 子级结构构成'}));
 }
 function signalContext(result,signal){
  const center=(result?.structure?.centers||[]).find(c=>c.id===signal.center_id&&c.rank===signal.rank);
  const child=center?.child_rank;
  const gates=signal.evidence?.gates||{},verified=Boolean(center?.certificate?.sublevel_types_verified&&gates.completed_child_types&&gates.terminal_is_completed_type&&gates.opposite_child_boundary_confirmed);
  return {label:label(result?.period,signal.rank),rank:signal.rank,larger_rank:validRank(signal.rank)?signal.rank+1:null,child_rank:validRank(child)?child:null,
   center_id:signal.center_id,components:center?.seed_ids||[],sublevel_verified:verified,
   sublevel_note:verified?'已记录完整子级类型及反向边界证据':'子级确认条件尚未齐备，查看下方缺失条件',
   cross_period_note:'此证据属于同一采样周期内部的递归结构；跨周期联动确认尚未验证'};
 }
 function timeframeNeighbors(current,available={}){
  const i=ORDER.indexOf(current);if(i<0)return [];
  return [{key:ORDER[i+1],relation:'大周期'},{key:current,relation:'当前周期'},{key:ORDER[i-1],relation:'小周期'}].filter(x=>x.key).map(x=>{
   const data=available[x.key],usable=Boolean(data&&!data.error&&data.bar_count>0);
   return {...x,label:period(x.key),available:usable,bar_count:data?.bar_count||0,as_of:data?.as_of||null,
    note:usable?'独立周期结果；不自动构成跨周期确认':data?.error||'该股票尚无此周期结果'};
  });
 }
 return {rank,period,color,label,relation,levels,describe,signalContext,timeframeNeighbors};
});
