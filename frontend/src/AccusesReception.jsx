import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';

function fmtDatetime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-CA', { year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit' });
}

export default function AccusesReception() {
  const [logs, setLogs]         = useState([]);
  const [dates, setDates]       = useState([]);
  const [dateFiltre, setDateFiltre] = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    chargerDates();
  }, []);

  useEffect(() => {
    chargerLogs();
  }, [dateFiltre]);

  async function chargerDates() {
    try {
      const res = await api.get('/consultation/dates');
      setDates(res.data);
      if (res.data.length > 0 && !dateFiltre) {
        setDateFiltre(res.data[0].date_programme);
      }
    } catch {}
  }

  async function chargerLogs() {
    setLoading(true);
    try {
      const q = dateFiltre ? `?date=${dateFiltre}` : '';
      const res = await api.get(`/consultation/logs${q}`);
      setLogs(res.data);
    } catch {}
    setLoading(false);
  }

  function exportCSV() {
    const header = 'N°;Chauffeur;Email;Email envoyé le;Trajets;Date consultation;Statut\n';
    const rows = logs.map(l =>
      `${l.numero_chauffeur};"${l.prenom} ${l.nom}";${l.email};` +
      `${fmtDatetime(l.envoye_le)};${l.nb_trajets || 0};` +
      `${fmtDatetime(l.date_consultation)};${statutLabel(l.statut_consultation)}`
    ).join('\n');
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `accuses-${dateFiltre || 'tous'}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function statutLabel(s) {
    if (s === 'consulte')   return 'Consulté ✓';
    if (s === 'en_attente') return 'Non consulté ✗';
    return 'En attente';
  }
  function statutStyle(s) {
    if (s === 'consulte')   return { background:'#e8f5e9', color:'#2e7d32' };
    if (s === 'en_attente') return { background:'#ffebee', color:'#c62828' };
    return { background:'#f3f4f6', color:'#888' };
  }

  const nbConsultes  = logs.filter(l => l.statut_consultation === 'consulte').length;
  const nbAttendu    = logs.filter(l => l.statut_consultation === 'en_attente').length;

  return (
    <div>
      {/* Barre filtres */}
      <div style={{ display:'flex', gap:'12px', alignItems:'center', padding:'16px',
        borderBottom:'1px solid #eee', flexWrap:'wrap' }}>
        <label style={{ fontSize:'14px', fontWeight:'500', color:'#333' }}>Date :</label>
        <select value={dateFiltre} onChange={e => setDateFiltre(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #ddd', borderRadius:'6px',
            fontSize:'14px', minWidth:'180px' }}>
          <option value="">Toutes les dates</option>
          {dates.map(d => (
            <option key={d.date_programme} value={d.date_programme}>
              {d.date_programme} ({d.nb_envois} envois)
            </option>
          ))}
        </select>
        <button onClick={chargerLogs}
          style={{ background:'white', border:'1px solid #ddd', color:BLEU,
            padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>
          Actualiser
        </button>
        {logs.length > 0 && (
          <button onClick={exportCSV}
            style={{ background:'#375623', color:'white', border:'none',
              padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>
            ↓ Exporter CSV
          </button>
        )}
        {logs.length > 0 && (
          <span style={{ fontSize:'13px', color:'#555', marginLeft:'8px' }}>
            <strong style={{ color:'#2e7d32' }}>{nbConsultes} consulté(s)</strong>
            {' · '}
            <strong style={{ color:'#c62828' }}>{nbAttendu} non consulté(s)</strong>
            {' · '}
            {logs.length} total
          </span>
        )}
      </div>

      {loading && <div style={{ padding:'40px', textAlign:'center', color:'#888' }}>Chargement...</div>}

      {!loading && (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
          <thead>
            <tr style={{ background:BLEU, color:'white' }}>
              {['N°','Chauffeur','Email','Email envoyé le','Trajets','Consulté le','Statut'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#999' }}>
                Aucun envoi trouvé pour cette date
              </td></tr>
            ) : logs.map((l, i) => (
              <tr key={l.id} style={{ background: i%2===0 ? '#fafafa' : 'white',
                borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'10px 14px', fontWeight:'700', color:BLEU }}>{l.numero_chauffeur}</td>
                <td style={{ padding:'10px 14px', fontWeight:'600' }}>{l.prenom} {l.nom}</td>
                <td style={{ padding:'10px 14px', color:'#555' }}>{l.email}</td>
                <td style={{ padding:'10px 14px' }}>{fmtDatetime(l.envoye_le)}</td>
                <td style={{ padding:'10px 14px', textAlign:'center' }}>{l.nb_trajets || 0}</td>
                <td style={{ padding:'10px 14px' }}>{fmtDatetime(l.date_consultation)}</td>
                <td style={{ padding:'10px 14px' }}>
                  <span style={{ ...statutStyle(l.statut_consultation),
                    padding:'3px 12px', borderRadius:'12px', fontSize:'12px', fontWeight:'600' }}>
                    {statutLabel(l.statut_consultation)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
