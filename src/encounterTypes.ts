export type EncounterPatient={patient:"adult"|"pediatric";ageYears?:number;weightKg?:number;halfDose?:boolean};

export type RecordedAdministration={
  drug:string;
  reason:string;
  route:string;
  dose:number;
  unit:string;
  volume:number;
  volumeUnit?:string;
  time:number;
  concentration:string;
  concentrationRequired?:boolean;
  patient?:string;
  safety?:string;
  administration?:string;
  repeat?:string;
  protocol?:string;
  monitoring?:string[];
  adjustment?:string;
  calculationMath?:string[];
  baseAuthorization?:{physician:string;time:number;reason:string};
};
