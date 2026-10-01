export interface SuperArtDef {
  id: 1 | 2 | 3;
  name: string;
  subtitle: string;
  stocks: number;
  gauge: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  style: string;
  country: string;
  primary: string;
  secondary: string;
  accent: string;
  heightScale: number;
  widthScale: number;
  speed: number;
  power: number;
  reach: number;
  superArts: [SuperArtDef, SuperArtDef, SuperArtDef];
}

const standardArts = (a: string, b: string, c: string): [SuperArtDef, SuperArtDef, SuperArtDef] => [
  { id: 1, name: a, subtitle: 'FAST STOCK / PRESSURE', stocks: 2, gauge: 88 },
  { id: 2, name: b, subtitle: 'HEAVY DAMAGE / COMMITMENT', stocks: 1, gauge: 120 },
  { id: 3, name: c, subtitle: 'TACTICAL / CONFIRM', stocks: 2, gauge: 104 },
];

export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'RYU', name: 'RYU', style: 'ANSATSUKEN / BALANCED', country: 'JAPAN', primary: '#e7e2dc', secondary: '#70272d', accent: '#efc158', heightScale: 1, widthScale: 1, speed: 1, power: 1, reach: 1, superArts: standardArts('SHINKU HADOKEN', 'SHIN SHORYUKEN', 'DENJIN HADOKEN') },
  { id: 'KEN', name: 'KEN', style: 'RUSH / COMBO', country: 'USA', primary: '#b62432', secondary: '#181824', accent: '#f0c34b', heightScale: 1.01, widthScale: .98, speed: 1.08, power: .96, reach: .98, superArts: standardArts('SHORYU REPPA', 'SHINRYUKEN', 'SHIPPU JINRAI KYAKU') },
  { id: 'CHUNLI', name: 'CHUN-LI', style: 'FOOTSIE / SPEED', country: 'CHINA', primary: '#345ba8', secondary: '#ece6d3', accent: '#f1ca52', heightScale: .94, widthScale: .9, speed: 1.1, power: .9, reach: 1.12, superArts: standardArts('KIKOSHO', 'HOUYOKUSEN', 'TENSEI RANKA') },
  { id: 'ALEX', name: 'ALEX', style: 'POWER / GRAB', country: 'USA', primary: '#355f45', secondary: '#c89962', accent: '#df4a3f', heightScale: 1.1, widthScale: 1.14, speed: .9, power: 1.18, reach: 1.03, superArts: standardArts('HYPER BOMB', 'BOOMERANG RAID', 'STUN GUN HEADBUTT') },
  { id: 'DUDLEY', name: 'DUDLEY', style: 'BOXING / WEAVE', country: 'ENGLAND', primary: '#f0e6d8', secondary: '#214f3e', accent: '#d54c42', heightScale: 1.03, widthScale: 1.02, speed: 1.02, power: 1.04, reach: 1.06, superArts: standardArts('ROCKET UPPERCUT', 'ROLLING THUNDER', 'CORKSCREW BLOW') },
  { id: 'MAKOTO', name: 'MAKOTO', style: 'KARATE / BURST', country: 'JAPAN', primary: '#eee8d9', secondary: '#d7b04a', accent: '#c33e39', heightScale: .91, widthScale: .9, speed: 1.06, power: 1.13, reach: .93, superArts: standardArts('SEICHUSEN GODANZUKI', 'ABARE TOSANAMI', 'TANDEN RENKI') },
  { id: 'IBUKI', name: 'IBUKI', style: 'NINJA / AIR', country: 'JAPAN', primary: '#b69469', secondary: '#4e4147', accent: '#de5350', heightScale: .92, widthScale: .86, speed: 1.14, power: .88, reach: .96, superArts: standardArts('KASUMI SUZAKU', 'YOROI DOROSHI', 'HASHIN SHO') },
  { id: 'YUN', name: 'YUN', style: 'RUSHDOWN / CHAIN', country: 'HONG KONG', primary: '#2f6299', secondary: '#ece2c6', accent: '#e6bd47', heightScale: .93, widthScale: .88, speed: 1.16, power: .91, reach: .95, superArts: standardArts('YOU HOU', 'SOURAI RENGEKI', 'GENEI JIN') },
 ] as const;

export const BOSS_CHARACTERS: readonly CharacterDef[] = [
  { id: 'URIEN', name: 'URIEN', style: 'TYRANT / PRESSURE', country: 'SECRET SOCIETY', primary: '#5d6b94', secondary: '#232938', accent: '#d9bf63', heightScale: 1.09, widthScale: 1.1, speed: .98, power: 1.2, reach: 1.08, superArts: standardArts('TYRANT SLAUGHTER', 'TEMPORAL THUNDER', 'AEGIS REFLECTOR') },
  { id: 'GILL', name: 'GILL', style: 'FINAL BOSS / ELEMENTAL', country: 'SECRET SOCIETY', primary: '#b84d42', secondary: '#3f72b0', accent: '#f0cf73', heightScale: 1.12, widthScale: 1.12, speed: 1.02, power: 1.26, reach: 1.12, superArts: standardArts('METEOR STRIKE', 'SERAPHIC WING', 'RESURRECTION') },
] as const;

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((character) => character.id === id) ?? BOSS_CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0]!;
}
