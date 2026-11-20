import { PRODUCED_SFX_ASSETS } from './SampledSfxBank.js';
import { runtimeQuality } from './RuntimeQuality.js';
import { CHARACTERS, BOSS_CHARACTERS } from '../game/characters.js';
import { animationSequencesFor } from '../render/AnimationSequenceLibrary.js';

export type AssetGroupName = 'app-shell' | 'character-hd' | 'character-hq' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'ending';

export const GAME_CACHE_NAME = 'game-cache-v688';

const THROW_ATTACKER_ASSETS = ['/art/throw-attacker-v1/ken.webp', '/art/throw-attacker-v1/ryu.webp', '/art/throw-attacker-v1/chunli.webp', '/art/throw-attacker-v1/alex.webp', '/art/throw-attacker-v1/dudley.webp', '/art/throw-attacker-v1/makoto.webp', '/art/throw-attacker-v1/ibuki.webp', '/art/throw-attacker-v1/yun.webp', '/art/throw-attacker-v1/urien.webp', '/art/throw-attacker-v1/gill.webp'];
const THROW_VICTIM_ASSETS = ['/art/throw-victim-v1/ken.webp', '/art/throw-victim-v1/ryu.webp', '/art/throw-victim-v1/chunli.webp', '/art/throw-victim-v1/alex.webp', '/art/throw-victim-v1/dudley.webp', '/art/throw-victim-v1/makoto.webp', '/art/throw-victim-v1/ibuki.webp', '/art/throw-victim-v1/yun.webp', '/art/throw-victim-v1/urien.webp', '/art/throw-victim-v1/gill.webp'];
const SUPER_HIT_ASSETS = ['/art/super-hit-v1/urien.webp', '/art/super-hit-v1/gill.webp', '/art/super-hit-v1/ryu.webp', '/art/super-hit-v1/ken.webp', '/art/super-hit-v1/chunli.webp', '/art/super-hit-v1/ibuki.webp', '/art/super-hit-v1/alex.webp', '/art/super-hit-v1/dudley.webp', '/art/super-hit-v1/makoto.webp', '/art/super-hit-v1/yun.webp'];
const AIR_FALL_ASSETS = ['/art/air-fall-v1/urien.webp', '/art/air-fall-v1/gill.webp', '/art/air-fall-v1/ryu.webp', '/art/air-fall-v1/ken.webp', '/art/air-fall-v1/chunli.webp', '/art/air-fall-v1/ibuki.webp', '/art/air-fall-v1/alex.webp', '/art/air-fall-v1/dudley.webp', '/art/air-fall-v1/makoto.webp', '/art/air-fall-v1/yun.webp'];
const KNOCKDOWN_ASSETS = ['/art/knockdown-motion-v1/ken.webp', '/art/knockdown-motion-v1/ryu.webp', '/art/knockdown-motion-v1/chunli.webp', '/art/knockdown-motion-v1/ibuki.webp', '/art/knockdown-motion-v1/alex.webp', '/art/knockdown-motion-v1/dudley.webp', '/art/knockdown-motion-v1/makoto.webp', '/art/knockdown-motion-v1/yun.webp', '/art/knockdown-motion-v1/urien.webp', '/art/knockdown-motion-v1/gill.webp'];

const PROP_IMPACT_ASSETS = ['/art/prop-impact-v1/atlas.webp', '/assets/render/PropImpactAssets.js'];

const STAGE_AMBIENT_ASSETS = ['/art/stage-ambient-v1/atlas.webp', '/assets/render/StageAmbientAssets.js'];

export const BELT_GRUNT_ASSETS = ['/art/grunts-v1/punk.webp', '/art/grunts-v1/knife.webp', '/art/grunts-v1/bruiser.webp', '/art/grunts-v1/kicker.webp', '/art/grunts-v1/soldier.webp', '/art/grunts-v1/thrower.webp', '/art/grunts-v1/pickups.webp', '/assets/render/GruntSprites.js'];

const STAGE_PROP_ASSETS = ['/art/stage-props-v1/atlas.webp', '/assets/render/StagePropAssets.js', '/assets/render/StagePropAtlasData.js'];

export const THROW_ESCAPE_ASSETS = ['ryu','ken','chunli','alex','dudley','makoto','ibuki','yun','urien','gill'].map(id => '/art/throw-escape-v1/' + id + '.webp');

export const ASSET_GROUPS: Record<AssetGroupName, readonly string[]> = {
  'app-shell': [
    ...PRODUCED_SFX_ASSETS,
    '/art/title-keyart.png', '/art/roster-mural.png', '/audio/score-v2/title-theme.ogg', '/audio/score-v2/select-theme.ogg',
    '/art/portraits/ryu.webp', '/art/portraits/ken.webp', '/art/portraits/chunli.webp', '/art/portraits/alex.webp',
    '/art/portraits/dudley.webp', '/art/portraits/makoto.webp', '/art/portraits/ibuki.webp', '/art/portraits/yun.webp',
    '/art/combat-sprites/ryu-authored-v1.png', '/art/combat-sprites/ken-authored-v1.png', '/art/combat-sprites/chunli-authored-v1.png', '/art/combat-sprites/alex-authored-v1.png',
    '/art/combat-sprites/dudley-authored-v1.png', '/art/combat-sprites/makoto-authored-v1.png', '/art/combat-sprites/ibuki-authored-v1.png', '/art/combat-sprites/yun-authored-v1.png',
    '/art/attack-atlases/ryu-authored-v1.webp', '/art/attack-atlases/ken-authored-v1.webp', '/art/attack-atlases/chunli-authored-v1.webp', '/art/attack-atlases/alex-authored-v1.webp',
    '/art/attack-atlases/dudley-authored-v1.webp', '/art/attack-atlases/makoto-authored-v1.webp', '/art/attack-atlases/ibuki-authored-v1.webp', '/art/attack-atlases/yun-authored-v1.webp',
  ],
  'character-hd': [
    '/art/character-quality-manifest.json',
    '/art/combat-sprites-hd/ryu-authored-v1.png', '/art/combat-sprites-hd/ken-authored-v1.png', '/art/combat-sprites-hd/chunli-authored-v1.png', '/art/combat-sprites-hd/alex-authored-v1.png',
    '/art/combat-sprites-hd/dudley-authored-v1.png', '/art/combat-sprites-hd/makoto-authored-v1.png', '/art/combat-sprites-hd/ibuki-authored-v1.png', '/art/combat-sprites-hd/yun-authored-v1.png',
    '/art/attack-atlases-hd/ryu-authored-v1.webp', '/art/attack-atlases-hd/ken-authored-v1.webp', '/art/attack-atlases-hd/chunli-authored-v1.webp', '/art/attack-atlases-hd/alex-authored-v1.webp',
    '/art/attack-atlases-hd/dudley-authored-v1.webp', '/art/attack-atlases-hd/makoto-authored-v1.webp', '/art/attack-atlases-hd/ibuki-authored-v1.webp', '/art/attack-atlases-hd/yun-authored-v1.webp',
  ],
  'character-hq': [
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/ko-motion-v1/ryu.webp',
    '/art/ko-motion-v1/ken.webp',
    '/art/ko-motion-v1/chunli.webp',
    '/art/ko-motion-v1/ibuki.webp',
    '/art/ko-motion-v1/alex.webp',
    '/art/ko-motion-v1/dudley.webp',
    '/art/ko-motion-v1/makoto.webp',
    '/art/ko-motion-v1/yun.webp',
    '/art/ko-motion-v1/urien.webp',
    '/art/ko-motion-v1/gill.webp',
    '/art/command-motion-v1/yun-shoulder-palm.webp',
    '/art/command-motion-v1/ibuki-spin-heel.webp',
    '/art/command-motion-v1/makoto-forward-chop.webp',
    '/art/command-motion-v1/dudley-dart-shot.webp',
    '/art/command-motion-v1/alex-lariat-press.webp',
    '/art/command-motion-v1/ryu-collarbone-breaker.webp',
    '/art/command-motion-v1/chunli-forward-backfist.webp',
    '/art/command-motion-v1/ken-step-kick.webp',
    ...THROW_ESCAPE_ASSETS,
    '/art/animation-hq/makoto/air-medium-kick.webp',
    '/art/animation-hq/makoto/air-medium-punch.webp',
    '/art/animation-hq/makoto/air-light-kick.webp',
    '/art/animation-hq/makoto/air-light-punch.webp',
    '/art/animation-hq/makoto/air-heavy-kick.webp',
    '/art/animation-hq/makoto/air-heavy-punch.webp',
    '/art/animation-hq/dudley/air-medium-kick.webp',
    '/art/animation-hq/dudley/air-medium-punch.webp',
    '/art/animation-hq/dudley/air-light-kick.webp',
    '/art/animation-hq/dudley/air-light-punch.webp',
    '/art/animation-hq/dudley/air-heavy-kick.webp',
    '/art/animation-hq/dudley/air-heavy-punch.webp',
    '/art/animation-hq/alex/air-heavy-punch.webp',
    '/art/animation-hq/alex/air-heavy-kick.webp',
    '/art/animation-hq/alex/air-light-punch.webp',
    '/art/animation-hq/alex/air-light-kick.webp',
    '/art/animation-hq/alex/air-medium-punch.webp',
    '/art/animation-hq/alex/air-medium-kick.webp',
    '/art/animation-hq/chunli/air-light-punch.webp',
    '/art/animation-hq/chunli/air-light-kick.webp',
    '/art/animation-hq/chunli/air-medium-punch.webp',
    '/art/animation-hq/chunli/air-medium-kick.webp',
    '/art/animation-hq/chunli/air-heavy-kick.webp',
    '/art/animation-hq/chunli/air-heavy-punch.webp',
    '/art/animation-hq/ryu/air-medium-kick.webp',
    '/art/animation-hq/ryu/air-medium-punch.webp',
    '/art/animation-hq/ryu/air-light-kick.webp',
    '/art/animation-hq/ryu/air-light-punch.webp',
    '/art/animation-hq/ryu/air-heavy-kick.webp',
    '/art/animation-hq/ryu/air-heavy-punch.webp',
    '/art/animation-hq/ken/air-medium-kick.webp',
    '/art/animation-hq/ken/air-medium-punch.webp',
    '/art/animation-hq/ken/victory.webp',
    '/art/animation-hq/ryu/victory.webp',
    '/art/animation-hq/chunli/victory.webp',
    '/art/animation-hq/ibuki/victory.webp',
    '/art/animation-hq/alex/victory.webp',
    '/art/animation-hq/dudley/victory.webp',
    '/art/animation-hq/makoto/victory.webp',
    '/art/animation-hq/yun/victory.webp',
    '/art/animation-hq/gill/victory.webp',
    '/art/animation-hq/urien/victory.webp',
    '/art/animation-hq/ken/air-light-kick.webp',
    '/art/animation-hq/ken/air-light-punch.webp',
    '/art/animation-hq/ken/air-heavy-kick.webp',
    '/art/animation-hq/ken/air-heavy-punch.webp',
    '/art/animation-hq/yun/genei-jin-install.webp',
    '/art/animation-hq/makoto/tanden-renki.webp',
    '/art/animation-hq/makoto/abare-tosanami.webp',
    '/art/animation-hq/alex/stun-gun-headbutt.webp',
    '/art/animation-hq/dudley/rocket-uppercut.webp',
    '/art/animation-hq/yun/you-hou.webp',
    '/art/animation-hq/yun/sourai-rengeki.webp',
    '/art/animation-hq/dudley/rolling-thunder.webp',
    '/art/animation-hq/alex/boomerang-raid.webp',
    '/art/animation-hq/alex/hyper-bomb.webp',
    '/art/animation-hq/yun/genei-jin.webp',
    '/art/animation-hq/makoto/seichusen-godanzuki.webp',
    '/art/animation-hq/ibuki/air-light-kick.webp',
    '/art/animation-hq/ibuki/air-medium-punch.webp',
    '/art/animation-hq/ibuki/air-medium-kick.webp',
    '/art/animation-hq/ibuki/air-light-punch.webp',
    '/art/animation-hq/ibuki/air-heavy-kick.webp',
    '/art/animation-hq/ibuki/air-heavy-punch.webp',
    '/art/animation-hq/gill/air-medium-kick.webp',
    '/art/animation-hq/gill/air-medium-punch.webp',
    '/art/animation-hq/gill/air-light-kick.webp',
    '/art/animation-hq/gill/air-light-punch.webp',
    '/art/animation-hq/gill/air-heavy-kick.webp',
    '/art/animation-hq/gill/air-heavy-punch.webp',
    '/art/animation-hq/gill/seraphic-storm.webp',
    '/art/animation-hq/urien/aegis-reflector.webp',
    '/art/animation-hq/dudley/corkscrew-blow.webp',
    '/art/animation-hq/makoto/tsurugi.webp',
    '/art/animation-hq/gill/lariat-rush.webp',
    '/art/animation-hq/urien/shoulder-tackle.webp',
    '/art/animation-hq/yun/shoulder-tackle.webp',
    '/art/animation-hq/alex/shoryuken.webp',
    '/art/animation-hq/urien/shoryuken.webp',
    '/art/animation-hq/yun/shoryuken.webp',
    '/art/animation-hq/gill/shoryuken.webp',
    '/art/animation-hq/makoto/shoryuken.webp',
    '/art/animation-hq/dudley/shoryuken.webp',
    '/art/animation-hq/gill/hadoken.webp',
    '/art/animation-hq/urien/air-medium-kick.webp',
    '/art/animation-hq/urien/air-medium-punch.webp',
    '/art/animation-hq/urien/air-light-kick.webp',
    '/art/animation-hq/urien/air-light-punch.webp',
    '/art/animation-hq/urien/air-heavy-kick.webp',
    '/art/animation-hq/urien/air-heavy-punch.webp',
    '/art/animation-hq/urien/hadoken.webp',
    '/art/animation-hq/alex/slash-elbow.webp', '/art/animation-hq/alex/flash-chop.webp', '/art/animation-hq/alex/crouch.webp', '/art/animation-hq/alex/crouch-light.webp', '/art/animation-hq/alex/crouch-medium.webp', '/art/animation-hq/alex/crouch-heavy.webp', '/art/animation-hq/alex/crouch-light-kick.webp', '/art/animation-hq/alex/crouch-medium-kick.webp', '/art/animation-hq/alex/crouch-heavy-kick.webp', '/art/animation-hq/alex/stand-light.webp', '/art/animation-hq/alex/stand-medium.webp', '/art/animation-hq/alex/stand-light-kick.webp', '/art/animation-hq/alex/stand-medium-kick.webp', '/art/animation-hq/alex/stand-heavy-kick.webp', '/art/animation-hq/alex/stand-heavy.webp',
    '/art/animation-hq/dudley/machine-gun-blow.webp', '/art/animation-hq/dudley/ducking-straight.webp', '/art/animation-hq/dudley/crouch.webp', '/art/animation-hq/dudley/crouch-light.webp', '/art/animation-hq/dudley/crouch-medium.webp', '/art/animation-hq/dudley/crouch-heavy.webp', '/art/animation-hq/dudley/crouch-light-kick.webp', '/art/animation-hq/dudley/crouch-medium-kick.webp', '/art/animation-hq/dudley/crouch-heavy-kick.webp', '/art/animation-hq/dudley/stand-light.webp', '/art/animation-hq/dudley/stand-medium.webp', '/art/animation-hq/dudley/stand-light-kick.webp', '/art/animation-hq/dudley/stand-medium-kick.webp', '/art/animation-hq/dudley/stand-heavy-kick.webp', '/art/animation-hq/dudley/stand-heavy.webp',
    '/art/animation-hq/makoto/hayate.webp', '/art/animation-hq/makoto/crouch.webp', '/art/animation-hq/makoto/crouch-light.webp', '/art/animation-hq/makoto/crouch-medium.webp', '/art/animation-hq/makoto/crouch-heavy.webp', '/art/animation-hq/makoto/crouch-light-kick.webp', '/art/animation-hq/makoto/crouch-medium-kick.webp', '/art/animation-hq/makoto/crouch-heavy-kick.webp', '/art/animation-hq/makoto/stand-light.webp', '/art/animation-hq/makoto/stand-medium.webp', '/art/animation-hq/makoto/stand-light-kick.webp', '/art/animation-hq/makoto/stand-medium-kick.webp', '/art/animation-hq/makoto/stand-heavy-kick.webp', '/art/animation-hq/makoto/stand-heavy.webp',
    '/art/animation-hq/yun/air-medium-kick.webp',
    '/art/animation-hq/yun/air-medium-punch.webp',
    '/art/animation-hq/yun/air-light-kick.webp',
    '/art/animation-hq/yun/air-light-punch.webp',
    '/art/animation-hq/yun/air-heavy-kick.webp',
    '/art/animation-hq/yun/air-heavy-punch.webp',
    '/art/animation-hq/yun/palm-rush.webp', '/art/animation-hq/yun/crouch.webp', '/art/animation-hq/yun/crouch-light.webp', '/art/animation-hq/yun/crouch-medium.webp', '/art/animation-hq/yun/crouch-heavy.webp', '/art/animation-hq/yun/crouch-light-kick.webp', '/art/animation-hq/yun/crouch-medium-kick.webp', '/art/animation-hq/yun/crouch-heavy-kick.webp', '/art/animation-hq/yun/stand-light.webp', '/art/animation-hq/yun/stand-medium.webp', '/art/animation-hq/yun/stand-light-kick.webp', '/art/animation-hq/yun/stand-medium-kick.webp', '/art/animation-hq/yun/stand-heavy-kick.webp', '/art/animation-hq/yun/stand-heavy.webp',
    '/art/animation-hq/urien/crouch.webp', '/art/animation-hq/urien/crouch-light.webp', '/art/animation-hq/urien/crouch-medium.webp', '/art/animation-hq/urien/crouch-heavy.webp', '/art/animation-hq/urien/crouch-light-kick.webp', '/art/animation-hq/urien/crouch-medium-kick.webp', '/art/animation-hq/urien/crouch-heavy-kick.webp', '/art/animation-hq/urien/stand-light.webp', '/art/animation-hq/urien/stand-medium.webp', '/art/animation-hq/urien/stand-light-kick.webp', '/art/animation-hq/urien/stand-medium-kick.webp', '/art/animation-hq/urien/stand-heavy-kick.webp', '/art/animation-hq/urien/stand-heavy.webp',
    '/art/animation-hq/gill/crouch.webp', '/art/animation-hq/gill/crouch-light.webp', '/art/animation-hq/gill/crouch-medium.webp', '/art/animation-hq/gill/crouch-heavy.webp', '/art/animation-hq/gill/crouch-light-kick.webp', '/art/animation-hq/gill/crouch-medium-kick.webp', '/art/animation-hq/gill/crouch-heavy-kick.webp', '/art/animation-hq/gill/stand-light.webp', '/art/animation-hq/gill/stand-medium.webp', '/art/animation-hq/gill/stand-light-kick.webp', '/art/animation-hq/gill/stand-medium-kick.webp', '/art/animation-hq/gill/stand-heavy-kick.webp', '/art/animation-hq/gill/stand-heavy.webp',
    '/art/animation-hq/ryu/crouch.webp', '/art/animation-hq/ryu/crouch-light.webp', '/art/animation-hq/ryu/crouch-medium.webp', '/art/animation-hq/ryu/crouch-heavy.webp', '/art/animation-hq/ryu/crouch-light-kick.webp', '/art/animation-hq/ryu/crouch-medium-kick.webp', '/art/animation-hq/ryu/crouch-heavy-kick.webp',
    '/art/animation-hq/ryu/crouch-parry-v1.webp', '/art/animation-hq/ryu/crouch-guard-v1.webp',
    '/art/animation-hq/ryu/guard.webp', '/art/animation-hq/ryu/parry.webp',
    '/art/animation-hq/alex/crouch-parry-v1.webp', '/art/animation-hq/alex/crouch-guard-v1.webp',
    '/art/animation-hq/alex/guard.webp', '/art/animation-hq/alex/parry.webp',
    '/art/animation-hq/dudley/crouch-parry-v1.webp', '/art/animation-hq/dudley/crouch-guard-v1.webp',
    '/art/animation-hq/dudley/guard.webp', '/art/animation-hq/dudley/parry.webp',
    '/art/animation-hq/makoto/crouch-parry-v1.webp', '/art/animation-hq/makoto/crouch-guard-v1.webp',
    '/art/animation-hq/makoto/guard.webp', '/art/animation-hq/makoto/parry.webp',
    '/art/animation-hq/yun/crouch-parry-v1.webp', '/art/animation-hq/yun/crouch-guard-v1.webp',
    '/art/animation-hq/yun/guard.webp', '/art/animation-hq/yun/parry.webp',
    '/art/animation-hq/urien/crouch-guard-v1.webp', '/art/animation-hq/gill/crouch-guard-v1.webp',
    '/art/animation-hq/urien/crouch-parry-v1.webp', '/art/animation-hq/gill/crouch-parry-v1.webp',
    '/art/animation-hq/urien/guard.webp', '/art/animation-hq/urien/parry.webp',
    '/art/animation-hq/gill/guard.webp', '/art/animation-hq/gill/parry.webp',
    '/art/animation-hq/alex/hit.webp',
    '/art/animation-hq/dudley/hit.webp',
    '/art/animation-hq/makoto/hit.webp',
    '/art/animation-hq/yun/hit.webp',
    '/art/animation-hq/urien/hit.webp',
    '/art/animation-hq/gill/hit.webp',
    '/art/animation-hq/alex/jump.webp', '/art/animation-hq/alex/landing.webp',
    '/art/animation-hq/dudley/jump.webp', '/art/animation-hq/dudley/landing.webp',
    '/art/animation-hq/makoto/jump.webp', '/art/animation-hq/makoto/landing.webp',
    '/art/animation-hq/yun/jump.webp', '/art/animation-hq/yun/landing.webp',
    '/art/animation-hq/urien/jump.webp', '/art/animation-hq/urien/landing.webp',
    '/art/animation-hq/gill/jump.webp', '/art/animation-hq/gill/landing.webp',
    '/art/animation-hq/alex/dash.webp', '/art/animation-hq/alex/dash-back.webp', '/art/animation-hq/dudley/dash.webp', '/art/animation-hq/dudley/dash-back.webp', '/art/animation-hq/makoto/dash.webp', '/art/animation-hq/makoto/dash-back.webp',
    '/art/animation-hq/yun/dash.webp', '/art/animation-hq/yun/dash-back.webp', '/art/animation-hq/urien/dash.webp', '/art/animation-hq/urien/dash-back.webp', '/art/animation-hq/gill/dash.webp', '/art/animation-hq/gill/dash-back.webp',
    '/art/animation-hq/alex/walk-back.webp', '/art/animation-hq/dudley/walk-back.webp', '/art/animation-hq/makoto/walk-back.webp',
    '/art/animation-hq/yun/walk-back.webp', '/art/animation-hq/urien/walk-back.webp', '/art/animation-hq/gill/walk-back.webp',
    '/art/animation-hq/alex/walk.webp', '/art/animation-hq/dudley/walk.webp', '/art/animation-hq/makoto/walk.webp',
    '/art/animation-hq/yun/walk.webp', '/art/animation-hq/urien/walk.webp', '/art/animation-hq/gill/walk.webp',
    '/art/animation-hq/alex/manifest.json', '/art/animation-hq/alex/idle.webp',
    '/art/animation-hq/dudley/manifest.json', '/art/animation-hq/dudley/idle.webp',
    '/art/animation-hq/makoto/manifest.json', '/art/animation-hq/makoto/idle.webp',
    '/art/animation-hq/yun/manifest.json', '/art/animation-hq/yun/idle.webp',
    '/art/animation-hq/urien/manifest.json', '/art/animation-hq/urien/idle.webp',
    '/art/animation-hq/gill/manifest.json', '/art/animation-hq/gill/idle.webp',
    '/art/hq-character-master-manifest.json',
    '/art/combat-sprites-hq/ryu.webp', '/art/combat-sprites-hq/chunli.webp',
    '/art/combat-sprites-hq/ken.webp', '/art/combat-sprites-hq/ibuki.webp',
    '/art/animation-hq/ryu/manifest.json',
    '/art/animation-hq/ryu/idle.webp', '/art/animation-hq/ryu/walk.webp', '/art/animation-hq/ryu/walk-back.webp',
    '/art/animation-hq/ryu/dash.webp', '/art/animation-hq/ryu/dash-back.webp', '/art/animation-hq/ryu/jump.webp', '/art/animation-hq/ryu/landing.webp',
    '/art/animation-hq/ryu/hit.webp', '/art/animation-hq/ryu/stand-light.webp', '/art/animation-hq/ryu/stand-medium.webp', '/art/animation-hq/ryu/stand-light-kick.webp', '/art/animation-hq/ryu/stand-medium-kick.webp', '/art/animation-hq/ryu/stand-heavy-kick.webp', '/art/animation-hq/ryu/stand-heavy.webp', '/art/animation-hq/ryu/hadoken.webp', '/art/animation-hq/ryu/shoryuken.webp', '/art/animation-hq/ryu/tatsumaki.webp',
    // Staged-disabled Ryu specials stay on disk until their authored art is ready.
    '/art/animation-hq/ken/manifest.json',
    '/art/animation-hq/ken/crouch.webp',
    '/art/animation-hq/ken/crouch-parry-v1.webp', '/art/animation-hq/ken/crouch-guard-v1.webp',
    '/art/animation-hq/ken/crouch-light.webp',
    '/art/animation-hq/ken/crouch-medium.webp',
    '/art/animation-hq/ken/crouch-heavy.webp',
    '/art/animation-hq/ken/crouch-light-kick.webp',
    '/art/animation-hq/ken/crouch-medium-kick.webp',
    '/art/animation-hq/ken/crouch-heavy-kick.webp',
    '/art/animation-hq/ken/idle.webp', '/art/animation-hq/ken/walk.webp', '/art/animation-hq/ken/walk-back.webp',
    '/art/animation-hq/ken/dash-back.webp', '/art/animation-hq/ken/dash.webp', '/art/animation-hq/ken/jump.webp', '/art/animation-hq/ken/landing.webp', '/art/animation-hq/ken/hit.webp',
    '/art/special-keyposes/ken/hadoken.webp', '/art/special-keyposes/ken/shoryuken.webp',
    '/art/special-keyposes/ken/tatsumaki.webp', '/art/special-keyposes/ken/super-rush.webp',
    '/art/special-keyposes/chunli/kikoken.webp', '/art/special-keyposes/chunli/spinning-bird-kick.webp',
    '/art/animation-hq/chunli/manifest.json',
    '/art/animation-hq/chunli/stand-medium.webp', '/art/animation-hq/chunli/crouch-parry-v1.webp', '/art/animation-hq/chunli/crouch-guard-v1.webp', '/art/animation-hq/chunli/guard.webp', '/art/animation-hq/chunli/parry.webp', '/art/animation-hq/chunli/crouch-heavy-kick.webp', '/art/animation-hq/chunli/crouch-medium-kick.webp', '/art/animation-hq/chunli/crouch-light-kick.webp', '/art/animation-hq/chunli/crouch-heavy.webp', '/art/animation-hq/chunli/crouch-medium.webp', '/art/animation-hq/chunli/crouch-light.webp', '/art/animation-hq/chunli/crouch.webp', '/art/animation-hq/chunli/idle.webp', '/art/animation-hq/chunli/walk.webp', '/art/animation-hq/chunli/walk-back.webp',
    '/art/animation-hq/chunli/stand-light-kick.webp',
    '/art/animation-hq/chunli/stand-medium-kick.webp',
    '/art/animation-hq/chunli/stand-heavy-kick.webp',
    '/art/animation-hq/chunli/dash-back.webp', '/art/animation-hq/chunli/dash.webp', '/art/animation-hq/chunli/jump.webp', '/art/animation-hq/chunli/landing.webp', '/art/animation-hq/chunli/hit.webp', '/art/animation-hq/chunli/stand-light.webp', '/art/animation-hq/chunli/stand-heavy.webp', '/art/animation-hq/chunli/hadoken.webp', '/art/animation-hq/chunli/tatsumaki.webp', '/art/animation-hq/chunli/shoryuken.webp', '/art/animation-hq/chunli/super-rush.webp', '/art/animation-hq/chunli/kikosho.webp', '/art/animation-hq/chunli/tensei-ranka.webp',
    '/art/animation-hq/ibuki/manifest.json',
    '/art/animation-hq/ibuki/stand-medium.webp',
    '/art/animation-hq/ibuki/stand-light-kick.webp',
    '/art/animation-hq/ibuki/stand-medium-kick.webp',
    '/art/animation-hq/ibuki/stand-heavy-kick.webp',
    '/art/animation-hq/ibuki/crouch-parry-v1.webp', '/art/animation-hq/ibuki/crouch-guard-v1.webp',
    '/art/animation-hq/ibuki/guard.webp', '/art/animation-hq/ibuki/parry.webp', '/art/animation-hq/ibuki/crouch-heavy-kick.webp', '/art/animation-hq/ibuki/crouch-medium-kick.webp', '/art/animation-hq/ibuki/crouch-light-kick.webp', '/art/animation-hq/ibuki/crouch-heavy.webp', '/art/animation-hq/ibuki/crouch-medium.webp', '/art/animation-hq/ibuki/crouch-light.webp', '/art/animation-hq/ibuki/crouch.webp', '/art/animation-hq/ibuki/idle.webp', '/art/animation-hq/ibuki/walk.webp', '/art/animation-hq/ibuki/walk-back.webp',
    '/art/animation-hq/ibuki/dash-back.webp', '/art/animation-hq/ibuki/dash.webp', '/art/animation-hq/ibuki/jump.webp', '/art/animation-hq/ibuki/landing.webp', '/art/animation-hq/ibuki/hit.webp', '/art/animation-hq/ibuki/stand-light.webp', '/art/animation-hq/ibuki/stand-heavy.webp', '/art/animation-hq/ibuki/hadoken.webp', '/art/animation-hq/ibuki/shoryuken.webp', '/art/animation-hq/ibuki/tatsumaki.webp', '/art/animation-hq/ibuki/yoroi-doroshi.webp', '/art/animation-hq/ibuki/super-rush.webp',
  ],
  'stage-1': [
    ...THROW_ESCAPE_ASSETS,
    ...STAGE_PROP_ASSETS,
    ...BELT_GRUNT_ASSETS,
    ...STAGE_AMBIENT_ASSETS,
    ...PROP_IMPACT_ASSETS,
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/fx/hit-impact-v2.webp', '/art/fx/combat-impact-v1.webp', '/assets/render/CombatImpactAssets.js', '/assets/scenes/Stage1Scene.js', '/art/stage-backgrounds-v2/newyork.webp', '/art/foregrounds/stage1-foreground.webp', '/audio/score-v2/stage1-theme.ogg'],
  'stage-2': [
    ...THROW_ESCAPE_ASSETS,
    ...STAGE_PROP_ASSETS,
    ...BELT_GRUNT_ASSETS,
    ...STAGE_AMBIENT_ASSETS,
    ...PROP_IMPACT_ASSETS,
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/fx/hit-impact-v2.webp', '/art/fx/combat-impact-v1.webp', '/assets/render/CombatImpactAssets.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage2Scene.js', '/art/stage-backgrounds-v2/hongkong.webp', '/art/foregrounds/stage2-foreground.webp', '/audio/score-v2/stage2-theme.ogg'],
  'stage-3': [
    ...THROW_ESCAPE_ASSETS,
    ...STAGE_PROP_ASSETS,
    ...BELT_GRUNT_ASSETS,
    ...STAGE_AMBIENT_ASSETS,
    ...PROP_IMPACT_ASSETS,
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/fx/hit-impact-v2.webp', '/art/fx/combat-impact-v1.webp', '/assets/render/CombatImpactAssets.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage3Scene.js', '/art/stage-backgrounds-v2/japan.webp', '/art/foregrounds/stage3-foreground.webp', '/audio/score-v2/stage3-theme.ogg'],
  'stage-4': [
    ...THROW_ESCAPE_ASSETS,
    ...STAGE_PROP_ASSETS,
    ...BELT_GRUNT_ASSETS,
    ...STAGE_AMBIENT_ASSETS,
    ...PROP_IMPACT_ASSETS,
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/fx/hit-impact-v2.webp', '/art/fx/combat-impact-v1.webp', '/assets/render/CombatImpactAssets.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage4Scene.js', '/art/stage-backgrounds-v2/london.webp', '/art/foregrounds/stage4-foreground.webp', '/audio/score-v2/stage4-theme.ogg'],
  'stage-5': [
    '/art/animation-hq/urien/crouch-guard-v1.webp', '/art/animation-hq/gill/crouch-guard-v1.webp',
    '/art/animation-hq/urien/crouch-parry-v1.webp', '/art/animation-hq/gill/crouch-parry-v1.webp',
    ...THROW_ESCAPE_ASSETS,
    ...STAGE_PROP_ASSETS,
    ...BELT_GRUNT_ASSETS,
    ...STAGE_AMBIENT_ASSETS,
    ...PROP_IMPACT_ASSETS,
    ...KNOCKDOWN_ASSETS,
    ...AIR_FALL_ASSETS,
    ...SUPER_HIT_ASSETS,
    ...THROW_ATTACKER_ASSETS,
    ...THROW_VICTIM_ASSETS,
    '/art/fx/hit-impact-v2.webp', '/art/fx/combat-impact-v1.webp', '/assets/render/CombatImpactAssets.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage5Scene.js', '/art/stage-backgrounds-v2/society.webp', '/art/foregrounds/stage5-foreground.webp', '/art/portraits/urien.webp', '/art/portraits/gill.webp', '/audio/score-v2/stage5-theme.ogg', '/audio/score-v2/final-boss-theme.ogg'],
  'ending': ['/assets/scenes/EndingScene.js', '/assets/game/EndingProfiles.js', '/art/ending-keyart.png', '/audio/score-v2/ending-theme.ogg'],
};

// Explicit offline preparation includes all enabled character poses and their
// support textures. These remain outside the normal startup/stage preload lists.
export const CAMPAIGN_OFFLINE_URLS = Array.from(new Set([
  ...ASSET_GROUPS['character-hd'],
  ...ASSET_GROUPS['character-hq'],
  ...[...CHARACTERS, ...BOSS_CHARACTERS].flatMap(character =>
    animationSequencesFor(character.id, true).map(sequence => sequence.asset)),
  '/art/special-keyposes/ken/hadoken.webp', '/art/special-keyposes/ken/shoryuken.webp',
  '/art/special-keyposes/ken/tatsumaki.webp', '/art/special-keyposes/ken/super-rush.webp',
  '/art/special-keyposes/chunli/kikoken.webp', '/art/special-keyposes/chunli/spinning-bird-kick.webp',
  ...ASSET_GROUPS['stage-1'],
  ...ASSET_GROUPS['stage-2'],
  ...ASSET_GROUPS['stage-3'],
  ...ASSET_GROUPS['stage-4'],
  ...ASSET_GROUPS['stage-5'],
  ...ASSET_GROUPS.ending,
]));

export interface OfflineCampaignStatus {
  supported: boolean;
  ready: boolean;
  cached: number;
  total: number;
  missing: string[];
}

export interface OfflineTransitionDetail {
  id: '1-2' | '2-3' | '3-4' | '4-5' | '5-ending';
  label: string;
  ready: boolean;
  missing: string[];
}

export interface OfflineTransitionStatus {
  ready: boolean;
  readyCount: number;
  total: number;
  transitions: OfflineTransitionDetail[];
}


export interface OfflineDynamicImportStep {
  id: OfflineTransitionDetail['id'];
  label: string;
  url: string;
  exportName: string;
  ready: boolean;
  durationMs: number;
  error?: string;
}

export interface OfflineDynamicImportAudit {
  supported: boolean;
  offline: boolean;
  controlled: boolean;
  ready: boolean;
  loaded: number;
  total: number;
  steps: OfflineDynamicImportStep[];
  message: string;
}

export const OFFLINE_TRANSITIONS: readonly { id: OfflineTransitionDetail['id']; label: string; urls: readonly string[] }[] = [
  { id: '1-2', label: 'STAGE 1 → 2', urls: ASSET_GROUPS['stage-2'] },
  { id: '2-3', label: 'STAGE 2 → 3', urls: ASSET_GROUPS['stage-3'] },
  { id: '3-4', label: 'STAGE 3 → 4', urls: ASSET_GROUPS['stage-4'] },
  { id: '4-5', label: 'STAGE 4 → 5', urls: ASSET_GROUPS['stage-5'] },
  { id: '5-ending', label: 'STAGE 5 → ENDING', urls: ASSET_GROUPS.ending },
];

export class AssetManager {
  private loadedGroups = new Set<string>();
  private loading = new Map<string, Promise<void>>();

  async loadGroup(name: AssetGroupName, onProgress?: (done: number, total: number) => void): Promise<void> {
    if (this.loadedGroups.has(name)) { onProgress?.(1, 1); return; }
    const existing = this.loading.get(name);
    if (existing) { await existing; onProgress?.(1, 1); return; }
    const urls = ASSET_GROUPS[name] ?? [];
    const task = (async () => {
      if (urls.length === 0) { this.loadedGroups.add(name); onProgress?.(1, 1); return; }
      let done = 0;
      onProgress?.(0, urls.length);
      await Promise.all(urls.map(async (url) => {
        this.modulePreload(url);
        const preferFreshCode = typeof navigator !== 'undefined' && navigator.onLine !== false && url.startsWith('/assets/') && url.endsWith('.js');
        const response = await this.fetchWithCacheFallback(url, preferFreshCode);
        if (!response.ok) throw new Error(`Asset preload failed: ${url} (${response.status})`);
        done += 1;
        onProgress?.(done, urls.length);
      }));
      this.loadedGroups.add(name);
      this.notifyServiceWorker(urls);
    })();
    this.loading.set(name, task);
    try { await task; } finally { this.loading.delete(name); }
  }

  prefetchGroup(name: AssetGroupName): void {
    if (this.loadedGroups.has(name) || this.loading.has(name)) return;
    const run = () => { void this.loadGroup(name).catch(() => undefined); };
    const delay = runtimeQuality.releaseProfile.idlePrefetchDelayMs;
    const idle = (globalThis as typeof globalThis & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(run, { timeout: Math.max(900, delay * 3) });
    else setTimeout(run, delay);
  }

  async prepareOfflineCampaign(onProgress?: (done: number, total: number) => void): Promise<OfflineCampaignStatus> {
    const urls = CAMPAIGN_OFFLINE_URLS;
    let done = 0;
    onProgress?.(0, urls.length);
    for (const url of urls) {
      this.modulePreload(url);
      const response = await this.fetchWithCacheFallback(url, true);
      if (!response.ok) throw new Error(`Offline cache failed: ${url} (${response.status})`);
      done += 1;
      onProgress?.(done, urls.length);
    }
    this.notifyServiceWorker(urls);
    return this.verifyOfflineCampaign();
  }

  async verifyOfflineCampaign(): Promise<OfflineCampaignStatus> {
    if (typeof caches === 'undefined') return { supported: false, ready: false, cached: 0, total: CAMPAIGN_OFFLINE_URLS.length, missing: [...CAMPAIGN_OFFLINE_URLS] };
    const missing: string[] = [];
    const cache = await caches.open(GAME_CACHE_NAME);
    for (const url of CAMPAIGN_OFFLINE_URLS) {
      const response = await cache.match(url);
      if (!response) missing.push(url);
    }
    return { supported: true, ready: missing.length === 0, cached: CAMPAIGN_OFFLINE_URLS.length - missing.length, total: CAMPAIGN_OFFLINE_URLS.length, missing };
  }


  async verifyOfflineTransitions(): Promise<OfflineTransitionStatus> {
    if (typeof caches === 'undefined') {
      const transitions = OFFLINE_TRANSITIONS.map((transition) => ({ id: transition.id, label: transition.label, ready: false, missing: [...transition.urls] }));
      return { ready: false, readyCount: 0, total: transitions.length, transitions };
    }
    const cache = await caches.open(GAME_CACHE_NAME);
    const transitions: OfflineTransitionDetail[] = [];
    for (const transition of OFFLINE_TRANSITIONS) {
      const missing: string[] = [];
      for (const url of transition.urls) if (!await cache.match(url)) missing.push(url);
      transitions.push({ id: transition.id, label: transition.label, ready: missing.length === 0, missing });
    }
    const readyCount = transitions.filter((transition) => transition.ready).length;
    return { ready: readyCount === transitions.length, readyCount, total: transitions.length, transitions };
  }


  async auditOfflineDynamicImports(timeoutMs = 12_000): Promise<OfflineDynamicImportAudit> {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
    const supported = typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    const specs = [
      { id: '1-2', label: 'STAGE 1 → 2', url: '/assets/scenes/Stage2Scene.js', exportName: 'Stage2Scene' },
      { id: '2-3', label: 'STAGE 2 → 3', url: '/assets/scenes/Stage3Scene.js', exportName: 'Stage3Scene' },
      { id: '3-4', label: 'STAGE 3 → 4', url: '/assets/scenes/Stage4Scene.js', exportName: 'Stage4Scene' },
      { id: '4-5', label: 'STAGE 4 → 5', url: '/assets/scenes/Stage5Scene.js', exportName: 'Stage5Scene' },
      { id: '5-ending', label: 'STAGE 5 → ENDING', url: '/assets/scenes/EndingScene.js', exportName: 'EndingScene' },
    ] as const;
    if (!supported) return { supported: false, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'MODULE WORKER UNSUPPORTED' };
    if (!offline) return { supported: true, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'TURN ON AIRPLANE MODE / GO OFFLINE' };
    if (!controlled) return { supported: true, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'SERVICE WORKER NOT CONTROLLING APP' };

    const cached = await this.verifyOfflineTransitions();
    if (!cached.ready) return { supported: true, offline, controlled, ready: false, loaded: cached.readyCount, total: cached.total, steps: [], message: `OFFLINE CACHE INCOMPLETE ${cached.readyCount}/${cached.total}` };

    const source = `
const specs = ${JSON.stringify(specs)};
const documentUrl = ${JSON.stringify(window.location.href)};
const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
(async () => {
  const steps = [];
  for (const spec of specs) {
    const started = now();
    try {
      const mod = await import(new URL(spec.url, documentUrl).href);
      const ready = typeof mod[spec.exportName] === 'function';
      steps.push({ ...spec, ready, durationMs: Math.max(0, now() - started), ...(ready ? {} : { error: 'EXPECTED EXPORT MISSING' }) });
    } catch (error) {
      steps.push({ ...spec, ready: false, durationMs: Math.max(0, now() - started), error: String(error) });
    }
  }
  self.postMessage({ steps });
})().catch((error) => self.postMessage({ fatal: String(error), steps: [] }));`;
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      const steps = await new Promise<OfflineDynamicImportStep[]>((resolve) => {
        const worker = new Worker(blobUrl, { type: 'module', name: 'ssc-offline-import-audit' });
        let settled = false;
        const finish = (value: OfflineDynamicImportStep[]) => { if (settled) return; settled = true; worker.terminate(); resolve(value); };
        const timer = window.setTimeout(() => finish(specs.map((spec) => ({ ...spec, ready: false, durationMs: timeoutMs, error: 'AUDIT TIMEOUT' }))), timeoutMs);
        worker.onmessage = (event: MessageEvent<{ steps?: OfflineDynamicImportStep[] }>) => { window.clearTimeout(timer); finish(Array.isArray(event.data?.steps) ? event.data.steps : []); };
        worker.onerror = (event) => { window.clearTimeout(timer); finish(specs.map((spec) => ({ ...spec, ready: false, durationMs: 0, error: event.message || 'MODULE WORKER ERROR' }))); };
      });
      const loaded = steps.filter((step) => step.ready).length;
      return { supported: true, offline, controlled, ready: loaded === specs.length, loaded, total: specs.length, steps, message: loaded === specs.length ? `OFFLINE DYNAMIC IMPORT ${loaded}/${specs.length} PASS` : `OFFLINE DYNAMIC IMPORT ${loaded}/${specs.length} CHECK` };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async verifyNetworkCutFallback(urls: readonly string[] = CAMPAIGN_OFFLINE_URLS): Promise<{ ready: boolean; cached: number; total: number; missing: string[] }> {
    if (typeof caches === 'undefined') return { ready: false, cached: 0, total: urls.length, missing: [...urls] };
    const cache = await caches.open(GAME_CACHE_NAME);
    const missing: string[] = [];
    for (const url of urls) if (!await cache.match(url)) missing.push(url);
    return { ready: missing.length === 0, cached: urls.length - missing.length, total: urls.length, missing };
  }

  invalidateGroup(name: AssetGroupName): void { this.loadedGroups.delete(name); }
  hasGroup(name: string): boolean { return this.loadedGroups.has(name); }

  private async fetchWithCacheFallback(url: string, preferNetwork: boolean): Promise<Response> {
    const cached = async (): Promise<Response | undefined> => {
      if (typeof caches === 'undefined') return undefined;
      try {
        const cache = await caches.open(GAME_CACHE_NAME);
        return await cache.match(url) ?? undefined;
      } catch { return undefined; }
    };

    if (!preferNetwork) {
      const hit = await cached();
      if (hit) return hit;
    }

    try {
      const response = await fetch(url, { cache: preferNetwork ? 'reload' : 'force-cache' });
      if (response.ok) await this.cacheResponse(url, response.clone());
      return response;
    } catch (error) {
      const hit = await cached();
      if (hit) return hit;
      throw error;
    }
  }

  private async cacheResponse(url: string, response: Response): Promise<void> {
    if (typeof caches === 'undefined' || !response.ok) return;
    try { const cache = await caches.open(GAME_CACHE_NAME); await cache.put(url, response); } catch { /* CacheStorage can be unavailable in privacy modes. */ }
  }

  private notifyServiceWorker(urls: readonly string[]): void {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller || urls.length === 0) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls: [...urls] });
  }

  private modulePreload(url: string): void {
    if (!url.startsWith('/assets/') || !url.endsWith('.js')) return;
    if (typeof document === 'undefined' || document.querySelector(`link[data-game-preload="${url}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    link.dataset.gamePreload = url;
    document.head.appendChild(link);
  }
}
