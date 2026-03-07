# CapyClass — Developer Session Log

> Bu fayl AI assistant (GitHub Copilot) tərəfindən yazılıb. Yeni sessiyada bu faylı oxuyub qaldığın yerdən davam et.

---

## Texnologiyalar
- **Next.js 14.2.35** (App Router, `/src/app`)
- **Prisma 5.22.0** + PostgreSQL (Supabase, 500MB limit)
- **NextAuth 4.24.13** (credentials provider)
- **TypeScript 5**, Tailwind CSS
- **Domain:** capyclass.com

---

## Sessiya 1 — İlkin Təmizlik

- Kotlin/HTML kompilyatorları `execute` route-dan silindi
- Tələbə sayı (member count) sinif görünüşünə əlavə edildi
- `src/middleware.ts` yaradıldı — təhlükəsizlik headerləri (CSP, XSS, HSTS, etc.)
- `src/lib/email.ts` yenidən yazıldı — daha yaxşı email çatdırılması
- SEO: sitemap, robots.txt, metadata təkmilləşdirildi
- Sinif səhifəsi `TeacherView.tsx` + `StudentView.tsx` komponentlərinə bölündü

---

## Sessiya 2 — Böyük Backend Yenilənməsi (18 təkmilləşdirmə)

### Prisma Schema Dəyişiklikləri
- **Yeni enum:** `TokenPurpose` (EMAIL_VERIFY, PASSWORD_RESET, PASSWORD_CHANGE, ACCOUNT_DELETE)
- **User-ə yeni sahələr:** `tokenPurpose`, `verificationTokenExpiresAt`, `otpAttempts`, `otpLockedUntil`
- **Task-a:** `dueDate` (DateTime?)
- **Yeni modellər:** `WorkspaceVersion`, `AuditLog`, `Notification`
- **İndekslər:** Workspace(studentId, classroomId), Task(classroomId), Classroom(teacherId)
- `npx prisma db push --accept-data-loss` ilə DB-yə tətbiq edildi

### Təhlükəsizlik
- OTP 15 dəqiqədən sonra bitir
- Hər OTP-nin **məqsədi** var — köhnədən eyni OTP hər yerdə işləyirdi, indi ayrılıb
- OTP brute-force qorunması: 5 yanlış cəhd → 15 dəq kilidlənmə
- Session cookie `sameSite: "strict"`
- Workspace save-ə **500KB** limit
- Rate limiter yaddaş qorunması (MAX_MAP_SIZE: 50k, DDoS-a qarşı)

### Rate Limitlər
| Endpoint | Limit | Pəncərə |
|---|---|---|
| verify-email | IP başına 10 | 15 dəq |
| reset-password | IP başına 10 | 15 dəq |
| resend-verification | IP başına 5 | 15 dəq |
| delete-account | User başına 3 | 15 dəq |
| execute (kod icra) | User başına 20 | 1 dəq |
| register | IP başına 5 | 15 dəq |
| forgot-password | IP başına 5 | 15 dəq |

### Performans
- **N+1 query düzəldildi:** classroom list-də batch `groupBy` istifadə olunur
- **Cursor-based pagination:** classroom detail (teacher workspace list)
- **DB indekslər** əlavə olundu

### TypeScript
- Bütün `as any` cast-lar silindi (20+ yerdə — bütün API route-lar + frontend)
- `src/types/next-auth.d.ts` yaradıldı — `session.user.id` və `session.user.role` artıq tipli

### Yeni Utility-lər
- `src/lib/audit.ts` — `logAudit()` funksiyası
- `src/lib/notifications.ts` — `createNotification()`, `notifyMany()`
- `src/lib/utils.ts`-ə əlavə olundu: `generateOtp()`, `setOtpToken()`, `verifyOtpToken()`

### Dəyişdirilən API Route-lar
| Route | Nə dəyişdi |
|---|---|
| `classrooms/route.ts` | N+1 fix, batch groupBy |
| `classrooms/[id]/route.ts` | Transaction delete, audit log, pagination |
| `classrooms/[id]/tasks/route.ts` | dueDate, notification göndərmə |
| `tasks/[id]/route.ts` | getAdminAccess() helper, dueDate, audit log |
| `workspaces/[id]/route.ts` | session.user.id, audit log |
| `workspaces/[id]/save/route.ts` | 500KB limit, versiya tarixçəsi (son 5) |
| `workspaces/[id]/review/route.ts` | Tələbəyə notification, audit log |
| `auth/register/route.ts` | tokenPurpose + expiry |
| `auth/verify-email/route.ts` | Rate limit, expiry, purpose, brute-force |
| `auth/forgot-password/route.ts` | Purpose + expiry |
| `auth/reset-password/route.ts` | Rate limit, expiry, purpose, brute-force |
| `auth/send-password-otp/route.ts` | Purpose-aware (?purpose= query param) |
| `auth/resend-verification/route.ts` | Rate limit, purpose + expiry |
| `auth/delete-account/route.ts` | verifyOtpToken(ACCOUNT_DELETE), transaction |
| `profile/route.ts` | verifyOtpToken(PASSWORD_CHANGE), audit log |
| `execute/route.ts` | session.user.id |
| `classrooms/[id]/enrollments/[studentId]/route.ts` | session.user.id |
| `classrooms/[id]/transfer/route.ts` | session.user.id |
| `classrooms/[id]/join/route.ts` | session.user.id + role |
| `classrooms/[id]/workspaces/route.ts` | session.user.id + role |

### Yeni Endpoint-lər
| Route | Metod | Nə edir |
|---|---|---|
| `/api/notifications` | GET | İstifadəçi bildirişləri (pagination, ?unread=true) |
| `/api/notifications` | PUT | Bildirişləri oxunmuş kimi işarələ |
| `/api/classrooms/[id]/export` | GET | CSV export (müəllim üçün) |
| `/api/cron/cleanup` | POST | Köhnə logları/bildirişləri sil (CRON_SECRET ilə) |

### Frontend Dəyişiklikləri
- **Profil səhifəsi** 4 komponentə bölündü (655 → 144 sətir):
  - `src/components/profile/ProfileCard.tsx`
  - `src/components/profile/PasswordChangeForm.tsx`
  - `src/components/profile/DeleteAccountSection.tsx`
  - `src/components/profile/OtpInput.tsx` (reusable)
- `DeleteAccountSection` artıq `?purpose=ACCOUNT_DELETE` göndərir
- Dashboard-dan "System active" badge silindi
- Classroom-dan "LIVE" badge silindi

### Cron Job
- `src/app/api/cron/cleanup/route.ts` — `CRON_SECRET` ilə qorunur
- Audit loglar: 30 gündən köhnə olanları silir
- Oxunmuş bildirişlər: 14 gündən köhnə olanları silir
- `.env`-ə `CRON_SECRET=random-key` əlavə etmək lazımdır

---

## Yaradılan Fayllar (tam siyahı)
```
src/types/next-auth.d.ts
src/lib/audit.ts
src/lib/notifications.ts
src/app/api/notifications/route.ts
src/app/api/classrooms/[id]/export/route.ts
src/app/api/cron/cleanup/route.ts
src/components/profile/OtpInput.tsx
src/components/profile/ProfileCard.tsx
src/components/profile/PasswordChangeForm.tsx
src/components/profile/DeleteAccountSection.tsx
```

## Sessiya 3 — Frontend Əlavələri

### Password Strength Meter
- `src/app/register/page.tsx`-ə əlavə edildi
- Şifrə sahəsinin altında 3 bölümlü rəngli bar göstərilir
- Səviyyələr: **Too short** (qırmızı) → **Weak** (qırmızı) → **Medium** (sarı) → **Strong** (yaşıl)
- Meyarlar: hərflər + rəqəmlər + xüsusi simvol + min 8 simvol

### dueDate Picker (Task-larda son tarix)
- `src/components/classroom/TeacherView.tsx`-ə əlavə edildi
- Task yaratma/redaktə modalında `datetime-local` input var
- Seçilmiş tarix API-yə `dueDate` kimi göndərilir
- Redaktə zamanı mövcud dueDate-i formata çevirib dolduraraq göstərir

### Supabase texniki problem haqqında
- "We are investigating a technical issue" yazısı Supabase status page-dən gəlir
- DB əlaqə xətaları olarsa Supabase status.supabase.com-u yoxla
- Kodda heç bir dəyişiklik lazım deyil, server tərəfli problemdir

### CSV Export nədir?
- `/api/classrooms/[id]/export` endpoint-i CSV fayl qaytarır
- Müəllim bu URL-ə GET sorğu atsın (brauzer avtomatik yükləyir):
  ```
  GET /api/classrooms/CLASS_ID/export
  ```
- CSV-də: tələbə adı, email, workspace adı, dil, status, qiymət notu, tarixlər
- Brauzer yükləmə pəncərəsi açır — Excel/Google Sheets-də açmaq olar
- **Frontend düyməsi hələ yoxdur** (TeacherView-da əlavə etmək lazımdır — gələcək iş)

---

✅ `npx next build` — 0 error, 0 warning

---

## Gələcək İşlər (hələ edilməyib)
1. **Frontend notification UI** — Navbar-da zəng ikonu, bildiriş paneli
2. **Frontend export düyməsi** — TeacherView-da CSV yükləmə düyməsi (endpoint hazırdır, sadəcə `<a href="/api/classrooms/${id}/export">` lazımdır)
3. **Vercel cron konfiqurasiyası** — `vercel.json`-da avtomatik cleanup
4. **WebSocket** — Real-time sinif yeniləmələri (polling əvəzinə)
5. **Redis-based rate limiter** — Production miqyası üçün
