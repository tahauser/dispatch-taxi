import { useState, useEffect, useRef } from 'react';
import api from './api';

const BLEU      = '#1F4E79';
const HEURES    = Array.from({length: 18}, (_, i) => i + 6);
const HAUTEUR_H = 48;
const HAUTEUR_HEADER = 120;
const LARGEUR_C = 200;
const W_HEURE   = 50;
const W_ATTENTE = 160;
const COULEURS  = ['#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336',
                   '#00BCD4','#FF5722','#607D8B','#E91E63','#3F51B5'];

function fmt(h) { return String(h||'').substring(0,5); }
function toMin(t) {
  if (!t) return 0;
  const p = String(t).split(':');
  return Number(p[0]) * 60 + Number(p[1] || 0);
}

const INPUT_STYLE = {
  padding: '4px 8px', border: '1px solid #ddd', borderRadius: '6px',
  fontSize: '12px', outline: 'none', background: 'white', height: '28px', boxSizing: 'border-box',
};
const SELECT_STYLE = { ...INPUT_STYLE, cursor: 'pointer' };

export default function CalendrierDispatch({ onEnvoiIndividuel, onRefresh, date, refreshKey }) {
  const [trajets,      setTrajets]    = useState([]);
  const [affectations, setAffect]     = useState([]);
  const [chauffeurs,   setChauffeurs] = useState([]);
  const [dispos,       setDispos]     = useState([]);
  const [loading,      setLoading]    = useState(false);
  const [message,      setMessage]    = useState('');
  const [dragging,     setDragging]   = useState(null);
  const [dragOver,     setDragOver]   = useState(null);
  const [masquer,      setMasquer]    = useState(false);
  const [tooltip,      setTooltip]    = useState(null);

  // Recherche
  const [showRecherche, setShowRecherche] = useState(false);
  const [recherche, setRecherche] = useState({ chauffeur: '', trajet: '', typeVehicule: '', statut: 'tous' });

  const scrollRef      = useRef(null);
  const scrollInterval = useRef(null);

  useEffect(() => { if (date) charger(); }, [date, refreshKey]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  async function charger() {
    setLoading(true);
    try {
      const [t, a, c, d] = await Promise.all([
        api.get(`/trajets?date=${date}`),
        api.get(`/affectations?date=${date}`),
        api.get('/chauffeurs'),
        api.get(`/disponibilites?date=${date}`),
      ]);
      setTrajets(t.data); setAffect(a.data);
      setChauffeurs(c.data); setDispos(d.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const affIds      = new Set(affectations.map(a => a.trajet_id));
  const affCodes    = new Set(affectations.map(a => a.code_trajet));
  const nonAffectes = trajets.filter(t => !affIds.has(t.id) && !affCodes.has(t.code_trajet));

  // Types de véhicule disponibles dans les données
  const typesVehicule = [...new Set([
    ...trajets.map(t => t.type_vehicule),
    ...chauffeurs.map(c => c.type_vehicule),
  ].filter(Boolean))].sort();

  // ---- Filtres ----
  const rCh = recherche.chauffeur.toLowerCase().trim();
  const rTr = recherche.trajet.toLowerCase().trim();
  const rTy = recherche.typeVehicule;
  const rSt = recherche.statut;

  const chauffeursTriés = [...chauffeurs].sort((a, b) => {
    const aD = dispos.some(d => d.chauffeur_id === a.id);
    const bD = dispos.some(d => d.chauffeur_id === b.id);
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;
    if (aD && bD) {
      return affectations.filter(x => x.chauffeur_id === a.id).length -
             affectations.filter(x => x.chauffeur_id === b.id).length;
    }
    return a.nom.localeCompare(b.nom);
  });

  const chauffeursBase = masquer
    ? chauffeursTriés.filter(ch => dispos.some(d => d.chauffeur_id === ch.id) || affectations.some(a => a.chauffeur_id === ch.id))
    : chauffeursTriés;

  // Filtre chauffeurs par recherche
  const chauffeursAffiches = chauffeursBase.filter(ch => {
    if (rCh && !`${ch.prenom} ${ch.nom} ${ch.numero_chauffeur}`.toLowerCase().includes(rCh)) return false;
    if (rTy && ch.type_vehicule !== rTy) return false;
    if (rSt === 'affectes' && !affectations.some(a => a.chauffeur_id === ch.id)) return false;
    if (rSt === 'sans_affectation' && affectations.some(a => a.chauffeur_id === ch.id)) return false;
    // Si un code trajet est saisi ET qu'il est affecté, ne garder que les chauffeurs concernés
    // Si le trajet est en attente (non affecté), tous les chauffeurs restent visibles pour le drag & drop
    const trajetEstAffecte = rTr && affectations.some(a => a.code_trajet.toLowerCase().includes(rTr));
    if (trajetEstAffecte && !affectations.some(a => a.chauffeur_id === ch.id && a.code_trajet.toLowerCase().includes(rTr))) return false;
    return true;
  });

  // Filtre trajets en attente par recherche
  const nonAffectesFiltres = nonAffectes.filter(t => {
    if (rTr && !t.code_trajet.toLowerCase().includes(rTr)) return false;
    if (rTy && t.type_vehicule && t.type_vehicule !== rTy) return false;
    return true;
  });

  // Si statut = affectés → masquer colonne en attente
  const montrerEnAttente = rSt !== 'affectes';
  // Les colonnes chauffeurs sont toujours visibles (pour permettre le drag & drop)
  const montrerChauffeurs = true;

  const nbFiltresActifs = [rCh, rTr, rTy, rSt !== 'tous' ? rSt : ''].filter(Boolean).length;

  function resetRecherche() {
    setRecherche({ chauffeur: '', trajet: '', typeVehicule: '', statut: 'tous' });
  }

  const couleur = {};
  chauffeursTriés.forEach((c, i) => { couleur[c.id] = COULEURS[i % COULEURS.length]; });

  // Note journée par chauffeur (première dispo non nulle)
  const noteParChauffeur = {};
  dispos.forEach(d => {
    if (d.note_journee && !noteParChauffeur[d.chauffeur_id])
      noteParChauffeur[d.chauffeur_id] = d.note_journee;
  });

  function getDispos(id) { return dispos.filter(d => d.chauffeur_id === id); }
  function estDispo(id, h) {
    return getDispos(id).some(d => {
      const db = parseInt(d.heure_debut); const fn = parseInt(d.heure_fin);
      return h >= db && h < fn;
    });
  }
  function getAffs(id) {
    const affs = affectations.filter(a => a.chauffeur_id === id);
    if (!rTr) return affs;
    return affs.filter(a => a.code_trajet.toLowerCase().includes(rTr));
  }
  function hasConflict(id, trajet) {
    const tD = toMin(trajet.heure_prise), tF = toMin(trajet.heure_arrivee);
    return affectations.filter(a => a.chauffeur_id === id).some(a => {
      if (a.trajet_id === trajet.id) return false;
      return toMin(a.heure_prise) < tF && toMin(a.heure_arrivee) > tD;
    });
  }

  function startDrag(trajet, affId = null, srcId = null) {
    setTooltip(null);
    setDragging({ ...trajet, affectation_id: affId, chauffeur_source_id: srcId });
  }

  function startAutoScroll(clientX, clientY) {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    scrollInterval.current = setInterval(() => {
      const el = scrollRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const th = 80; const sp = 12;
      if (clientX > rect.right - th)  el.scrollLeft += sp;
      else if (clientX < rect.left + th) el.scrollLeft -= sp;
      if (clientY > rect.bottom - th) el.scrollTop  += sp;
      else if (clientY < rect.top + th)  el.scrollTop  -= sp;
    }, 30);
  }
  function stopAutoScroll() {
    if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
  }

  async function onDrop(chauffeur) {
    if (!dragging) return;
    stopAutoScroll(); setDragOver(null);
    if (dragging.chauffeur_source_id === chauffeur.id) { setDragging(null); return; }
    if (hasConflict(chauffeur.id, dragging)) {
      setMessage(`⚠️ Conflit — ${chauffeur.prenom} ${chauffeur.nom} a déjà un trajet à cette heure`);
      setDragging(null); return;
    }
    const hasDispo = getDispos(chauffeur.id).length > 0;
    if (!hasDispo) {
      const ok = window.confirm(`${chauffeur.prenom} ${chauffeur.nom} n'a pas de disponibilité.\nVoulez-vous quand même l'affecter?`);
      if (!ok) { setDragging(null); return; }
    }
    try {
      await api.post('/affectations/affecter', { trajet_id: dragging.id, chauffeur_id: chauffeur.id, date });
      setMessage(`✅ ${dragging.code_trajet} affecté à ${chauffeur.prenom} ${chauffeur.nom}`);
      await charger();
      if (onRefresh) onRefresh();
    } catch (err) { setMessage('❌ ' + (err.response?.data?.message || 'Erreur')); }
    setDragging(null);
  }

  async function retirerAff(affId, code) {
    if (!window.confirm(`Retirer l'affectation de ${code}?`)) return;
    try { await api.delete(`/affectations/${affId}`); setMessage(`${code} retirée`); await charger(); if (onRefresh) onRefresh(); }
    catch { setMessage('Erreur'); }
  }

  function posTrajet(hP, hA, liste, idx) {
    const hD = toMin(hP), hF = toMin(hA);
    const top    = (hD / 60 - 6) * HAUTEUR_H;
    const height = Math.max((hF - hD) / 60 * HAUTEUR_H, 28);
    const total  = Math.max(1, liste.filter(b => toMin(b.hP) < hF && toMin(b.hA) > hD).length);
    const over   = liste.filter((b, i) => i < idx && toMin(b.hP) < hF && toMin(b.hA) > hD).length;
    const pct = 100 / total;
    return { top, height, left: `calc(${over * pct}% + 2px)`, width: `calc(${pct}% - 10px)` };
  }

  function posNonAff(t, idx) {
    const hD = toMin(t.heure_prise), hF = toMin(t.heure_arrivee);
    const top    = (hD / 60 - 6) * HAUTEUR_H;
    const height = Math.max((hF - hD) / 60 * HAUTEUR_H, 28);
    const total  = Math.max(1, nonAffectesFiltres.filter(b => toMin(b.heure_prise) < hF && toMin(b.heure_arrivee) > hD).length);
    const over   = nonAffectesFiltres.filter((b, i) => i < idx && toMin(b.heure_prise) < hF && toMin(b.heure_arrivee) > hD).length;
    const colW   = Math.floor((W_ATTENTE - 10) / total);
    return { top, height, left: 5 + over * colW, width: colW - 2 };
  }

  const CORPS_H = HEURES.length * HAUTEUR_H;

  return (
    <div style={{ fontFamily: 'Arial,sans-serif' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
        <button onClick={charger} style={{ padding: '4px 10px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Actualiser</button>
        {[
          { label: `${trajets.length} trajets`,   color: BLEU },
          { label: `${affectations.length} affectés`, color: '#2e7d32' },
          { label: `${nonAffectes.length} en attente`, color: nonAffectes.length > 0 ? '#c62828' : '#2e7d32' },
          { label: `${[...new Set(dispos.map(d => d.chauffeur_id))].length} dispos`, color: '#1565c0' },
        ].map(s => (
          <span key={s.label} style={{ background: 'white', border: `1px solid ${s.color}44`, color: s.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>{s.label}</span>
        ))}

        {/* Bouton Recherche */}
        <button
          onClick={() => { setShowRecherche(p => !p); if (showRecherche) resetRecherche(); }}
          style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', background: showRecherche ? BLEU : 'white', color: showRecherche ? 'white' : '#555', border: `1px solid ${showRecherche ? BLEU : '#ddd'}`, borderRadius: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
          🔍 Rechercher{nbFiltresActifs > 0 && !showRecherche ? ` (${nbFiltresActifs})` : ''}
        </button>

        <button onClick={() => setMasquer(p => !p)}
          style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', background: masquer ? BLEU : 'white', color: masquer ? 'white' : '#555', border: '1px solid #ddd', borderRadius: '6px', fontWeight: '500' }}>
          {masquer ? '👁️ Afficher tous' : '🙈 Masquer non concernés'}
        </button>
      </div>

      {/* Panneau de recherche */}
      {showRecherche && (
        <div style={{ background: '#F3F6FB', border: '1px solid #C5D5E8', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#555', fontWeight: '600', whiteSpace: 'nowrap' }}>Chauffeur</label>
            <input
              type="text"
              placeholder="Nom, prénom ou n°..."
              value={recherche.chauffeur}
              onChange={e => setRecherche(r => ({ ...r, chauffeur: e.target.value }))}
              style={{ ...INPUT_STYLE, width: '160px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#555', fontWeight: '600', whiteSpace: 'nowrap' }}>Trajet</label>
            <input
              type="text"
              placeholder="Code trajet..."
              value={recherche.trajet}
              onChange={e => setRecherche(r => ({ ...r, trajet: e.target.value }))}
              style={{ ...INPUT_STYLE, width: '130px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#555', fontWeight: '600', whiteSpace: 'nowrap' }}>Type véhicule</label>
            <select value={recherche.typeVehicule} onChange={e => setRecherche(r => ({ ...r, typeVehicule: e.target.value }))} style={{ ...SELECT_STYLE, width: '110px' }}>
              <option value="">Tous</option>
              {typesVehicule.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#555', fontWeight: '600', whiteSpace: 'nowrap' }}>Statut</label>
            <select value={recherche.statut} onChange={e => setRecherche(r => ({ ...r, statut: e.target.value }))} style={{ ...SELECT_STYLE, width: '130px' }}>
              <option value="tous">Tous</option>
              <option value="affectes">Affectés seulement</option>
              <option value="en_attente">En attente seulement</option>
              <option value="sans_affectation">Sans aucune affectation</option>
            </select>
          </div>
          {nbFiltresActifs > 0 && (
            <button onClick={resetRecherche} style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '6px' }}>
              ✕ Effacer ({nbFiltresActifs})
            </button>
          )}
          {nbFiltresActifs > 0 && (
            <span style={{ fontSize: '11px', color: '#1565c0', background: '#E3F2FD', padding: '3px 8px', borderRadius: '10px', fontWeight: '600' }}>
              {montrerChauffeurs ? `${chauffeursAffiches.length} chauffeur${chauffeursAffiches.length !== 1 ? 's' : ''}` : ''}
              {montrerChauffeurs && montrerEnAttente ? ' · ' : ''}
              {montrerEnAttente ? `${nonAffectesFiltres.length} trajet${nonAffectesFiltres.length !== 1 ? 's' : ''} en attente` : ''}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '4px', fontSize: '12px', color: '#555' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 12, height: 12, background: '#E8F5E9', border: '1px solid #A5D6A7', display: 'inline-block', borderRadius: '2px' }} /> Disponible
        </span>
        <span style={{ color: '#888' }}>🖱️ Glissez les trajets pour les affecter ou les déplacer</span>
      </div>

      {message && (
        <div style={{ background: message.includes('⚠️') || message.includes('❌') ? '#ffebee' : '#e8f5e9', color: message.includes('⚠️') || message.includes('❌') ? '#c62828' : '#2e7d32', padding: '10px 16px', borderRadius: '6px', marginBottom: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Chargement...</div>
      ) : (
        <div ref={scrollRef}
          onDragOver={e => { e.preventDefault(); startAutoScroll(e.clientX, e.clientY); }}
          onDragEnd={stopAutoScroll}
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '75vh', border: '1px solid #ddd', borderRadius: '8px', position: 'relative' }}>

          {tooltip && (
            <div style={{ position: 'fixed', background: '#1F4E79', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', top: tooltip.y + 12, left: tooltip.x + 12, maxWidth: 220 }}>
              <div style={{ fontWeight: '700' }}>{tooltip.code}</div>
              <div>{fmt(tooltip.prise)} → {fmt(tooltip.arrivee)}</div>
              <div style={{ opacity: 0.85, marginTop: 4 }}>{tooltip.adresse}</div>
              {tooltip.notes && <div style={{ opacity: 0.75, fontStyle: 'italic' }}>{tooltip.notes}</div>}
            </div>
          )}

          <div style={{ display: 'flex', width: '100%' }}>

            {/* ===== COLONNE HEURES ===== */}
            <div style={{ width: W_HEURE, flexShrink: 0, position: 'sticky', left: 0, zIndex: 25, background: '#f8f9fa', borderRight: '1px solid #e0e0e0' }}>
              <div style={{ height: HAUTEUR_HEADER, flexShrink: 0, borderBottom: '2px solid #ddd', boxSizing: 'border-box', background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 26 }} />
              {HEURES.map((h, i) => (
                <div key={h} style={{ height: HAUTEUR_H, borderTop: '1px solid #e0e0e0', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -8, right: 4, fontSize: '11px', color: '#888', fontWeight: '500', background: '#f8f9fa', padding: '0 2px' }}>
                    {String(h).padStart(2, '0')}h
                  </span>
                </div>
              ))}
            </div>

            {/* ===== COLONNE EN ATTENTE ===== */}
            {montrerEnAttente && (
              <div style={{ width: W_ATTENTE, flexShrink: 0, position: 'sticky', left: W_HEURE, zIndex: 24, background: '#FFFDE7', borderRight: '2px solid #FFB74D', boxShadow: '2px 0 6px rgba(0,0,0,0.08)' }}>
                <div style={{ height: HAUTEUR_HEADER, flexShrink: 0, background: '#FFF3E0', borderBottom: '2px solid #FFB74D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 25, boxSizing: 'border-box' }}>
                  <div style={{ fontWeight: '700', color: '#E65100', fontSize: '12px' }}>En attente</div>
                  <div style={{ fontSize: '11px', color: '#F57C00' }}>
                    {nonAffectesFiltres.length}{nonAffectesFiltres.length !== nonAffectes.length ? `/${nonAffectes.length}` : ''} trajet{nonAffectesFiltres.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ height: 0 }} />
                <div style={{ position: 'relative', height: CORPS_H }}>
                  {HEURES.map((h, i) => (
                    <div key={h} style={{ position: 'absolute', top: i * HAUTEUR_H, left: 0, right: 0, height: HAUTEUR_H, borderTop: i > 0 ? '1px solid #FFE082' : 'none' }} />
                  ))}
                  {nonAffectesFiltres.map((t, idx) => {
                    const { top, height, left, width } = posNonAff(t, idx);
                    return (
                      <div key={t.id} draggable
                        onDragStart={() => startDrag(t)}
                        onDragEnd={() => { setDragging(null); stopAutoScroll(); }}
                        onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, code: t.code_trajet, prise: t.heure_prise, arrivee: t.heure_arrivee, adresse: t.adresse_prise, notes: t.notes })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ position: 'absolute', top, left, width, height, background: '#FF9800', color: 'white', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', fontWeight: '600', cursor: 'grab', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10, opacity: dragging?.id === t.id ? 0.4 : 1, userSelect: 'none' }}>
                        <div>{t.code_trajet}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>{fmt(t.heure_prise)}–{fmt(t.heure_arrivee)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== COLONNES CHAUFFEURS ===== */}
            {montrerChauffeurs && chauffeursAffiches.map(ch => {
              const cl = couleur[ch.id];
              const isTarget = dragOver === ch.id;
              const hasDispo = getDispos(ch.id).length > 0;
              const affs = getAffs(ch.id);
              const nbAff = affectations.filter(a => a.chauffeur_id === ch.id).length;
              const liste = affs.map(a => ({ hP: a.heure_prise, hA: a.heure_arrivee }));

              return (
                <div key={ch.id} style={{ flex: 1, minWidth: LARGEUR_C, flexShrink: 0, borderRight: '1px solid #eee' }}
                  onDragOver={e => { e.preventDefault(); setDragOver(ch.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(ch)}>

                  <div style={{ height: HAUTEUR_HEADER, minHeight: HAUTEUR_HEADER, maxHeight: HAUTEUR_HEADER, background: 'white', borderBottom: `1px solid ${cl}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '0', position: 'sticky', top: 0, zIndex: 15, transition: 'background 0.15s' }}>
                    <div
                      onClick={async () => { if (onEnvoiIndividuel && confirm(`Envoyer le programme par email a ${ch.prenom} ${ch.nom} ?`)) { await onEnvoiIndividuel(ch.id); await charger(); if (onRefresh) onRefresh(); } }}
                      title={noteParChauffeur[ch.id] ? `📝 ${noteParChauffeur[ch.id]}` : 'Envoyer programme par email'}
                      style={{ fontWeight: '700', fontSize: '11px', color: isTarget ? 'white' : cl, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', cursor: onEnvoiIndividuel ? 'pointer' : 'default', textDecoration: onEnvoiIndividuel ? 'underline' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.prenom} {ch.nom}</span>
                      {noteParChauffeur[ch.id] && (
                        <span style={{ fontSize: '10px', flexShrink: 0 }}>📝</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: isTarget ? 'rgba(255,255,255,0.8)' : '#888' }}>
                      N°{ch.numero_chauffeur} · {ch.type_vehicule}
                    </div>
                    {!hasDispo && <div style={{ fontSize: '9px', background: isTarget ? 'rgba(255,255,255,0.2)' : '#ffebee', color: isTarget ? 'white' : '#c62828', padding: '1px 5px', borderRadius: '3px', marginTop: '2px' }}>Sans dispo</div>}
                    {nbAff > 0 && <div style={{ fontSize: '9px', background: isTarget ? 'rgba(255,255,255,0.2)' : cl + '22', color: isTarget ? 'white' : cl, padding: '1px 5px', borderRadius: '3px', marginTop: '2px', fontWeight: '600' }}>{nbAff} trajet{nbAff > 1 ? 's' : ''}</div>}
                  </div>

                  <div style={{ position: 'relative', height: CORPS_H, background: isTarget ? cl + '11' : 'white', borderLeft: `3px solid ${cl}`, transition: 'all 0.15s' }}>
                    {HEURES.map((h, i) => (
                      <div key={h} style={{ position: 'absolute', top: i * HAUTEUR_H, left: 0, right: 0, height: HAUTEUR_H, background: estDispo(ch.id, h) ? '#E8F5E9' : 'transparent', borderTop: `1px solid ${estDispo(ch.id, h) ? '#C8E6C9' : '#f5f5f5'}` }} />
                    ))}
                    {affs.map((aff, idx) => {
                      const { top, height, left: lft, width: w } = posTrajet(aff.heure_prise, aff.heure_arrivee, liste, idx);
                      const trajetData = { id: aff.trajet_id, code_trajet: aff.code_trajet, heure_prise: aff.heure_prise, heure_arrivee: aff.heure_arrivee, adresse_prise: aff.adresse_prise };
                      const surligne = rTr && aff.code_trajet.toLowerCase().includes(rTr);
                      return (
                        <div key={aff.id} draggable
                          onDragStart={() => startDrag(trajetData, aff.id, ch.id)}
                          onDragEnd={() => { setDragging(null); stopAutoScroll(); }}
                          onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, code: aff.code_trajet, prise: aff.heure_prise, arrivee: aff.heure_arrivee, adresse: aff.adresse_prise, notes: aff.notes })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{ position: 'absolute', top, left: lft, width: w, height, background: cl, color: 'white', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', fontWeight: '600', overflow: 'hidden', zIndex: surligne ? 20 : 10, cursor: 'grab', opacity: dragging?.id === aff.trajet_id ? 0.4 : (rTr && !surligne ? 0.3 : 1), boxShadow: surligne ? `0 0 0 2px white, 0 0 0 4px ${cl}, 0 4px 8px rgba(0,0,0,0.2)` : '0 2px 4px rgba(0,0,0,0.15)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span>{aff.code_trajet}</span>
                            <button onClick={e => { e.stopPropagation(); setTooltip(null); retirerAff(aff.id, aff.code_trajet); }}
                              onMouseEnter={() => setTooltip(null)}
                              style={{ background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', borderRadius: '50%', width: 14, height: 14, cursor: 'pointer', fontSize: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.9 }}>{fmt(aff.heure_prise)}–{fmt(aff.heure_arrivee)}</div>
                          {height > 42 && <div style={{ fontSize: '9px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aff.adresse_prise?.substring(0, 22)}...</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Message si aucun résultat */}
            {montrerChauffeurs && chauffeursAffiches.length === 0 && nbFiltresActifs > 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px', padding: '40px' }}>
                Aucun chauffeur ne correspond aux critères de recherche
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
