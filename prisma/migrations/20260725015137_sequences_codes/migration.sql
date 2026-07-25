-- Séquences PostgreSQL pour la génération de codes (§1.4 du plan).
--
-- Le master prompt v1 générait les codes via "lire le max, ajouter 1,
-- insérer" côté application : deux requêtes concurrentes lisent le même max
-- et produisent le même code (JED-0001 en double). Une SEQUENCE PostgreSQL
-- garantit l'atomicité de l'incrément au niveau de la base — nextval() ne
-- renvoie jamais deux fois la même valeur, même sous forte concurrence.
--
-- Chaque compteur est global et continu (jamais remis à zéro par année) :
-- un reset par année introduirait exactement la même classe de bug que la
-- borne de journée du §1.14 (frontière ambiguë, concurrence au moment du
-- changement). L'année affichée dans les codes CTR/INT/FAC est purement
-- informative, dérivée de la date de génération.

CREATE SEQUENCE IF NOT EXISTS jed_client_seq START 1;
CREATE SEQUENCE IF NOT EXISTS jed_contrat_seq START 1;
CREATE SEQUENCE IF NOT EXISTS jed_intervention_seq START 1;
CREATE SEQUENCE IF NOT EXISTS jed_facture_seq START 1;
CREATE SEQUENCE IF NOT EXISTS jed_technicien_seq START 1;
CREATE SEQUENCE IF NOT EXISTS jed_toilette_seq START 1;