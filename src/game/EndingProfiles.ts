export interface EndingProfile {
  id: string;
  title: string;
  epilogue: [string, string, string];
  location: string;
  accent: string;
  motif: 'sunrise' | 'city' | 'dojo' | 'arena' | 'night' | 'rooftop';
  closing: string;
}

const profiles: Record<string, EndingProfile> = {
  RYU: {
    id: 'RYU', title: 'THE ROAD CONTINUES', location: 'A QUIET ROAD OUTSIDE THE CITY', accent: '#e9c568', motif: 'sunrise',
    epilogue: ['The Society is gone, but Ryu does not celebrate for long.', 'He leaves before sunrise, carrying only the memory of stronger opponents.', 'For him, the answer was never hidden in a facility. It waits in the next fight.'],
    closing: 'NO DESTINATION. ONLY THE NEXT STEP.',
  },
  KEN: {
    id: 'KEN', title: 'BACK TO WHAT MATTERS', location: 'NEW YORK — EARLY MORNING', accent: '#f05b53', motif: 'city',
    epilogue: ['Ken watches the last Society signal disappear from the skyline.', 'The thrill of the fight fades, replaced by a familiar thought of home.', 'He smiles. Winning matters — but knowing what to return to matters more.'],
    closing: 'FIGHT HARD. RETURN STRONGER.',
  },
  CHUNLI: {
    id: 'CHUNLI', title: 'CASE CLOSED', location: 'HONG KONG — POLICE ARCHIVE', accent: '#e9ca58', motif: 'city',
    epilogue: ['Chun-Li copies the Society records before the facility goes dark.', 'Names, routes and missing fighters finally connect into one complete case.', 'By dawn, the evidence is already moving to the people who can use it.'],
    closing: 'THE FIGHT ENDS. THE WORK CONTINUES.',
  },
  ALEX: {
    id: 'ALEX', title: 'A STRONGER WORLD', location: 'NEW YORK — ROOFTOP', accent: '#df604f', motif: 'rooftop',
    epilogue: ['Alex stands above the city, bruised and still restless.', 'The Society promised the strongest fighters in the world. It delivered only another beginning.', 'He looks toward the streets below, already searching for the next challenge.'],
    closing: 'STRENGTH MEANS NOTHING IF IT STOPS HERE.',
  },
  DUDLEY: {
    id: 'DUDLEY', title: 'A GENTLEMAN RETURNS', location: 'LONDON — PRIVATE GYM', accent: '#d7b85c', motif: 'arena',
    epilogue: ['Dudley returns to London before the underground club can reopen.', 'He hangs his gloves carefully, satisfied that the matter has been settled properly.', 'Tomorrow there will be tea, training, and perhaps a worthy challenger.'],
    closing: 'VICTORY SHOULD ALWAYS HAVE STYLE.',
  },
  MAKOTO: {
    id: 'MAKOTO', title: 'THE DOJO DOORS OPEN', location: 'JAPAN — RINDOUKAN DOJO', accent: '#d6ad45', motif: 'dojo',
    epilogue: ['Makoto returns with proof that her karate survived the world outside.', 'The old dojo feels smaller than before — but no longer forgotten.', 'She throws the doors open and challenges the next student to step inside.'],
    closing: 'RINDOUKAN LIVES THROUGH EVERY FIGHT.',
  },
  IBUKI: {
    id: 'IBUKI', title: 'MISSION COMPLETE... FINALLY', location: 'JAPAN — SCHOOL ROOFTOP', accent: '#df6259', motif: 'rooftop',
    epilogue: ['Ibuki submits her mission report with several pages missing on purpose.', 'Secret facilities, elite fighters and elemental gods were enough excitement for one assignment.', 'Her next objective is simpler: arrive at school before anyone notices.'],
    closing: 'NINJA DUTY: COMPLETE. NORMAL LIFE: PENDING.',
  },
  YUN: {
    id: 'YUN', title: 'THE CITY IS STILL MOVING', location: 'HONG KONG — NIGHT MARKET ROOFTOP', accent: '#e8bd49', motif: 'night',
    epilogue: ['Yun returns to the night market as if he had only stepped away for an hour.', 'The stalls reopen, scooters pass below, and nobody needs to know how close things came.', 'He grins at the skyline. There are always more streets worth protecting.'],
    closing: 'KEEP MOVING. KEEP THE CITY ALIVE.',
  },
};

export function endingProfileCount(): number { return Object.keys(profiles).length; }

export function endingProfileFor(characterId: string): EndingProfile {
  return profiles[characterId] ?? profiles.RYU!;
}
