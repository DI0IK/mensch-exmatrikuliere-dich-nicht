import React, { useState } from 'react';
import type { Language } from '../../game/types';
import { TRANSLATIONS } from '../../i18n/translations';
import { loadCustomTurnConfig, saveCustomTurnConfig } from '../../net/iceConfig';

interface TurnSettingsPanelProps {
  language: Language;
}

export const TurnSettingsPanel: React.FC<TurnSettingsPanelProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [open, setOpen] = useState(false);
  const [turnCfg, setTurnCfg] = useState(() => loadCustomTurnConfig());
  const [savedMsg, setSavedMsg] = useState(false);

  return (
    <div style={{ borderTop: '1px dashed #cbbba0', paddingTop: '10px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: '0.78rem',
          color: 'var(--ink-muted)',
          textDecoration: 'underline',
        }}
      >
        {open ? '▾ ' : '▸ '}
        {t.turnSettingsToggle}
      </button>

      {open && (
        <div
          style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(231, 220, 200, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.82rem',
          }}
        >
          <input
            type="text"
            placeholder="TURN URL (e.g. turn:global.relay.metered.ca:80)"
            value={turnCfg.urls}
            onChange={(e) => setTurnCfg({ ...turnCfg, urls: e.target.value })}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfa988' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Username"
              value={turnCfg.username}
              onChange={(e) => setTurnCfg({ ...turnCfg, username: e.target.value })}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfa988' }}
            />
            <input
              type="password"
              placeholder="Credential"
              value={turnCfg.credential}
              onChange={(e) => setTurnCfg({ ...turnCfg, credential: e.target.value })}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfa988' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="tactile-btn"
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              onClick={() => {
                saveCustomTurnConfig(turnCfg);
                setSavedMsg(true);
                window.setTimeout(() => setSavedMsg(false), 1800);
              }}
            >
              Save
            </button>
            {savedMsg && (
              <span style={{ color: 'var(--stamp-green)', fontWeight: 700 }}>{t.turnSaved}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
