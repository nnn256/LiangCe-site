(() => {
 'use strict';const model=window.LiangceChanLiveModel,$=s=>document.querySelector(s);
 let lastData=null,lastAnalysis=null,forceAnalysis=false,analysisContext='';
 const controls=document.createElement('div');controls.className='chan-tools cs-live-controls';
 controls.innerHTML='<label><input type="checkbox" id="cs-live-enabled" checked> 自动更新K线</label><button id="cs-live-refresh" class="quiet-button">立即刷新K线</button><span id="cs-live-status" role="status" aria-live="polite">选择股票后获取当天K线</span><span id="cs-analysis-status" role="status" aria-live="polite">完整结构单独计算</span>';
 $('#cs-chart-section .chan-tools').after(controls);
 const context=()=>{const s=window.LiangceChan?.state();return s?.selected?{code:s.selected,period:s.period}:null;};
 const visible=()=>!document.hidden&&window.LiangceChan?.state().visible;
 function unpack(data){if(data?.ok===false){const e=Error(data.message||'请求失败');e.retryAfter=data.retry_after;e.status=data.status;throw e;}return data;}
 function candleStatus(s){
  $('#cs-live-status').textContent=s.lastError?`K线更新失败：${s.lastError}；保留上次K线并自动重试`:s.busy?'正在获取当天K线…':!s.enabled?'自动更新已暂停':s.lastSuccess?`K线截至 ${lastData?.as_of} · ${model.trading()?'每20秒刷新':'休市每5分钟检查'}${lastData?.forming_bars?' · 含未收盘K线':''}`:'选择股票后获取当天K线';
  $('#cs-live-refresh').disabled=s.busy||!s.key;
 }
 function analysisStatus(s){
  const a=lastAnalysis,completed=a?.status==='ready';
  const message=s.lastError?`完整分析等待重试：${s.lastError}`:s.busy?'正在读取完整分析进度…':completed?`完整分析完成 · ${a.total}根 · ${a.result?.signals?.length||0}条六类记录`:a?`完整分析 ${a.completed||0}/${a.total||'待取数'} · ${a.status==='queued'?'排队中':'计算中'}`:'完整分析尚未开始';
  $('#cs-analysis-status').textContent=message;
  if(s.key)window.LiangceChan.setAnalysisStatus?.(s.key,{message,complete:completed&&!s.lastError,error:Boolean(s.lastError),running:s.busy||!completed});
 }
 const candles=model.scheduler({context,visible:()=>visible()&&!$('#cs-chart-section').hidden,fetcher:async(code,period)=>model.normalize(unpack(await window.pywebview.api.get_live_candles(code,period)),code,period),onData(data){lastData=data;window.LiangceChan.applyLiveHistory(data);},onState:candleStatus});
 const structure=model.scheduler({context,visible,delay:data=>data.status==='ready'?model.interval():5000,
  fetcher:async(code,period)=>{const force=forceAnalysis;forceAnalysis=false;let a=unpack(await window.pywebview.api.get_live_structure(code,period,force));const closed=lastData?.code===code&&lastData?.period===period?lastData.bars.filter(b=>b.is_closed!==false).at(-1)?.date:null;if(!force&&a.status==='ready'&&closed&&closed>a.result?.as_of)a=unpack(await window.pywebview.api.get_live_structure(code,period,true));if(a.status==='failed')throw Error(a.message||'完整回放失败');return a;},
  onData(a){lastAnalysis=a;window.LiangceChan.applyAnalysis?.(a);},onState:analysisStatus});
 function resetContext(){const c=context(),key=c?c.code+':'+c.period:'';if(key!==analysisContext){analysisContext=key;lastData=null;lastAnalysis=null;}}
 function check(){resetContext();candles.tick();structure.tick();}
 $('#cs-live-enabled').onchange=e=>candles.setEnabled(e.target.checked);
 $('#cs-live-refresh').onclick=()=>candles.tick(true);
 window.addEventListener('liangce:chan-selected',check);
 window.addEventListener('liangce:chan-analyze',()=>{resetContext();forceAnalysis=true;structure.tick(true);candles.tick(true);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){candles.tick(true);structure.tick(true);}});
 window.addEventListener('online',()=>{candles.tick(true);structure.tick(true);});
 setInterval(check,1000);check();window.LiangceChanLive={refresh:()=>candles.tick(true),analyze:()=>{forceAnalysis=true;return structure.tick(true);},state:()=>({...candles.state(),data:lastData,analysis:lastAnalysis,analysisRequest:structure.state()})};
})();
