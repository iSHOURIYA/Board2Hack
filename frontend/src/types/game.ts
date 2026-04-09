export type CardId = 'TIKI_UP_1' | 'TIKI_UP_2' | 'TIKI_UP_3' | 'TIKI_TOPPLE' | 'TIKI_TOAST';
export type TikiId = number;

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
