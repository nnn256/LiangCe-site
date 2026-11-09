(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LiangceChanMarkers=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const labels={first_buy:'一买',second_buy:'二买',third_buy:'三买',first_sell:'一卖',second_sell:'二卖',third_sell:'三卖'};
 const states={candidate:'待确认',confirmed:'确认',invalidated:'失效',withdrawn:'撤销'};
 function time(value,period){const label=String(value).replace('T',' ');return period.endsWith('m')?Math.floor(Date.parse(label.slice(0,16).replace(' ','T')+':00+08:00')/1000):label.slice(0,10);}
 function build(result,{mode='anchor',fractals=true,signals=true,rank='all'}={}){
  const bars=result?.bars||[],markers=[],evidence={};let omitted=0;
  const times=new Set(bars.map(b=>time(b.date,result.period)));
  if(fractals)for(const f of result?.structure?.fractals||[]){
   const pivot=bars[f.source],basis=bars[f.basis_at];if(!pivot||!basis||f.state!=='closed_basis'||f.basis_at<=f.source){omitted++;continue;}
   const id='fractal:'+f.id,t=time(pivot.date,result.period),top=f.kind==='top';
   markers.push({id,time:t,position:top?'aboveBar':'belowBar',shape:'circle',size:.5,color:top?'#7252aa':'#168580',text:top?'顶':'底'});
   evidence[id]={type:'fractal',label:top?'顶分型':'底分型',price:f.price,anchor_time:pivot.date,confirmed_at:basis.date,basis_at:f.basis_at,source:f.source,components:f.components};
  }
  if(signals)for(const s of result?.signals||[]){
   if(rank!=='all'&&s.rank!==Number(rank))continue;
   const label=mode==='anchor'?s.anchor_time:s.confirmed_at||s.observed_at,t=time(label,result.period);
   if(!times.has(t)){omitted++;continue;}
   const id='signal:'+s.id;
   markers.push({id,time:t,position:s.side==='buy'?'belowBar':'aboveBar',shape:s.side==='buy'?'arrowUp':'arrowDown',size:1.3,color:s.state==='confirmed'?(s.side==='buy'?'#c74b4b':'#087b68'):s.state==='candidate'?'#b87724':'#777',text:`${labels[s.signal_class]||s.label}·${states[s.state]||s.state}·L${s.rank}`});
   evidence[id]={type:'signal',...s};
  }
  markers.sort((a,b)=>(typeof a.time==='number'?a.time-b.time:a.time.localeCompare(b.time))||a.id.localeCompare(b.id));
  return {markers,evidence,omitted,signalCount:markers.filter(m=>m.id.startsWith('signal:')).length,fractalCount:markers.filter(m=>m.id.startsWith('fractal:')).length};
 }
 return {build,time};
});
