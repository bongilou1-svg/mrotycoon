/* ===========================================================================
   MRO TYCOON — Operaciones · datos de la maqueta
   Matrículas reales (pool OVD/LEAS), WOs reales (workorders.json),
   aerolíneas con color de marca (airlines.json). "Foto" de un turno de mañana
   en Asturias para que el feed cuente una historia legible.
   =========================================================================== */

const ATA = {
  5:"Time Limits / Checks", 12:"Servicing", 21:"Air Conditioning", 22:"Auto Flight",
  23:"Communications", 24:"Electrical Power", 25:"Equipment / Furnishings",
  26:"Fire Protection", 27:"Flight Controls", 28:"Fuel", 29:"Hydraulic Power",
  30:"Ice & Rain Protection", 32:"Landing Gear", 33:"Lights", 34:"Navigation", 71:"Power Plant",
};

const AIRLINES = {
  IB:{name:"Iberia Express", color:"#E40000"},
  VY:{name:"Vueling",        color:"#FFCD00"},
  V7:{name:"Volotea",        color:"#A20067"},
  U2:{name:"easyJet",        color:"#FF6600"},
  EI:{name:"Aer Lingus",     color:"#0D754B"},
};

const MECHS = {
  "M-001":{n:"Paula Moreno", c:"B1", moral:70},
  "M-002":{n:"Diego Sáez",   c:"B1", moral:82},
  "M-003":{n:"Marta Iglesias",c:"B2", moral:64},
  "M-004":{n:"Iván Costas",  c:"B1", moral:75},
  "M-005":{n:"Lucía Prado",  c:"B2", moral:88},
};
const initials = n => n.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();

/* Hora "ahora" = 08:40 (coincide con el screenshot del build actual). */
const NOW = 8*60+40;
const hhmm = m => String(Math.floor((m%1440)/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");

/* Cada evento: el feed completo del momento. slaMin = minutos hasta vencer SLA
   (negativo = vencido). assign.state: unassigned|travel|working|done|deferred. */
const EVENTS = [
  {
    id:"WI-2042", kind:"wo", icon:"🛑", reg:"EC-NQM", model:"A320", eng:"CFM56", al:"V7",
    stand:"351", flight:"V73118", wo:"WO-057", ata:29, cat:"B1", sev:"Critical", aog:true,
    emit:7*60+58, slaMin:24,
    desc:"PTU (Power Transfer Unit) servicing — Green↔Yellow hidráulico bidireccional. Contaminación de fluido detectada: cambio de filtro + ciclo de flush obligatorio.",
    amm:"AMM 29-13-21-690-001",
    parts:["PTU service kit","Hydraulic filter element","Skydrol LD-4 flush qty"],
    tools:["Heavy toolkit","Hydraulic flush rig","Particle counter"],
    assign:{state:"working", team:["M-001","M-002"]},
    phase:"MainTask", phasePct:55,
    fee:8200, penalty:1500,
  },
  {
    id:"WI-2044", kind:"wo", icon:"🔧", reg:"EC-OKG", model:"A320", eng:"CFM56", al:"VY",
    stand:"352", flight:"VY1422", wo:"WO-062", ata:32, cat:"B1", sev:"Critical", aog:false,
    emit:8*60+12, slaMin:41,
    desc:"MLG #2 brake unit R&I — Honeywell carbon. Crítico: el retorno a servicio exige brake-cool test + dragging brake check en rotación sobre gato.",
    amm:"AMM 32-45-15-000-002",
    parts:["MLG brake unit P/N MLG-BRK"],
    tools:["Heavy lift 50t","Hydraulic toolkit","Torque wrench 200-800 ft-lb"],
    assign:{state:"unassigned", hint:"B1 ocupados · 2 en AOG EC-NQM"},
    phase:"ToPlane", phasePct:0,
    fee:5400, penalty:5000,
  },
  {
    id:"WI-2045", kind:"wo", icon:"🔧", reg:"EC-KCU", model:"A320", eng:"CFM56", al:"VY",
    stand:"451", flight:"VY1631", wo:"WO-049", ata:28, cat:"B1", sev:"Major", aog:false,
    emit:8*60+18, slaMin:38,
    desc:"Fuel transfer pump R&I — wing tank center transfer. Fire-watch + bonding obligatorios. Test capacidad ≥ 11 USG/min a 35 PSI. Leak check 5 min.",
    amm:"AMM 28-22-12-000-001",
    parts:["Fuel xfer pump P/N FXP-1","Fuel O-ring kit"],
    tools:["Heavy toolkit","Fuel safety kit","Bonding lead","Flow meter"],
    assign:{state:"unassigned", hint:"B1 ocupados · libera Iván ~09:10"},
    phase:"ToPlane", phasePct:0,
    fee:4100, penalty:1500,
  },
  {
    id:"WI-2047", kind:"wo", icon:"🔧", reg:"EC-MES", model:"A320", eng:"CFM56", al:"VY",
    stand:"452", flight:"VY1208", wo:"WO-019", ata:23, cat:"B2", sev:"Minor", aog:false,
    emit:8*60+25, slaMin:118,
    desc:"VHF1 transceiver R&I — Collins RT-1701A LRU. Verificar 121.5 emergencia, umbral squelch, índice de modulación. Antena VSWR < 1.5.",
    amm:"AMM 23-12-21-000-001",
    parts:["VHF transceiver Collins RT-1701A"],
    tools:["Avionics toolkit","VSWR meter","Comms test set"],
    assign:{state:"unassigned", hint:"B2 en turno tarde · hora extra +2h"},
    phase:"ToPlane", phasePct:0,
    fee:2300, penalty:1500,
  },
  {
    id:"WI-2039", kind:"wo", icon:"🔧", reg:"EC-MBD", model:"A320", eng:"CFM56", al:"VY",
    stand:"551", flight:"VY1875", wo:"WO-009", ata:21, cat:"B1", sev:"Minor", aog:false,
    emit:7*60+40, slaMin:74,
    desc:"Pack 2 flow control valve R&I — FCV P/N 89241-1. Torque attach bolts 82-90 in-lb. Test funcional: full-open a full-close ≤ 4s.",
    amm:"AMM 21-51-21-000-005",
    parts:["FCV P/N 89241-1"],
    tools:["Standard toolkit","Torque wrench 0-150 in-lb"],
    assign:{state:"working", team:["M-004"]},
    phase:"Test", phasePct:70,
    fee:2600, penalty:1500,
  },
  {
    id:"WI-2041", kind:"wo", icon:"🔧", reg:"EI-DEK", model:"A320", eng:"CFM56", al:"EI",
    stand:"551", flight:"EI742", wo:"WO-072", ata:33, cat:"B2", sev:"Minor", aog:false,
    emit:7*60+52, slaMin:95,
    desc:"Anti-collision beacon (top fuselage) R&I — Whelen 8060 LED. Lift requerido. Verificar flash rate 40-100 fpm por FAR 25.1401.",
    amm:"AMM 33-44-11-000-001",
    parts:["Beacon LED P/N BCN-T (Whelen 8060)"],
    tools:["Cherry picker lift","Safety harness","Standard toolkit"],
    assign:{state:"travel", team:["M-003"]},
    phase:"ToPlane", phasePct:40,
    fee:1900, penalty:1500,
  },
  {
    id:"DC-EC-NQN", kind:"daily", icon:"🌙", reg:"EC-NQN", model:"A320", eng:"CFM56", al:"V7",
    stand:"452", flight:"—", ata:5, cat:"B1", sev:"Minor", aog:false,
    emit:6*60+5, slaMin:80,
    desc:"Daily check pernocta — walkaround, tren/frenos, servicing motores, drenaje fuel, cockpit & emergencia.",
    amm:"MPD — Daily Maintenance Look-in",
    subtasks:[
      {id:"DC-001", t:"Walkaround externo", done:true},
      {id:"DC-002", t:"Tren, neumáticos y frenos", done:true},
      {id:"DC-003", t:"Servicing motores y niveles", done:true},
      {id:"DC-004", t:"Drenaje tanques combustible", active:true, pct:60},
      {id:"DC-005", t:"Cockpit y equipo emergencia", done:false},
    ],
    assign:{state:"working", team:["M-004"]},
    phase:"MainTask", phasePct:60,
    fee:1700, penalty:0,
  },
  {
    id:"WI-2030", kind:"wo", icon:"📋", reg:"EC-ISI", model:"A320", eng:"CFM56", al:"V7",
    stand:"—", flight:"V73402", wo:"WO-073", ata:33, cat:"B2", sev:"Minor", aog:false,
    emit:6*60+40, slaMin:null, melCat:"D", melDays:312,
    desc:"Logo light vertical stab R&I — cosmético. Diferido vía MEL categoría D (312 días). Reprogramar en próxima ventana de hangar.",
    amm:"AMM 33-46-11-000-001",
    parts:["Logo light P/N LG-LT"], tools:["Cherry picker lift","Safety harness"],
    assign:{state:"deferred"},
    phase:"Deferred", phasePct:0,
    fee:0, penalty:0,
  },
  {
    id:"EV-RWY-1", kind:"event", icon:"🚧", reg:null, al:null,
    emit:9*60, slaMin:null,
    desc:"Pista 11/29 — cierre parcial programado por trabajos de balizamiento. Llegadas reprogramadas 09:00 → 13:00.",
    window:[9*60,13*60],
    phase:"ACTIVE",
  },
  {
    id:"WI-2018", kind:"wo", icon:"✅", reg:"EC-LVV", model:"A320", eng:"CFM56", al:"VY",
    stand:"351", flight:"VY1109", wo:"WO-005", ata:12, cat:"B1", sev:"Minor", aog:false,
    emit:6*60+8, closeMin:6*60+44, slaMin:null,
    desc:"Daily visual MLI (Maintenance Look-in Inspection) — walkaround per AMM 05-10-15. Sign-off OAS. Completado on-time.",
    amm:"AMM 05-10-15",
    parts:[], tools:["Inspection mirror","Flashlight 3-cell"],
    assign:{state:"done", team:["M-001"]},
    phase:"Completed", phasePct:100,
    fee:1400, penalty:0,
  },
];

/* Log / notificaciones (panel derecho). */
const LOG = [
  {t:"08:40", lvl:"bad",  h:"🛑 AOG EC-NQM — PTU contaminada bloquea V73118"},
  {t:"08:25", lvl:"warn", h:"Callout EC-MES VHF1 sin técnico B2 disponible"},
  {t:"08:18", lvl:"warn", h:"Callout EC-KCU fuel transfer pump R&I (AMM 28)"},
  {t:"08:12", lvl:"warn", h:"Callout EC-OKG freno MLG#2 — crítico"},
  {t:"08:02", lvl:"info", h:"Paula Moreno → EC-NQM (PTU flush)"},
  {t:"07:44", lvl:"ok",   h:"✅ EC-MBD Pack 2 FCV en fase Test"},
  {t:"06:44", lvl:"ok",   h:"✅ Daily MLI EC-LVV completado on-time"},
  {t:"06:30", lvl:"info", h:"Pista 11/29: aviso cierre parcial 09:00-13:00"},
];

/* HUD snapshot (coincide con el build actual). */
const HUD = { day:1, time:NOW, balance:"200.000 €", rep:51, compliance:80, week:1, dayNight:"☀️" };
