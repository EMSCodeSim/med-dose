import {defineConfig} from "drizzle-kit";

export default defineConfig({
  dialect:"postgresql",
  schema:"./drizzle/schema.ts",
  out:"./migrations",
  dbCredentials:{url:process.env.DATABASE_URL||"postgresql://schema-only:unused@localhost/mymeddose"},
  strict:true,
});
