const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

function fmtHeure(h) { return String(h||'').substring(0,5); }
function fmtDate(dateStr) {
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
  const d = new Date(dateStr+'T12:00:00');
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

async function envoyerProgramme(chauffeur, date) {
  const dateF = fmtDate(date);
  const lignes = chauffeur.trajets.map(t => `
    <tr style="border-bottom:1px solid #e0e0e0;">
      <td style="padding:10px;font-weight:bold;color:#1F4E79;">${t.code_trajet}</td>
      <td style="padding:10px;text-align:center;">${fmtHeure(t.heure_prise)}</td>
      <td style="padding:10px;text-align:center;">${fmtHeure(t.heure_arrivee)}</td>
      <td style="padding:10px;">${t.type_vehicule||'TAXI'}</td>
      <td style="padding:10px;">${t.adresse_prise}</td>
      <td style="padding:10px;color:#666;font-style:italic;">${t.notes||''}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
    <div style="background:#1F4E79;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="color:white;margin:0;">Programme de dispatch</h1>
      <p style="color:#D6E4F0;margin:5px 0 0 0;">${dateF}</p>
    </div>
    <div style="background:#f8f9fa;padding:20px;border-left:4px solid #1F4E79;">
      <p>Bonjour <strong>${chauffeur.prenom} ${chauffeur.nom}</strong>,</p>
      <p>Voici votre programme pour le <strong>${dateF}</strong> — <strong>${chauffeur.trajets.length} trajet(s)</strong>.</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:20px;">
      <thead><tr style="background:#1F4E79;color:white;">
        <th style="padding:12px;text-align:left;">Trajet</th>
        <th style="padding:12px;">Prise</th><th style="padding:12px;">Fin</th>
        <th style="padding:12px;text-align:left;">Vehicule</th>
        <th style="padding:12px;text-align:left;">Adresse de prise</th>
        <th style="padding:12px;text-align:left;">Notes</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
    </table>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - systeme de dispatch.</p>
    </div>
  </body></html>`;

  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Votre programme du ${dateF} - ${chauffeur.prenom} ${chauffeur.nom}`,
    html
  });
  console.log(`Email envoye a ${chauffeur.email}`);
}

async function envoyerAucunTrajet(chauffeur, date) {
  const dateF = fmtDate(date);
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
    <div style="background:#1F4E79;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="color:white;margin:0;">Programme de dispatch</h1>
      <p style="color:#D6E4F0;margin:5px 0 0 0;">${dateF}</p>
    </div>
    <div style="background:#fff8e1;padding:20px;border-left:4px solid #FFA000;">
      <p>Bonjour <strong>${chauffeur.prenom} ${chauffeur.nom}</strong>,</p>
      <p>Vous avez indique vos disponibilites pour le <strong>${dateF}</strong>.</p>
      <p style="color:#E65100;font-weight:bold;">Aucun trajet ne vous a ete assigne pour cette journee.</p>
      <p>Merci de votre disponibilite.</p>
    </div>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - systeme de dispatch.</p>
    </div>
  </body></html>`;
  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Programme du ${dateF} - Aucun trajet assigne`,
    html
  });
  console.log(`Email aucun trajet envoye a ${chauffeur.email}`);
}

async function envoyerAucuneDisponibilite(chauffeur, date) {
  const dateF = fmtDate(date);
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
    <div style="background:#1F4E79;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="color:white;margin:0;">Programme de dispatch</h1>
      <p style="color:#D6E4F0;margin:5px 0 0 0;">${dateF}</p>
    </div>
    <div style="background:#fce4ec;padding:20px;border-left:4px solid #e53935;">
      <p>Bonjour <strong>${chauffeur.prenom} ${chauffeur.nom}</strong>,</p>
      <p>Nous n'avons pas recu vos disponibilites pour le <strong>${dateF}</strong>.</p>
      <p style="color:#b71c1c;font-weight:bold;">Aucun trajet ne vous a donc ete assigne pour cette journee.</p>
      <p>Pour les prochaines journees, merci de saisir vos disponibilites avant la deadline.</p>
    </div>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - systeme de dispatch.</p>
    </div>
  </body></html>`;
  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Programme du ${dateF} - Aucune disponibilite recue`,
    html
  });
  console.log(`Email aucune dispo envoye a ${chauffeur.email}`);
}

module.exports = { envoyerProgramme, envoyerAucunTrajet, envoyerAucuneDisponibilite };
