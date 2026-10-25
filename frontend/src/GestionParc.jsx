import { useState, useEffect, useCallback } from 'react';
import api from './api';
import Avatar from './Avatar';
import VehiculeIcon from './VehiculeIcon';

const BLEU = '#1F4E79';
const TYPES = ['TAXI', 'BERLINE', 'VAN', 'MINIBUS'];
const STATUTS = { actif: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service' };
const STATUT_COULEUR = { actif: ['#e8f5e9', '#2e7d32'], maintenance: ['#fff3e0', '#E65100'], hors_service: ['#fce4ec', '#c62828'] };
const VIDE = { numero_unite: '', immatriculation: '', marque: '', modele: '', annee: '', couleur: '', type_vehicule: 'TAXI',
  nb_places: 4, kilometrage: '', statut: 'actif', date_assurance_exp: '', date_immat_exp: '', date_prochain_entretien: '', notes: '' };

const LIBELLES = { inspection: 'Inspection', assurance: 'Assurance', immatriculation: 'Immatriculation', entretien: 'Entretien' };
const TYPES_INSP = { periodique: 'Périodique', mecanique: 'Mécanique', securite: 'Sécurité', proprete: 'Propreté', apres_incident: 'Après incident' };
const RESULTATS = { conforme: ['Conforme', '#e8f5e9', '#2e7d32'], conforme_reserve: ['Avec réserve', '#fff3e0', '#E65100'], non_conforme: ['Non conforme', '#fce4ec', '#c62828'] };
const CHECK = [['freins', 'Freins'], ['pneus', 'Pneus'], ['feux', 'Feux et clignotants'], ['essuie_glaces', 'Essuie-glaces'],
  ['ceintures', 'Ceintures'], ['retroviseurs', 'Rétroviseurs'], ['extincteur', 'Extincteur / trousse'], ['enseigne', 'Enseigne / taximètre'],
  ['carrosserie', 'Carrosserie'], ['proprete', 'Propreté intérieure']];
const INSP_VIDE = { vehicule_id: '', type_inspection: 'periodique', date_inspection: '', date_prochaine: '', kilometrage: '',
  inspecteur: '', resultat: 'conforme', notes: '', checklist: Object.fromEntries(CHECK.map(([k]) => [k, true])) };

const aujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
const joursAvant = (d) => d ? Math.round((new Date(d + 'T12:00:00') - new Date(aujourdhui() + 'T12:00:00')) / 86400000) : null;

let HORIZON = 30; // délai max d'avertissement (réglé dans l'onglet Alertes)
function alertes(v) {
  const l = [];
  if (v.statut === 'actif' && !v.insp_date) l.push({ txt: 'Jamais inspecté', rouge: false });
  [['date_assurance_exp', 'Assurance'], ['date_immat_exp', 'Immat.'], ['date_prochain_entretien', 'Entretien'], ['insp_prochaine', 'Inspection']].forEach(([k, lib]) => {
    const j = joursAvant(v[k]);
    if (j === null) return;
    if (j < 0) l.push({ txt: `${lib} échu`, rouge: true });
    else if (j <= HORIZON) l.push({ txt: `${lib} dans ${j} j`, rouge: false });
  });
  return l;
}

const norm = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const contient = (champs, q) => !q.trim() || norm(champs.join(' ')).includes(norm(q).trim());

function Filtres({ q, setQ, placeholder, selects = [], total, affiche, onReset }) {
  const actif = q || selects.some(s => s.value);
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', background: '#f5f8fc', padding: '8px 10px', borderRadius: '8px' }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={'🔍 ' + placeholder}
        style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', minWidth: '230px', flex: '1 1 230px', maxWidth: '360px' }} />
      {selects.map(sel => (
        <select key={sel.label} value={sel.value} onChange={e => sel.set(e.target.value)} title={sel.label}
          style={{ padding: '7px 10px', border: `1px solid ${sel.value ? BLEU : '#ddd'}`, borderRadius: '6px', fontSize: '13px', background: sel.value ? '#e3edf7' : 'white' }}>
          <option value="">{sel.label} : tous</option>
          {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ))}
      {actif && <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '12px' }}>✕ Effacer</button>}
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>{affiche} / {total}</span>
    </div>
  );
}

const btn = (bg, color) => ({ background: bg, color, border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' });
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
const lbl = { display: 'block', marginBottom: '5px', fontWeight: 500, color: '#333', fontSize: '13px' };

function Modal({ titre, onClose, children, largeur = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: largeur, width: '92%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: BLEU, fontSize: '18px' }}>{titre}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function GestionParc() {
  const [onglet, setOnglet] = useState('vehicules');
  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [modalV, setModalV] = useState(null);       // { id?, ...champs }
  const [modalA, setModalA] = useState(null);       // { vehicule, chauffeur_id, date_debut, date_fin }
  const [inspections, setInspections] = useState([]);
  const [modalI, setModalI] = useState(null);
  const [filtreV, setFiltreV] = useState('');
  const [alParams, setAlParams] = useState(null);
  const [alApercu, setAlApercu] = useState(null);
  const [alJournal, setAlJournal] = useState([]);
  const [fv, setFv] = useState({ q: '', type: '', statut: '', occ: '', alerte: '' });
  const [fa, setFa] = useState({ q: '', etat: '', type: '' });
  const [fi, setFi] = useState({ q: '', resultat: '', etat: '', type: '' });
  const [prop, setProp] = useState(null);
  const [datePropo, setDatePropo] = useState(aujourdhui());
  const [choix, setChoix] = useState({});
  const [loading, setLoading] = useState(false);

  const affMsg = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 6000); };

  const charger = useCallback(async () => {
    try {
      const [v, c, a, i] = await Promise.all([
        api.get('/vehicules'), api.get('/chauffeurs'), api.get('/vehicules/affectations'), api.get('/vehicules/inspections'),
      ]);
      setVehicules(v.data); setChauffeurs(c.data); setAffectations(a.data); setInspections(i.data);
      try {
        const p = await api.get('/vehicules/parametres');
        HORIZON = Math.max(...p.data.jours, 1);
        setAlParams(prev => prev || { ...p.data, jours_txt: p.data.jours_avant });
      } catch { /* paramètres facultatifs */ }
    } catch { affMsg('Erreur de chargement', false); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function sauverVehicule(e) {
    e.preventDefault();
    const { id, ...champs } = modalV;
    try {
      if (id) await api.put(`/vehicules/${id}`, champs); else await api.post('/vehicules', champs);
      setModalV(null); affMsg(id ? '✓ Véhicule mis à jour' : '✓ Véhicule ajouté'); charger();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  async function sauverAffectation(e) {
    e.preventDefault();
    try {
      await api.post('/vehicules/affectations', {
        vehicule_id: modalA.vehicule.id, chauffeur_id: modalA.chauffeur_id,
        date_debut: modalA.date_debut, date_fin: modalA.date_fin || null,
      });
      setModalA(null); affMsg('✓ Affectation créée'); charger();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  async function sauverParams(e) {
    e.preventDefault();
    try {
      const r = await api.put('/vehicules/parametres', {
        jours_avant: alParams.jours_txt, heure_envoi: alParams.heure_envoi, actif: alParams.actif,
        notifier_admins: alParams.notifier_admins, notifier_chauffeurs: alParams.notifier_chauffeurs });
      HORIZON = Math.max(...r.data.jours, 1);
      setAlParams({ ...r.data, jours_txt: r.data.jours_avant });
      affMsg('✓ Paramètres enregistrés'); chargerAlertes();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  async function chargerAlertes() {
    try {
      const [a, j] = await Promise.all([api.get('/vehicules/alertes/apercu'), api.get('/vehicules/alertes/journal')]);
      setAlApercu(a.data); setAlJournal(j.data);
    } catch { affMsg('Erreur de chargement des alertes', false); }
  }

  async function executerAlertes() {
    if (!window.confirm('Envoyer maintenant les courriels d\'alerte (administrateurs et chauffeurs concernés) ?')) return;
    try {
      const r = await api.post('/vehicules/alertes/executer');
      const d = r.data;
      affMsg(d.alertes === 0 ? 'Rien à envoyer : aucune nouvelle échéance.' :
        `✓ ${d.alertes} alerte(s) — ${d.admins} courriel(s) admin, ${d.chauffeurs} courriel(s) chauffeur` + (d.erreurs.length ? ` — erreurs : ${d.erreurs[0]}` : ''), d.erreurs.length === 0);
      chargerAlertes();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  useEffect(() => { if (onglet === 'alertes') chargerAlertes(); }, [onglet]);

  async function sauverInspection(e) {
    e.preventDefault();
    try {
      const r = await api.post('/vehicules/inspections', modalI);
      setModalI(null);
      affMsg(r.data.retire_du_service ? '⚠️ Inspection enregistrée — véhicule retiré du service (non conforme)' : '✓ Inspection enregistrée', !r.data.retire_du_service);
      charger();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  async function supprimerInsp(i) {
    if (!window.confirm(`Supprimer l'inspection du ${i.date_inspection} (${i.numero_unite}) ?`)) return;
    try { await api.delete(`/vehicules/inspections/${i.id}`); charger(); } catch { affMsg('Erreur', false); }
  }

  async function liberer(affId, libelle) {
    if (!window.confirm(`Mettre fin à l'affectation de ${libelle} ?`)) return;
    try { await api.patch(`/vehicules/affectations/${affId}/terminer`, {}); affMsg('✓ Véhicule libéré'); charger(); }
    catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
  }

  async function supprimerAff(a) {
    if (!window.confirm(`Supprimer l'affectation ${a.numero_unite} → ${a.prenom} ${a.nom} ?`)) return;
    try { await api.delete(`/vehicules/affectations/${a.id}`); charger(); } catch { affMsg('Erreur', false); }
  }

  async function calculer() {
    setLoading(true);
    try {
      const r = await api.get(`/vehicules/proposition?date=${datePropo}`);
      setProp(r.data);
      setChoix(Object.fromEntries(r.data.propositions.map(p => [p.chauffeur.id, true])));
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
    setLoading(false);
  }

  async function appliquer() {
    const paires = prop.propositions.filter(p => choix[p.chauffeur.id])
      .map(p => ({ chauffeur_id: p.chauffeur.id, vehicule_id: p.vehicule.id }));
    if (!paires.length) return affMsg('Aucune paire sélectionnée', false);
    setLoading(true);
    try {
      const r = await api.post('/vehicules/proposition/appliquer', { date: prop.date, paires });
      affMsg(`✓ ${r.data.crees} affectation(s) créée(s)` + (r.data.echecs.length ? ` — ${r.data.echecs.length} échec(s) : ${r.data.echecs[0].message}` : ''), r.data.echecs.length === 0);
      await charger(); await calculer();
    } catch (err) { affMsg(err.response?.data?.message || 'Erreur', false); }
    setLoading(false);
  }

  const champ = (k, label, type = 'text', requis = false) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={lbl}>{label}{requis && ' *'}</label>
      <input type={type} value={modalV[k] ?? ''} required={requis} onChange={e => setModalV(m => ({ ...m, [k]: e.target.value }))} style={inp} />
    </div>
  );

  const nbLibres = vehicules.filter(v => v.statut === 'actif' && !v.aff_id).length;
  const nbAlertes = vehicules.filter(v => alertes(v).length).length;

  const vehFiltres = vehicules.filter(v =>
    contient([v.numero_unite, v.immatriculation, v.marque, v.modele, v.couleur, v.annee, v.ch_prenom, v.ch_nom, v.ch_numero], fv.q) &&
    (!fv.type || v.type_vehicule === fv.type) && (!fv.statut || v.statut === fv.statut) &&
    (!fv.occ || (fv.occ === 'libre' ? (v.statut === 'actif' && !v.aff_id) : !!v.aff_id)) &&
    (!fv.alerte || ((alertes(v).length > 0) === (fv.alerte === 'oui'))));
  const affFiltrees = affectations.filter(a => {
    const etat = a.en_cours ? 'en_cours' : (a.date_debut > aujourdhui() ? 'a_venir' : 'terminee');
    return contient([a.numero_unite, a.immatriculation, a.marque, a.modele, a.prenom, a.nom, a.numero_chauffeur], fa.q) &&
      (!fa.etat || etat === fa.etat) && (!fa.type || a.type_vehicule === fa.type);
  });

  const tabs = [['vehicules', '🚗 Véhicules'], ['affectations', '🔗 Affectations'], ['proposition', '✨ Proposition'], ['inspections', '🔍 Inspections'], ['alertes', '🔔 Alertes']];

  return (
    <div>
      {msg.text && <div style={{ background: msg.ok ? '#e8f5e9' : '#ffebee', color: msg.ok ? '#2e7d32' : '#c62828', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: '4px', marginBottom: 0 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setOnglet(id)}
            style={{ padding: '10px 22px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '14px',
              fontWeight: onglet === id ? 600 : 400, background: onglet === id ? 'white' : '#e0e9f3', color: onglet === id ? BLEU : '#555' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '0 10px 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '16px', overflowX: 'auto' }}>

        {/* ───────── Véhicules ───────── */}
        {onglet === 'vehicules' && (<>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button onClick={() => setModalV({ ...VIDE })} style={{ ...btn(BLEU, 'white'), padding: '9px 18px', fontSize: '14px', fontWeight: 600 }}>+ Nouveau véhicule</button>
            <button onClick={charger} style={{ ...btn('white', '#555'), border: '1px solid #ddd', padding: '9px 14px', fontSize: '14px' }}>Actualiser</button>
            <span style={{ color: '#666', fontSize: '13px' }}>{vehicules.length} véhicules · {nbLibres} libre(s){nbAlertes > 0 && ` · ⚠️ ${nbAlertes} avec échéance`}</span>
          </div>
          <Filtres q={fv.q} setQ={q => setFv(f => ({ ...f, q }))} placeholder="Unité, plaque, marque, modèle, chauffeur…"
            total={vehicules.length} affiche={vehFiltres.length} onReset={() => setFv({ q: '', type: '', statut: '', occ: '', alerte: '' })}
            selects={[
              { label: 'Type', value: fv.type, set: v => setFv(f => ({ ...f, type: v })), options: TYPES.map(t => [t, t]) },
              { label: 'Statut', value: fv.statut, set: v => setFv(f => ({ ...f, statut: v })), options: Object.entries(STATUTS) },
              { label: 'Affectation', value: fv.occ, set: v => setFv(f => ({ ...f, occ: v })), options: [['libre', 'Libres'], ['affecte', 'Affectés']] },
              { label: 'Échéances', value: fv.alerte, set: v => setFv(f => ({ ...f, alerte: v })), options: [['oui', 'Avec alerte'], ['non', 'Sans alerte']] },
            ]} />
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
            <thead><tr style={{ background: BLEU, color: 'white', textAlign: 'left' }}>
              {['Unité', 'Immat.', 'Véhicule', 'Type', 'Km', 'Statut', 'Chauffeur actuel', 'Échéances', 'Actions'].map(h => <th key={h} style={{ padding: '12px 12px', fontSize: '13px' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {vehFiltres.length === 0 && <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{vehicules.length === 0 ? 'Aucun véhicule — ajoutez le premier' : 'Aucun véhicule ne correspond aux filtres'}</td></tr>}
              {vehFiltres.map((v, i) => {
                const actif = v.statut === 'actif';
                const [bg, col] = STATUT_COULEUR[v.statut] || STATUT_COULEUR.actif;
                return (
                  <tr key={v.id} style={{ background: !actif ? '#ececec' : i % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee', color: actif ? undefined : '#8a8a8a' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: actif ? BLEU : '#8a8a8a' }}>{v.numero_unite}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{v.immatriculation}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>{[v.marque, v.modele].filter(Boolean).join(' ')}<div style={{ color: '#999', fontSize: '11px' }}>{[v.annee, v.couleur].filter(Boolean).join(' · ')}</div></td>
                    <td style={{ padding: '10px 12px' }}><VehiculeIcon type={v.type_vehicule} size={24} style={{ filter: actif ? 'none' : 'grayscale(1)' }} /></td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>{v.kilometrage != null ? Number(v.kilometrage).toLocaleString('fr-CA') : '—'}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ background: bg, color: col, padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{STATUTS[v.statut]}</span></td>
                    <td style={{ padding: '10px 12px' }}>
                      {v.aff_id
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <Avatar ch={{ numero_chauffeur: v.ch_numero, prenom: v.ch_prenom, nom: v.ch_nom, photo: v.ch_photo }} size={26} />
                            {v.ch_prenom} {v.ch_nom}
                          </span>
                        : <span style={{ color: '#999', fontSize: '13px' }}>{actif ? 'Libre' : '—'}</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {alertes(v).map(a => <div key={a.txt} style={{ fontSize: '11px', color: a.rouge ? '#c62828' : '#E65100', fontWeight: 600 }}>⚠️ {a.txt}</div>)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => setModalV({ ...VIDE, ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? ''])) })} style={btn('#e3f2fd', '#1565c0')}>Modifier</button>
                        {actif && !v.aff_id && <button onClick={() => setModalA({ vehicule: v, chauffeur_id: '', date_debut: aujourdhui(), date_fin: '' })} style={btn('#e8f5e9', '#2e7d32')}>Affecter</button>}
                        {v.aff_id && <button onClick={() => liberer(v.aff_id, `${v.numero_unite} (${v.ch_prenom} ${v.ch_nom})`)} style={btn('#fff3e0', '#E65100')}>Libérer</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>)}

        {/* ───────── Affectations ───────── */}
        {onglet === 'affectations' && (<>
          <Filtres q={fa.q} setQ={q => setFa(f => ({ ...f, q }))} placeholder="Véhicule, chauffeur, marque…"
            total={affectations.length} affiche={affFiltrees.length} onReset={() => setFa({ q: '', etat: '', type: '' })}
            selects={[
              { label: 'État', value: fa.etat, set: v => setFa(f => ({ ...f, etat: v })), options: [['en_cours', 'En cours'], ['a_venir', 'À venir'], ['terminee', 'Terminées']] },
              { label: 'Type', value: fa.type, set: v => setFa(f => ({ ...f, type: v })), options: TYPES.map(t => [t, t]) },
            ]} />
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead><tr style={{ background: BLEU, color: 'white', textAlign: 'left' }}>
              {['Véhicule', 'Chauffeur', 'Du', 'Au', 'État', 'Actions'].map(h => <th key={h} style={{ padding: '12px', fontSize: '13px' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {affFiltrees.length === 0 && <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{affectations.length === 0 ? 'Aucune affectation' : 'Aucune affectation ne correspond aux filtres'}</td></tr>}
              {affFiltrees.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee', color: a.en_cours ? undefined : '#888' }}>
                  <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><VehiculeIcon type={a.type_vehicule} size={20} /><b style={{ color: BLEU }}>{a.numero_unite}</b> <span style={{ fontSize: '12px', color: '#777' }}>{a.marque} {a.modele}</span></span></td>
                  <td style={{ padding: '10px 12px' }}>{a.prenom} {a.nom} <span style={{ color: '#999', fontSize: '12px' }}>N°{a.numero_chauffeur}</span></td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{a.date_debut}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{a.date_fin || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: a.en_cours ? '#e8f5e9' : '#f0f0f0', color: a.en_cours ? '#2e7d32' : '#777', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{a.en_cours ? 'En cours' : (a.date_debut > aujourdhui() ? 'À venir' : 'Terminée')}</span></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(a.en_cours || a.date_debut > aujourdhui()) && !a.date_fin && <button onClick={() => liberer(a.id, `${a.numero_unite} (${a.prenom} ${a.nom})`)} style={btn('#fff3e0', '#E65100')}>Terminer</button>}
                      <button onClick={() => supprimerAff(a)} style={btn('#fce4ec', '#c62828')}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}

        {/* ───────── Proposition ───────── */}
        {onglet === 'proposition' && (<>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>À partir du</label>
            <input type="date" value={datePropo} onChange={e => setDatePropo(e.target.value)} style={{ ...inp, width: 'auto' }} />
            <button onClick={calculer} disabled={loading} style={{ ...btn(BLEU, 'white'), padding: '9px 18px', fontSize: '14px', fontWeight: 600 }}>✨ Proposer des affectations</button>
          </div>
          <p style={{ color: '#777', fontSize: '12px', margin: '0 0 14px' }}>
            Apparie les chauffeurs actifs sans véhicule avec les véhicules en service libres du même type. Priorité aux véhicules déjà conduits par le chauffeur, puis aux plus récents.
          </p>
          {prop && (<>
            {prop.propositions.length === 0
              ? <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Aucune proposition : tous les chauffeurs ont déjà un véhicule, ou aucun véhicule libre correspondant.</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                  <thead><tr style={{ background: BLEU, color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '12px', width: '40px' }}>
                      <input type="checkbox" checked={prop.propositions.every(p => choix[p.chauffeur.id])}
                        onChange={e => setChoix(Object.fromEntries(prop.propositions.map(p => [p.chauffeur.id, e.target.checked])))} />
                    </th>
                    {['Chauffeur', 'Véhicule proposé', 'Pourquoi'].map(h => <th key={h} style={{ padding: '12px', fontSize: '13px' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {prop.propositions.map((p, i) => (
                      <tr key={p.chauffeur.id} style={{ background: i % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 12px' }}><input type="checkbox" checked={!!choix[p.chauffeur.id]} onChange={e => setChoix(c => ({ ...c, [p.chauffeur.id]: e.target.checked }))} /></td>
                        <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Avatar ch={p.chauffeur} size={30} />{p.chauffeur.prenom} {p.chauffeur.nom} <span style={{ color: '#999', fontSize: '12px' }}>N°{p.chauffeur.numero_chauffeur}</span></span></td>
                        <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><VehiculeIcon type={p.vehicule.type_vehicule} size={22} /><b style={{ color: BLEU }}>{p.vehicule.numero_unite}</b><span style={{ fontSize: '12px', color: '#777' }}>{p.vehicule.marque} {p.vehicule.modele} {p.vehicule.annee} · {p.vehicule.immatriculation}</span></span></td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555' }}>{p.raisons.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
            {prop.propositions.length > 0 && (
              <button onClick={appliquer} disabled={loading} style={{ ...btn('#2e7d32', 'white'), padding: '10px 22px', fontSize: '14px', fontWeight: 600, marginTop: '14px' }}>
                ✓ Appliquer la sélection ({prop.propositions.filter(p => choix[p.chauffeur.id]).length})
              </button>)}
            {prop.chauffeurs_sans_vehicule.length > 0 && (
              <div style={{ marginTop: '16px', background: '#fff8e1', borderLeft: '4px solid #FFA000', padding: '10px 14px', fontSize: '13px' }}>
                <b>Sans véhicule correspondant :</b> {prop.chauffeurs_sans_vehicule.map(c => `${c.prenom} ${c.nom} (${c.type_vehicule || 'TAXI'})`).join(', ')}
              </div>)}
            {prop.vehicules_libres.length > 0 && (
              <div style={{ marginTop: '10px', background: '#f0f4f8', borderLeft: `4px solid ${BLEU}`, padding: '10px 14px', fontSize: '13px' }}>
                <b>Véhicules restés libres :</b> {prop.vehicules_libres.map(v => `${v.numero_unite} (${v.type_vehicule})`).join(', ')}
              </div>)}
          </>)}
        </>)}

        {/* ───────── Inspections ───────── */}
        {onglet === 'inspections' && (() => {
          const auj = aujourdhui();
          const enRetard = vehicules.filter(v => v.statut === 'actif' && (!v.insp_date || (v.insp_prochaine && v.insp_prochaine < auj)));
          const bientot = vehicules.filter(v => v.statut === 'actif' && v.insp_prochaine && v.insp_prochaine >= auj && joursAvant(v.insp_prochaine) <= 30);
          const etatInsp = (v) => {
            const j = joursAvant(v.insp_prochaine);
            if (v.statut !== 'actif') return 'hors';
            if (!v.insp_date) return 'jamais';
            if (j !== null && j < 0) return 'retard';
            if (j !== null && j <= 30) return 'bientot';
            return 'ajour';
          };
          const suiviFiltre = vehicules.filter(v =>
            contient([v.numero_unite, v.immatriculation, v.marque, v.modele], fi.q) &&
            (!fi.type || v.type_vehicule === fi.type) && (!fi.etat || etatInsp(v) === fi.etat) &&
            (!fi.resultat || v.insp_resultat === fi.resultat));
          const hist = inspections.filter(i => (!filtreV || i.vehicule_id === filtreV) &&
            contient([i.numero_unite, i.immatriculation, i.marque, i.modele, i.inspecteur, i.notes, TYPES_INSP[i.type_inspection]], fi.q) &&
            (!fi.type || i.type_vehicule === fi.type) && (!fi.resultat || i.resultat === fi.resultat));
          const nouvelle = (vid = '') => setModalI({ ...INSP_VIDE, vehicule_id: vid, date_inspection: auj, checklist: { ...INSP_VIDE.checklist } });
          return (<>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => nouvelle()} style={{ ...btn(BLEU, 'white'), padding: '9px 18px', fontSize: '14px', fontWeight: 600 }}>+ Nouvelle inspection</button>
              <span style={{ background: enRetard.length ? '#fce4ec' : '#e8f5e9', color: enRetard.length ? '#c62828' : '#2e7d32', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {enRetard.length} en retard / jamais inspecté(s)</span>
              <span style={{ background: bientot.length ? '#fff3e0' : '#f0f4f8', color: bientot.length ? '#E65100' : '#666', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {bientot.length} à faire sous 30 jours</span>
            </div>

            <Filtres q={fi.q} setQ={q => setFi(f => ({ ...f, q }))} placeholder="Véhicule, plaque, inspecteur, notes…"
              total={vehicules.length} affiche={suiviFiltre.length} onReset={() => setFi({ q: '', resultat: '', etat: '', type: '' })}
              selects={[
                { label: 'État', value: fi.etat, set: v => setFi(f => ({ ...f, etat: v })), options: [['retard', 'En retard'], ['jamais', 'Jamais inspecté'], ['bientot', 'Sous 30 jours'], ['ajour', 'À jour'], ['hors', 'Hors service']] },
                { label: 'Résultat', value: fi.resultat, set: v => setFi(f => ({ ...f, resultat: v })), options: Object.entries(RESULTATS).map(([k, [l]]) => [k, l]) },
                { label: 'Type', value: fi.type, set: v => setFi(f => ({ ...f, type: v })), options: TYPES.map(t => [t, t]) },
              ]} />
            <h3 style={{ color: BLEU, fontSize: '15px', margin: '0 0 8px' }}>Suivi par véhicule</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px', marginBottom: '24px' }}>
              <thead><tr style={{ background: BLEU, color: 'white', textAlign: 'left' }}>
                {['Véhicule', 'Dernière inspection', 'Résultat', 'Prochaine', 'État', ''].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: '13px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {suiviFiltre.map((v, i) => {
                  const j = joursAvant(v.insp_prochaine);
                  const etat = v.statut !== 'actif' ? ['Hors service', '#888', '#f0f0f0']
                    : !v.insp_date ? ['Jamais inspecté', '#c62828', '#fce4ec']
                    : j !== null && j < 0 ? [`En retard de ${-j} j`, '#c62828', '#fce4ec']
                    : j !== null && j <= 30 ? [`Dans ${j} j`, '#E65100', '#fff3e0']
                    : ['À jour', '#2e7d32', '#e8f5e9'];
                  const res = RESULTATS[v.insp_resultat];
                  return (
                    <tr key={v.id} style={{ background: i % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '9px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><VehiculeIcon type={v.type_vehicule} size={20} /><b style={{ color: BLEU }}>{v.numero_unite}</b><span style={{ fontSize: '12px', color: '#777' }}>{v.marque} {v.modele}</span></span></td>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{v.insp_date || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{res ? <span style={{ background: res[1], color: res[2], padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{res[0]}</span> : '—'}</td>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{v.insp_prochaine || '—'}</td>
                      <td style={{ padding: '9px 12px' }}><span style={{ background: etat[2], color: etat[1], padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{etat[0]}</span></td>
                      <td style={{ padding: '9px 12px' }}>{v.statut === 'actif' && <button onClick={() => nouvelle(v.id)} style={btn('#e3f2fd', '#1565c0')}>Inspecter</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h3 style={{ color: BLEU, fontSize: '15px', margin: 0 }}>Historique</h3>
              <select value={filtreV} onChange={e => setFiltreV(e.target.value)} style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
                <option value="">Tous les véhicules</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.numero_unite}</option>)}
              </select>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead><tr style={{ background: '#e0e9f3', textAlign: 'left' }}>
                {['Date', 'Véhicule', 'Type', 'Résultat', 'Km', 'Inspecteur', 'Points non conformes / notes', ''].map(h => <th key={h} style={{ padding: '9px 12px', fontSize: '12px', color: '#555' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {hist.length === 0 && <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Aucune inspection enregistrée</td></tr>}
                {hist.map((i, k) => {
                  const res = RESULTATS[i.resultat] || RESULTATS.conforme;
                  const ko = i.checklist ? CHECK.filter(([c]) => i.checklist[c] === false).map(([, l]) => l) : [];
                  return (
                    <tr key={i.id} style={{ background: k % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{i.date_inspection}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: BLEU }}>{i.numero_unite}</td>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{TYPES_INSP[i.type_inspection] || i.type_inspection}</td>
                      <td style={{ padding: '9px 12px' }}><span style={{ background: res[1], color: res[2], padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{res[0]}</span></td>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{i.kilometrage != null ? Number(i.kilometrage).toLocaleString('fr-CA') : '—'}</td>
                      <td style={{ padding: '9px 12px', fontSize: '13px' }}>{i.inspecteur || '—'}</td>
                      <td style={{ padding: '9px 12px', fontSize: '12px', color: '#555' }}>{ko.length ? <b style={{ color: '#c62828' }}>{ko.join(', ')}</b> : null}{ko.length && i.notes ? ' — ' : ''}{i.notes}</td>
                      <td style={{ padding: '9px 12px' }}><button onClick={() => supprimerInsp(i)} style={btn('#fce4ec', '#c62828')}>Supprimer</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>);
        })()}

        {/* ───────── Alertes ───────── */}
        {onglet === 'alertes' && alParams && (<>
          <form onSubmit={sauverParams} style={{ background: '#f5f8fc', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <h3 style={{ color: BLEU, fontSize: '15px', margin: '0 0 12px' }}>Paramètres des alertes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'end' }}>
              <div><label style={lbl}>Prévenir à l'avance (jours, séparés par des virgules)</label>
                <input value={alParams.jours_txt} onChange={e => setAlParams(p => ({ ...p, jours_txt: e.target.value }))} placeholder="30, 14, 7, 1" style={inp} /></div>
              <div><label style={lbl}>Heure d'envoi quotidien (heure de Montréal)</label>
                <select value={alParams.heure_envoi} onChange={e => setAlParams(p => ({ ...p, heure_envoi: Number(e.target.value) }))} style={inp}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')} h 00</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', margin: '14px 0', fontSize: '14px' }}>
              {[['actif', 'Alertes activées'], ['notifier_admins', 'Prévenir les administrateurs / dispatch'], ['notifier_chauffeurs', 'Prévenir le chauffeur du véhicule']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!alParams[k]} onChange={e => setAlParams(p => ({ ...p, [k]: e.target.checked }))} />{l}</label>))}
            </div>
            <p style={{ fontSize: '12px', color: '#777', margin: '0 0 12px' }}>
              Chaque seuil n'est envoyé qu'une fois par échéance. Une échéance dépassée est rappelée chaque jour jusqu'à sa mise à jour.
              Couvre l'inspection, l'assurance, l'immatriculation et l'entretien des véhicules en service.
            </p>
            <button type="submit" style={{ ...btn(BLEU, 'white'), padding: '9px 22px', fontSize: '14px', fontWeight: 600 }}>Enregistrer</button>
          </form>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            <h3 style={{ color: BLEU, fontSize: '15px', margin: 0 }}>À envoyer au prochain contrôle</h3>
            <button onClick={chargerAlertes} style={{ ...btn('white', '#555'), border: '1px solid #ddd', padding: '6px 12px', fontSize: '13px' }}>Actualiser</button>
            <button onClick={executerAlertes} disabled={!alApercu || alApercu.aEnvoyer.length === 0}
              style={{ ...btn('#E65100', 'white'), padding: '7px 14px', fontSize: '13px', fontWeight: 600, opacity: alApercu && alApercu.aEnvoyer.length ? 1 : 0.5 }}>
              📧 Envoyer maintenant</button>
          </div>
          {(() => {
            const ligne = (a, k) => (
              <tr key={a.vehicule_id + a.type + a.date} style={{ background: k % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 12px' }}><b style={{ color: BLEU }}>{a.numero_unite}</b> <span style={{ fontSize: '12px', color: '#777' }}>{a.vehicule}</span></td>
                <td style={{ padding: '8px 12px', fontSize: '13px' }}>{a.libelle}</td>
                <td style={{ padding: '8px 12px', fontSize: '13px' }}>{a.date}</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: a.jours < 0 ? '#c62828' : '#E65100' }}>{a.jours < 0 ? `En retard de ${-a.jours} j` : a.jours === 0 ? "Aujourd'hui" : `Dans ${a.jours} j`}</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', color: a.chauffeur ? '#333' : '#999' }}>{a.chauffeur || 'Libre (admin seulement)'}</td>
              </tr>);
            const tete = ['Véhicule', 'Échéance', 'Date', 'Délai', 'Chauffeur prévenu'];
            const th = (<thead><tr style={{ background: '#e0e9f3', textAlign: 'left' }}>{tete.map(h => <th key={h} style={{ padding: '8px 12px', fontSize: '12px', color: '#555' }}>{h}</th>)}</tr></thead>);
            return (<>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', marginBottom: '22px' }}>{th}<tbody>
                {!alApercu ? <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Chargement…</td></tr>
                  : alApercu.aEnvoyer.length === 0 ? <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#2e7d32' }}>✓ Aucune nouvelle alerte à envoyer</td></tr>
                  : alApercu.aEnvoyer.map(ligne)}</tbody></table>
              <h3 style={{ color: BLEU, fontSize: '15px', margin: '0 0 8px' }}>Échéances à venir (hors seuils)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', marginBottom: '22px' }}>{th}<tbody>
                {alApercu && alApercu.aVenir.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Aucune</td></tr>}
                {alApercu && alApercu.aVenir.slice(0, 40).map(ligne)}</tbody></table>
            </>);
          })()}
          <h3 style={{ color: BLEU, fontSize: '15px', margin: '0 0 8px' }}>Journal des envois (100 derniers)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead><tr style={{ background: '#e0e9f3', textAlign: 'left' }}>{['Envoyé le', 'Véhicule', 'Échéance', 'Date', 'Jours restants'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: '12px', color: '#555' }}>{h}</th>)}</tr></thead>
            <tbody>
              {alJournal.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Aucun envoi pour le moment</td></tr>}
              {alJournal.map((j, k) => (
                <tr key={k} style={{ background: k % 2 ? 'white' : '#fafafa', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <td style={{ padding: '8px 12px' }}>{new Date(j.envoye_le).toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: BLEU }}>{j.numero_unite}</td>
                  <td style={{ padding: '8px 12px' }}>{LIBELLES[j.type_echeance] || j.type_echeance}</td>
                  <td style={{ padding: '8px 12px' }}>{j.date_echeance}</td>
                  <td style={{ padding: '8px 12px' }}>{j.jours_restants < 0 ? `retard ${-j.jours_restants} j` : `${j.jours_restants} j`}</td>
                </tr>))}
            </tbody>
          </table>
        </>)}
      </div>

      {/* Modal véhicule */}
      {modalV && (
        <Modal titre={modalV.id ? 'Modifier le véhicule' : 'Nouveau véhicule'} onClose={() => setModalV(null)}>
          <form onSubmit={sauverVehicule}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              {champ('numero_unite', 'N° d\'unité', 'text', true)}
              {champ('immatriculation', 'Immatriculation', 'text', true)}
              {champ('marque', 'Marque')}
              {champ('modele', 'Modèle')}
              {champ('annee', 'Année', 'number')}
              {champ('couleur', 'Couleur')}
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Type</label>
                <select value={modalV.type_vehicule} onChange={e => setModalV(m => ({ ...m, type_vehicule: e.target.value }))} style={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              {champ('nb_places', 'Places', 'number')}
              {champ('kilometrage', 'Kilométrage', 'number')}
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Statut</label>
                <select value={modalV.statut} onChange={e => setModalV(m => ({ ...m, statut: e.target.value }))} style={inp}>{Object.entries(STATUTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              {champ('date_assurance_exp', 'Échéance assurance', 'date')}
              {champ('date_immat_exp', 'Échéance immatriculation', 'date')}
              {champ('date_prochain_entretien', 'Prochain entretien', 'date')}
            </div>
            {modalV.statut !== 'actif' && modalV.id && <p style={{ fontSize: '12px', color: '#E65100' }}>Un véhicule hors service met fin à son affectation en cours.</p>}
            {champ('notes', 'Notes')}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalV(null)} style={{ ...btn('#f0f0f0', '#555'), padding: '9px 18px', fontSize: '14px' }}>Annuler</button>
              <button type="submit" style={{ ...btn(BLEU, 'white'), padding: '9px 22px', fontSize: '14px', fontWeight: 600 }}>Enregistrer</button>
            </div>
          </form>
        </Modal>)}

      {/* Modal affectation */}
      {modalA && (
        <Modal titre={`Affecter ${modalA.vehicule.numero_unite}`} onClose={() => setModalA(null)} largeur={440}>
          <form onSubmit={sauverAffectation}>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Chauffeur *</label>
              <select required value={modalA.chauffeur_id} onChange={e => setModalA(m => ({ ...m, chauffeur_id: e.target.value }))} style={inp}>
                <option value="">— choisir —</option>
                {chauffeurs.filter(c => c.actif).map(c => <option key={c.id} value={c.id}>{c.numero_chauffeur} — {c.prenom} {c.nom} ({c.type_vehicule || 'TAXI'})</option>)}
              </select></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Du *</label><input type="date" required value={modalA.date_debut} onChange={e => setModalA(m => ({ ...m, date_debut: e.target.value }))} style={inp} /></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Au (facultatif)</label><input type="date" value={modalA.date_fin} onChange={e => setModalA(m => ({ ...m, date_fin: e.target.value }))} style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalA(null)} style={{ ...btn('#f0f0f0', '#555'), padding: '9px 18px', fontSize: '14px' }}>Annuler</button>
              <button type="submit" style={{ ...btn(BLEU, 'white'), padding: '9px 22px', fontSize: '14px', fontWeight: 600 }}>Affecter</button>
            </div>
          </form>
        </Modal>)}

      {/* Modal inspection */}
      {modalI && (
        <Modal titre="Nouvelle inspection" onClose={() => setModalI(null)} largeur={620}>
          <form onSubmit={sauverInspection}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Véhicule *</label>
                <select required value={modalI.vehicule_id} onChange={e => setModalI(m => ({ ...m, vehicule_id: e.target.value }))} style={inp}>
                  <option value="">— choisir —</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.numero_unite} — {v.marque} {v.modele}</option>)}
                </select></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Type</label>
                <select value={modalI.type_inspection} onChange={e => setModalI(m => ({ ...m, type_inspection: e.target.value }))} style={inp}>
                  {Object.entries(TYPES_INSP).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Date *</label>
                <input type="date" required value={modalI.date_inspection} onChange={e => setModalI(m => ({ ...m, date_inspection: e.target.value }))} style={inp} /></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Prochaine inspection</label>
                <input type="date" value={modalI.date_prochaine} onChange={e => setModalI(m => ({ ...m, date_prochaine: e.target.value }))} style={inp} /></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Kilométrage</label>
                <input type="number" value={modalI.kilometrage} onChange={e => setModalI(m => ({ ...m, kilometrage: e.target.value }))} style={inp} /></div>
              <div style={{ marginBottom: '12px' }}><label style={lbl}>Inspecteur / garage</label>
                <input value={modalI.inspecteur} onChange={e => setModalI(m => ({ ...m, inspecteur: e.target.value }))} style={inp} /></div>
            </div>
            <label style={lbl}>Points vérifiés (décochez ce qui est défectueux)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '6px', marginBottom: '12px' }}>
              {CHECK.map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: `1px solid ${modalI.checklist[k] ? '#c8e6c9' : '#ef9a9a'}`, borderRadius: '6px', background: modalI.checklist[k] ? '#f1f8f1' : '#fdecea', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!modalI.checklist[k]} onChange={e => setModalI(m => ({ ...m, checklist: { ...m.checklist, [k]: e.target.checked } }))} />{l}
                </label>
              ))}
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Résultat</label>
              <select value={modalI.resultat} onChange={e => setModalI(m => ({ ...m, resultat: e.target.value }))} style={inp}>
                {Object.entries(RESULTATS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
              {modalI.resultat === 'non_conforme' && <p style={{ fontSize: '12px', color: '#c62828', margin: '6px 0 0' }}>⚠️ Non conforme : le véhicule passera en maintenance et son affectation en cours prendra fin.</p>}
            </div>
            <div style={{ marginBottom: '14px' }}><label style={lbl}>Notes</label>
              <input value={modalI.notes} onChange={e => setModalI(m => ({ ...m, notes: e.target.value }))} style={inp} /></div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalI(null)} style={{ ...btn('#f0f0f0', '#555'), padding: '9px 18px', fontSize: '14px' }}>Annuler</button>
              <button type="submit" style={{ ...btn(BLEU, 'white'), padding: '9px 22px', fontSize: '14px', fontWeight: 600 }}>Enregistrer</button>
            </div>
          </form>
        </Modal>)}
    </div>
  );
}
