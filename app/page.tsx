'use client';

import { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const STOCKS = {
  TITAN:{name:"Titan Company",sector:"Consumer Durables",price:3200,pe:80,roe:24,mktcap:250000,ocf:3500,rev:38000,revcagr:22,epscagr:25,opm:12,roce:28,de:0.08,fcf:3200,promo:52.9,ca:18000,tl:8000,sh:888,np:2800,dep:450,capex:800,bvps:180},
  DMART:{name:"Avenue Supermarts",sector:"Retail",price:3400,pe:105,roe:16,mktcap:220000,ocf:4800,rev:42000,revcagr:24,epscagr:22,opm:8,roce:18,de:0.0,fcf:3200,promo:75.2,ca:8500,tl:4200,sh:650,np:2100,dep:1200,capex:2800,bvps:280},
  HDFCBANK:{name:"HDFC Bank",sector:"Banking",price:1650,pe:18,roe:17,mktcap:1100000,ocf:85000,rev:180000,revcagr:18,epscagr:16,opm:48,roce:18,de:0.0,fcf:75000,promo:26.1,ca:200000,tl:150000,sh:6700,np:40000,dep:2000,capex:3000,bvps:650},
  TCS:{name:"TCS",sector:"IT Services",price:3600,pe:28,roe:44,mktcap:1300000,ocf:42000,rev:225000,revcagr:10,epscagr:8,opm:25,roce:48,de:0.0,fcf:40000,promo:72.3,ca:95000,tl:35000,sh:3618,np:42000,dep:3200,capex:5500,bvps:200},
  ASIANPAINT:{name:"Asian Paints",sector:"Paints",price:2900,pe:65,roe:28,mktcap:280000,ocf:4200,rev:32000,revcagr:14,epscagr:12,opm:18,roce:32,de:0.0,fcf:3800,promo:52.7,ca:12000,tl:5000,sh:958,np:3200,dep:420,capex:850,bvps:150},
  ITC:{name:"ITC Limited",sector:"FMCG",price:420,pe:26,roe:24,mktcap:520000,ocf:18000,rev:65000,revcagr:8,epscagr:10,opm:32,roce:26,de:0.0,fcf:16500,promo:0,ca:45000,tl:20000,sh:12400,np:16000,dep:2800,capex:4500,bvps:95},
  RELIANCE:{name:"Reliance Industries",sector:"Conglomerate",price:2500,pe:28,roe:14,mktcap:1700000,ocf:55000,rev:850000,revcagr:12,epscagr:14,opm:18,roce:16,de:0.45,fcf:45000,promo:50.3,ca:400000,tl:250000,sh:6800,np:60000,dep:45000,capex:85000,bvps:1100},
  BAJFINANCE:{name:"Bajaj Finance",sector:"NBFC",price:6800,pe:35,roe:20,mktcap:420000,ocf:32000,rev:42000,revcagr:28,epscagr:26,opm:68,roce:22,de:6.5,fcf:8000,promo:55,ca:180000,tl:140000,sh:618,np:12000,dep:500,capex:1000,bvps:950},
  MARUTI:{name:"Maruti Suzuki",sector:"Auto",price:10600,pe:29,roe:14,mktcap:320000,ocf:12000,rev:125000,revcagr:6,epscagr:4,opm:10,roce:18,de:0.0,fcf:8500,promo:58.2,ca:42000,tl:18000,sh:302,np:10500,dep:4200,capex:7700,bvps:2200},
  INFY:{name:"Infosys",sector:"IT Services",price:1550,pe:27,roe:30,mktcap:650000,ocf:28000,rev:145000,revcagr:9,epscagr:7,opm:22,roce:32,de:0.0,fcf:26500,promo:13,ca:72000,tl:28000,sh:4150,np:24000,dep:2900,capex:4400,bvps:180},
};

const clamp=(v:number,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
const sc=(s:number)=>s>=80?"#10B981":s>=60?"#F59E0B":s>=40?"#818CF8":"#EF4444";
const lbl=(s:number)=>s>=80?"HIGH":s>=60?"MOD":s>=40?"LOW":"WEAK";

function scoreJhunjhunwala(s:any){
  const pcf=s.mktcap/s.ocf;
  const pcfS=pcf>=25&&pcf<=35?100:pcf<25?clamp(100-(25-pcf)*2):clamp(100-(pcf-35)*3);
  const gS=clamp(Math.min(40,s.revcagr*4)+Math.min(40,s.epscagr*2.67)+Math.min(20,s.opm*1.14));
  const fcfM=(s.fcf/s.rev)*100;
  const qS=clamp(Math.min(40,s.roce*2.67)+Math.min(40,s.de<=0.5?40:Math.max(0,40-s.de*80))+Math.min(20,fcfM*2.5));
  const cvS=clamp(s.promo>=45?100:s.promo*2.22);
  const total=pcfS*0.25+gS*0.25+qS*0.20+cvS*0.20+50*0.10;
  return{name:"Jhunjhunwala",full:"Rakesh Jhunjhunwala",label:"Conviction Multibagger",score:Math.round(total),
    comps:[
      {label:"P/CF Ratio",v:Math.round(pcfS),wt:25,detail:`${pcf.toFixed(1)}x (ideal 25–35x)`},
      {label:"Growth Composite",v:Math.round(gS),wt:25,detail:`Rev ${s.revcagr}% · EPS ${s.epscagr}% · OPM ${s.opm}%`},
      {label:"Quality (ROCE/Debt/FCF)",v:Math.round(qS),wt:20,detail:`ROCE ${s.roce}% · D/E ${s.de} · FCF margin ${fcfM.toFixed(1)}%`},
      {label:"Promoter Conviction",v:Math.round(cvS),wt:20,detail:`${s.promo}% holding (target >45%)`},
    ],
    insight:`P/CF ${pcf.toFixed(1)}x · ${s.revcagr}% rev CAGR · ${s.promo}% promoter. ${total>=75?"High multibagger probability.":"Below conviction threshold."}`};
}

function scoreDamani(s:any){
  const deS=s.de<=0.1?100:s.de<=0.3?70:clamp(100-s.de*100);
  const roceS=clamp(s.roce>=25?100:s.roce*4);
  const fcfM=(s.fcf/s.rev)*100;
  const cfS=clamp(fcfM>=10?100:fcfM*10);
  const moatS=clamp(s.opm>=15?100:s.opm*6.67);
  const total=deS*0.30+roceS*0.25+cfS*0.20+moatS*0.15+50*0.10;
  return{name:"Damani",full:"Radhakishan Damani",label:"Zero-Debt Fortress",score:Math.round(total),
    comps:[
      {label:"Zero-Debt Filter",v:Math.round(deS),wt:30,detail:`D/E ${s.de.toFixed(2)} (target ≤0.1)`},
      {label:"ROCE Sustainability",v:Math.round(roceS),wt:25,detail:`${s.roce}% (target >25%)`},
      {label:"Cash Flow Predictability",v:Math.round(cfS),wt:20,detail:`FCF margin ${fcfM.toFixed(1)}% (target >10%)`},
      {label:"Defensive Moat",v:Math.round(moatS),wt:15,detail:`OPM ${s.opm}% (target >15%)`},
    ],
    insight:`D/E ${s.de.toFixed(2)} · ROCE ${s.roce}% · FCF margin ${fcfM.toFixed(1)}%. ${s.de<=0.1?"Passes":"Fails"} Damani's zero-debt test.`};
}

function scoreBuffett(s:any){
  const roeS=clamp(s.roe>=20?100:s.roe*5);
  const moatS=clamp(s.opm>=20?100:s.opm*5);
  const oe=s.np+s.dep-s.capex*0.7;
  const oeY=(oe/s.mktcap)*100;
  const oeS=clamp(oeY>=8?100:oeY*12.5);
  const mgS=clamp(s.promo>=30?100:s.promo*3.33);
  const total=roeS*0.30+moatS*0.25+oeS*0.20+mgS*0.15+50*0.10;
  return{name:"Buffett",full:"Warren Buffett",label:"Quality Moat",score:Math.round(total),
    comps:[
      {label:"ROE Sustainability",v:Math.round(roeS),wt:30,detail:`${s.roe}% (target >20%)`},
      {label:"Economic Moat",v:Math.round(moatS),wt:25,detail:`OPM ${s.opm}% (target >20%)`},
      {label:"Owner Earnings Yield",v:Math.round(oeS),wt:20,detail:`${oeY.toFixed(1)}% (target >8%)`},
      {label:"Management Skin",v:Math.round(mgS),wt:15,detail:`Promoter ${s.promo}%`},
    ],
    insight:`ROE ${s.roe}% · OE yield ${oeY.toFixed(1)}% · OPM ${s.opm}%. ${total>=75?"Wonderful compounder.":"Lacks durable moat."}`};
}

function scoreGraham(s:any){
  const ncav=(s.ca-s.tl)/s.sh;
  const ncavDisc=((ncav-s.price)/s.price)*100;
  const ncavS=clamp(ncavDisc>=30?100:ncavDisc>0?ncavDisc*3.33:50+ncavDisc);
  const peS=clamp(s.pe<=15?100:Math.max(0,100-(s.pe-15)*5));
  const cr=s.ca/Math.max(1,s.tl);
  const crS=clamp(cr*50);
  const deS=clamp(s.de<=0.5?100:Math.max(0,100-s.de*100));
  const total=ncavS*0.40+peS*0.25+crS*0.15+deS*0.20;
  return{name:"Graham",full:"Benjamin Graham",label:"Deep Value",score:Math.round(total),
    comps:[
      {label:"NCAV Discount",v:Math.round(ncavS),wt:40,detail:`NCAV ₹${Math.round(ncav)} vs ₹${s.price} (${ncavDisc>0?"+":""}${Math.round(ncavDisc)}%)`},
      {label:"P/E Value",v:Math.round(peS),wt:25,detail:`P/E ${s.pe} (target <15)`},
      {label:"Current Ratio Safety",v:Math.round(crS),wt:15,detail:`Ratio ${cr.toFixed(2)} (target >2)`},
      {label:"Debt Safety",v:Math.round(deS),wt:20,detail:`D/E ${s.de.toFixed(2)} (target <0.5)`},
    ],
    insight:`NCAV ₹${Math.round(ncav)} vs price ₹${s.price} · P/E ${s.pe}. ${ncavDisc>0?"Trading below liquidation value!":"Premium to net assets."}`};
}

function scoreLynch(s:any){
  const peg=s.pe/Math.max(1,s.epscagr);
  const pegS=clamp(peg<=1?100:peg<=1.5?70:Math.max(0,100-(peg-1)*50));
  const gS=clamp(s.epscagr>=15?100:s.epscagr*6.67);
  const cfS=s.fcf>0?100:0;
  const stS=clamp(s.revcagr>=12?100:s.revcagr*8.33);
  const total=pegS*0.30+gS*0.25+cfS*0.20+stS*0.15+50*0.10;
  return{name:"Lynch",full:"Peter Lynch",label:"GARP",score:Math.round(total),
    comps:[
      {label:"PEG Ratio",v:Math.round(pegS),wt:30,detail:`PEG ${peg.toFixed(2)} (P/E ${s.pe} ÷ ${s.epscagr}% growth)`},
      {label:"EPS Growth Rate",v:Math.round(gS),wt:25,detail:`${s.epscagr}% CAGR (target >15%)`},
      {label:"Free Cash Flow",v:Math.round(cfS),wt:20,detail:`₹${Math.round(s.fcf/1000)}K Cr ${s.fcf>0?"positive":"negative"}`},
      {label:"Revenue Story",v:Math.round(stS),wt:15,detail:`${s.revcagr}% revenue growth`},
    ],
    insight:`PEG ${peg.toFixed(2)} · EPS CAGR ${s.epscagr}% · Rev ${s.revcagr}%. ${peg<=1?"Paying below 1x for growth — Lynch's sweet spot.":peg<=1.5?"Reasonable GARP candidate.":"Growth not worth the price."}`};
}

const SCORERS=[scoreJhunjhunwala,scoreDamani,scoreBuffett,scoreGraham,scoreLynch];
const SIG={BUY:"#10B981",HOLD:"#F59E0B",AVOID:"#EF4444"};
const getSig=(s:number)=>s>=72?"BUY":s>=52?"HOLD":"AVOID";

export default function RishiTerminal(){
  const [sel,setSel]=useState("TITAN");
  const [exp,setExp]=useState<string|null>(null);
  const [anim,setAnim]=useState(0);

  const stock=STOCKS[sel as keyof typeof STOCKS];
  const scores=SCORERS.map(fn=>fn(stock));
  const composite=Math.round(scores.reduce((a,b)=>a+b.score,0)/scores.length);

  useEffect(()=>{
    setAnim(0);setExp(null);
    let n=0;
    const iv=setInterval(()=>{n=Math.min(n+3,composite);setAnim(n);if(n>=composite)clearInterval(iv);},12);
    return()=>clearInterval(iv);
  },[sel,composite]);

  const radar=scores.map(s=>({rishi:s.name,score:s.score}));

  return(
    <div style={{fontFamily:"'JetBrains Mono','Courier New',monospace",background:"#050508",color:"#E2E8F0",minHeight:"100vh"}}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap"/>
      <style>{`
        .cinzel{font-family:'Cinzel',Georgia,serif}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .chip{cursor:pointer;padding:7px 14px;border-radius:5px;border:1px solid #1E293B;background:#09090F;color:#64748B;font-size:11px;letter-spacing:1px;transition:all .2s;font-family:inherit}
        .chip:hover,.chip.on{background:#F59E0B15;border-color:#F59E0B60;color:#F59E0B}
        .rcard{background:#09090F;border:1px solid #1E293B;border-radius:7px;padding:16px;cursor:pointer;transition:all .2s}
        .rcard:hover{background:#0F0F1C;transform:translateY(-2px)}
        .bar{background:#1E293B;border-radius:2px;height:3px;overflow:hidden}
        .bar-fill{height:100%;border-radius:2px;transition:width 1s ease}
        .fade{animation:fade .4s ease}
        @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#F59E0B25}
        @media(max-width:600px){.grid5{grid-template-columns:repeat(2,1fr)!important}.top-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{borderBottom:"1px solid #F59E0B18",padding:"13px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#06060D",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div className="cinzel" style={{fontSize:17,color:"#F59E0B",letterSpacing:3}}>RISHI TERMINAL 4.0</div>
          <div style={{fontSize:9,color:"#1E293B",letterSpacing:2,marginTop:1}}>ETERNAL SAGE RESEARCH OPERATING SYSTEM</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div className="pulse" style={{width:5,height:5,borderRadius:"50%",background:"#10B981"}}></div>
          <span style={{fontSize:10,color:"#10B981",letterSpacing:1}}>LIVE</span>
          <span style={{fontSize:10,color:"#334155",marginLeft:6}}>5 RISHIS · 10 STOCKS</span>
          <span style={{padding:"2px 8px",borderRadius:3,background:"#F59E0B10",border:"1px solid #F59E0B25",fontSize:9,color:"#F59E0B80",letterSpacing:1}}>DEMO</span>
        </div>
      </div>

      <div style={{maxWidth:920,margin:"0 auto",padding:"22px 16px"}}>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:9,color:"#1E293B",letterSpacing:2,marginBottom:10}}>SELECT STOCK TO ANALYZE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {Object.entries(STOCKS).map(([sym,d])=>(
              <button key={sym} className={`chip ${sel===sym?"on":""}`} onClick={()=>setSel(sym)}>
                {sym}<span style={{opacity:.45,fontSize:9,marginLeft:5}}>₹{d.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="top-grid fade" style={{display:"grid",gridTemplateColumns:"148px 1fr",gap:12,marginBottom:12}}>
          <div style={{background:"#09090F",border:`2px solid ${sc(composite)}28`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#1E293B",letterSpacing:2,marginBottom:8}}>RISHI SCORE</div>
            <div className="cinzel" style={{fontSize:54,color:sc(composite),lineHeight:1}}>{anim}</div>
            <div style={{fontSize:9,color:sc(composite),marginTop:4,letterSpacing:1}}>/100</div>
            <div style={{marginTop:10,padding:"3px 10px",borderRadius:3,background:`${sc(composite)}15`,border:`1px solid ${sc(composite)}40`,fontSize:9,color:sc(composite),letterSpacing:1}}>{lbl(composite)}</div>
          </div>
          <div style={{background:"#09090F",border:"1px solid #1E293B",borderRadius:8,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div className="cinzel" style={{fontSize:17,color:"#F5E6D3"}}>{stock.name}</div>
                <div style={{fontSize:10,color:"#475569",marginTop:3}}>{stock.sector} · NSE</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,color:"#F1F5F9"}}>₹{stock.price.toLocaleString()}</div>
                <div style={{fontSize:10,color:"#64748B",marginTop:2}}>P/E {stock.pe}x · ROE {stock.roe}%</div>
              </div>
            </div>
            {scores.map(s=>(
              <div key={s.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:10,color:"#64748B",width:90,flexShrink:0}}>{s.name}</span>
                <div className="bar" style={{flex:1}}>
                  <div className="bar-fill" style={{width:`${s.score}%`,background:sc(s.score)}}></div>
                </div>
                <span style={{fontSize:11,color:sc(s.score),width:26,textAlign:"right",fontWeight:600}}>{s.score}</span>
                <span style={{fontSize:9,padding:"1px 5px",borderRadius:2,background:`${SIG[getSig(s.score) as keyof typeof SIG]}15`,color:SIG[getSig(s.score) as keyof typeof SIG],width:32,textAlign:"center"}}>{getSig(s.score)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:"#09090F",border:"1px solid #1E293B",borderRadius:8,padding:16,marginBottom:12}}>
          <div style={{fontSize:9,color:"#1E293B",letterSpacing:2,marginBottom:4}}>RISHI ALIGNMENT RADAR</div>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radar} cx="50%" cy="50%">
              <PolarGrid stroke="#131320"/>
              <PolarAngleAxis dataKey="rishi" tick={{fill:"#64748B",fontSize:10}}/>
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="score" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.12} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{fontSize:9,color:"#1E293B",letterSpacing:2,marginBottom:10}}>RISHI FORMULA VERDICTS — CLICK ANY CARD TO EXPAND</div>
        <div className="grid5" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
          {scores.map(s=>(
            <div key={s.name} className="rcard" style={{borderLeft:`3px solid ${sc(s.score)}`,borderRadius:"0 7px 7px 0"}} onClick={()=>setExp(exp===s.name?null:s.name)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <div style={{fontSize:11,color:"#CBD5E1",fontWeight:500}}>{s.full.split(" ").slice(-1)[0]}</div>
                <div style={{fontSize:20,fontWeight:700,color:sc(s.score)}}>{s.score}</div>
              </div>
              <div style={{fontSize:9,color:"#475569",marginBottom:8}}>{s.label}</div>
              <div className="bar" style={{marginBottom:8}}>
                <div className="bar-fill" style={{width:`${s.score}%`,background:sc(s.score)}}></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:9,padding:"2px 6px",borderRadius:2,background:`${SIG[getSig(s.score) as keyof typeof SIG]}15`,color:SIG[getSig(s.score) as keyof typeof SIG]}}>{getSig(s.score)}</span>
                <span style={{fontSize:9,color:"#334155"}}>{exp===s.name?"▲":"▼"}</span>
              </div>
            </div>
          ))}
        </div>

        {exp&&(()=>{
          const s=scores.find(x=>x.name===exp);
          if(!s)return null;
          return(
            <div className="fade" style={{background:"#09090F",border:`1px solid ${sc(s.score)}30`,borderRadius:8,padding:20,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div className="cinzel" style={{fontSize:15,color:"#F5E6D3"}}>{s.full}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:2}}>{s.label} Formula</div>
                </div>
                <div style={{fontSize:36,color:sc(s.score),fontWeight:700}}>{s.score}<span style={{fontSize:12,color:sc(s.score),opacity:.6}}>/100</span></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:14}}>
                {s.comps.map((c:any,i:number)=>(
                  <div key={i} style={{background:"#0A0A16",borderRadius:6,padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:10,color:"#94A3B8"}}>{c.label}</span>
                      <span style={{fontSize:13,color:sc(c.v),fontWeight:700}}>{c.v}</span>
                    </div>
                    <div className="bar" style={{marginBottom:6}}>
                      <div className="bar-fill" style={{width:`${c.v}%`,background:sc(c.v)}}></div>
                    </div>
                    <div style={{fontSize:9,color:"#475569"}}>{c.detail}</div>
                    <div style={{fontSize:9,color:"#334155",marginTop:4}}>Weight: {c.wt}%</div>
                  </div>
                ))}
              </div>
              <div style={{padding:"10px 14px",background:"#0A0A16",borderRadius:6,borderLeft:`2px solid ${sc(s.score)}60`}}>
                <div style={{fontSize:9,color:"#64748B",letterSpacing:1,marginBottom:4}}>KEY INSIGHT</div>
                <div style={{fontSize:11,color:"#94A3B8",lineHeight:1.7}}>{s.insight}</div>
              </div>
            </div>
          );
        })()}

        <div style={{marginTop:8,textAlign:"center",fontSize:9,color:"#0F172A",letterSpacing:1}}>
          NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · SEBI COMPLIANT
        </div>
      </div>
    </div>
  );
}