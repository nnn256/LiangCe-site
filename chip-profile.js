(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LiangceChipProfile=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 function calculate(bars,{windowSize=120,binCount=72}={}){
  if(!Array.isArray(bars))throw new TypeError('K线必须为数组');
  if(!Number.isInteger(windowSize)||windowSize<0||!Number.isInteger(binCount)||binCount<8||binCount>256)throw new RangeError('分布参数无效');
  const closed=bars.filter(b=>b&&b.is_closed!==false&&b.closed!==false),rows=windowSize?closed.slice(-windowSize):closed;
  const usable=rows.filter(b=>[b.open,b.high,b.low,b.close,b.volume].every(Number.isFinite)&&b.low>0&&b.volume>0&&b.high>=Math.max(b.open,b.close,b.low)&&b.low<=Math.min(b.open,b.close));
  const base={method:'ohlcv_uniform_volume_profile',holding_cost_verified:false,selectedBars:rows.length,usedBars:usable.length,omittedBars:rows.length-usable.length};
  if(!usable.length)return {...base,ok:false,message:'没有可用的正成交量K线，无法估算筹码峰',bins:[]};
  let low=Infinity,high=-Infinity,total=0;
  for(const b of usable){low=Math.min(low,b.low);high=Math.max(high,b.high);total+=b.volume;}
  if(!Number.isFinite(total))throw new RangeError('成交量合计超出范围');
  const last=rows.at(-1),lastClose=Number.isFinite(last?.close)&&last.close>0?last.close:null;
  // A flat market is a point mass, not an invented spread around the price.
  const flat=low===high,step=flat?0:(high-low)/binCount;
  const bins=Array.from({length:flat?1:binCount},(_,i)=>({low:low+i*step,high:flat?high:low+(i+1)*step,price:flat?low:low+(i+.5)*step,volume:0}));
  for(const b of usable){
   if(flat){bins[0].volume+=b.volume;continue;}
   if(b.high===b.low){bins[Math.min(binCount-1,Math.max(0,Math.floor((b.low-low)/step)))].volume+=b.volume;continue;}
   const first=Math.max(0,Math.floor((b.low-low)/step)),end=Math.min(binCount-1,Math.floor((b.high-low)/step));
   for(let i=first;i<=end;i++){const bin=bins[i],overlap=Math.max(0,Math.min(b.high,bin.high)-Math.max(b.low,bin.low));bin.volume+=b.volume*overlap/(b.high-b.low);}
  }
  const distributed=bins.reduce((sum,b)=>sum+b.volume,0);
  for(const b of bins)b.share=b.volume/distributed;
  const max=Math.max(...bins.map(b=>b.volume)),peaks=bins.filter(b=>Math.abs(b.volume-max)<=max*1e-10),peak=peaks[0];
  function quantile(q){let sum=0;for(const b of bins){if(sum+b.share>=q)return b.low+(b.high-b.low)*(q-sum)/b.share;sum+=b.share;}return high;}
  const weightedPrice=bins.reduce((sum,b)=>sum+b.price*b.share,0);
  const belowLastShare=lastClose==null?null:bins.reduce((sum,b)=>sum+b.share*(b.high===b.low?(lastClose>=b.price?1:0):Math.max(0,Math.min(1,(lastClose-b.low)/(b.high-b.low)))),0);
  return {...base,ok:true,bins,totalVolume:total,distributedVolume:distributed,low,high,peak,peakCount:peaks.length,weightedPrice,central70:[quantile(.15),quantile(.85)],belowLastShare,lastClose,first:rows[0]?.date??rows[0]?.closed_at,last:last?.date??last?.closed_at};
 }
 return {calculate};
});
