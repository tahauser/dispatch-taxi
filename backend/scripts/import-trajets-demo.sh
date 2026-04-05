#!/bin/bash
echo "==================================="
echo "  Import trajets démo"
echo "==================================="
read -p "Date de la journée (ex: 2026-04-07) : " DATE

if ! [[ $DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Format invalide. Utiliser YYYY-MM-DD"
  exit 1
fi

echo "Vidage + import trajets pour $DATE..."

sudo -u postgres psql -d dispatch_taxi << SQL

-- 1. Supprimer affectations de la journée cible
DELETE FROM affectations WHERE date_programme = '$DATE';

-- 2. Supprimer trajets de la journée cible
DELETE FROM trajets WHERE date_trajet = '$DATE';

-- 3. Insérer les trajets frais
INSERT INTO trajets (code_trajet, date_trajet, heure_prise, heure_arrivee, type_vehicule, adresse_prise, statut) VALUES
('TVT0001', '$DATE', '07:15', '08:12', 'TAXI',    '1800 Henri-Blaquiere RUE Chambly J3L 3E9', 'en_attente'),
('TVT0015', '$DATE', '08:00', '09:10', 'BERLINE',  '3355 Autoroute Laval H7T 0H4', 'en_attente'),
('TVT0002', '$DATE', '08:30', '09:15', 'TAXI',    '1000 Saint-Denis RUE Montreal H2X 0C1', 'en_attente'),
('TVT0003', '$DATE', '09:00', '10:05', 'BERLINE',  '730 Abbe-Theoret AV Sainte-Julie J3E 0E1', 'en_attente'),
('TVT0016', '$DATE', '09:30', '10:25', 'TAXI',    '730 Abbe-Theoret AV Sainte-Julie J3E 0E1', 'en_attente'),
('TVT0004', '$DATE', '10:30', '11:20', 'TAXI',    '1800 Henri-Blaquiere RUE Chambly J3L 3E9', 'en_attente'),
('TVT0005', '$DATE', '11:00', '11:55', 'TAXI',    '1730 Eiffel RUE Boucherville J4B 7W1', 'en_attente'),
('TVT0019', '$DATE', '12:30', '13:20', 'TAXI',    '227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8', 'en_attente'),
('TVT0021', '$DATE', '14:30', '15:15', 'TAXI',    '5515 Saint-Jacques Montreal H4A', 'en_attente'),
('TVT0023', '$DATE', '16:30', '17:25', 'TAXI',    '980 Rue Sagard Montreal H2C 2X1', 'en_attente'),
('TVT0011', '$DATE', '17:30', '18:20', 'TAXI',    '1730 Eiffel RUE Boucherville J4B 7W1', 'en_attente')
ON CONFLICT (code_trajet) DO UPDATE SET
  date_trajet = EXCLUDED.date_trajet,
  statut = 'en_attente';

-- Vérification
SELECT code_trajet, heure_prise, heure_arrivee, type_vehicule
FROM trajets
WHERE date_trajet = '$DATE'
ORDER BY heure_prise;

SQL

echo ""
echo "✅ 11 trajets importés pour $DATE"
echo "==================================="
