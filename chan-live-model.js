(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LiangceChanLiveModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const periods=['day','week','month','1m','5m','15m','30m','60m'];
 function validate(code,period){if(!/^\d{6}$/.test(String(code))||!periods.includes(period))throw Error('股票或实时周期无效');}
 function trading(now=Date.now()){const d=new Date(now+8*3600000),m=d.getUTCHours()*60+d.getUTCMinutes();return d.getUTCDay()>0&&d.getUTCDay()<6&&((m>=555&&m<=690)||(m>=780&&m<=900));}
 function interval(now=Date.now()){return trading(now)?20000:300000;}
 function normalize(panel,code,period,now=Date.now()){
  validate(code,period);const full=(code.startsWith('6')?'sh':/^(4|8|92)/.test(code)?'bj':'sz')+code;
  if(panel.symbol!==full||panel.period!==period||panel.source_kind!=='live_market_panel')throw Error('后台未返回对应股票和周期的实时数据');
  const computed=Date.parse(panel.computed_at||'');if(!Number.isFinite(computed)||computed>now+60000||now-computed>Math.max(interval(now)*2,180000))throw Error('后台返回的实时快照已过期');
  const unique=new Map();
  for(const b of panel.bars||[]){
   const label=String(b.date_cn||''),date=period.endsWith('m')?label.slice(0,16):label.slice(0,10);
   if(!(period.endsWith('m')?/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/:/^\d{4}-\d{2}-\d{2}$/).test(date)||!['open','high','low','close','volume'].every(k=>Number.isFinite(b[k]))||b.low<=0||b.volume<0||b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close))throw Error('实时K线价格或成交量无效');
   if(typeof b.is_closed!=='boolean')throw Error('实时K线缺少收盘状态');
   const t=Date.parse(label.replace(' ','T')+':00+08:00');
   if(!Number.isFinite(t)||(b.is_closed&&t>now+1000))throw Error('实时K线日期或收盘时间无效');
   unique.set(date,{date,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume,is_closed:b.is_closed});
  }
  const bars=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!bars.length)throw Error('实时接口没有返回K线');
  return {ok:true,code,period,name:panel.name||code,bars,bar_count:bars.length,first:bars[0].date,as_of:bars.at(-1).date,computed_at:panel.computed_at,fetched_at:panel.fetched_at||panel.computed_at,source:panel.provenance?.source||'Railway',adjustment:panel.provenance?.adjustment||'provider_unspecified',volume_unit:panel.provenance?.volume_unit||'source_native',input_sha256:panel.coverage?.input_sha256,forming_bars:bars.filter(b=>!b.is_closed).length,refresh_after_ms:interval(now),live:true};
 }
 function compatible(snapshot,live){
  if(!snapshot||snapshot.code!==live.code||snapshot.period!==live.period)return false;
  const basis=v=>v==='unadjusted'?'none':v;
  if(basis(snapshot.adjustment)!==basis(live.adjustment))return false;
  const byDate=new Map(live.bars.map(b=>[b.date,b]));let matched=0;
  for(const old of snapshot.bars||[]){const b=byDate.get(old.date);if(!b)continue;matched++;if(['open','high','low','close'].some(k=>Math.abs(b[k]-old[k])>1e-7))return false;}
  return matched>0&&matched===snapshot.bars.length;
 }
 function scheduler({fetcher,context,onData,onState,clock=()=>Date.now(),visible=()=>true}){
  let key='',generation=0,busy=false,next=0,enabled=true,lastError=null,lastSuccess=null,requests=0,pending=false;
  function sync(){const c=context(),nextKey=c?c.code+':'+c.period:'';if(nextKey!==key){key=nextKey;generation++;next=0;lastSuccess=null;lastError=null;pending=Boolean(key);onState?.(state());}return c;}
  function state(){return {key,busy,next,enabled,lastError,lastSuccess,requests};}
  async function tick(force=false){
   const c=sync();if(force){next=0;pending=true;}if(!c||!enabled||!visible())return;
   if(busy)return;if(!force&&!pending&&clock()<next)return;
   busy=true;pending=false;const version=generation;requests++;onState?.(state());
   try{const data=await fetcher(c.code,c.period);sync();if(version!==generation||!enabled)return;onData(data);lastError=null;lastSuccess=clock();next=clock()+interval(clock());}
   catch(error){sync();if(version!==generation)return;lastError=error.message||String(error);next=clock()+Math.max(30000,interval(clock()));}
   finally{busy=false;onState?.(state());if(pending&&enabled&&visible())queueMicrotask(()=>tick());}
  }
  return {tick,state,setEnabled(value){enabled=Boolean(value);generation++;next=0;pending=enabled;onState?.(state());if(enabled)tick(true);}};
 }
 return {normalize,compatible,scheduler,interval,trading,validate};
});
