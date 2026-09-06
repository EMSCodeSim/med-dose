import {sql} from "drizzle-orm";
import {bigint,bigserial,boolean,jsonb,pgTable,text,timestamp} from "drizzle-orm/pg-core";
import type {AdminReviews} from "../src/neonAdmin";
import type {ClinicalOverrideState,MedicationAdminState} from "../src/adminMedicationStore";
import type {MedicationCatalogState} from "../src/medicationCatalogStore";

export const adminAllowlist=pgTable("admin_allowlist",{
  email:text().primaryKey(),
  role:text().notNull().default("admin"),
  active:boolean().notNull().default(true),
  createdAt:timestamp("created_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(),
});

export const adminWorkspace=pgTable("admin_workspace",{
  id:text().primaryKey(),
  medicationState:jsonb("medication_state").$type<MedicationAdminState>().notNull().default({}),
  reviews:jsonb().$type<AdminReviews>().notNull().default({}),
  catalog:jsonb().$type<MedicationCatalogState>().notNull().default({}),
  clinicalOverrides:jsonb("clinical_overrides").$type<ClinicalOverrideState>().notNull().default({}),
  version:bigint({mode:"number"}).notNull().default(1),
  updatedAt:timestamp("updated_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(),
  updatedBy:text("updated_by"),
});

export const adminAuditLog=pgTable("admin_audit_log",{
  id:bigserial({mode:"number"}).primaryKey(),
  actorUserId:text("actor_user_id").notNull().default(sql`auth.user_id()`),
  action:text().notNull(),
  details:jsonb().$type<Record<string,unknown>>().notNull().default({}),
  createdAt:timestamp("created_at",{withTimezone:true,mode:"string"}).notNull().defaultNow(),
});
