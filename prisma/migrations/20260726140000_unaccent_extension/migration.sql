-- Recherche admin insensible aux accents côté serveur (Clients, Factures,
-- Devis, Interventions) : équivalent serveur de la normalisation NFD faite
-- côté client dans TableauFiltrable.tsx, indispensable pour les noms
-- haïtiens/français accentués saisis sans accent.
CREATE EXTENSION IF NOT EXISTS unaccent;
