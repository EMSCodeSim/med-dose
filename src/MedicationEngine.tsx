import {useEffect,useMemo,useState,type ReactNode} from "react";
import type {GenericMedication,GenericDosePath} from "./dmpMedicationData";
import DoseTracker from "./DoseTracker";
import CalculationBoard from "./CalculationBoard";
import MedicationBuilderShell from "./MedicationBuilderShell";
import FentanylDoseDashboard from "./FentanylDoseDashboard";
import DoseSyringe from "./DoseSyringe";
import GravityDripCalculator from "./GravityDripCalculator";
import type {EncounterPatient,RecordedAdministration} from "./encounterTypes";
import type {CalculationPatient} from "./calculationPatient";
import WeightQuickSelect from "./WeightQuickSelect";
import {commonEmsConcentrationsFor} from "./emsMedicationDefaults";
import {loadClinicalOverrides} from "./adminMedicationStore";
import "./genericMedication.css";

// MedicationEngine implementation is generated/maintained as the shared workflow.
// NOTE: concentration/formulation confirmation belongs only to the dedicated
// `concentration` step. The later `safety` step must never render concentration
// selection or confirmation controls.
