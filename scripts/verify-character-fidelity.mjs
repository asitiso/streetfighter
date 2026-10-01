import { combatProfileFor } from '../dist/assets/combat/CharacterCombatProfiles.js';
import { normalFor, specialMovesFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';

const fail = (message) => { console.error('CHARACTER_FIDELITY_FAIL', message); process.exit(1); };

const ryuMp = normalFor('mp', false, 'RYU');
const chunMp = normalFor('mp', false, 'CHUNLI');
const kenMp = normalFor('mp', false, 'KEN');
const makotoHp = normalFor('hp', false, 'MAKOTO');
const ryuHp = normalFor('hp', false, 'RYU');
if (chunMp.hitbox.forward <= ryuMp.hitbox.forward * 1.1) fail('Chun-Li reach identity missing');
if (kenMp.recovery >= ryuMp.recovery) fail('Ken recovery identity missing');
if (makotoHp.damage <= ryuHp.damage * 1.12) fail('Makoto burst damage missing');

const alexThrow = throwMoveFor('ALEX');
const ryuThrow = throwMoveFor('RYU');
if (alexThrow.damage <= ryuThrow.damage * 1.25 || alexThrow.hitbox.forward <= ryuThrow.hitbox.forward) fail('Alex grab identity missing');

const ibuki = combatProfileFor('IBUKI');
const yun = combatProfileFor('YUN');
const ryu = combatProfileFor('RYU');
if (ibuki.jumpVelocity <= ryu.jumpVelocity + .8 || ibuki.gravity >= ryu.gravity) fail('Ibuki air mobility missing');
if (!yun.chainRoutes.lp?.includes('mp') || !yun.chainRoutes.mk?.includes('hk')) fail('Yun chain routes missing');

const alexFighter = new Fighter(getCharacter('ALEX'), 'player', 200, 500, 1);
const ibukiFighter = new Fighter(getCharacter('IBUKI'), 'player', 200, 500, 1);
if (alexFighter.maxHp <= 1080 || ibukiFighter.maxHp >= 1000) fail('character health profiles not applied');

const alexSpecials = specialMovesFor('ALEX');
const ibukiSpecials = specialMovesFor('IBUKI');
const urienSpecials = specialMovesFor('URIEN');
const gillSpecials = specialMovesFor('GILL');
if (alexSpecials.primary.kind === 'projectile') fail('Alex should not use projectile primary');
if (ibukiSpecials.exPrimary.projectile?.count !== 2) fail('Ibuki EX multi-kunai missing');
if (!urienSpecials.super.projectile?.piercing || (urienSpecials.super.projectile?.speed ?? 99) >= 1) fail('Urien Aegis wall behavior missing');
if (gillSpecials.super.projectile?.count !== 3 || !gillSpecials.super.projectile?.piercing) fail('Gill Seraphic multi-volley missing');

const ids = ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'];
const identity = ids.map((id) => ({ id, profile: combatProfileFor(id).identity, primary: specialMovesFor(id).primary.label }));
if (new Set(identity.map((x) => x.primary)).size !== 8) fail('playable primary specials not unique');

console.log('CHARACTER_FIDELITY_VERIFY_PASS', {
  chunReach: Number((chunMp.hitbox.forward / ryuMp.hitbox.forward).toFixed(2)),
  kenRecovery: [kenMp.recovery, ryuMp.recovery],
  makotoDamage: [makotoHp.damage, ryuHp.damage],
  alexThrow: [alexThrow.damage, ryuThrow.damage],
  ibukiJump: ibuki.jumpVelocity,
  yunChainLinks: Object.keys(yun.chainRoutes).length,
  identities: identity,
});
