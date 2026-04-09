export type CardId = string; // e.g. "TIKI_UP_1", "TIKI_UP_2", "TIKI_UP_3", "TIKI_TOAST", "TIKI_TUMBLE"
export type TikiId = number;   // 1 to 9 typically

export interface SecretCards {
  top: TikiId;
  middle: TikiId;
  bottom: TikiId;
}

export interface PlayerSecret {
  secret: SecretCards;
  hand: CardId[];
}

export interface PlayerDetails {
  id: string;
  username: string;
}
