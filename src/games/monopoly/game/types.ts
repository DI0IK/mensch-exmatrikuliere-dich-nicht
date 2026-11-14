export type Language = 'de' | 'en';

export type PlayerColor = 'rot' | 'blau' | 'gelb' | 'gruen';

export type SeatType = 'human-local' | 'human-remote' | 'bot';

export interface PlayerConfig {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  active: boolean;
  major?: string;
  emoji?: string;
}

export interface GameSettings {
  turboStart: boolean;
  freeParkingPot: boolean;
  auctions: boolean;
  doubleOnStart: boolean;
}

export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue';

export type TileType =
  | 'start'
  | 'street'
  | 'chest'
  | 'tax'
  | 'transit'
  | 'jail'
  | 'utility'
  | 'chance'
  | 'parking'
  | 'goto_jail';

export interface TileDef {
  index: number;
  type: TileType;
  name: Record<Language, string>;
  group?: ColorGroup;
  price?: number;
  houseCost?: number;
  /** [base, 1 house, 2 houses, 3 houses, 4 houses, hotel] */
  rents?: [number, number, number, number, number, number];
  taxAmount?: number;
}

export interface PropertyState {
  ownerIndex: number | null;
  /** 0..4 = Tutorien, 5 = Lehrstuhl (Hotel) */
  houses: number;
  mortgaged: boolean;
}

export type CardDeck = 'chance' | 'chest';

export type CardEffect =
  | { kind: 'cash'; amount: number }
  | { kind: 'move_to'; tileIndex: number; collectStart: boolean }
  | { kind: 'move_relative'; steps: number }
  | { kind: 'goto_jail' }
  | { kind: 'jail_card' }
  | { kind: 'repairs'; perHouse: number; perHotel: number }
  | { kind: 'collect_from_all'; amount: number }
  | { kind: 'pay_to_all'; amount: number }
  | { kind: 'nearest_transit'; doubleRent: boolean };

export interface DrawnCard {
  id: string;
  deck: CardDeck;
  title: Record<Language, string>;
  description: Record<Language, string>;
  effect: CardEffect;
}

export interface PlayerState {
  index: number;
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  major?: string;
  emoji?: string;
  position: number;
  cash: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  bankrupt: boolean;
}

export interface TradeOffer {
  fromIndex: number;
  toIndex: number;
  offerCash: number;
  requestCash: number;
  offerProperties: number[];
  requestProperties: number[];
  offerJailCards: number;
  requestJailCards: number;
}

export interface AuctionState {
  tileIndex: number;
  currentBid: number;
  highestBidder: number | null;
  activeBidders: number[];
  currentBidderPos: number;
  passedPlayers: number[];
}

export type GamePhase =
  | 'WAIT_ROLL'
  | 'BUY_OR_AUCTION'
  | 'AUCTION'
  | 'CARD_MODAL'
  | 'TURN_ACTION'
  | 'TRADE_REVIEW'
  | 'DEBT_RECOVERY'
  | 'GAME_OVER';

export interface LogEntry {
  id: number;
  text: Record<Language, string>;
  playerIndex?: number;
  tone?: 'neutral' | 'good' | 'bad' | 'highlight';
}

export interface GameState {
  players: PlayerState[];
  properties: Record<number, PropertyState>;
  currentTurn: number;
  phase: GamePhase;
  settings: GameSettings;
  lastDice: [number, number] | null;
  doublesCount: number;
  canRollAgain: boolean;
  freeParkingPot: number;
  pendingTileIndex: number | null;
  drawnCard: DrawnCard | null;
  pendingTrade: TradeOffer | null;
  preTradePhase?: 'WAIT_ROLL' | 'TURN_ACTION';
  auction: AuctionState | null;
  debtCreditorIndex: number | null;
  chanceDeck: string[];
  chestDeck: string[];
  winnerIndex: number | null;
  logs: LogEntry[];
  nextLogId: number;
  turnCount: number;
  botTradeAttemptedTurn?: number;
  declinedTradeKeys?: string[];
}

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'PAY_JAIL' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PROPERTY' }
  | { type: 'PLACE_BID'; playerIndex: number; amount: number }
  | { type: 'PASS_BID'; playerIndex: number }
  | { type: 'ACK_CARD' }
  | { type: 'BUILD_HOUSE'; tileIndex: number }
  | { type: 'SELL_HOUSE'; tileIndex: number }
  | { type: 'TOGGLE_MORTGAGE'; tileIndex: number }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'END_TURN' };
