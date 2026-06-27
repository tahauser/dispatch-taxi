const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const APP_URL = process.env.APP_URL || 'http://dispatch-taxi.canadacentral.cloudapp.azure.com';

function fmtHeure(h) { return String(h||'').substring(0,5); }
function fmtDate(dateStr) {
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
  const d = new Date(dateStr+'T12:00:00');
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function genererTokenConsultation(chauffeur_id, date_programme) {
  return jwt.sign(
    { chauffeur_id, date_programme },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function envoyerProgramme(chauffeur, date) {
  const dateF  = fmtDate(date);
  const token  = genererTokenConsultation(chauffeur.chauffeur_id, date);
  const lien   = `${APP_URL}/consultation/${token}`;

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
    <div style="background:#1F4E79;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="color:white;margin:0;">Programme de dispatch</h1>
      <p style="color:#D6E4F0;margin:5px 0 0 0;">${dateF}</p>
    </div>
    <div style="background:#f8f9fa;padding:20px;border-left:4px solid #1F4E79;">
      <p>Bonjour <strong>${chauffeur.prenom} ${chauffeur.nom}</strong>,</p>
      <p>Votre programme pour le <strong>${dateF}</strong> est disponible — <strong>${chauffeur.trajets.length} trajet(s)</strong> vous ont été assignés.</p>
      <p>Cliquez sur le bouton ci-dessous pour consulter votre programme complet :</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${lien}"
           style="background:#1F4E79;color:white;padding:14px 32px;border-radius:8px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          📋 Consulter mon programme du ${dateF}
        </a>
      </div>
      <p style="color:#888;font-size:13px;">
        Ce lien est valable 7 jours et vous est réservé — ne le partagez pas.<br>
        Si le bouton ne fonctionne pas, copiez ce lien : <br>
        <span style="word-break:break-all;color:#1F4E79;">${lien}</span>
      </p>
    </div>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - système de dispatch.</p>
    </div>
  </body></html>`;

  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Votre programme du ${dateF} — ${chauffeur.prenom} ${chauffeur.nom}`,
    html
  });
  console.log(`Email programme envoye a ${chauffeur.email}`);
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
      <p>Vous avez indiqué vos disponibilités pour le <strong>${dateF}</strong>.</p>
      <p style="color:#E65100;font-weight:bold;">Aucun trajet ne vous a été assigné pour cette journée.</p>
      <p>Merci de votre disponibilité.</p>
    </div>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - système de dispatch.</p>
    </div>
  </body></html>`;
  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Programme du ${dateF} - Aucun trajet assigné`,
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
      <p>Nous n'avons pas reçu vos disponibilités pour le <strong>${dateF}</strong>.</p>
      <p style="color:#b71c1c;font-weight:bold;">Aucun trajet ne vous a donc été assigné pour cette journée.</p>
      <p>Pour les prochaines journées, merci de saisir vos disponibilités avant la deadline.</p>
    </div>
    <div style="background:#f8f9fa;padding:15px;margin-top:20px;font-size:12px;color:#666;">
      <p style="margin:0;">Message automatique - système de dispatch.</p>
    </div>
  </body></html>`;
  await transporter.sendMail({
    from: `"Dispatch Taxi" <${process.env.EMAIL_FROM}>`,
    to: chauffeur.email,
    subject: `Programme du ${dateF} - Aucune disponibilité reçue`,
    html
  });
  console.log(`Email aucune dispo envoye a ${chauffeur.email}`);
}

module.exports = { envoyerProgramme, envoyerAucunTrajet, envoyerAucuneDisponibilite, genererTokenConsultation };
