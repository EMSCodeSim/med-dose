/** Only demographics/measurements may cross an explicitly requested calculation boundary. */
export type CalculationPatient={
  age:string;
  ageUnit:"years"|"months"|"days";
  weight:string;
  weightUnit:"kg"|"lb";
  weightSource:string;
};

export function copyPatientMeasurements(value:CalculationPatient):CalculationPatient{
  // Deliberately whitelist fields: never copy a medication, pathway, safety check,
  // selected dose, result, administration history, or repeat timer.
  return {age:value.age,ageUnit:value.ageUnit,weight:value.weight,weightUnit:value.weightUnit,weightSource:value.weightSource};
}

export function hasPatientMeasurements(value:CalculationPatient|null):boolean{
  if(!value)return false;
  return (value.age.trim()!==""&&Number.isFinite(Number(value.age))&&Number(value.age)>=0)
    ||(value.weight.trim()!==""&&Number.isFinite(Number(value.weight))&&Number(value.weight)>0);
}
