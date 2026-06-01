/* ===========================================================================
   MRO TYCOON — datos Oficina + Schedule (maqueta)
   Coherentes con la "foto" de Operaciones: Paula+Diego en el AOG (PTU),
   Iván en el FCV + daily, Marta en tránsito al beacon, Lucía en turno tarde.
   =========================================================================== */

/* Plantilla (cap 5/5 — estado representativo de un MRO de línea ya rodado). */
const ROSTER = [
  { id:"M-001", n:"Paula Moreno",   c:"B1", eff:1.10, moral:70, shift:"morning",   state:"Working", assign:"WI-2042", task:"PTU flush · EC-NQM", salary:1840, night:false, age:41, exp:14, sev:34800, ratings:["A320/CFM56/B1","A321/CFM56/B1"], train:null },
  { id:"M-002", n:"Diego Sáez",     c:"B1", eff:1.15, moral:82, shift:"morning",   state:"Working", assign:"WI-2042", task:"PTU flush · EC-NQM", salary:1910, night:false, age:37, exp:11, sev:24200, ratings:["A320/CFM56/B1","A320/V2500/B1"], train:null },
  { id:"M-003", n:"Marta Iglesias", c:"B2", eff:1.05, moral:64, shift:"morning",   state:"ToPlane", assign:"WI-2041", task:"Beacon R&I · EI-DEK", salary:1980, night:false, age:45, exp:18, sev:46000, ratings:["A320/CFM56/B2"], train:null },
  { id:"M-004", n:"Iván Costas",    c:"B1", eff:1.00, moral:75, shift:"morning",   state:"Working", assign:"WI-2039", task:"Pack 2 FCV + daily", salary:1760, night:false, age:33, exp:8,  sev:14600, ratings:["A320/CFM56/B1"], train:null },
  { id:"M-005", n:"Lucía Prado",    c:"B2", eff:1.20, moral:88, shift:"afternoon", state:"OffShift",assign:null,      task:null, salary:2010, night:false, age:29, exp:6,  sev:11200, ratings:["A320/CFM56/B2","A320/V2500/B2"], train:null },
];

/* Pool de contratación (sub-tab, lo mostramos en el drawer/teaser). */
const CANDIDATES = [
  { id:"C-101", n:"Rubén Lema",   c:"B1", eff:1.08, salary:1880, age:38, exp:12, bonus:7520, expDays:5, traits:["meticuloso","nocturno"], ratings:["A320/CFM56/B1"] },
  { id:"C-102", n:"Nadia Ferrer", c:"B2", eff:1.14, salary:2040, age:34, exp:10, bonus:8160, expDays:3, traits:["rápida","avionics"], ratings:["A320/CFM56/B2","A320/V2500/B2"] },
];

/* Contratados en este escenario: Volotea (base OVD) + Vueling. */
const CONTRACTED = new Set(["V7","VY"]);

/* Schedule del día (OVD/LEAS · día 1). handled = operador contratado y habilitado. */
const AP_META = { icao:"LEAS", iata:"OVD", name:"Asturias", day:1, dayName:"Lunes" };
const FLIGHTS = [
  { id:"F-01", min:6*60+15, cs:"V73118", type:"arrival",   remote:"BCN", model:"A320", eng:"CFM56", al:"V7", reg:"EC-NQM", handled:true },
  { id:"F-02", min:6*60+40, cs:"VY1109", type:"departure", remote:"BCN", model:"A320", eng:"CFM56", al:"VY", reg:"EC-LVV", handled:true, done:true },
  { id:"F-03", min:7*60+5,  cs:"YW8412", type:"arrival",   remote:"MAD", model:"CRJ-1000", eng:"CF34-8C5", al:"YW", reg:"EC-MXA", handled:false },
  { id:"F-04", min:7*60+30, cs:"IB8754", type:"arrival",   remote:"MAD", model:"A320", eng:"CFM56", al:"IB", reg:"EC-MGC", handled:false },
  { id:"F-05", min:8*60+10, cs:"V73402", type:"departure", remote:"VLC", model:"A320", eng:"CFM56", al:"V7", reg:"EC-ISI", handled:true },
  { id:"F-06", min:8*60+35, cs:"VY1422", type:"arrival",   remote:"AGP", model:"A320", eng:"CFM56", al:"VY", reg:"EC-OKG", handled:true },
  { id:"F-07", min:9*60+20, cs:"U28456", type:"arrival",   remote:"LGW", model:"A320", eng:"CFM56", al:"U2", reg:"G-EZOA", handled:false },
  { id:"F-08", min:10*60+5, cs:"VY1631", type:"departure", remote:"PMI", model:"A320", eng:"CFM56", al:"VY", reg:"EC-KCU", handled:true },
  { id:"F-09", min:11*60+15,cs:"V73119", type:"departure", remote:"BCN", model:"A320", eng:"CFM56", al:"V7", reg:"EC-NQM", handled:true },
  { id:"F-10", min:12*60+40,cs:"IB8761", type:"departure", remote:"MAD", model:"A320", eng:"CFM56", al:"IB", reg:"EC-MGC", handled:false },
  { id:"F-11", min:14*60+30,cs:"VY1208", type:"arrival",   remote:"BCN", model:"A320", eng:"CFM56", al:"VY", reg:"EC-MES", handled:true },
  { id:"F-12", min:16*60+50,cs:"V73208", type:"arrival",   remote:"SVQ", model:"A320", eng:"CFM56", al:"V7", reg:"EC-NQN", handled:true },
  { id:"F-13", min:19*60+25,cs:"V73215", type:"arrival",   remote:"ALC", model:"A320", eng:"CFM56", al:"V7", reg:"EC-NQN", handled:true, overnight:true },
  { id:"F-14", min:21*60+40,cs:"YW8419", type:"departure", remote:"MAD", model:"CRJ-1000", eng:"CF34-8C5", al:"YW", reg:"EC-MXA", handled:false },
  { id:"F-15", min:22*60+15,cs:"VY1875", type:"arrival",   remote:"BCN", model:"A320", eng:"CFM56", al:"VY", reg:"EC-MBD", handled:true, overnight:true },
];
