import { useState, useEffect } from 'react';
import api from './api';
import Avatar from './Avatar';

const BLEU = '#1F4E79';
const champ = { padding:'6px 8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' };
const $ = n => (n ?? 0).toLocaleString('fr-CA', { style:'currency', currency:'CAD' });
const auj = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Toronto' });
const il = n => { const d = new Date(auj() + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };
const couleur = (v, bon, moyen) => v === null || v === undefined ? '#999' : v >= bon ? '#2E7D32' : v >= moyen ? '#F57C00' : '#C62828';

function Tuile({ titre, valeur, sous, couleurVal }) {
  return (
    <div style={{ background:'white', border:'1px solid #e3e8ee', borderRadius:'10px', padding:'14px 16px', minWidth:'170px', flex:'1 1 170px' }}>
      <div style={{ fontSize:'12px', color:'#777', marginBottom:'6px' }}>{titre}</div>
      <div style={{ fontSize:'26px', fontWeight:700, color:couleurVal || BLEU }}>{valeur}</div>
      {sous && <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>{sous}</div>}
    </div>
  );
}

export default function TableauKpi() {
  const [du, setDu] = useState(il(29));
  const [au, setAu] = useState(auj());
  const [tol, setTol] = useState(5);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/kpi?du=${du}&au=${au}&tolerance=${tol}`).then(r => { setD(r.data); setErr(''); }).catch(() => setErr('Erreur de chargement'));
  }, [du, au, tol]);

  const preset = n => { setDu(il(n)); setAu(auj()); };
  const pc = v => v === null || v === undefined ? '—' : v + ' %';
  const max = d ? Math.max(1, ...d.serie.map(s => s.courses)) : 1;

  return (
    <div style={{ padding:'20px' }}>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginBottom:'16px' }}>
        <b style={{ color:BLEU }}>Indicateurs de performance</b>
        {[[6,'7 jours'],[29,'30 jours'],[89,'90 jours']].map(([n, l]) => <button key={n} onClick={() => preset(n)} style={{ ...champ, cursor:'pointer', background:'white' }}>{l}</button>)}
        <input type="date" value={du} max={au} onChange={e => setDu(e.target.value)} style={champ} /> →
        <input type="date" value={au} min={du} onChange={e => setAu(e.target.value)} style={champ} />
        <label style={{ fontSize:'13px' }} title="Un chauffeur est à l'heure s'il signale son arrivée au plus tard à l'heure de prise + cette tolérance">tolérance <input type="number" min="0" max="60" value={tol} onChange={e => setTol(e.target.value)} style={{ ...champ, width:'55px' }} /> min</label>
      </div>
      {err && <div style={{ color:'#C62828' }}>{err}</div>}
      {d && (<>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'20px' }}>
          <Tuile titre="Ponctualité" valeur={pc(d.ponctualite.taux)} couleurVal={couleur(d.ponctualite.taux, 90, 75)}
            sous={d.ponctualite.mesures ? `${d.ponctualite.a_lheure}/${d.ponctualite.mesures} à l'heure${d.ponctualite.retard_moyen_min ? ` · retard moyen ${d.ponctualite.retard_moyen_min} min` : ''}` : 'Aucune arrivée enregistrée'} />
          <Tuile titre="Taux de remplissage" valeur={pc(d.remplissage.taux)} couleurVal={couleur(d.remplissage.taux, 95, 85)} sous={`${d.remplissage.affectes}/${d.remplissage.trajets} trajets affectés`} />
          <Tuile titre="Courses terminées" valeur={d.courses.terminees} sous={`${d.courses.total} affectées · ${d.courses.no_show} client(s) absent(s) · complétion ${pc(d.courses.taux_completion)}`} />
          <Tuile titre="Km à vide" valeur={`${d.km_vide.total} km`} sous={d.km_vide.par_course !== null ? `${d.km_vide.par_course} km par course` : ''} />
          <Tuile titre="Coût par course" valeur={d.couts.par_course !== null ? $(d.couts.par_course) : '—'} sous={`Dépenses parc ${$(d.couts.total)}`} />
          <Tuile titre="Revenus − dépenses" valeur={$(d.couts.marge)} couleurVal={d.couts.marge >= 0 ? '#2E7D32' : '#C62828'} sous={`Facturé ${$(d.couts.revenus)}`} />
        </div>

        <h4 style={{ margin:'0 0 8px', color:BLEU }}>Courses par jour</h4>
        {d.serie.length === 0 ? <div style={{ color:'#999', marginBottom:'20px' }}>Aucune course sur la période</div> : (
          <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'110px', marginBottom:'24px', overflowX:'auto' }}>
            {d.serie.map(s => (
              <div key={s.date} title={`${s.date} : ${s.courses} course(s), ${s.terminees} terminée(s), ${s.km_vide} km à vide`} style={{ flex:'1 0 14px', maxWidth:'34px', display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'100%' }}>
                <div style={{ background:'#BBD3EA', height:`${(s.courses - s.terminees) / max * 100}%` }} />
                <div style={{ background:BLEU, height:`${s.terminees / max * 100}%` }} />
              </div>))}
          </div>)}
        <div style={{ fontSize:'12px', color:'#888', margin:'-16px 0 20px' }}><span style={{ color:BLEU }}>■</span> terminées <span style={{ color:'#BBD3EA', marginLeft:'10px' }}>■</span> autres</div>

        <h4 style={{ margin:'0 0 8px', color:BLEU }}>Productivité des chauffeurs</h4>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead><tr style={{ background:BLEU, color:'white' }}>{['Chauffeur','Courses','Terminées','Heures en course','Km','Courses/heure','Km à vide','Ponctualité'].map(h => <th key={h} style={{ padding:'8px 10px', textAlign:'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {d.chauffeurs.length === 0 && <tr><td colSpan="8" style={{ padding:'24px', textAlign:'center', color:'#999' }}>Aucune donnée</td></tr>}
              {d.chauffeurs.map((c, i) => (
                <tr key={c.id} style={{ background:i%2?'white':'#fafafa', borderBottom:'1px solid #eee' }}>
                  <td style={{ padding:'7px 10px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}><Avatar ch={c} size={26} />{c.prenom} {c.nom}</span></td>
                  <td style={{ padding:'7px 10px' }}>{c.courses}</td><td style={{ padding:'7px 10px' }}>{c.terminees}</td>
                  <td style={{ padding:'7px 10px' }}>{c.heures}</td><td style={{ padding:'7px 10px' }}>{c.km}</td>
                  <td style={{ padding:'7px 10px' }}>{c.courses_par_heure ?? '—'}</td><td style={{ padding:'7px 10px' }}>{c.km_vide}</td>
                  <td style={{ padding:'7px 10px', fontWeight:600, color:couleur(c.ponctualite, 90, 75) }}>{pc(c.ponctualite)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:'12px', color:'#888', marginTop:'8px' }}>Ponctualité : calculée sur les arrivées signalées par les chauffeurs. Km à vide : domicile → 1re prise puis arrivée → prise suivante (même calcul que l'optimisation). Distances sans valeur saisie : estimées (vol d'oiseau × 1,3).</div>
      </>)}
    </div>
  );
}
