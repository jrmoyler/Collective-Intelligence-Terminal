/**
 * Core pure functions extracted from index.html for testability.
 * These functions contain the critical business logic of the
 * Collective Intelligence Terminal.
 */

// ── Levenshtein Similarity (fuzzy string matching)
function levenshteinSim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const s = a.length, t = b.length;
  if (Math.abs(s - t) / Math.max(s, t) > 0.3) return 0;
  // Boundary: dp[i][0]=i (delete i chars), dp[0][j]=j (insert j chars)
  const dp = Array.from({length:s+1},(_,i)=>Array.from({length:t+1},(_,j)=>i===0?j:j===0?i:0));
  for (let i=1;i<=s;i++) for (let j=1;j<=t;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return 1 - dp[s][t] / Math.max(s, t);
}

// ── Simple Moving Average
function citSMA(closes, period) {
  if(closes.length < period) return null;
  const sl = closes.slice(-period);
  return +(sl.reduce((a,b)=>a+b,0)/period).toFixed(2);
}

// ── Relative Strength Index
function citRSI(closes, period=14) {
  if(closes.length < period+1) return 50;
  let g=0,l=0;
  for(let i=closes.length-period;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    if(d>0)g+=d;else l+=Math.abs(d);
  }
  const ag=g/period,al=l/period;
  if(al===0)return 100;
  return +(100-100/(1+ag/al)).toFixed(1);
}

// ── Brier Score
function brierScore(predProb, outcome) {
  const p = predProb / 100;
  const o = outcome === 'YES' ? 1 : 0;
  return +((p - o) ** 2).toFixed(4);
}

// ── Parse JSON from Claude response
function parseJSON(text, fallback={}) {
  try {
    const clean = text.replace(/```json|```/g,'').trim();
    const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
    if(start===-1||end===-1) return fallback;
    return JSON.parse(clean.substring(start, end+1));
  } catch(e){ return fallback; }
}

// ── CORS proxy URL builder
function citAllOrigins(url) {
  return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
}

// ── Fallback seed data (all nulls)
function citFallback() {
  return {
    vix:null,vvix:null,pcRatio:null,
    spyPrice:null,spy20:null,spy50:null,spy200:null,
    spyRsi:null,tnyield:null,dxy:null,
    qqq:null,qqq50:null,
    abv20:null,abv50:null,abv200:null,adRatio:null,
    nhNl:null,mcOsc:null,pctHH:null,
    fomc:false,cpi:false,
    spyChg:null,qqqChg:null,vixChg:null,dxyChg:null,tnxChg:null,
    sectors:[
      {sym:'XLK',name:'TECH',chg:null},{sym:'XLF',name:'FIN',chg:null},
      {sym:'XLE',name:'ENERGY',chg:null},{sym:'XLV',name:'HEALTH',chg:null},
      {sym:'XLI',name:'INDUS',chg:null},{sym:'XLY',name:'DISC',chg:null},
      {sym:'XLP',name:'STAPLES',chg:null},{sym:'XLU',name:'UTIL',chg:null},
      {sym:'XLB',name:'MATER',chg:null},{sym:'XLRE',name:'REIT',chg:null},
      {sym:'XLC',name:'COMM',chg:null},
    ],
  };
}

// ── Market Scoring Engine
function citScoreMarket(d, mode) {
  if(d.vix==null||d.spyPrice==null){
    return{total:0,volScore:0,trendScore:0,breadthScore:0,momScore:0,macroScore:0,
           execScore:0,decision:'LOADING',regime:'FETCHING...',
           breakoutsHolding:false,pullbacksBought:false,followThru:false,setupsWorking:false};
  }
  const tight=mode==='day';
  let volScore=d.vix>30?15:d.vix>22?35:d.vix>18?55:d.vix>14?75:d.vix<10?55:85;
  if(d.pcRatio>1.2) volScore-=15; if(d.pcRatio<0.6) volScore-=10;
  volScore=Math.max(0,Math.min(100,volScore));
  let trendScore=0;
  if(d.spyPrice>d.spy200)trendScore+=30;
  if(d.spyPrice>d.spy50) trendScore+=25;
  if(d.spyPrice>d.spy20) trendScore+=20;
  if(d.qqq>d.qqq50)      trendScore+=15;
  if(d.spyRsi>50&&d.spyRsi<70) trendScore+=10;
  trendScore=Math.min(100,trendScore);
  let breadthScore=0;
  if(d.abv200>65)breadthScore+=30;else if(d.abv200>50)breadthScore+=18;else if(d.abv200>35)breadthScore+=8;
  if(d.abv50>60) breadthScore+=25;else if(d.abv50>45) breadthScore+=14;
  if(d.abv20>55) breadthScore+=20;else if(d.abv20>40) breadthScore+=10;
  if(d.adRatio>1.5)breadthScore+=15;else if(d.adRatio>1.0)breadthScore+=8;
  if(+d.nhNl>80)breadthScore+=10;
  breadthScore=Math.min(100,breadthScore);
  const ss=[...d.sectors].sort((a,b)=>b.chg-a.chg);
  const topAvg=(ss[0].chg+ss[1].chg+ss[2].chg)/3;
  const spread=topAvg-((ss[8]?.chg||0)+(ss[9]?.chg||0)+(ss[10]?.chg||0))/3;
  let momScore=50;
  if(topAvg>1.5)momScore+=20;else if(topAvg>0.5)momScore+=10;
  if(spread>2)momScore+=20;else if(spread>1)momScore+=10;
  if(d.pctHH>55)momScore+=10;else if(d.pctHH>40)momScore+=5;
  momScore=Math.max(0,Math.min(100,momScore));
  let macroScore=50;
  if(d.tnyield<4.0)macroScore+=20;else if(d.tnyield<4.5)macroScore+=10;else if(d.tnyield>5.0)macroScore-=20;
  if(d.dxy<100)macroScore+=15;else if(d.dxy<104)macroScore+=5;else if(d.dxy>108)macroScore-=15;
  if(d.fomc)macroScore-=15; if(d.cpi)macroScore-=10;
  macroScore=Math.max(0,Math.min(100,macroScore));
  const mult=tight?0.9:1.0;
  const total=Math.round((volScore*.25+momScore*.25+trendScore*.20+breadthScore*.20+macroScore*.10)*mult);
  const breakoutsHolding=trendScore>60&&breadthScore>55;
  const pullbacksBought=d.adRatio>1.2&&d.abv20>50;
  const followThru=momScore>55&&trendScore>55;
  const setupsWorking=volScore>50&&momScore>60;
  let execScore=0;
  if(breakoutsHolding)execScore+=30;if(pullbacksBought)execScore+=25;
  if(followThru)execScore+=25;if(setupsWorking)execScore+=20;
  const decision=total>=80?'YES':total>=60?'CAUTION':'NO';
  const regime=trendScore>65&&breadthScore>60?'UPTREND':trendScore<40&&breadthScore<40?'DOWNTREND':'CHOP';
  return {total,volScore,trendScore,breadthScore,momScore,macroScore,execScore,
          decision,regime,breakoutsHolding,pullbacksBought,followThru,setupsWorking};
}

// ── Order Book Metrics Derivation
function citDeriveOBMetrics(ob, trades) {
  if(!ob||!ob.bids?.length||!ob.asks?.length) return null;
  const bestBid=ob.bids[0].price, bestAsk=ob.asks[0].price;
  const mid=(bestBid+bestAsk)/2;
  const spreadPct=mid>0?(bestAsk-bestBid)/mid*100:0;
  const roundTripPct=spreadPct*2;
  const bidDepth=ob.bids.filter(b=>b.price>=mid*.97).reduce((s,b)=>s+b.size,0);
  const askDepth=ob.asks.filter(a=>a.price<=mid*1.03).reduce((s,a)=>s+a.size,0);
  const totD=bidDepth+askDepth;
  const oi=totD>0?(bidDepth-askDepth)/totD:0;
  const sf=trades.map(t=>t.side*t.size);
  const dp=trades.slice(1).map((t,i)=>t.price-trades[i].price);
  const buyV=trades.filter(t=>t.side===1).reduce((s,t)=>s+t.size,0);
  const sellV=trades.filter(t=>t.side===-1).reduce((s,t)=>s+t.size,0);
  const bkSz=10; let vbkts=[];
  for(let i=0;i+bkSz<=trades.length;i+=bkSz){
    const bk=trades.slice(i,i+bkSz);
    const bB=bk.filter(t=>t.side===1).reduce((s,t)=>s+t.size,0);
    const bS=bk.filter(t=>t.side===-1).reduce((s,t)=>s+t.size,0);
    const bT=bB+bS; if(bT>0) vbkts.push(Math.abs(bB-bS)/bT);
  }
  const measVPIN=vbkts.length?+(vbkts.reduce((a,b)=>a+b,0)/vbkts.length).toFixed(3):null;
  const iat=trades.slice(1).map((t,i)=>Math.max(0.1,(t.timestamp-trades[i].timestamp)/1000));
  return {
    bestBid,bestAsk,mid,
    spreadPct:+spreadPct.toFixed(3),roundTripPct:+roundTripPct.toFixed(3),
    bidDepth:+bidDepth.toFixed(2),askDepth:+askDepth.toFixed(2),
    orderImbalance:+oi.toFixed(3),signedFlows:sf,priceChanges:dp,
    buyVol:buyV,sellVol:sellV,
    measuredVPIN:measVPIN,interArrivals:iat,
    vsEquityMultiple:+(roundTripPct/0.02).toFixed(0),
    bids:ob.bids,asks:ob.asks,
  };
}

// ── Kyle Lambda Model
function citKyleLambda(d, obMetrics, citDelibSignal = { active: false }) {
  const delibBoost = (() => {
    if (!citDelibSignal.active) return 0;
    if (citDelibSignal.probDelta == null) return 0;
    const absDelta = Math.abs(citDelibSignal.probDelta);
    if (absDelta > 20) return 0.22;
    if (absDelta > 10) return 0.12;
    return 0;
  })();
  if(obMetrics&&obMetrics.signedFlows?.length>=5&&obMetrics.priceChanges?.length>=5){
    const Q=obMetrics.signedFlows,dP=obMetrics.priceChanges;
    const n=Math.min(Q.length,dP.length);
    const Qn=Q.slice(0,n),dPn=dP.slice(0,n);
    const cov=Qn.reduce((s,q,i)=>s+dPn[i]*q,0)/n;
    const varQ=Qn.reduce((s,q)=>s+q*q,0)/n;
    const lam=varQ>0?cov/varQ:0;
    const pred=Qn.map(q=>lam*q);
    const mDP=dPn.reduce((a,b)=>a+b,0)/n;
    const ssT=dPn.reduce((s,v)=>s+(v-mDP)**2,0);
    const ssR=dPn.reduce((s,v,i)=>s+(v-pred[i])**2,0);
    const r2=ssT>0?Math.max(0,1-ssR/ssT):0;
    const r2m = Math.min(0.98, r2 + delibBoost);
    return {lambda:+Math.abs(lam).toFixed(6),r2:+(r2m*100).toFixed(1),informed:r2m>0.15,measured:true,n,
            delibBoosted:delibBoost>0,delibDelta:citDelibSignal.probDelta,gaugeVal:Math.min(100,r2m*500)};
  }
  const spxP   = d.spyPrice || 500;
  const vixN   = d.vix!=null ? Math.min(d.vix/40, 1) : 0.35;
  const adFlow = d.adRatio!=null ? Math.max(-1, Math.min(1, (d.adRatio-1)/2)) : 0;
  const lam    = (vixN * vixN) * Math.abs(adFlow) * 0.0004 / Math.max(spxP, 1);
  const r2     = Math.min(0.35, vixN * 0.18 + Math.abs(adFlow) * 0.12);
  const r2boosted = Math.min(0.98, r2 + delibBoost);
  const r2pct  = +(r2boosted * 100).toFixed(1);
  return {lambda:+lam.toFixed(6), r2:r2pct, informed:r2boosted>0.15, measured:false,
          delibBoosted:delibBoost>0, delibDelta:citDelibSignal.probDelta, gaugeVal:Math.min(100,r2boosted*500)};
}

// ── Hawkes Process Model
function citHawkes(d, obMetrics) {
  if(obMetrics?.interArrivals?.length>=10){
    const ia=obMetrics.interArrivals;
    const mn=ia.reduce((a,b)=>a+b,0)/ia.length;
    const vr=ia.reduce((s,v)=>s+(v-mn)**2,0)/ia.length;
    const cv=mn>0?Math.sqrt(vr)/mn:1;
    const br=Math.min(0.98,Math.max(0.05,1-1/Math.max(cv,1)));
    const rate=1/Math.max(mn,0.01),mu=rate*(1-br),beta=Math.max(0.1,1/mn),alpha=+(br*beta).toFixed(4);
    return {alpha:+alpha.toFixed(4),beta:+beta.toFixed(4),branchingRatio:+br.toFixed(3),eventCount:ia.length,cv:+cv.toFixed(3),hotMarket:br>0.8,explosive:br>0.95,measured:true,gaugeVal:Math.min(100,br*100)};
  }
  const vixSp=Math.max(0,(d.vix-14)/20),momP=Math.max(0,(d.spyRsi-50)/50);
  const alpha=+(0.3+vixSp*0.6+momP*0.1).toFixed(4),beta=+(0.4+(1-vixSp)*0.4).toFixed(4);
  const br=+(alpha/beta).toFixed(3);
  return {alpha,beta,branchingRatio:br,eventCount:45,hotMarket:br>0.8,explosive:br>0.95,measured:false,gaugeVal:Math.min(100,br*100)};
}

// ── Almgren-Chriss Optimal Execution
function citAlmgrenChriss(d) {
  const sigma=d.vix/100/Math.sqrt(252),eta=0.002*(1+d.vix/20),gamma=0.0005*(1+d.vix/30),riskAv=1e-6,T=20;
  const kappa=Math.sqrt(riskAv*sigma*sigma/eta),X=10000;
  const optSlices=Math.max(3,Math.min(20,Math.ceil(1/(kappa*T)+1)));
  const sinhKT=Math.sinh(kappa*T)||1;
  const traj=[];
  for(let i=0;i<=T;i++) traj.push(X*Math.sinh(kappa*(T-i))/sinhKT);
  const slipPct=(eta*(X/T)+0.5*gamma*X)/X*100;
  return {optimalSlices:optSlices,slippagePct:+slipPct.toFixed(2),slippageDollar:+(slipPct/100*X).toFixed(0),riskWarning:slipPct/100*X>300,trajectory:traj.map((v,i)=>({t:i/T,remaining:v/X}))};
}

// ── Avellaneda-Stoikov Market Making
function citAvellanedaStoikov(d, hawkes, citDelibSignal = { active: false }) {
  const s=d.spyPrice,sigma=d.vix/100/Math.sqrt(252),gamma=0.1;
  const kappa=Math.max(hawkes.eventCount||45,1)/60,tau=0.5,q=+((d.adRatio-1.5)*3).toFixed(2);
  let reservationAdj = 0;
  let asDelibInfo = null;
  if (citDelibSignal.active && citDelibSignal.probDelta != null) {
    const delta = citDelibSignal.probDelta;
    reservationAdj = (delta / 100) * s * 0.001 * (citDelibSignal.confidence === 'HIGH' ? 1.5 : citDelibSignal.confidence === 'MEDIUM' ? 1.0 : 0.5);
    asDelibInfo = { delta, adj: +reservationAdj.toFixed(4), confidence: citDelibSignal.confidence, event: citDelibSignal.event?.substring(0,40) };
  }
  const r = s - q * gamma * sigma * sigma * tau + reservationAdj;
  const spreadWidener = (citDelibSignal.active && citDelibSignal.dissensus) ? 1.4 :
                        (citDelibSignal.active && citDelibSignal.herdLikely) ? 1.25 : 1.0;
  const dBase = gamma * sigma * sigma * tau + (2/gamma) * Math.log(1 + gamma / Math.max(kappa, 0.01));
  const dOpt  = dBase * spreadWidener;
  return {
    reservationPrice:  +r.toFixed(2),
    reservationAdj:    +reservationAdj.toFixed(4),
    bidSpread:         +(dOpt/2).toFixed(4),
    askSpread:         +(dOpt/2).toFixed(4),
    spreadWidened:     spreadWidener > 1,
    inventory:         q,
    inventoryWarning:  Math.abs(q)>3,
    gaugeVal:          Math.min(100,Math.abs(q)/5*100),
    delibInfo:         asDelibInfo,
  };
}

// ── VPIN (Volume-Synchronized Probability of Informed Trading)
function citVPIN(d, kyle, obMetrics, citDelibSignal = { active: false }) {
  if(obMetrics?.measuredVPIN!=null){
    const vp=obMetrics.measuredVPIN,tp=+(vp*100).toFixed(1);
    return {vpin:vp,toxicPct:tp,impliedSpread:+(obMetrics.spreadPct).toFixed(3),polySpread:+(obMetrics.roundTripPct).toFixed(2),vsEquities:obMetrics.vsEquityMultiple,highToxicity:vp>0.5,flashCrashRisk:vp>0.7,measured:true,gaugeVal:Math.min(100,vp*140)};
  }
  const vixF=Math.min(1,d.vix/35),infoF=kyle.r2/100,adI=Math.abs(d.adRatio-1)/(d.adRatio+1);
  const deliberDisp = citDelibSignal.active && citDelibSignal.dissensus ? 0.08 : 0;
  const herdBoost    = citDelibSignal.active && citDelibSignal.herdLikely ? 0.06 : 0;
  const vp=Math.min(0.95,0.15+vixF*0.3+infoF*0.25+adI*0.3+deliberDisp+herdBoost);
  const ps=+(6.0+vp*3.0+kyle.r2/10).toFixed(2);
  return {vpin:+vp.toFixed(3),toxicPct:+(vp*100).toFixed(1),impliedSpread:+(0.02*(1+vp*10)).toFixed(3),polySpread:ps,vsEquities:+(ps/0.02).toFixed(0),highToxicity:vp>0.5,flashCrashRisk:vp>0.7,measured:false,
          deliberBoost:deliberDisp+herdBoost>0,gaugeVal:Math.min(100,vp*140)};
}

// ── Compute All Microstructure Models
function citComputeAll(d, obMetrics, citDelibSignal = { active: false }) {
  const kyle=citKyleLambda(d,obMetrics,citDelibSignal);
  const hawkes=citHawkes(d,obMetrics);
  const ac=citAlmgrenChriss(d);
  const as_=citAvellanedaStoikov(d,hawkes,citDelibSignal);
  const vpin=citVPIN(d,kyle,obMetrics,citDelibSignal);
  const microRisk=Math.round(kyle.r2*.25+hawkes.branchingRatio*50*.25+vpin.gaugeVal*.30+as_.gaugeVal*.20);
  return {kyle,hawkes,ac,as:as_,vpin,microRisk,hasLiveOB:!!obMetrics};
}

// ── Parlay Correlation Factor
function parlayCorrelationFactor(legs) {
  if (legs.length <= 1) return 1.0;
  let totalCorr = 0, pairs = 0;
  for (let i = 0; i < legs.length; i++) {
    for (let j = i+1; j < legs.length; j++) {
      const sameD = legs[i].domain === legs[j].domain;
      const adjD  = (legs[i].assetSignals?.equitySignals||[]).some(e =>
        (legs[j].assetSignals?.equitySignals||[]).some(f => f.sym === e.sym));
      totalCorr += sameD ? 0.7 : adjD ? 0.3 : 0.05;
      pairs++;
    }
  }
  const avgCorr = pairs > 0 ? totalCorr / pairs : 0;
  return Math.max(0.4, 1 - avgCorr * 0.6);
}

// ── Compute Parlay Odds
function computeParlayOdds(legs) {
  if (!legs.length) return null;
  const rawProb = legs.reduce((prod, l) => prod * (l.probability / 100), 1);
  const corrFactor = parlayCorrelationFactor(legs);
  const adjProb    = Math.max(0.001, Math.pow(rawProb, 1 / corrFactor));
  const mktProb = legs.filter(l => l.marketPrice != null).length === legs.length
    ? legs.reduce((prod, l) => prod * (l.marketPrice / 100), 1)
    : null;
  const edge = mktProb != null ? adjProb - mktProb : null;
  let kellyFraction = null;
  if (mktProb != null && mktProb > 0.005) {
    const b = 1 / mktProb - 1;
    const p = adjProb, q = 1 - p;
    kellyFraction = Math.max(0, (b * p - q) / b);
    kellyFraction = Math.min(0.05, kellyFraction * 0.5);
  }
  const payout = mktProb != null ? (1 / mktProb) : (1 / adjProb);
  return {
    legs:          legs.length,
    rawProb:       +(rawProb * 100).toFixed(2),
    adjProb:       +(adjProb * 100).toFixed(2),
    corrFactor:    +corrFactor.toFixed(3),
    mktProb:       mktProb != null ? +(mktProb * 100).toFixed(2) : null,
    edge:          edge != null ? +(edge * 100).toFixed(2) : null,
    kellyFraction: kellyFraction != null ? +(kellyFraction * 100).toFixed(2) : null,
    payout:        +payout.toFixed(2),
    ev:            edge != null && kellyFraction != null
                   ? +((adjProb * payout - 1) * 100).toFixed(2) : null,
    verdict:       edge != null ? (edge > 0.02 ? 'ENTER' : edge > 0 ? 'CAUTION' : 'AVOID') : 'NO MARKET DATA',
  };
}

// ── Build Cross-Asset Signals
const ASSET_CORRELATIONS = {
  financial: {
    YES: { equities:[{sym:'SPY',dir:1,weight:1.0},{sym:'QQQ',dir:1,weight:0.9},{sym:'XLF',dir:1,weight:0.8}], crypto:[{sym:'BTC',dir:1,weight:0.6}], forex:[{pair:'DXY',dir:-1,weight:0.5}], reason:'Bull markets lift all boats' },
    NO:  { equities:[{sym:'SPY',dir:-1,weight:1.0},{sym:'GLD',dir:1,weight:0.8},{sym:'TLT',dir:1,weight:0.7}], crypto:[{sym:'BTC',dir:-1,weight:0.5}], forex:[{pair:'DXY',dir:1,weight:0.6}], reason:'Risk-off rotation' },
  },
  technology: {
    YES: { equities:[{sym:'QQQ',dir:1,weight:1.0},{sym:'XLK',dir:1,weight:1.0},{sym:'NVDA',dir:1,weight:0.9},{sym:'MSFT',dir:1,weight:0.8}], crypto:[{sym:'BTC',dir:1,weight:0.7},{sym:'ETH',dir:1,weight:0.8}], reason:'Tech breakout' },
    NO:  { equities:[{sym:'QQQ',dir:-1,weight:0.9},{sym:'XLK',dir:-1,weight:0.9}], crypto:[{sym:'ETH',dir:-1,weight:0.6}], reason:'Tech selloff' },
  },
  polymarket: {
    YES: { equities:[{sym:'SPY',dir:1,weight:0.6}], crypto:[{sym:'BTC',dir:1,weight:0.5}], reason:'General risk-on' },
    NO:  { equities:[{sym:'SPY',dir:-1,weight:0.5}], crypto:[{sym:'BTC',dir:-1,weight:0.4}], reason:'Mild risk-off' },
  },
  philosophy: { YES:{equities:[],reason:'No direct correlation'}, NO:{equities:[],reason:''} },
};

function buildCrossAssetSignals(domainId, direction, probDelta) {
  const corr = ASSET_CORRELATIONS[domainId] || ASSET_CORRELATIONS.polymarket;
  const side  = direction === 'YES' ? corr.YES : corr.NO;
  if (!side) return null;
  const scaleFactor = probDelta != null ? Math.min(1.5, 1 + Math.abs(probDelta) / 100) : 1.0;
  const equitySignals = (side.equities||[]).map(e => ({
    sym:    e.sym,
    dir:    e.dir,
    weight: +(e.weight * scaleFactor).toFixed(2),
    action: e.dir === 1 ? 'LONG' : 'SHORT',
    signal: e.dir === 1 ? 'BULLISH' : 'BEARISH',
  }));
  const cryptoSignals = (side.crypto||[]).map(c => ({
    sym:    c.sym,
    dir:    c.dir,
    weight: +(c.weight * scaleFactor).toFixed(2),
    action: c.dir === 1 ? 'LONG' : 'SHORT',
    signal: c.dir === 1 ? 'BULLISH' : 'BEARISH',
  }));
  const forexSignals = (side.forex||[]).map(f => ({
    pair:   f.pair,
    dir:    f.dir,
    weight: +(f.weight * scaleFactor).toFixed(2),
    action: f.dir === 1 ? 'LONG' : 'SHORT',
  }));
  return {
    equitySignals, cryptoSignals, forexSignals,
    reason: side.reason || '',
    topPlay: equitySignals[0] || cryptoSignals[0] || null,
  };
}

// ── Compute Execution Signal
function computeExecutionSignal(ms, ps, delibSignal) {
  if(!ms)return null;
  const {kyle,hawkes,as,vpin}=ms;
  const pDelta=delibSignal?.probDelta;
  const edge=pDelta!=null?Math.abs(pDelta)/100:0.05;
  const direction=pDelta!=null?(pDelta>0?'YES':'NO'):null;
  const marketP=(delibSignal?.marketProb||50)/100;
  const predP=(delibSignal?.predProb||50)/100;
  const b=direction==='YES'?(1/Math.max(marketP,0.01))-1:(1/Math.max(1-marketP,0.01))-1;
  const p=direction==='YES'?predP:(1-predP);
  const q=1-p;
  const rawKelly=b>0?(b*p-q)/b:0;
  const vpinP=1-Math.min(0.7,vpin.vpin*1.2);
  const kyleP=kyle.informed?(1-Math.min(0.5,kyle.r2/100)):1.0;
  const spdCost=Math.min(1,(as.bidSpread+as.askSpread)*100);
  const spdP=1-Math.min(0.6,spdCost*2);
  const hawkP=hawkes.hotMarket?0.75:1.0;
  const confM=delibSignal?.confidence==='HIGH'?1.0:delibSignal?.confidence==='MEDIUM'?0.7:0.5;
  const adjKelly=Math.max(0,rawKelly*vpinP*kyleP*spdP*hawkP*confM);
  const hKelly=adjKelly*0.5;
  const capKelly=Math.min(0.10,hKelly);
  const rtCost=vpin.polySpread/100;
  const netEV=edge-rtCost;
  const posEV=netEV>0;
  const limitAdj=(as.bidSpread+as.askSpread)/2;
  const limitYes=+(Math.max(0.01,marketP-limitAdj)*100).toFixed(1);
  const limitNo=+(Math.max(0.01,(1-marketP)-limitAdj)*100).toFixed(1);
  const limitPrice=direction==='YES'?limitYes:limitNo;
  let rec='AVOID';
  if(posEV&&capKelly>=0.01){rec=capKelly<0.03?'CAUTION':'ENTER';}
  if(vpin.flashCrashRisk||hawkes.explosive)rec='AVOID';
  if(!direction)rec='CAUTION';
  return{rec,direction,edge:+edge.toFixed(4),rawKelly:+rawKelly.toFixed(4),capKelly:+capKelly.toFixed(4),vpinP:+vpinP.toFixed(3),kyleP:+kyleP.toFixed(3),rtCost:+rtCost.toFixed(4),netEV:+netEV.toFixed(4),posEV,limitPrice,kellyPct:+(capKelly*100).toFixed(1)};
}

// ── Score Color
function citScoreColor(s) {
  return s>=70?'#00FFB2':s>=45?'#FFB800':'#FF3B5C';
}

// ── Signal Fusion (standalone version for testing, requires data injection)
function computeSignalFusion(citMarketData, liveData) {
  let score = 0, count = 0, signals = [];
  const add = (label, value, weight) => {
    if (value == null || isNaN(value)) return;
    score += value * weight;
    count += weight;
    signals.push({ label, value: +value.toFixed(2), weight, contribution: +(value*weight).toFixed(2) });
  };
  if (citMarketData?.scores?.total != null) {
    add('Market Quality', (citMarketData.scores.total - 50) * 1.0, 2.0);
  }
  if (liveData?.unusualWhales?.flowBias) {
    const uwVal = liveData.unusualWhales.flowBias === 'BULLISH' ? 30
                : liveData.unusualWhales.flowBias === 'BEARISH' ? -30 : 0;
    const uwBull = liveData.unusualWhales.bullPct || 50;
    add('UW Options Flow', uwVal + (uwBull - 50) * 0.5, 1.8);
  }
  const pcRatio = liveData?.cboeFlow?.pcRatio || citMarketData?.data?.pcRatio;
  if (pcRatio != null) {
    const pcScore = pcRatio > 1.3 ? 25 : pcRatio > 1.1 ? 12 : pcRatio < 0.6 ? -25 : pcRatio < 0.75 ? -12 : 0;
    add('CBOE P/C Ratio', pcScore, 1.5);
  }
  if (liveData?.fearGreed?.value != null) {
    const fg = liveData.fearGreed.value;
    const fgScore = fg <= 20 ? 35 : fg <= 30 ? 18 : fg >= 80 ? -35 : fg >= 70 ? -18 : (fg - 50) * 0.4;
    add('Fear & Greed', fgScore, 1.2);
  }
  const abv200 = citMarketData?.data?.abv200;
  if (abv200 != null) {
    add('Breadth >200d', (abv200 - 50) * 0.8, 1.4);
  }
  const vix = citMarketData?.data?.vix;
  if (vix != null) {
    const vixScore = vix < 13 ? -10 : vix < 18 ? 15 : vix < 22 ? 5 : vix < 28 ? -15 : -35;
    add('VIX Level', vixScore, 1.3);
  }
  const spyP  = citMarketData?.data?.spyPrice;
  const spy50 = citMarketData?.data?.spy50;
  const spy200= citMarketData?.data?.spy200;
  if (spyP && spy50 && spy200) {
    const trendScore = (spyP > spy200 ? 20 : -20) + (spyP > spy50 ? 10 : -10);
    add('SPY Trend', trendScore, 1.4);
  }
  const rsi = citMarketData?.data?.spyRsi;
  if (rsi != null) {
    const rsiScore = rsi > 70 ? -20 : rsi < 30 ? 20 : rsi > 60 ? -5 : rsi < 40 ? 5 : (rsi - 50) * 0.4;
    add('SPY RSI', rsiScore, 1.0);
  }
  const yield10 = liveData?.fred?.DGS10 || citMarketData?.data?.tnyield;
  if (yield10 != null) {
    const yldScore = yield10 > 5.0 ? -30 : yield10 > 4.5 ? -15 : yield10 > 4.0 ? -5 : 10;
    add('10Y Yield', yldScore, 1.1);
  }
  const dxy = citMarketData?.data?.dxy;
  if (dxy != null) {
    const dxyScore = dxy > 108 ? -20 : dxy > 104 ? -8 : dxy < 100 ? 15 : dxy < 103 ? 5 : 0;
    add('DXY Dollar', dxyScore, 1.0);
  }
  const btcChg = liveData?.crypto?.bitcoin?.usd_24h_change;
  if (btcChg != null) {
    add('BTC 24h', Math.max(-30, Math.min(30, btcChg * 2)), 0.8);
  }
  const congTrades = liveData?.unusualWhales?.congress || [];
  if (congTrades.length > 0) {
    const buys  = congTrades.filter(t => t.type?.toLowerCase().includes('purchase') || t.type?.toLowerCase().includes('buy')).length;
    const sells = congTrades.filter(t => t.type?.toLowerCase().includes('sale') || t.type?.toLowerCase().includes('sell')).length;
    const congScore = (buys - sells) / Math.max(congTrades.length, 1) * 25;
    add('Congress Trades', congScore, 0.7);
  }
  if (citMarketData?.data?.fomc) add('FOMC Risk', -15, 1.0);
  if (citMarketData?.data?.cpi)  add('CPI Risk',  -10, 0.8);
  const rawScore = count > 0 ? score / count : 0;
  const normalised = Math.max(-100, Math.min(100, rawScore));
  const direction  = normalised > 8 ? 'BULLISH' : normalised < -8 ? 'BEARISH' : 'NEUTRAL';
  const conviction = Math.abs(normalised) > 40 ? 'HIGH' : Math.abs(normalised) > 18 ? 'MEDIUM' : 'LOW';
  const topSignals = signals.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,5);
  return { score: +normalised.toFixed(1), direction, conviction, signals: topSignals, count };
}

module.exports = {
  levenshteinSim,
  citSMA,
  citRSI,
  brierScore,
  parseJSON,
  citAllOrigins,
  citFallback,
  citScoreMarket,
  citDeriveOBMetrics,
  citKyleLambda,
  citHawkes,
  citAlmgrenChriss,
  citAvellanedaStoikov,
  citVPIN,
  citComputeAll,
  parlayCorrelationFactor,
  computeParlayOdds,
  buildCrossAssetSignals,
  computeExecutionSignal,
  citScoreColor,
  computeSignalFusion,
  ASSET_CORRELATIONS,
};
