-- Aperta a canonicalizacao de e-mail para o comportamento real do PostgreSQL
-- de producao. Correcao para a frente da 0005, que nao pode ser reescrita:
-- ja foi publicada.
--
-- A 0005 assumiu que `\s` cobria todo espaco em branco. Nao cobre: `\s` e as
-- classes POSIX resolvem pela collation do banco, entao o que elas casam muda
-- com o ambiente. Na producao (PostgreSQL 17.11, UTF8) `\s` casa TAB, LF e CR
-- mas NAO casa NBSP -- medido la, e reproduzido aqui num banco com collation C.
-- Um endereco cercado de NBSP passaria pela restricao da 0005 enquanto o
-- trim() do JavaScript o removeria, e o app nunca reencontraria essa linha.
--
-- `btrim` com um conjunto explicito casa caracteres exatos e nao depende de
-- collation: mesmo resultado em qualquer ambiente. O conjunto cobre espaco,
-- TAB, LF, CR, VT, FF, NBSP (U+00A0) e BOM (U+FEFF); os dois invisiveis entram
-- por chr(), para nao ficarem embutidos e ilegiveis no fonte.
--
-- Nao e equivalencia exata ao TrimString do JavaScript, que tambem remove os
-- separadores Unicode (U+2000..U+200A, U+2028, U+2029, U+3000). Esses nao
-- chegam pela API -- o trim() do JS os remove antes da validacao -- e enumerar
-- todos deixaria a restricao ilegivel sem fechar nenhuma porta real.
--
-- As tres etapas abaixo usam a MESMA expressao. Uma guarda que definisse
-- canonico de outro jeito se declararia limpa e depois corromperia justamente
-- as linhas que deveria proteger.

-- 1. Recusa mexer em qualquer coisa se duas linhas colidirem sob a definicao
--    corrigida. Fundir contas e decisao de negocio -- paginas, midia e cota
--    pertencem a alguem -- entao aborta e deixa os dados como estavam.
DO $$
DECLARE
  grupos int;
BEGIN
  SELECT count(*) INTO grupos
  FROM (
    SELECT 1 FROM "users"
    GROUP BY lower(btrim("email", E' 	
' || chr(160) || chr(65279)))
    HAVING count(*) > 1
  ) c;

  IF grupos > 0 THEN
    RAISE EXCEPTION
      'Migracao abortada: % grupo(s) de e-mail colidem apos a canonicalizacao corrigida. Resolva manualmente antes de migrar; nenhuma linha foi alterada.',
      grupos;
  END IF;
END $$;
--> statement-breakpoint
-- 2. Traz as linhas existentes para a forma canonica corrigida. Um valor
--    canonico aqui tambem satisfaz a restricao da 0005, que ainda esta em pe
--    neste ponto, entao a ordem e segura.
UPDATE "users"
SET "email" = lower(btrim("email", E' 	
' || chr(160) || chr(65279)))
WHERE "email" <> lower(btrim("email", E' 	
' || chr(160) || chr(65279)));
--> statement-breakpoint
-- 3. Troca a restricao da 0005 pela corrigida.
ALTER TABLE "users" DROP CONSTRAINT "users_email_canonical";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_canonical" CHECK ("users"."email" = lower(btrim("users"."email", E' \t\n\r\v\f' || chr(160) || chr(65279))));
