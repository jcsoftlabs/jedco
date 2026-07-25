-- Contrainte d'exclusion anti double-booking (§1.3 du plan — le bug le plus
-- grave identifié dans le master prompt v1). Le flux "GET véhicules
-- disponibles → choisir → POST intervention" a une fenêtre de course : deux
-- dispatchers qui planifient le même camion à la même heure créent deux
-- interventions valides sur un véhicule unique. Rien côté application ne peut
-- fermer cette fenêtre de façon fiable (un check-then-act reste une course
-- même avec une transaction, sauf verrou explicite) — c'est la base de
-- données qui doit refuser, via une contrainte EXCLUDE USING gist qui détecte
-- le chevauchement au moment de l'INSERT, atomiquement, comme un index unique.
--
-- La plage horaire (colonne "periode") est calculée par trigger plutôt que
-- via une colonne GENERATED ALWAYS AS STORED : PostgreSQL refuse tstzrange()
-- dans une expression générée ("generation expression is not immutable"),
-- vérifié empiriquement sur cette migration. Un trigger BEFORE INSERT/UPDATE
-- n'a pas cette contrainte d'immutabilité et produit le même résultat.
--
-- ⚠️ MAINTENANCE : cette migration ajoute des colonnes, des triggers et des
-- contraintes EXCLUDE qui ne sont PAS déclarés dans schema.prisma (pas
-- d'équivalent dans le DSL Prisma). Ne jamais lancer `prisma migrate dev`
-- sans `--create-only` après celle-ci sans relire le SQL généré : Prisma ne
-- connaît pas ces objets et pourrait proposer de les supprimer en pensant
-- combler un écart de schéma.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── Véhicule : la plage horaire vit directement sur Intervention ───────────
-- (vehiculeId y est déjà une colonne, pas besoin de dénormalisation).

ALTER TABLE "Intervention" ADD COLUMN "periode" tstzrange;

CREATE OR REPLACE FUNCTION jed_calculer_periode_intervention()
RETURNS trigger AS $$
BEGIN
  NEW."periode" := CASE WHEN NEW."datePlanifiee" IS NOT NULL THEN
    tstzrange(
      NEW."datePlanifiee",
      NEW."datePlanifiee" + (COALESCE(NEW."dureeEstimeeMin", 60) * interval '1 minute'),
      '[)'
    )
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculer_periode_intervention
  BEFORE INSERT OR UPDATE OF "datePlanifiee", "dureeEstimeeMin" ON "Intervention"
  FOR EACH ROW EXECUTE FUNCTION jed_calculer_periode_intervention();

ALTER TABLE "Intervention"
  ADD CONSTRAINT "vehicule_pas_double_reserve"
  EXCLUDE USING gist ("vehiculeId" WITH =, "periode" WITH &&)
  WHERE (
    "vehiculeId" IS NOT NULL
    AND "deletedAt" IS NULL
    AND "statut" IN ('EN_ATTENTE', 'PLANIFIE', 'EN_COURS')
  );

-- ─── Technicien : la plage horaire est dénormalisée sur InterventionTechnicien ──
-- Une contrainte EXCLUDE ne peut porter que sur les colonnes d'une seule
-- table ; l'affectation technicien↔intervention vit dans une table de
-- jonction séparée qui n'a pas nativement de date. On y copie datePlanifiee/
-- dureeEstimeeMin/periode via triggers, synchronisés avec Intervention à
-- l'insertion et à chaque changement de planification.

ALTER TABLE "InterventionTechnicien" ADD COLUMN "datePlanifiee" timestamptz;
ALTER TABLE "InterventionTechnicien" ADD COLUMN "dureeEstimeeMin" integer;
ALTER TABLE "InterventionTechnicien" ADD COLUMN "periode" tstzrange;

-- À l'insertion d'une affectation technicien, copie la fenêtre effective de
-- l'intervention parente — NULL (donc hors contrainte) si l'intervention n'a
-- pas encore de date, ou si elle est déjà terminée/annulée/supprimée.
CREATE OR REPLACE FUNCTION jed_sync_intervention_technicien_periode()
RETURNS trigger AS $$
DECLARE
  v_date timestamptz;
  v_duree integer;
BEGIN
  SELECT
    CASE WHEN i."datePlanifiee" IS NOT NULL
              AND i."deletedAt" IS NULL
              AND i."statut" IN ('EN_ATTENTE', 'PLANIFIE', 'EN_COURS')
         THEN i."datePlanifiee" END,
    i."dureeEstimeeMin"
  INTO v_date, v_duree
  FROM "Intervention" i
  WHERE i.id = NEW."interventionId";

  NEW."datePlanifiee" := v_date;
  NEW."dureeEstimeeMin" := v_duree;
  NEW."periode" := CASE WHEN v_date IS NOT NULL THEN
    tstzrange(v_date, v_date + (COALESCE(v_duree, 60) * interval '1 minute'), '[)')
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_intervention_technicien_periode
  BEFORE INSERT ON "InterventionTechnicien"
  FOR EACH ROW EXECUTE FUNCTION jed_sync_intervention_technicien_periode();

-- Quand l'intervention parente change de date, durée, statut ou est
-- supprimée, répercute sur toutes les affectations techniciens existantes —
-- c'est CETTE mise à jour que la contrainte EXCLUDE ci-dessous valide, donc
-- reporter une intervention sur un créneau déjà pris par l'un de ses propres
-- techniciens est refusé au même titre qu'une création.
CREATE OR REPLACE FUNCTION jed_propagate_intervention_periode()
RETURNS trigger AS $$
DECLARE
  v_date timestamptz;
BEGIN
  v_date := CASE WHEN NEW."datePlanifiee" IS NOT NULL
                      AND NEW."deletedAt" IS NULL
                      AND NEW."statut" IN ('EN_ATTENTE', 'PLANIFIE', 'EN_COURS')
                 THEN NEW."datePlanifiee" END;

  UPDATE "InterventionTechnicien" it
  SET
    "datePlanifiee" = v_date,
    "dureeEstimeeMin" = NEW."dureeEstimeeMin",
    "periode" = CASE WHEN v_date IS NOT NULL THEN
      tstzrange(v_date, v_date + (COALESCE(NEW."dureeEstimeeMin", 60) * interval '1 minute'), '[)')
    END
  WHERE it."interventionId" = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_propagate_intervention_periode
  AFTER UPDATE OF "datePlanifiee", "dureeEstimeeMin", "statut", "deletedAt" ON "Intervention"
  FOR EACH ROW EXECUTE FUNCTION jed_propagate_intervention_periode();

ALTER TABLE "InterventionTechnicien"
  ADD CONSTRAINT "technicien_pas_double_reserve"
  EXCLUDE USING gist ("technicienId" WITH =, "periode" WITH &&);
