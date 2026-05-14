/**
 * Supabase Postgres에 supabase/migrations/*.sql 적용 (터미널).
 * .env 에 DATABASE_URL 필요 (대시보드 Database → Connection string).
 */
import "dotenv/config";
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "[db:migrate] DATABASE_URL 이 .env 에 없습니다.\n" +
      "Supabase → Project Settings → Database → Connection string (URI)\n" +
      "비밀번호 자리에 DB 비밀번호를 넣은 전체 URI를 붙여 넣으세요."
  );
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("[db:migrate] 마이그레이션 SQL 파일이 없습니다:", migrationsDir);
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  /** IF NOT EXISTS 등으로 나는 NOTICE(42P07)가 터미널을 지저분하게 채우지 않도록 */
  onnotice: () => {},
});

try {
  for (const name of files) {
    const path = join(migrationsDir, name);
    process.stdout.write(`[db:migrate] ${name} … `);
    await sql.file(path);
    console.log("ok");
  }
  console.log("[db:migrate] 완료");
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
