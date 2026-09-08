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
  patient?:string;
  baseAuthorization?:{physician:string;time:number;reason:string};
};
