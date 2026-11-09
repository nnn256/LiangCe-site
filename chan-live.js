(() => {
 'use strict';const model=window.LiangceChanLiveModel,$=s=>document.querySelector(s);
 let service,lastContext='',lastData=null;
 const tools=document.createElement('div');tools.className='chan-tools cs-live-controls';
 tools.innerHTML='<label><input type="checkbox" id="cs-live-enabled" checked> 实时更新K线与筹码峰</label><button id="cs-live-refresh" class="quiet-button">立即刷新</button><span id="cs-live-status" role="status" aria-live="polite">准备连接实时数据…</span>';
 $('#cs-chart-section .chan-tools').after(tools);
 function context(){const s=window.LiangceChan?.state();return s?.selected?{code:s.selected,period:s.period}:null;}
 function visible(){return !document.hidden&&!$('#cs-chart-section').hidden;}
 function status(state){
  const text=state.lastError?`更新失败：${state.lastError}；保留上次数据，将自动重试`:state.busy?'正在获取实时K线…':!state.enabled?'自动更新已暂停':state.lastSuccess?`已检查 ${new Date(state.lastSuccess).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})} · ${model.trading()?'交易时每20秒更新':'休市每5分钟检查'} · K线截至 ${lastData?.as_of||'—'}${lastData?.forming_bars?' · 含未收盘K线':''}`:'选择股票后自动连接';
  $('#cs-live-status').textContent=text;$('#cs-live-status').classList.toggle('cs-live-error',Boolean(state.lastError));$('#cs-live-refresh').disabled=state.busy||!state.key;
 }
 service=model.scheduler({context,visible,fetcher:async(code,period)=>model.normalize(await window.pywebview.api.get_live_panel(code,period),code,period),onData(data){lastData=data;window.LiangceChan.applyLiveHistory(data);},onState:status});
 function check(){const c=context(),key=c?c.code+':'+c.period:'';if(key!==lastContext){lastContext=key;lastData=null;}service.tick();}
 $('#cs-live-enabled').onchange=e=>service.setEnabled(e.target.checked);
 $('#cs-live-refresh').onclick=()=>service.tick(true);
 window.addEventListener('liangce:chan-selected',()=>{check();if(!service.state().busy)service.tick(true);});document.addEventListener('visibilitychange',()=>{if(!document.hidden)service.tick(true);});window.addEventListener('online',()=>service.tick(true));
 setInterval(check,1000);check();window.LiangceChanLive={refresh:()=>service.tick(true),state:()=>({...service.state(),data:lastData})};
})();
