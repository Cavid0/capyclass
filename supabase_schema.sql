-- ============================================================
-- ClassEdu – Supabase SQL Schema
-- Kopyalayıb Supabase > SQL Editor-a yapışdırın və Run edin.
-- ============================================================

-- 1. Enum tiplər
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('TEACHER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceStatus" AS ENUM ('PENDING', 'PASS', 'FAIL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. İstifadəçilər
CREATE TABLE IF NOT EXISTS "User" (
  "id"                TEXT        PRIMARY KEY,
  "name"              TEXT        NOT NULL,
  "email"             TEXT        NOT NULL UNIQUE,
  "hashedPassword"    TEXT        NOT NULL,
  "role"              "Role"      NOT NULL DEFAULT 'STUDENT',
  "emailVerified"     BOOLEAN     NOT NULL DEFAULT false,
  "verificationToken" TEXT        UNIQUE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sinifxanalar
CREATE TABLE IF NOT EXISTS "Classroom" (
  "id"          TEXT        PRIMARY KEY,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "inviteCode"  TEXT        NOT NULL UNIQUE,
  "teacherId"   TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- 4. Co-adminlər
CREATE TABLE IF NOT EXISTS "ClassroomAdmin" (
  "id"          TEXT        PRIMARY KEY,
  "classroomId" TEXT        NOT NULL REFERENCES "Classroom"("id") ON DELETE CASCADE,
  "userId"      TEXT        NOT NULL REFERENCES "User"("id")      ON DELETE CASCADE,
  "addedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("classroomId", "userId")
);
CREATE INDEX IF NOT EXISTS "ClassroomAdmin_classroomId_idx" ON "ClassroomAdmin"("classroomId");
CREATE INDEX IF NOT EXISTS "ClassroomAdmin_userId_idx"      ON "ClassroomAdmin"("userId");

-- 5. Sinifxana üzvlüyü
CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id"          TEXT        PRIMARY KEY,
  "studentId"   TEXT        NOT NULL REFERENCES "User"("id")      ON DELETE CASCADE,
  "classroomId" TEXT        NOT NULL REFERENCES "Classroom"("id") ON DELETE CASCADE,
  "joinedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("studentId", "classroomId")
);
CREATE INDEX IF NOT EXISTS "Enrollment_studentId_idx"   ON "Enrollment"("studentId");
CREATE INDEX IF NOT EXISTS "Enrollment_classroomId_idx" ON "Enrollment"("classroomId");

-- 6. Tapşırıqlar
CREATE TABLE IF NOT EXISTS "Task" (
  "id"          TEXT        PRIMARY KEY,
  "title"       TEXT        NOT NULL,
  "description" TEXT        NOT NULL DEFAULT '',
  "classroomId" TEXT        NOT NULL REFERENCES "Classroom"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Task_classroomId_idx" ON "Task"("classroomId");

-- 7. İş sahələri (tələbə kodları)
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id"           TEXT              PRIMARY KEY,
  "title"        TEXT              NOT NULL DEFAULT 'My Code',
  "code"         TEXT              NOT NULL DEFAULT '',
  "language"     TEXT              NOT NULL DEFAULT 'javascript',
  "status"       "WorkspaceStatus" NOT NULL DEFAULT 'PENDING',
  "reviewStatus" TEXT,
  "reviewNote"   TEXT,
  "studentId"    TEXT              NOT NULL REFERENCES "User"("id")      ON DELETE CASCADE,
  "classroomId"  TEXT              NOT NULL REFERENCES "Classroom"("id") ON DELETE CASCADE,
  "createdAt"    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Workspace_studentId_idx"   ON "Workspace"("studentId");
CREATE INDEX IF NOT EXISTS "Workspace_classroomId_idx" ON "Workspace"("classroomId");
