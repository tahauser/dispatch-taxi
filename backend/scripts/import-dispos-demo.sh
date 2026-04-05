#!/bin/bash
echo "==================================="
echo "  Import disponibilités démo"
echo "==================================="
read -p "Date de la journée (ex: 2026-04-07) : " DATE

if ! [[ $DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Format invalide. Utiliser YYYY-MM-DD"
  exit 1
fi

echo "Importing disponibilités pour $DATE..."

sudo -u postgres psql -d dispatch_taxi << SQL
DELETE FROM disponibilites WHERE date_dispo = '$DATE' AND chauffeur_id IN (SELECT id FROM chauffeurs WHERE numero_chauffeur IN ('015','034','012','021','041','055'));
INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin) SELECT id, '$DATE', '06:00', '12:00' FROM chauffeurs WHERE numero_chauffeur = '012';
INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin) SELECT id, '$DATE', '14:00', '22:00' FROM chauffeurs WHERE numero_chauffeur = '021';
INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin) SELECT id, '$DATE', '10:00', '19:00' FROM chauffeurs WHERE numero_chauffeur = '041';
INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin) SELECT id, '$DATE', '07:00', '11:00' FROM chauffeurs WHERE numero_chauffeur = '055';
INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin) SELECT id, '$DATE', '18:00', '23:00' FROM chauffeurs WHERE numero_chauffeur = '055';
SELECT c.numero_chauffeur, c.prenom, d.heure_debut, d.heure_fin FROM disponibilites d JOIN chauffeurs c ON c.id = d.chauffeur_id WHERE d.date_dispo = '$DATE' ORDER BY c.numero_chauffeur, d.heure_debut;
SQL

echo "✅ Disponibilités importées pour $DATE"
echo "   009 Hatim  — non touché"
echo "   015 Sophie — vidée"
echo "   034 Marie  — vidée"
echo "   012 Marc   — 06h-12h"
echo "   021 Pierre — 14h-22h"
echo "   041 Luc    — 10h-19h"
echo "   055 Julie  — 07h-11h + 18h-23h"
