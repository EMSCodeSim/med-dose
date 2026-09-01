import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const clinicalMedicationOverrides={
  name:"clinical-medication-overrides",
  enforce:"pre" as const,
  resolveId(source:string,importer?:string){
    if(source==="./fieldMedicationDefinitions"&&importer?.endsWith("/src/UnifiedApp.tsx")){
      return fileURLToPath(new URL("./src/expandedFieldMedicationDefinitions.ts",import.meta.url));
    }
    if(source==="./emsMedicationDefaults"&&importer?.endsWith("/src/MedicationEngine.tsx")){
      return fileURLToPath(new URL("./src/clinicalMedicationDefaults.ts",import.meta.url));
    }
    return null;
  },
};

export default defineConfig({ plugins: [clinicalMedicationOverrides,react()] });
