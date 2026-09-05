-- Canonical e-mail identity: email = lower(trim(email)), where "trim" has to
-- mean the same thing the application means.
--
-- The obvious `btrim(email)` is NOT that: with a single argument it strips only
-- the ASCII space, so a raw insert padded with TAB, CR, LF or a non-breaking
-- space would pass the constraint while the application's `trim()` would have
-- removed it. In a UTF-8 database `\s` covers space, TAB, CR, LF, VT, FF, NBSP
-- and the Unicode separators -- every class JavaScript strips except U+FEFF.
-- Matching that last codepoint would mean embedding an invisible character in
-- the constraint definition, a worse trap than the gap it closes, and it cannot
-- arrive through the API, whose own trim() removes it before validation.
--
-- The three statements below MUST keep using the same expression. A guard that
-- defined canonical differently from the UPDATE would clear itself and then
-- corrupt exactly the rows it was meant to protect.
--
-- Production was audited read-only before this migration: 3 users, zero
-- non-canonical, zero collisions. Another environment may differ, so the guard
-- runs first and refuses to guess.

-- 1. Refuse to touch anything if two rows would collapse onto the same address.
--    Merging accounts is a business decision -- pages, media and quota belong to
--    someone -- so this aborts and leaves the data exactly as it was.
DO $$
DECLARE
  grupos int;
BEGIN
  SELECT count(*) INTO grupos
  FROM (
    SELECT 1 FROM "users"
    GROUP BY lower(regexp_replace("email", '^\s+|\s+$', '', 'g'))
    HAVING count(*) > 1
  ) c;

  IF grupos > 0 THEN
    RAISE EXCEPTION
      'Migracao abortada: % grupo(s) de e-mail colidem apos a canonicalizacao. Resolva manualmente antes de migrar; nenhuma linha foi alterada.',
      grupos;
  END IF;
END $$;
--> statement-breakpoint
-- 2. Bring existing rows to the canonical form.
UPDATE "users"
SET "email" = lower(regexp_replace("email", '^\s+|\s+$', '', 'g'))
WHERE "email" <> lower(regexp_replace("email", '^\s+|\s+$', '', 'g'));
--> statement-breakpoint
-- 3. Make it an invariant of the database, not just a habit of the code. With
--    every row canonical, the existing UNIQUE(email) is already the
--    case-insensitive uniqueness we want.
ALTER TABLE "users" ADD CONSTRAINT "users_email_canonical" CHECK ("users"."email" = lower(regexp_replace("users"."email", '^\s+|\s+$', '', 'g')));
