import { useState } from 'react';
import type { GameComponentProps } from '../../shared/collection/types';
import { ConnectionInfoModal } from '../../shared/components/ConnectionInfoModal';
import { GameToolbar } from '../../shared/components/GameToolbar';
import { Lobby } from '../../shared/components/Lobby';
import { useGameEngine } from '../../shared/engine/useGameEngine';
import { Card } from '../../shared/ui';
import { DiceTray } from './components/DiceTray';
import { GameModeSelector } from './components/lobby/GameModeSelector';
import { ScorecardTable } from './components/ScorecardTable';
import { WinnerModal } from './components/WinnerModal';
import { KniffelEngine } from './game/KniffelEngine';
import type { PlayerConfig } from './game/types';

export function KniffelApp({
  language,
  muted,
  onToggleLanguage,
  onToggleMute,
  onBackToGames,
}: GameComponentProps) {
  const [showConnInfo, setShowConnInfo] = useState(false);
  const { engine, snapshot } = useGameEngine(() => new KniffelEngine());
  const state = snapshot.gameState;
  const localSeatIndices = engine.getLocalSeatIndices();

  if (!state) {
    return (
      <Lobby<PlayerConfig>
        gameId="kniffel"
        language={language}
        players={snapshot.players}
        lobbyRoster={snapshot.lobbyRoster}
        connectedSeats={snapshot.connectedSeats}
        hostLobbyCode={snapshot.hostLobbyCode}
        hostLobbyError={snapshot.hostLobbyError}
        initialRoomCode={snapshot.initialRoomCode}
        isGuest={snapshot.isGuest}
        guestSeat={snapshot.guestSeat}
        guestName={snapshot.guestName}
        guestMajor={snapshot.guestMajor}
        guestEmoji={snapshot.guestEmoji}
        guestConnected={snapshot.guestConnected}
        guestConnecting={snapshot.guestConnecting}
        guestError={snapshot.guestError}
        onChangePlayers={engine.setPlayers}
        onChangeGuestName={engine.setGuestName}
        onChangeGuestMajor={engine.setGuestMajor}
        onChangeGuestEmoji={engine.setGuestEmoji}
        onToggleLanguage={onToggleLanguage}
        onCloseRemoteSeat={engine.closeRemoteSeat}
        onStartGame={engine.startGame}
        onGuestJoinRoom={engine.joinRoomAsGuest}
        onGuestLeave={engine.leaveGuestRoom}
        onBackToGames={onBackToGames}
        minPlayers={snapshot.minPlayers}
        maxPlayers={snapshot.maxPlayers}
        onAddPlayer={() => engine.addPlayer('bot')}
        onRemovePlayer={engine.removePlayer}
        titleOverride="ECTS-Kniffel"
        subtitleOverride={
          language === 'de'
            ? '5 Würfel, 13 Kategorien & Spickzettel-Sabotage'
            : '5 dice, 13 categories & Cheat-Sheet sabotage'
        }
        badgeOverride="PO 2026 · KLAUSUREN-WÜRFEL"
        customModeSelector={
          <GameModeSelector
            language={language}
            isGuest={snapshot.isGuest}
            settings={snapshot.settings}
            lobbySettings={snapshot.lobbySettings}
            onChangeSettings={engine.setSettings}
          />
        }
      />
    );
  }

  const canAct = localSeatIndices.includes(state.currentTurn);

  return (
    <div className="app-shell" style={{ maxWidth: '980px', margin: '0 auto', gap: '14px' }}>
      <GameToolbar
        language={language}
        muted={muted}
        onOpenConnectionInfo={() => setShowConnInfo(true)}
        onToggleMute={onToggleMute}
        onToggleLanguage={onToggleLanguage}
        onReturnToLobby={engine.returnToLobby}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <DiceTray
            state={state}
            language={language}
            canAct={canAct}
            onAction={engine.dispatchAction}
          />

          <Card padding="12px" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
              {language === 'de' ? 'Prüfungsprotokoll' : 'Exam Log'}
            </strong>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
              {state.logs.map((entry) => (
                <div key={entry.id} style={{ padding: '3px 6px', borderRadius: '6px', background: 'rgba(231,220,200,0.35)' }}>
                  {entry.text[language]}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <ScorecardTable
          state={state}
          language={language}
          canAct={canAct}
          onAction={engine.dispatchAction}
        />
      </div>

      {showConnInfo && (
        <ConnectionInfoModal
          players={state.players}
          language={language}
          isGuest={snapshot.isGuest}
          hostLobbyCode={snapshot.hostLobbyCode}
          connectedSeats={snapshot.connectedSeats}
          disconnectedSeats={snapshot.disconnectedSeats}
          seatTransports={snapshot.seatTransports}
          onClose={() => setShowConnInfo(false)}
        />
      )}

      <WinnerModal
        state={state}
        language={language}
        onPlayAgain={engine.startGame}
        onBackToLobby={engine.returnToLobby}
      />
    </div>
  );
}
