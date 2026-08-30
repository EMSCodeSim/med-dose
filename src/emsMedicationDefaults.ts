import type {CatalogMedication} from "./medicationCatalogStore";

type Clinical=Record<string,any>;
type Concentration={label:string;amount?:number;amountUnit?:string;volume?:number;volumeUnit?:string;concentration?:number;concentrationUnit?:string};

const common:Record<string,Concentration[]>={
  adenosine:[
    {label:"6 mg / 2 mL",amount:6,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:3,concentrationUnit:"mg/mL"},
    {label:"12 mg / 4 mL",amount:12,amountUnit:"mg",volume:4,volumeUnit:"mL",concentration:3,concentrationUnit:"mg/mL"},
  ],
  albuterol:[{label:"2.5 mg / 3 mL unit dose",amount:2.5,amountUnit:"mg",volume:3,volumeUnit:"mL",concentration:0.833333,concentrationUnit:"mg/mL"}],
  amiodarone:[{label:"150 mg / 3 mL",amount:150,amountUnit:"mg",volume:3,volumeUnit:"mL",concentration:50,concentrationUnit:"mg/mL"}],
  ondansetron:[{label:"4 mg / 2 mL",amount:4,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:2,concentrationUnit:"mg/mL"}],
  haloperidol:[{label:"5 mg / 1 mL",amount:5,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:5,concentrationUnit:"mg/mL"}],
  atropine:[
    {label:"1 mg / 10 mL prefilled syringe",amount:1,amountUnit:"mg",volume:10,volumeUnit:"mL",concentration:0.1,concentrationUnit:"mg/mL"},
    {label:"1 mg / 1 mL vial",amount:1,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:1,concentrationUnit:"mg/mL"},
  ],
  midazolam:[{label:"5 mg / 1 mL",amount:5,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:5,concentrationUnit:"mg/mL"}],
  diazepam:[{label:"10 mg / 2 mL",amount:10,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:5,concentrationUnit:"mg/mL"}],
  lorazepam:[{label:"2 mg / 1 mL",amount:2,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:2,concentrationUnit:"mg/mL"}],
  calcium:[
    {label:"Calcium chloride 1 g / 10 mL",amount:1000,amountUnit:"mg",volume:10,volumeUnit:"mL",concentration:100,concentrationUnit:"mg/mL"},
    {label:"Calcium gluconate 1 g / 10 mL",amount:1000,amountUnit:"mg",volume:10,volumeUnit:"mL",concentration:100,concentrationUnit:"mg/mL"},
  ],
  dextrose:[
    {label:"D10W 25 g / 250 mL",amount:25000,amountUnit:"mg",volume:250,volumeUnit:"mL",concentration:100,concentrationUnit:"mg/mL"},
    {label:"D50W 25 g / 50 mL",amount:25000,amountUnit:"mg",volume:50,volumeUnit:"mL",concentration:500,concentrationUnit:"mg/mL"},
  ],
  diltiazem:[{label:"25 mg / 5 mL",amount:25,amountUnit:"mg",volume:5,volumeUnit:"mL",concentration:5,concentrationUnit:"mg/mL"}],
  diphenhydramine:[{label:"50 mg / 1 mL",amount:50,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:50,concentrationUnit:"mg/mL"}],
  dopamine:[{label:"400 mg / 250 mL premix",amount:400000,amountUnit:"mcg",volume:250,volumeUnit:"mL",concentration:1600,concentrationUnit:"mcg/mL"}],
  epinephrine:[
    {label:"1 mg/mL (1:1,000)",amount:1,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:1,concentrationUnit:"mg/mL"},
    {label:"0.1 mg/mL (1:10,000)",amount:1,amountUnit:"mg",volume:10,volumeUnit:"mL",concentration:0.1,concentrationUnit:"mg/mL"},
  ],
  glucagon:[{label:"1 mg vial after reconstitution",amount:1,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:1,concentrationUnit:"mg/mL"}],
  hydroxocobalamin:[{label:"5 g vial reconstituted to 200 mL",amount:5000,amountUnit:"mg",volume:200,volumeUnit:"mL",concentration:25,concentrationUnit:"mg/mL"}],
  ipratropium:[{label:"0.5 mg / 2.5 mL unit dose",amount:0.5,amountUnit:"mg",volume:2.5,volumeUnit:"mL",concentration:0.2,concentrationUnit:"mg/mL"}],
  lidocaine:[{label:"2% lidocaine",amount:20,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:20,concentrationUnit:"mg/mL"}],
  magnesium:[{label:"1 g / 2 mL",amount:1000,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:500,concentrationUnit:"mg/mL"}],
  methylprednisolone:[{label:"125 mg / 2 mL after reconstitution",amount:125,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:62.5,concentrationUnit:"mg/mL"}],
  naloxone:[
    {label:"2 mg / 2 mL",amount:2,amountUnit:"mg",volume:2,volumeUnit:"mL",concentration:1,concentrationUnit:"mg/mL"},
    {label:"4 mg / 0.1 mL nasal device",amount:4,amountUnit:"mg",volume:0.1,volumeUnit:"mL",concentration:40,concentrationUnit:"mg/mL"},
  ],
  fentanyl:[{label:"100 mcg / 2 mL",amount:100,amountUnit:"mcg",volume:2,volumeUnit:"mL",concentration:50,concentrationUnit:"mcg/mL"}],
  ketamine:[
    {label:"500 mg / 5 mL stock vial",amount:500,amountUnit:"mg",volume:5,volumeUnit:"mL",concentration:100,concentrationUnit:"mg/mL"},
    {label:"200 mg / 20 mL department working dilution",amount:200,amountUnit:"mg",volume:20,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"},
  ],
  morphine:[{label:"10 mg / 1 mL",amount:10,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:10,concentrationUnit:"mg/mL"}],
  hydromorphone:[{label:"1 mg / 1 mL",amount:1,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:1,concentrationUnit:"mg/mL"}],
  "racemic-epinephrine":[{label:"2.25% solution",amount:22.5,amountUnit:"mg",volume:1,volumeUnit:"mL",concentration:22.5,concentrationUnit:"mg/mL"}],
  "sodium-bicarbonate":[{label:"50 mEq / 50 mL",amount:50,amountUnit:"mEq",volume:50,volumeUnit:"mL",concentration:1,concentrationUnit:"mEq/mL"}],
};

const agencySpecific=new Set(["antiemetics","antipsychotics","duodote","hemostatic-agents","nitroglycerin","nsaids","oral-glucose","oxygen","phenylephrine","ophthalmic-anesthetics"]);

const uniq=(items:string[])=>Array.from(new Set(items.map(x=>String(x).trim()).filter(Boolean)));

export function enrichMedicationAdminData(med:CatalogMedication,input:Clinical):Clinical{
  const data:Clinical=JSON.parse(JSON.stringify(input||{}));
  data.id=data.id||med.id;
  data.name=data.name||med.name;
  data.brand=data.brand||med.brand;
  data.category=data.category||med.sub;
  data.protocolId=data.protocolId||med.protocol.id;
  data.protocolName=data.protocolName||med.protocol.name;
  if(data.page===undefined||data.page===null)data.page=med.protocol.page;

  if(Array.isArray(data.paths)&&data.paths.length){
    if(!Array.isArray(data.indications)||!data.indications.length)data.indications=uniq(data.paths.map((p:any)=>p?.label));
    if(!Array.isArray(data.routes)||!data.routes.length)data.routes=uniq(data.paths.flatMap((p:any)=>String(p?.route||"").split("/").map((x:string)=>x.trim())));
    if(!Array.isArray(data.monitoring)||!data.monitoring.length)data.monitoring=uniq(data.paths.flatMap((p:any)=>Array.isArray(p?.monitoring)?p.monitoring:[]));
    if(!Array.isArray(data.administration)||!data.administration.length)data.administration=uniq(data.paths.map((p:any)=>p?.administration));
    const baseNotes=uniq(data.paths.map((p:any)=>p?.baseContact).filter(Boolean).map((x:string)=>`Base contact: ${x}`));
    const special=uniq(data.paths.flatMap((p:any)=>Array.isArray(p?.special)?p.special:[]));
    if(baseNotes.length||special.length)data.notes=uniq([...(Array.isArray(data.notes)?data.notes:[]),...baseNotes,...special]);
  }

  if((!Array.isArray(data.concentrations)||data.concentrations.length===0)&&common[med.id]){
    data.concentrations=JSON.parse(JSON.stringify(common[med.id]));
    data.notes=uniq([...(Array.isArray(data.notes)?data.notes:[]),"Common EMS stock concentration(s) prefilled for setup. Verify the department inventory and physical medication label before clinical approval."]);
  } else if((!Array.isArray(data.concentrations)||data.concentrations.length===0)&&agencySpecific.has(med.id)){
    data.notes=uniq([...(Array.isArray(data.notes)?data.notes:[]),"No concentration was auto-filled because this medication group/device/preparation is agency-specific. Enter the exact department stock product before approval."]);
  }
  return data;
}

export function commonEmsConcentrationsFor(id:string):Concentration[]{return JSON.parse(JSON.stringify(common[id]||[]))}
