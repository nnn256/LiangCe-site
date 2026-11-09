(() => {
 'use strict';const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let panel,result=null,profile=null,windowSize=120,quote=null;
 const money=n=>n==null?'—':n.toFixed(n<1?3:2),periodNames={day:'日线',week:'周线',month:'月线','1m':'1分钟','5m':'5分钟','15m':'15分钟','30m':'30分钟','60m':'60分钟'};
 function mount(plotWrap){
  const layout=document.createElement('div');layout.className='cs-chip-layout';plotWrap.before(layout);layout.append(plotWrap);
  panel=document.createElement('section');panel.id='cs-chip-panel';panel.className='cs-chip-panel';panel.setAttribute('aria-label','筹码峰估算');
  panel.innerHTML='<div class="cs-chip-heading"><div><h3>筹码峰 <span>价量估算</span></h3><small id="cs-chip-source">选择股票后显示</small></div><select id="cs-chip-window" class="select" aria-label="筹码峰统计范围"><option value="120">近120根</option><option value="250">近250根</option><option value="0">全部已载入</option></select></div><div id="cs-chip-plot" role="img" aria-label="等待筹码分布" class="cs-chip-plot"></div><div id="cs-chip-stats" class="cs-chip-stats" aria-live="polite"></div><div class="cs-chip-legend"><span>低于末收</span><span>高于末收</span><span>最高量价档</span></div><details class="cs-chip-method"><summary>估算口径与数据范围</summary><p>成交量均匀分配到每根K线的最低价至最高价，累计为价量分布。未取得逐笔成交、历史换手及持仓成本，不代表实际持仓筹码或获利盘；不参与缠论买卖点确认。复权与采样口径跟随当前K线。</p><p id="cs-chip-coverage"></p></details>';
  layout.append(panel);$('#cs-chip-window').onchange=e=>{windowSize=Number(e.target.value);render();};render();
 }
 function render(){
  if(!panel)return;const plot=$('#cs-chip-plot'),stats=$('#cs-chip-stats');stats.replaceChildren();$('#cs-chip-coverage').textContent='';
  if(!result){profile=null;plot.innerHTML='<div class="cs-chip-empty">选择股票后计算筹码峰</div>';plot.setAttribute('aria-label','等待筹码分布');$('#cs-chip-source').textContent='等待K线';return;}
  $('#cs-chip-source').textContent=`${result.code} · ${periodNames[result.period]||result.period}`;
  const referenceQuote=quote&&!quote.stale&&quote.market_time?.slice(0,10)>=result.as_of?.slice(0,10)?quote:null;
  try{profile=window.LiangceChipProfile.calculate(result.bars,{windowSize,includeForming:result.live===true,referencePrice:referenceQuote?.price});}catch(error){profile={ok:false,message:error.message};}
  if(!profile.ok){plot.innerHTML=`<div class="cs-chip-empty">${esc(profile.message)}</div>`;plot.setAttribute('aria-label',profile.message);return;}
  const p=profile,W=260,H=320,top=18,bottom=296,left=63,right=241,pad=p.low===p.high?Math.max(p.low*.02,.01):0,lo=p.low-pad,hi=p.high+pad;
  const y=price=>bottom-(price-lo)/(hi-lo)*(bottom-top),max=p.peak.volume;
  const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  const parts=[`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`];
  for(const price of ticks)parts.push(`<line x1="${left}" x2="${right}" y1="${y(price)}" y2="${y(price)}" stroke="#e4e9e6"/><text x="${left-8}" y="${y(price)+4}" text-anchor="end" fill="#7a8581" font-size="10">${money(price)}</text>`);
  parts.push(`<rect x="${left}" y="${y(p.central70[1])}" width="${right-left}" height="${Math.max(1,y(p.central70[0])-y(p.central70[1]))}" fill="#b87724" opacity=".07"/>`);
  for(const b of p.bins){if(!b.volume)continue;const yy=p.low===p.high?y(b.price)-5:y(b.high),height=p.low===p.high?10:Math.max(.5,y(b.low)-y(b.high)-.5),color=b===p.peak?'#b87724':p.lastClose!=null&&b.price<=p.lastClose?'#c74b4b':'#087b68';parts.push(`<rect x="${left}" y="${yy}" width="${b.volume/max*(right-left)}" height="${height}" rx=".6" fill="${color}" opacity=".82"><title>${money(b.low)}～${money(b.high)} · 成交量占比 ${(b.share*100).toFixed(2)}%</title></rect>`);}
  if(p.lastClose!=null&&p.lastClose>=lo&&p.lastClose<=hi){const yy=y(p.lastClose);parts.push(`<line x1="${left}" x2="${right}" y1="${yy}" y2="${yy}" stroke="#202b2a" stroke-dasharray="3 3"/><rect x="${left+2}" y="${Math.max(top,Math.min(bottom-16,yy-17))}" width="88" height="15" fill="#fff" opacity=".93"/><text x="${left+5}" y="${Math.max(top,Math.min(bottom-16,yy-17))+11}" fill="#202b2a" font-size="10">末收 ${money(p.lastClose)}</text>`);}
  parts.push('<text x="241" y="316" text-anchor="end" fill="#7a8581" font-size="9">横轴：各价档相对成交量</text></svg>');plot.innerHTML=parts.join('');
  plot.setAttribute('aria-label',`筹码峰估算，最高量价档${money(p.peak.low)}至${money(p.peak.high)}，末根收盘${money(p.lastClose)}`);
  stats.innerHTML=[['主峰价档',`${money(p.peak.low)}～${money(p.peak.high)}`],['70%成交区',`${money(p.central70[0])}～${money(p.central70[1])}`],['价量均价',money(p.weightedPrice)],['低于末收占比',p.belowLastShare==null?'—':(p.belowLastShare*100).toFixed(1)+'%']].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#cs-chip-coverage').textContent=`${p.first} 至 ${p.last}；${p.usedBars}/${p.selectedBars} 根有效K线${p.omittedBars?`，${p.omittedBars}根无有效成交量或价格已排除`:''}。价格口径：${result.adjustment||'未记录'}。${p.peakCount>1?`最高量有${p.peakCount}个并列价档，主峰标出最低价档。`:''}`;
  if(result.live){$('#cs-chip-source').textContent+=` · 自动更新${p.formingBars?' · 盘中估算':''}`;$('#cs-chip-coverage').textContent+=` 实时取数 ${result.fetched_at||result.computed_at}；含${p.formingBars}根未收盘K线，随成交量变化，不参与信号确认。`;}
  if(referenceQuote){plot.innerHTML=plot.innerHTML.replaceAll('末收','现价');stats.innerHTML=stats.innerHTML.replaceAll('末收','现价');plot.setAttribute('aria-label',plot.getAttribute('aria-label').replace('末根收盘','最新报价'));}
  $('.cs-chip-legend').children[0].textContent=referenceQuote?'低于现价':'低于末收';$('.cs-chip-legend').children[1].textContent=referenceQuote?'高于现价':'高于末收';
 }
 window.LiangceChipView={mount,setResult(value){if(result===value)return;if(result?.code!==value?.code)quote=null;result=value;render();},setQuote(value){if(!result||value.code!==result.code||quote?.price===value.price&&quote?.market_time===value.market_time&&quote?.stale===value.stale)return;quote=value;render();},state:()=>({code:result?.code,period:result?.period,windowSize,profile})};
})();
