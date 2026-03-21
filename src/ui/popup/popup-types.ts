export interface InterestProfile {
  [tag: string]: { tag: string; score: number };
}

export interface UP {
  mid: number;
  name: string;
  face: string;
  sign: string;
  follow_time: number;
}

export interface UPCache {
  upList: UP[];
  lastUpdate: number;
}

export interface ClassifyCache {
  lastUpdate: number;
}

export interface InterestRow {
  tag: string;
  score: number;
  ratio: number;
}
