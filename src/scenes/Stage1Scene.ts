import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import { getCharacter } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import { CombatWorld } from '../combat/CombatWorld.js';
import type { CombatEvent } from '../combat/CombatTypes.js';
import type { Fighter } from '../combat/Fighter.js';
import { specialMovesFor } from '../combat/MoveLibrary.js';
import { techniqueCatalogFor } from '../combat/TechniqueLibrary.js';
import { drawCharacterPreview, drawCombatFighter } from '../render/Visuals.js';
import { superCameraProfileForMotif } from '../render/SuperCameraProfiles.js';
import { bossCinematicPose, type BossCinematicKind } from '../render/BossCinematicProfiles.js';
import { finalKoPose } from '../render/FinalSequenceProfiles.js';
import type { StageResult } from '../game/StageResult.js';
import { formatClearTime } from '../game/StageResult.js';
import { runtimeQuality } from '../core/RuntimeQuality.js';
import { combatFxDensity, qualityDetailCount, stageVisualProfile } from '../render/FinalVisualProfiles.js';
import { hitSparkProfile, stagePresentationProfile } from '../render/FinalPresentationProfiles.js';
import { attackTrailProfile, hudModeProfile, projectileTrailProfile, stageLightingProfile } from '../render/CombatPresentationProfiles.js';
import { bossHudPhaseProfile, fxPolishProfile, stageDepthProfile, transitionPolishProfile } from '../render/FinalPolishProfiles.js';
import { cinematicTimingForEvent } from '../render/CinematicTimingProfiles.js';
import { artImage, characterPortraitKey, PLAYABLE_ATTACK_ATLAS_KEYS, PLAYABLE_COMBAT_SPRITE_KEYS, preloadArtAssets, stageArtKey, stageForegroundKey } from '../render/ImageAssets.js';
import { characterTextureManager } from '../render/CharacterTextureManager.js';
import { animationTextureManager } from '../render/AnimationTextureManager.js';
import { closeSpacingStrength, fighterReadabilityProfile, foregroundOcclusionAlpha } from '../render/FighterReadabilityProfiles.js';
import { signatureMoveProfile } from '../render/SignatureMoveProfiles.js';
import { locomotionProfile } from '../render/LocomotionProfiles.js';
import { contactVisualEnvelope, contactVisualProfile } from '../render/ContactVisualProfiles.js';
import { heroContactSample } from '../render/HeroContactProfiles.js';

export class Stage1Scene implements Scene {
  private world: CombatWorld;
  private phase: 'belt' | 'transition' | 'duel' | 'final-transition' | 'final-duel' | 'final-ko' | 'clear' | 'defeat' = 'belt';
  private phaseFrames = 0;
  private time = 0;
  private stageTime = 99;
  private introFrames = 105;
  private hitPulse = 0;
  private beltWave = 0;
  private waveBreakFrames = 0;
  private defeatedEnemies = 0;
  private readonly beltWaveCount = 3;
  private cameraX = 0;
  private beltState: 'fight' | 'travel' = 'fight';
  private clearDispatched = false;
  private finalKoFrames = 0;
  private defeatFrames = 0;
  private defeatDispatched = false;
  private defeatReason: 'ko' | 'double-ko' | 'time-over' = 'ko';
  private paused = false;
  private gillPhase: 1 | 2 | 3 = 1;
  private gillPhaseBanner = 0;
  private bossPatternCooldown = 0;
  private bossPatternFlash = 0;
  private bossPatternIndex = 0;
  private soundtrackStep = -1;
  private cameraKickFrames = 0;
  private cameraKickPower = 0;
  private cameraFocusFrames = 0;
  private cameraFocusX = 640;
  private cameraFocusY = 360;
  private cameraFocusZoom = 1;
  private cameraSlowFrames = 0;
  private cameraLetterboxFrames = 0;
  private superCameraFrames = 0;
  private superCameraForward = 0;
  private superCameraPanY = 0;
  private superCameraZoom = 1;
  private cameraRhythmFrames = 0;
  private cameraRhythmTotal = 0;
  private cameraRhythmPan = 0;
  private cameraCatchFrames = 0;
  private cameraCatchTotal = 0;
  private cameraCatchX = 640;
  private cameraCatchY = 360;
  private cameraCatchZoom = 1;
  private readonly stageLength: number;
  private readonly areaStarts = [0, 1220, 2440] as const;
  private elapsedCombatFrames = 0;
  private carriedDamageDealt = 0;
  private carriedDamageTaken = 0;
  private carriedMaxComboHits = 0;
  private carriedMaxComboDamage = 0;
  private carriedParries = 0;
  private carriedRedParries = 0;
  private carriedSupersUsed = 0;
  private carriedThrowsLanded = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    readonly playerDef: CharacterDef,
    readonly superArt: SuperArtDef,
    private readonly stageId: 1 | 2 | 3 | 4 | 5 = 1,
    private readonly onClear?: (result: StageResult) => void,
    private readonly onDefeat?: () => void,
  ) {
    this.stageLength = stageId === 1 ? 3560 : stageId === 2 ? 3820 : stageId === 3 ? 4020 : stageId === 4 ? 4140 : 4320;
    this.introFrames = transitionPolishProfile(stageId).introFrames;
    this.world = new CombatWorld(playerDef, getCharacter(playerDef.id === 'KEN' ? 'RYU' : 'KEN'), 'belt', superArt);
    this.world.player.superGauge = Math.round(this.world.player.superStockCost * .55);
    this.spawnBeltWave(0);
    this.seedStageProps();
  }

  enter(): void {
    const preload = [stageArtKey(this.stageId), stageForegroundKey(this.stageId)] as Array<ReturnType<typeof stageArtKey> | ReturnType<typeof stageForegroundKey> | NonNullable<ReturnType<typeof characterPortraitKey>>>;
    const playerPortrait = characterPortraitKey(this.playerDef.id);
    if (playerPortrait) preload.push(playerPortrait);
    if (this.stageId === 5) {
      const urienPortrait = characterPortraitKey('URIEN');
      const gillPortrait = characterPortraitKey('GILL');
      if (urienPortrait) preload.push(urienPortrait);
      if (gillPortrait) preload.push(gillPortrait);
    }
    preloadArtAssets([...preload, ...PLAYABLE_COMBAT_SPRITE_KEYS, ...PLAYABLE_ATTACK_ATLAS_KEYS]);
    characterTextureManager.focusCharacter(this.playerDef.id);
    characterTextureManager.preloadCharacter(this.world.enemy.character.id);
    if (characterTextureManager.wantsHd()) {
      animationTextureManager.preloadCharacter(this.playerDef.id, 'combat');
      animationTextureManager.preloadCharacter(this.world.enemy.character.id, 'combat');
    }
    this.audio.playStagePulse();
    this.audio.playStageIntro?.(this.stageId);
    this.audio.startStageSoundscape?.(this.stageId);
    this.audio.setStageIntensity?.('belt');
  }
  exit(): void { this.audio.setPaused?.(false); this.audio.stopSoundscape?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number, tick: number): void {
    if (this.phase === 'defeat') {
      if (this.defeatFrames > 0) {
        this.defeatFrames = Math.max(0, this.defeatFrames - 1);
        this.cameraFocusFrames = Math.max(this.cameraFocusFrames, 2);
        this.cameraFocusX = this.world.player.x;
        this.cameraFocusY = this.world.player.y - 105;
        this.cameraFocusZoom = 1.1;
      } else if (!this.defeatDispatched && (this.input.pressed('start') || this.input.pressed('confirm') || this.input.pressed('lp') || this.input.pressed('lk'))) {
        this.defeatDispatched = true;
        this.onDefeat?.();
      }
      return;
    }
    const pauseAllowed = this.introFrames <= 0 && (this.phase === 'belt' || this.phase === 'duel' || this.phase === 'final-duel');
    if (pauseAllowed && this.input.pressed('start')) {
      this.paused = !this.paused;
      this.audio.setPaused?.(this.paused);
      return;
    }
    if (this.paused) return;

    const visualScale = this.cameraSlowFrames > 0 ? .42 : 1;
    this.time += dt * visualScale;
    this.tickCameraPresentation();
    const beat = Math.floor(this.time * 2);
    if (beat !== this.soundtrackStep) {
      this.soundtrackStep = beat;
      const intensity = this.phase === 'final-duel' || this.phase === 'final-transition' ? 'final' : this.phase === 'duel' || this.phase === 'transition' ? 'duel' : 'belt';
      this.audio.playStageBeat?.(this.stageId, beat, intensity);
    }
    if (this.introFrames > 0) { this.introFrames -= 1; return; }

    if (this.phase === 'transition') {
      this.phaseFrames -= 1;
      if (this.phaseFrames === transitionPolishProfile(this.stageId).duelPrepareAt) this.prepareDuel();
      if (this.phaseFrames <= 0) this.phase = 'duel';
      return;
    }
    if (this.phase === 'final-transition') {
      this.phaseFrames -= 1;
      if (this.phaseFrames === transitionPolishProfile(this.stageId).duelPrepareAt) this.prepareFinalDuel();
      if (this.phaseFrames <= 0) this.phase = 'final-duel';
      return;
    }
    if (this.phase === 'final-ko') {
      this.finalKoFrames = Math.max(0, this.finalKoFrames - 1);
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, 2);
      this.cameraFocusX = this.world.enemy.x;
      this.cameraFocusY = this.world.enemy.y - 120;
      this.cameraFocusZoom = 1.18;
      if (this.finalKoFrames === 105) { this.audio.playBossCue?.(true); this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, 105); }
      if (this.finalKoFrames <= 0) { this.phase = 'clear'; this.phaseFrames = transitionPolishProfile(this.stageId).finalClearFrames; this.world.player.enterVictoryPose(); this.audio.playStageClear?.(true); this.audio.setStageIntensity?.('duel'); }
      return;
    }
    if (this.phase === 'clear') {
      this.phaseFrames = Math.max(0, this.phaseFrames - 1);
      const timing = transitionPolishProfile(this.stageId);
      const dispatchAt = this.stageId === 5 ? timing.finalClearDispatchAt : timing.clearDispatchAt;
      if (!this.clearDispatched && this.phaseFrames <= dispatchAt) { this.clearDispatched = true; this.onClear?.(this.stageResult()); }
      return;
    }
    if (this.phase === 'belt' && this.waveBreakFrames > 0) {
      this.waveBreakFrames -= 1;
      if (this.waveBreakFrames === 0) this.beltState = 'fight';
      this.updateCamera();
      return;
    }

    const timerActive = this.phase !== 'belt' || this.beltState === 'fight';
    if (timerActive) this.stageTime = Math.max(0, this.stageTime - dt);
    if (timerActive && this.stageTime <= 0) {
      this.phase = 'defeat';
      this.defeatReason = 'time-over';
      this.defeatFrames = 90;
      this.defeatDispatched = false;
      this.world.projectiles.length = 0;
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, 90);
      this.cameraFocusX = this.world.player.x;
      this.cameraFocusY = this.world.player.y - 105;
      this.cameraFocusZoom = 1.08;
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, 90);
      return;
    }
    this.elapsedCombatFrames += 1;
    this.world.update(this.input, tick);
    this.updateCamera();
    if (this.phase === 'duel' && this.stageId === 5) this.updateUrienPattern();
    if (this.phase === 'final-duel') { this.updateGillPhase(); this.updateGillPattern(); }
    if (this.bossPatternFlash > 0) this.bossPatternFlash -= 1;
    if (this.gillPhaseBanner > 0) this.gillPhaseBanner -= 1;
    for (const event of this.world.events) {
      if (event.audioPlayed) continue;
      event.audioPlayed = true;
      this.triggerCameraForEvent(event);
      if (event.type === 'hit' || event.type === 'counter') this.audio.playHit(event.power);
      else if (event.type === 'air-hit') this.audio.playAirHit?.(event.power);
      else if (event.type === 'command-hit') this.audio.playCommandHit?.(event.power);
      else if (event.type === 'target-hit') this.audio.playTargetHit?.(event.power);
      else if (event.type === 'block') this.audio.playBlock?.(event.power);
      else if (event.type === 'parry' || event.type === 'red-parry') this.audio.playParry(event.type === 'red-parry');
      else if (event.type === 'throw-escape') this.audio.playThrowEscape?.();
      else if (event.type === 'super-flash') this.audio.playSuperStart?.();
      else if (event.type === 'super-impact') this.audio.playSuperImpact?.(event.power);
      else if (event.type === 'boss-warning' || event.type === 'boss-burst') this.audio.playBossCue?.(event.type === 'boss-burst');
      else if (event.type === 'juggle') this.audio.playAirHit?.(Math.max(80, event.power * 28));
      else if (event.type === 'wall-bounce' || event.type === 'ground-bounce') this.audio.playHit(Math.max(150, event.power));
      else if (event.type === 'ko') this.audio.playKo?.();
      else if (event.type === 'enemy-collision' || event.type === 'wall-impact' || event.type === 'prop-break') this.audio.playHit(Math.max(90, event.power));
      if (event.power > 0 && event.type !== 'block') this.hitPulse = Math.max(this.hitPulse, Math.min(12, Math.round(event.power / 18)));
    }
    if (this.hitPulse > 0) this.hitPulse -= 1;

    if (this.world.player.hp <= 0) {
      this.phase = 'defeat';
      this.defeatReason = this.world.livingEnemies.length === 0 ? 'double-ko' : 'ko';
      this.defeatFrames = 120;
      this.defeatDispatched = false;
      this.world.projectiles.length = 0;
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, 120);
      if (this.defeatReason === 'double-ko' && this.world.enemies.length > 0) {
        const enemy = this.world.enemies[0]!;
        this.cameraFocusX = (this.world.player.x + enemy.x) * .5;
        this.cameraFocusY = Math.min(this.world.player.y, enemy.y) - 105;
        this.cameraFocusZoom = 1.06;
      } else {
        this.cameraFocusX = this.world.player.x;
        this.cameraFocusY = this.world.player.y - 105;
        this.cameraFocusZoom = 1.1;
      }
      this.cameraSlowFrames = Math.max(this.cameraSlowFrames, 24);
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, 120);
      return;
    }

    if (this.phase === 'belt' && this.beltState === 'fight' && this.world.livingEnemies.length === 0) {
      this.defeatedEnemies += this.world.enemies.length;
      if (this.beltWave < this.beltWaveCount - 1) {
        this.beltWave += 1;
        this.beltState = 'travel';
        this.world.projectiles.length = 0;
        this.world.enemies.length = 0;
        this.world.rules.arenaLeft = Math.max(96, this.areaStarts[this.beltWave - 1] + 120);
        this.world.rules.arenaRight = this.areaStarts[this.beltWave] + 260;
      } else {
        this.phase = 'transition';
        this.phaseFrames = transitionPolishProfile(this.stageId).duelFrames;
        this.audio.playDuelTransition?.(false);
        this.audio.setStageIntensity?.('duel');
      }
    } else if (this.phase === 'belt' && this.beltState === 'travel' && this.world.player.x >= this.areaStarts[this.beltWave] + 150) {
      this.spawnBeltWave(this.beltWave);
      this.waveBreakFrames = 54;
    } else if (this.phase === 'duel' && this.world.enemy.hp <= 0) {
      if (this.stageId === 5) {
        this.phase = 'final-transition';
        this.phaseFrames = transitionPolishProfile(this.stageId).duelFrames;
        this.audio.playDuelTransition?.(true);
        this.audio.setStageIntensity?.('final');
      } else {
        this.phase = 'clear';
        this.phaseFrames = transitionPolishProfile(this.stageId).clearFrames;
        this.world.player.enterVictoryPose();
        this.audio.playStageClear?.(false);
      }
    } else if (this.phase === 'final-duel' && this.world.enemy.hp <= 0) {
      this.phase = 'final-ko';
      this.finalKoFrames = 180;
      this.audio.playFinalKo?.();
      this.world.projectiles.length = 0;
      this.cameraFocusFrames = 180;
      this.cameraFocusX = this.world.enemy.x;
      this.cameraFocusY = this.world.enemy.y - 120;
      this.cameraFocusZoom = 1.2;
      this.cameraSlowFrames = 42;
      this.cameraLetterboxFrames = 180;
      this.world.events.push({ type: 'boss-burst', x: this.world.enemy.x, y: this.world.enemy.y - 120, power: 360, ttl: 90, label: 'DIVINITY COLLAPSE' });
    }
  }

  render({ ctx, width, height }: RenderContext, alpha: number): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    const scroll = this.world.rules.mode === 'belt' ? this.cameraX : 0;
    const camera = this.cameraPresentation(scroll);
    ctx.save();
    ctx.translate(640, 360);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-640 + camera.panX + camera.shakeX, -360 + camera.panY + camera.shakeY);
    ctx.translate(-scroll, 0);
    this.drawStageBackdrop(ctx);
    this.drawDepthParallax(ctx, scroll, 'far');
    this.drawBackgroundMotion(ctx);
    this.drawStageSetDressing(ctx);
    this.drawArenaFloor(ctx);
    this.drawStageLighting(ctx);
    this.drawFinalArenaEscalation(ctx);
    this.drawBossArenaAura(ctx);
    this.drawProps(ctx);
    // Large near-field art stays behind the fighters. Only small dynamic foreground props may pass in front,
    // and those props fade locally around combatants to preserve silhouettes.
    this.drawStageForegroundArt(ctx, scroll);
    this.drawDepthParallax(ctx, scroll, 'near');
    const fighters = [...this.world.enemies, this.world.player].filter((fighter) => !(this.phase === 'final-ko' && fighter.character.id === 'GILL')).sort((a, b) => a.y - b.y);
    this.drawFighterContrastFields(ctx, fighters);
    this.drawCloseSpacingSeparation(ctx, fighters);
    for (let index = 0; index < fighters.length; index += 1) {
      const fighter = fighters[index]!;
      if (fighter.installFrames > 0) this.drawInstallAura(ctx, fighter);
      this.drawFighterFloorReflection(ctx, fighter);
      this.drawFighterGroundInteraction(ctx, fighter);
      this.drawFighterStageShadow(ctx, fighter);
      this.drawFighterReadabilityAccent(ctx, fighter);
      this.drawAttackMotionArc(ctx, fighter);
      this.drawHeroContactSequence(ctx, fighter);
      this.drawSignatureContactBloom(ctx, fighter);
      drawCombatFighter(ctx, fighter, alpha, this.time + index * .17);
      this.drawFighterRimLight(ctx, fighter);
    }
    this.drawFinalKoSequence(ctx);
    this.drawProjectiles(ctx);
    this.drawFx(ctx);
    this.drawForegroundMotion(ctx, fighters);
    ctx.restore();
    this.drawAtmosphere(ctx);
    this.drawStageColorGrade(ctx);
    this.drawImpactFrameOverlay(ctx);
    this.drawCinematicLetterbox(ctx);
    this.drawSuperOverlay(ctx);
    this.drawHud(ctx);
    this.drawIntro(ctx);
    this.drawWaveCard(ctx);
    this.drawAdvancePrompt(ctx);
    this.drawTransition(ctx);
    this.drawFinalTransition(ctx);
    this.drawGillPhaseOverlay(ctx);
    this.drawBossPatternFlash(ctx);
    this.drawStageClear(ctx);
    this.drawHelp(ctx);
    this.drawDefeat(ctx);
    this.drawPause(ctx);
    ctx.restore();
  }



  private tickCameraPresentation(): void {
    if (this.cameraKickFrames > 0) this.cameraKickFrames -= 1;
    else this.cameraKickPower = 0;
    if (this.cameraFocusFrames > 0) this.cameraFocusFrames -= 1;
    if (this.cameraSlowFrames > 0) this.cameraSlowFrames -= 1;
    if (this.cameraLetterboxFrames > 0) this.cameraLetterboxFrames -= 1;
    if (this.superCameraFrames > 0) this.superCameraFrames -= 1;
    if (this.cameraRhythmFrames > 0) this.cameraRhythmFrames -= 1;
    else { this.cameraRhythmTotal = 0; this.cameraRhythmPan = 0; }
    if (this.cameraCatchFrames > 0) this.cameraCatchFrames -= 1;
    else { this.cameraCatchTotal = 0; this.cameraCatchZoom = 1; }
  }

  private triggerCameraForEvent(event: CombatEvent): void {
    const impact = event.type === 'hit' || event.type === 'air-hit' || event.type === 'command-hit' || event.type === 'target-hit' || event.type === 'counter' || event.type === 'super-impact' || event.type === 'wall-bounce' || event.type === 'ground-bounce' || event.type === 'enemy-collision' || event.type === 'wall-impact';
    if (impact || event.type === 'parry' || event.type === 'red-parry') {
      const timing = cinematicTimingForEvent(event);
      this.cameraKickFrames = Math.max(this.cameraKickFrames, timing.kickFrames);
      this.cameraKickPower = Math.max(this.cameraKickPower, timing.kickPower);
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, timing.focusFrames);
      this.cameraFocusX = event.x;
      this.cameraFocusY = event.y;
      this.cameraFocusZoom = Math.max(this.cameraFocusZoom, timing.focusZoom);
      this.cameraSlowFrames = Math.max(this.cameraSlowFrames, timing.slowFrames);
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, timing.letterboxFrames);

      if (Math.abs(timing.rhythmPan) > .01) {
        const total = Math.max(1, event.hitTotal ?? 1);
        const index = Math.max(1, event.hitIndex ?? 1);
        const side = event.attackerSide === 'enemy' ? -1 : 1;
        const alternate = total > 1 && index % 2 === 0 ? -1 : 1;
        this.cameraRhythmTotal = Math.max(this.cameraRhythmTotal, event.type === 'super-impact' ? 10 : 7);
        this.cameraRhythmFrames = this.cameraRhythmTotal;
        this.cameraRhythmPan = timing.rhythmPan * side * alternate;
      }

      if (timing.catchFrames > 0) {
        this.cameraCatchTotal = timing.catchFrames;
        this.cameraCatchFrames = timing.catchFrames;
        this.cameraCatchX = event.x;
        this.cameraCatchY = event.y;
        this.cameraCatchZoom = timing.catchZoom;
      }
    }
    if (event.type === 'super-flash') {
      const profile = superCameraProfileForMotif(event.style);
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, profile.duration);
      this.cameraFocusX = event.x;
      this.cameraFocusY = event.y;
      this.cameraFocusZoom = profile.zoom;
      this.cameraSlowFrames = Math.max(this.cameraSlowFrames, profile.slow);
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, profile.letterbox);
      this.superCameraFrames = profile.duration;
      this.superCameraForward = profile.panForward;
      this.superCameraPanY = profile.panY;
      this.superCameraZoom = profile.zoom;
    }
    if (event.type === 'boss-warning' || event.type === 'boss-burst') {
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, event.type === 'boss-warning' ? 26 : 18);
      this.cameraFocusX = event.x;
      this.cameraFocusY = event.y;
      this.cameraFocusZoom = this.phase === 'final-duel' ? 1.13 : 1.095;
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, 20);
      if (event.type === 'boss-burst') {
        this.cameraKickFrames = Math.max(this.cameraKickFrames, 10);
        this.cameraKickPower = Math.max(this.cameraKickPower, 7.5);
      }
    }
    if (event.type === 'ko') {
      this.cameraFocusFrames = Math.max(this.cameraFocusFrames, 34);
      this.cameraFocusX = event.x;
      this.cameraFocusY = event.y;
      this.cameraFocusZoom = 1.12;
      this.cameraSlowFrames = Math.max(this.cameraSlowFrames, 20);
      this.cameraLetterboxFrames = Math.max(this.cameraLetterboxFrames, 32);
    }
  }

  private cameraPresentation(scroll: number): { zoom: number; panX: number; panY: number; shakeX: number; shakeY: number } {
    let zoom = this.phase === 'final-duel' || this.phase === 'final-ko' ? 1.065 : this.phase === 'duel' || this.phase === 'defeat' ? 1.035 : 1;
    let panX = 0;
    let panY = 0;
    if (this.world.rules.mode === 'duel') {
      const enemy = this.world.enemy;
      const player = this.world.player;
      const midpointX = (player.x + enemy.x) * .5;
      const playerHead = player.y - player.jumpHeight - 92;
      const enemyHead = enemy.y - enemy.jumpHeight - 92;
      const midpointY = (playerHead + enemyHead) * .5;
      const separation = Math.abs(player.x - enemy.x);
      const heightGap = Math.abs(playerHead - enemyHead);
      const pairWeight = this.superCameraFrames > 0 ? .2 : .12;
      panX += (640 - midpointX) * pairWeight;
      panY += (330 - midpointY) * (this.superCameraFrames > 0 ? .075 : .045);
      const fitZoom = Math.max(1, Math.min(1.075, 1.078 - separation / 8500 - heightGap / 12000));
      if (this.superCameraFrames > 0) zoom = Math.max(1.015, Math.min(zoom, fitZoom + .025));
      else zoom = Math.max(zoom, fitZoom);
    }
    if (this.cameraFocusFrames > 0) {
      const strength = Math.min(.34, .13 + this.cameraFocusFrames / 110);
      const focusScreenX = this.cameraFocusX - scroll;
      panX += (640 - focusScreenX) * strength;
      panY += (356 - this.cameraFocusY) * strength * .48;
      zoom = Math.max(zoom, this.cameraFocusZoom);
    } else {
      this.cameraFocusZoom += (1 - this.cameraFocusZoom) * .15;
    }
    if (this.cameraCatchFrames > 0 && this.cameraCatchTotal > 0) {
      const progress = 1 - this.cameraCatchFrames / this.cameraCatchTotal;
      const catchEase = Math.sin(Math.min(1, progress) * Math.PI * .5) * (1 - progress * .34);
      const catchScreenX = this.cameraCatchX - scroll;
      panX += (640 - catchScreenX) * (.11 + catchEase * .18);
      panY += (350 - this.cameraCatchY) * (.05 + catchEase * .11);
      zoom = Math.max(zoom, 1 + (this.cameraCatchZoom - 1) * catchEase);
    }
    if (this.cameraRhythmFrames > 0 && this.cameraRhythmTotal > 0) {
      const rhythmLife = this.cameraRhythmFrames / this.cameraRhythmTotal;
      const rhythmPulse = Math.sin((1 - rhythmLife) * Math.PI) * rhythmLife;
      panX += this.cameraRhythmPan * rhythmPulse;
    }
    const legacyShake = this.hitPulse > 0 ? Math.sin(this.hitPulse * 5.3) * Math.min(4.5, this.hitPulse) : 0;
    let shakeX = legacyShake;
    let shakeY = 0;
    if (this.cameraKickFrames > 0 && this.cameraKickPower > 0) {
      const fade = this.cameraKickFrames / 12;
      const wave = this.cameraKickFrames * 2.73;
      shakeX += Math.sin(wave) * this.cameraKickPower * fade;
      shakeY += Math.cos(wave * 1.43) * this.cameraKickPower * .42 * fade;
    }
    if (this.superCameraFrames > 0) {
      const fade = Math.min(1, this.superCameraFrames / 10);
      const facing = this.world.player.currentMove?.superCost ? this.world.player.facing : this.world.enemy.currentMove?.superCost ? this.world.enemy.facing : 1;
      panX -= facing * this.superCameraForward * fade;
      panY += this.superCameraPanY * fade;
      zoom = Math.max(zoom, 1 + (this.superCameraZoom - 1) * fade);
    }
    return { zoom, panX, panY, shakeX, shakeY };
  }

  private drawImpactFrameOverlay(ctx: CanvasRenderingContext2D): void {
    const impact = [...this.world.events].reverse().find((event) =>
      event.type === 'super-impact' || event.type === 'red-parry' || event.type === 'parry' || event.type === 'counter' || event.type === 'wall-bounce' || event.type === 'ground-bounce'
    );
    if (!impact) return;
    const fx = fxPolishProfile(impact);
    const life = Math.max(0, Math.min(1, impact.ttl / Math.max(1, fx.baseTtl)));
    const sharp = Math.pow(life, 1.7);
    const superImpact = impact.type === 'super-impact';
    const red = impact.type === 'red-parry';
    const hitTotal = Math.max(1, impact.hitTotal ?? 1);
    const hitIndex = Math.max(1, Math.min(hitTotal, impact.hitIndex ?? 1));
    const hitRatio = hitTotal <= 1 ? 1 : (hitIndex - 1) / (hitTotal - 1);
    const finalHit = hitTotal > 1 && hitIndex >= hitTotal;
    const cadence = hitTotal > 1 ? .82 + hitRatio * .14 + (finalHit ? .24 : 0) : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flashAlpha = (superImpact ? .12 : red ? .085 : .045) * sharp * cadence;
    ctx.fillStyle = red ? `rgba(255,72,106,${flashAlpha})` : superImpact ? `rgba(255,238,174,${flashAlpha})` : `rgba(114,211,255,${flashAlpha})`;
    ctx.fillRect(0, 0, 1280, 720);
    if (runtimeQuality.currentTier !== 'low') {
      ctx.globalAlpha = sharp * (superImpact ? .22 : .1);
      ctx.fillStyle = superImpact ? '#fff1aa' : red ? '#ff5779' : '#77dfff';
      const band = (8 + (1 - life) * 18) * (finalHit ? 1.28 : 1);
      const cadenceOffset = hitTotal > 1 ? (hitIndex % 2 === 0 ? 5 : -5) : 0;
      ctx.fillRect(0, Math.max(0, impact.y - 3 - band * .5 + cadenceOffset), 1280, band);
      ctx.globalAlpha = sharp * .08 * cadence;
      ctx.fillRect(Math.max(0, impact.x - 5), 0, 10 + (finalHit ? 4 : 0), 720);
    }
    ctx.restore();
  }

  private drawCinematicLetterbox(ctx: CanvasRenderingContext2D): void {
    const transitionActive = this.phase === 'transition' || this.phase === 'final-transition' || this.phase === 'final-ko';
    if (this.cameraLetterboxFrames <= 0 && !transitionActive) return;
    const dynamic = this.cameraLetterboxFrames > 0 ? Math.min(1, this.cameraLetterboxFrames / 18) : 1;
    const height = this.phase === 'final-ko' ? 62 : transitionActive ? 48 : 18 + dynamic * 22;
    ctx.save();
    ctx.fillStyle = `rgba(2,3,7,${transitionActive ? .92 : .78 * dynamic})`;
    ctx.fillRect(0, 0, 1280, height);
    ctx.fillRect(0, 720 - height, 1280, height);
    ctx.restore();
  }


  private spawnBeltWave(index: number): void {
    const base = this.areaStarts[index];
    this.beltState = 'fight';
    this.stageTime = 99;
    this.world.rules.arenaLeft = Math.max(96, base + 70);
    this.world.rules.arenaRight = Math.min(this.stageLength - 80, base + 1120);
    this.world.rules.arenaTop = this.stageId === 2 ? (index === 1 ? 420 : 405) : this.stageId === 3 ? (index === 2 ? 410 : 398) : this.stageId === 4 ? (index === 2 ? 428 : 408) : this.stageId === 5 ? (index === 2 ? 420 : 404) : 394;
    this.world.rules.arenaBottom = this.stageId === 2 ? (index === 1 ? 558 : 575) : this.stageId === 3 ? (index === 2 ? 560 : 578) : this.stageId === 4 ? (index === 2 ? 552 : 574) : this.stageId === 5 ? (index === 2 ? 558 : 572) : 580;
    if (index > 0) this.world.player.x = Math.max(this.world.player.x, base + 170);

    if (this.stageId === 5) {
      if (index === 0) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('URIEN', 'FACILITY ENFORCER', '#596a8e', '#232b39', '#d8bb5e', 1.05, 1.07), archetype: 'heavy', x: base + 780, y: 455, hp: 470 },
          { character: this.enemyVariant('RYU', 'SOCIETY TECHNICIAN', '#c9cfd6', '#38445a', '#6bd2e8', .98, 1), archetype: 'technical', x: base + 960, y: 548, hp: 430 },
          { character: this.enemyVariant('KEN', 'SECURITY STRIKER', '#6a3441', '#202735', '#d6b557', 1.01, 1.02), archetype: 'mma', x: base + 1090, y: 420, hp: 410 },
        ]);
      } else if (index === 1) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('URIEN', 'ADVANCED ENFORCER', '#576a92', '#242a38', '#d7bd65', 1.08, 1.1), archetype: 'heavy', x: base + 690, y: 440, hp: 560 },
          { character: this.enemyVariant('IBUKI', 'AGILE OPERATIVE', '#756354', '#39404c', '#d45155', .93, .88), archetype: 'agile', x: base + 820, y: 560, hp: 410 },
          { character: this.enemyVariant('RYU', 'PARRY SPECIALIST', '#cfd4d8', '#33445b', '#72d8ee', .99, 1), archetype: 'technical', x: base + 950, y: 420, hp: 500 },
          { character: this.enemyVariant('ALEX', 'CAPTURE UNIT', '#3f5560', '#b98c65', '#e0b84e', 1.08, 1.13), archetype: 'grappler', x: base + 1080, y: 555, hp: 590 },
        ]);
      } else {
        this.world.replaceEnemies([
          { character: this.enemyVariant('URIEN', 'ELITE ENFORCER', '#536b98', '#222936', '#ebc861', 1.1, 1.12), archetype: 'technical', x: base + 835, y: 450, hp: 880 },
          { character: this.enemyVariant('KEN', 'ELITE GUARD', '#653441', '#202632', '#e0ba55', 1.03, 1.04), archetype: 'mma', x: base + 1035, y: 545, hp: 760 },
        ]);
      }
      return;
    }

    if (this.stageId === 3) {
      if (index === 0) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('MAKOTO', 'KARATE FIGHTER', '#eee4d2', '#b99042', '#bf3d3c', .94, .92), archetype: 'karate', x: base + 790, y: 452, hp: 350 },
          { character: this.enemyVariant('RYU', 'DOJO FIGHTER', '#d9d5cf', '#6e2930', '#d9aa43', .98, 1), archetype: 'technical', x: base + 970, y: 548, hp: 370 },
          { character: this.enemyVariant('IBUKI', 'FAST FIGHTER', '#665b50', '#3a3540', '#cf4d4d', .92, .86), archetype: 'agile', x: base + 1090, y: 420, hp: 315 },
        ]);
      } else if (index === 1) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('MAKOTO', 'COUNTER KARATE', '#efe7d7', '#c19b48', '#bd3f3f', .94, .92), archetype: 'technical', x: base + 700, y: 445, hp: 410 },
          { character: this.enemyVariant('ALEX', 'DOJO GRAPPLER', '#44594e', '#c08e60', '#df5448', 1.05, 1.1), archetype: 'grappler', x: base + 835, y: 560, hp: 470 },
          { character: this.enemyVariant('RYU', 'TECHNICAL FIGHTER', '#d7d4ce', '#672a31', '#e2b44a', .99, 1), archetype: 'technical', x: base + 950, y: 420, hp: 430 },
          { character: this.enemyVariant('YUN', 'FAST FIGHTER', '#315f87', '#dfd1ab', '#d9ad3e', .94, .9), archetype: 'agile', x: base + 1060, y: 560, hp: 340 },
        ]);
      } else {
        this.world.replaceEnemies([
          { character: this.enemyVariant('MAKOTO', 'ELITE DOJO MASTER', '#f0e9db', '#a77e35', '#bc3838', .96, .94), archetype: 'technical', x: base + 850, y: 448, hp: 760 },
          { character: this.enemyVariant('RYU', 'ELITE COUNTER FIGHTER', '#d4d0c9', '#5e252d', '#e0b24b', 1, 1.02), archetype: 'technical', x: base + 1035, y: 545, hp: 710 },
        ]);
      }
      return;
    }

    if (this.stageId === 4) {
      if (index === 0) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('DUDLEY', 'BOXER', '#ddd4c2', '#294a3f', '#bd433f', 1.02, 1.02), archetype: 'boxer', x: base + 785, y: 455, hp: 390 },
          { character: this.enemyVariant('ALEX', 'HEAVYWEIGHT', '#454b5e', '#bd895b', '#dbb346', 1.1, 1.14), archetype: 'heavy', x: base + 965, y: 548, hp: 520 },
          { character: this.enemyVariant('KEN', 'TECHNICAL BOXER', '#6f333b', '#24232b', '#e4bd4e', 1.02, 1.02), archetype: 'technical', x: base + 1090, y: 420, hp: 410 },
        ]);
      } else if (index === 1) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('DUDLEY', 'TECHNICAL BOXER', '#d9d1be', '#24483d', '#c04442', 1.02, 1.03), archetype: 'technical', x: base + 690, y: 440, hp: 450 },
          { character: this.enemyVariant('ALEX', 'GRAPPLER', '#424b57', '#c18b5c', '#d84f45', 1.08, 1.12), archetype: 'grappler', x: base + 825, y: 560, hp: 520 },
          { character: this.enemyVariant('KEN', 'MMA FIGHTER', '#703640', '#25232b', '#e4b84a', 1.01, 1.02), archetype: 'mma', x: base + 945, y: 420, hp: 470 },
          { character: this.enemyVariant('YUN', 'CAGE RUSHDOWN', '#2e5c84', '#ded0aa', '#e0b641', .95, .91), archetype: 'agile', x: base + 1075, y: 555, hp: 390 },
        ]);
      } else {
        this.world.replaceEnemies([
          { character: this.enemyVariant('DUDLEY', 'ELITE PRIZEFIGHTER', '#dfd7c6', '#24483e', '#c44a43', 1.04, 1.04), archetype: 'technical', x: base + 840, y: 450, hp: 790 },
          { character: this.enemyVariant('ALEX', 'ELITE MMA HEAVY', '#3f4855', '#c28f61', '#e0b64b', 1.12, 1.16), archetype: 'mma', x: base + 1035, y: 545, hp: 830 },
        ]);
      }
      return;
    }

    if (this.stageId === 2) {
      if (index === 0) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('YUN', 'FAST STRIKER', '#254f79', '#e1d2aa', '#f0c44b', .94, .88), archetype: 'agile', x: base + 790, y: 455, hp: 300 },
          { character: this.enemyVariant('CHUNLI', 'KUNG-FU FIGHTER', '#315ba0', '#e8dfc8', '#ecbf4b', .94, .9), archetype: 'karate', x: base + 970, y: 548, hp: 320 },
          { character: this.enemyVariant('IBUKI', 'AGILE FIGHTER', '#765d48', '#443944', '#df5c56', .92, .86), archetype: 'agile', x: base + 1080, y: 420, hp: 280 },
        ]);
      } else if (index === 1) {
        this.world.replaceEnemies([
          { character: this.enemyVariant('YUN', 'FAST STRIKER', '#2f669b', '#e9dbb5', '#e6bd47', .94, .88), archetype: 'agile', x: base + 115, y: 430, hp: 330 },
          { character: this.enemyVariant('MAKOTO', 'KUNG-FU FIGHTER', '#eee4d2', '#d0a94c', '#c84342', .92, .9), archetype: 'karate', x: base + 835, y: 555, hp: 360 },
          { character: this.enemyVariant('CHUNLI', 'KICK FIGHTER', '#355eaa', '#eee6d4', '#efc94f', .94, .9), archetype: 'kick', x: base + 960, y: 470, hp: 340 },
          { character: this.enemyVariant('ALEX', 'THROW FIGHTER', '#415e50', '#c5905e', '#df5548', 1.04, 1.08), archetype: 'grappler', x: base + 1070, y: 565, hp: 430 },
          { character: this.enemyVariant('RYU', 'RANGED FIGHTER', '#d9d5cf', '#6e2930', '#edbd4f', .98, 1), archetype: 'ranged', x: base + 1120, y: 405, hp: 330 },
        ]);
      } else {
        this.world.replaceEnemies([
          { character: this.enemyVariant('YUN', 'ELITE RUSHDOWN', '#24547f', '#e7d9b5', '#f1c948', .95, .9), archetype: 'agile', x: base + 860, y: 450, hp: 650 },
          { character: this.enemyVariant('ALEX', 'ELITE THROW FIGHTER', '#38594c', '#c69160', '#e15b4b', 1.08, 1.12), archetype: 'grappler', x: base + 1040, y: 548, hp: 720 },
        ]);
      }
      return;
    }

    if (index === 0) {
      this.world.replaceEnemies([
        { character: this.enemyVariant('RYU', 'STREET BRAWLER', '#6d5141', '#27232a', '#d7a55e', .98, 1.02), archetype: 'brawler', x: base + 790, y: 478, hp: 280 },
        { character: this.enemyVariant('DUDLEY', 'BOXER', '#d8d0bd', '#315447', '#c94b43', 1.02, 1.02), archetype: 'boxer', x: base + 960, y: 535, hp: 300 },
        { character: this.enemyVariant('YUN', 'KICK FIGHTER', '#375f80', '#ded1aa', '#d4a83f', .94, .9), archetype: 'kick', x: base + 1090, y: 430, hp: 270 },
      ]);
      return;
    }
    if (index === 1) {
      this.world.replaceEnemies([
        { character: this.enemyVariant('RYU', 'STREET BRAWLER', '#6d5141', '#27232a', '#d7a55e', .98, 1.02), archetype: 'brawler', x: base + 700, y: 455, hp: 310 },
        { character: this.enemyVariant('DUDLEY', 'BOXER', '#d8d0bd', '#315447', '#c94b43', 1.02, 1.02), archetype: 'boxer', x: base + 820, y: 550, hp: 330 },
        { character: this.enemyVariant('ALEX', 'WRESTLER', '#494f66', '#c08c5f', '#e2b950', 1.08, 1.11), archetype: 'grappler', x: base + 930, y: 425, hp: 390 },
        { character: this.enemyVariant('YUN', 'KICK FIGHTER', '#375f80', '#ded1aa', '#d4a83f', .94, .9), archetype: 'kick', x: base + 1030, y: 575, hp: 290 },
        { character: this.enemyVariant('KEN', 'HEAVY BRAWLER', '#74353d', '#25222a', '#e0ba5d', 1.06, 1.08), archetype: 'heavy', x: base + 1100, y: 500, hp: 440 },
      ]);
      return;
    }
    this.world.replaceEnemies([
      { character: this.enemyVariant('ALEX', 'ELITE GRAPPLER', '#334d46', '#c49561', '#efcb5b', 1.1, 1.14), archetype: 'grappler', x: base + 850, y: 455, hp: 620 },
      { character: this.enemyVariant('KEN', 'ELITE STRIKER', '#8a323d', '#211f29', '#f0c755', 1.04, 1.04), archetype: 'boxer', x: base + 1030, y: 545, hp: 560 },
    ]);
  }

  private seedStageProps(): void {
    if (this.stageId === 5) {
      this.world.addProp({ id: 'console-society-a', label: 'CONTROL CONSOLE', x: 690, y: 548, width: 86, depth: 44, hp: 320, solid: true });
      this.world.addProp({ id: 'crate-society-a', label: 'SECURITY CRATE', x: 930, y: 430, width: 70, depth: 44, hp: 210, solid: true });
      this.world.addProp({ id: 'console-society-b', label: 'RESEARCH CONSOLE', x: 1620, y: 555, width: 90, depth: 46, hp: 340, solid: true });
      this.world.addProp({ id: 'tank-society-a', label: 'ENERGY TANK', x: 2070, y: 438, width: 68, depth: 42, hp: 380, solid: true });
      this.world.addProp({ id: 'crate-society-b', label: 'SECURITY CRATE', x: 2870, y: 548, width: 72, depth: 44, hp: 230, solid: true });
      return;
    }
    if (this.stageId === 3) {
      this.world.addProp({ id: 'vending-jp-a', label: 'VENDING MACHINE', x: 680, y: 548, width: 72, depth: 42, hp: 300, solid: true });
      this.world.addProp({ id: 'crate-jp-a', label: 'DOJO CRATE', x: 940, y: 430, width: 66, depth: 44, hp: 170, solid: true });
      this.world.addProp({ id: 'lantern-jp-a', label: 'LANTERN STAND', x: 1600, y: 555, width: 52, depth: 34, hp: 145, solid: true });
      this.world.addProp({ id: 'vending-jp-b', label: 'VENDING MACHINE', x: 2050, y: 435, width: 72, depth: 42, hp: 300, solid: true });
      this.world.addProp({ id: 'crate-jp-b', label: 'TRAINING CRATE', x: 2860, y: 550, width: 70, depth: 44, hp: 190, solid: true });
      return;
    }
    if (this.stageId === 4) {
      this.world.addProp({ id: 'bin-london-a', label: 'STREET BIN', x: 680, y: 555, width: 54, depth: 34, hp: 145, solid: true });
      this.world.addProp({ id: 'crate-london-a', label: 'GYM CRATE', x: 940, y: 425, width: 68, depth: 44, hp: 175, solid: true });
      this.world.addProp({ id: 'bag-london-a', label: 'HEAVY BAG', x: 1620, y: 545, width: 56, depth: 34, hp: 230, solid: true });
      this.world.addProp({ id: 'crate-london-b', label: 'FIGHT CLUB CRATE', x: 2070, y: 438, width: 72, depth: 44, hp: 185, solid: true });
      this.world.addProp({ id: 'bag-london-b', label: 'HEAVY BAG', x: 2890, y: 548, width: 56, depth: 34, hp: 240, solid: true });
      return;
    }
    if (this.stageId === 2) {
      this.world.addProp({ id: 'stall-market-a', label: 'FOOD STALL', x: 690, y: 548, width: 126, depth: 42, hp: 240, solid: true });
      this.world.addProp({ id: 'crate-market-a', label: 'MARKET CRATE', x: 860, y: 555, width: 62, depth: 38, hp: 140, solid: true });
      this.world.addProp({ id: 'crate-market-b', label: 'MARKET CRATE', x: 1570, y: 425, width: 68, depth: 42, hp: 150, solid: true });
      this.world.addProp({ id: 'stall-market-b', label: 'MARKET STALL', x: 1880, y: 548, width: 132, depth: 44, hp: 260, solid: true });
      this.world.addProp({ id: 'trash-market-a', label: 'FOOD BIN', x: 2070, y: 568, width: 52, depth: 34, hp: 125, solid: true });
      this.world.addProp({ id: 'crate-market-c', label: 'MARKET CRATE', x: 2870, y: 548, width: 72, depth: 44, hp: 175, solid: true });
      return;
    }
    this.world.addProp({ id: 'trash-a', label: 'TRASH CAN', x: 700, y: 565, width: 54, depth: 34, hp: 130, solid: true });
    this.world.addProp({ id: 'crate-a', label: 'WOOD CRATE', x: 835, y: 414, width: 66, depth: 44, hp: 160, solid: true });
    this.world.addProp({ id: 'hydrant-a', label: 'HYDRANT', x: 1080, y: 575, width: 42, depth: 30, hp: 220, solid: true });
    this.world.addProp({ id: 'trash-b', label: 'TRASH CAN', x: 1730, y: 550, width: 54, depth: 34, hp: 130, solid: true });
    this.world.addProp({ id: 'crate-b', label: 'WOOD CRATE', x: 2090, y: 430, width: 66, depth: 44, hp: 160, solid: true });
    this.world.addProp({ id: 'hydrant-b', label: 'HYDRANT', x: 2890, y: 565, width: 42, depth: 30, hp: 220, solid: true });
  }

  private updateCamera(): void {
    if (this.world.rules.mode !== 'belt') { this.cameraX = 0; return; }
    const target = Math.max(0, Math.min(this.stageLength - 1280, this.world.player.x - 355));
    this.cameraX += (target - this.cameraX) * .085;
    if (Math.abs(target - this.cameraX) < .25) this.cameraX = target;
  }

  private drawAdvancePrompt(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'belt' || this.beltState !== 'travel') return;
    const pulse = .7 + Math.sin(this.time * 7) * .2;
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(250,215,108,${pulse})`;
    ctx.font = '900 30px Impact, Arial Black, sans-serif';
    ctx.fillText('GO  →', 1208, 354);
    ctx.fillStyle = `rgba(255,255,255,${pulse * .7})`;
    ctx.font = '800 11px Arial, sans-serif';
    ctx.fillText(this.stageId === 2 ? 'MOVE THROUGH THE MARKET' : this.stageId === 3 ? 'ADVANCE TOWARD THE DOJO' : this.stageId === 4 ? 'DESCEND INTO THE FIGHT CLUB' : this.stageId === 5 ? 'PUSH DEEPER INTO THE FACILITY' : 'ADVANCE THROUGH DOWNTOWN', 1208, 378);
  }

  private drawWaveCard(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'belt' || this.waveBreakFrames <= 0) return;
    const progress = 1 - this.waveBreakFrames / 90;
    const alpha = Math.sin(Math.min(1, progress * 1.5) * Math.PI) * .86;
    ctx.fillStyle = `rgba(5,7,11,${alpha * .55})`; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(244,194,82,${alpha})`; ctx.font = '900 15px Arial Black, sans-serif';
    ctx.fillText(`AREA ${this.beltWave + 1} / ${this.beltWaveCount}`, 640, 316);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.font = '900 44px Impact, Arial Black, sans-serif';
    ctx.fillText(this.beltWave === 1 ? (this.stageId === 2 ? 'NIGHT MARKET RUSH' : this.stageId === 3 ? 'PARRY TEST' : this.stageId === 4 ? 'UNDERGROUND QUALIFIER' : this.stageId === 5 ? 'SECURITY LOCKDOWN' : 'THE CROWD CLOSES IN') : (this.stageId === 3 ? 'DOJO ELITES' : this.stageId === 4 ? 'FIGHT CLUB ELITES' : this.stageId === 5 ? 'SOCIETY ELITES' : 'ELITE FIGHTERS'), 640, 367);
    ctx.fillStyle = `rgba(255,255,255,${alpha * .6})`; ctx.font = '700 12px Arial, sans-serif';
    ctx.fillText('KEEP MOVING • CONTROL THE LANE • PICK YOUR OPENING', 640, 396);
  }

  private enemyVariant(baseId: string, name: string, primary: string, secondary: string, accent: string, heightScale: number, widthScale: number): CharacterDef {
    const base = getCharacter(baseId);
    return { ...base, name, primary, secondary, accent, heightScale, widthScale };
  }

  private drawProps(ctx: CanvasRenderingContext2D): void {
    for (const prop of [...this.world.props].sort((a, b) => a.y - b.y)) {
      ctx.save();
      ctx.translate(prop.x, prop.y);
      if (prop.broken) {
        ctx.globalAlpha = .65;
        ctx.fillStyle = '#4a3b35';
        for (let i = 0; i < 5; i += 1) { ctx.save(); ctx.rotate(i * .8); ctx.fillRect(8 + i * 4, -4, 25, 8); ctx.restore(); }
        ctx.restore();
        continue;
      }
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 5, prop.width * .58, prop.depth * .38, 0, 0, Math.PI * 2); ctx.fill();
      if (prop.id.startsWith('trash')) {
        ctx.fillStyle = '#5c6670'; ctx.strokeStyle = '#252b32'; ctx.lineWidth = 4; ctx.fillRect(-21, -58, 42, 58); ctx.strokeRect(-21, -58, 42, 58);
        ctx.fillStyle = '#7c8790'; ctx.fillRect(-25, -63, 50, 9);
      } else if (prop.id.startsWith('stall')) {
        ctx.fillStyle = '#722b50'; ctx.strokeStyle = '#2b1a2a'; ctx.lineWidth = 5; ctx.fillRect(-58, -56, 116, 56); ctx.strokeRect(-58, -56, 116, 56);
        ctx.fillStyle = '#d9a648'; ctx.fillRect(-64, -64, 128, 10);
        ctx.strokeStyle = '#d9a648'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-50, -64); ctx.lineTo(-42, -104); ctx.lineTo(42, -104); ctx.lineTo(50, -64); ctx.stroke();
        ctx.fillStyle = '#ef3f7a'; ctx.fillRect(-39, -100, 78, 24);
        ctx.fillStyle = '#fff1d2'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NIGHT FOOD', 0, -83);
      } else if (prop.id.startsWith('vending')) {
        ctx.fillStyle = '#d8d8cf'; ctx.strokeStyle = '#30343b'; ctx.lineWidth = 5; ctx.fillRect(-30, -92, 60, 92); ctx.strokeRect(-30, -92, 60, 92);
        ctx.fillStyle = '#e14e4a'; ctx.fillRect(-23, -82, 46, 25); ctx.fillStyle = '#77c5df'; ctx.fillRect(-21, -50, 42, 35);
        ctx.fillStyle = '#f5e6b1'; for (let i = 0; i < 3; i += 1) ctx.fillRect(-16 + i * 13, -43, 8, 18);
      } else if (prop.id.startsWith('lantern')) {
        ctx.strokeStyle = '#2f2a2a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -96); ctx.stroke();
        ctx.fillStyle = '#d8433f'; ctx.beginPath(); ctx.ellipse(0, -78, 24, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f0c359'; ctx.fillRect(-18, -82, 36, 6);
      } else if (prop.id.startsWith('bag')) {
        ctx.strokeStyle = '#5c6168'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -118); ctx.lineTo(0, -94); ctx.stroke();
        ctx.fillStyle = '#7d3036'; ctx.strokeStyle = '#2d2528'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-24, -96, 48, 86, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d0a44a'; ctx.fillRect(-19, -64, 38, 8);
      } else if (prop.id.startsWith('bin')) {
        ctx.fillStyle = '#344957'; ctx.strokeStyle = '#1d2931'; ctx.lineWidth = 5; ctx.fillRect(-22, -58, 44, 58); ctx.strokeRect(-22, -58, 44, 58);
        ctx.fillStyle = '#556e7b'; ctx.fillRect(-26, -64, 52, 9);
      } else if (prop.id.startsWith('console')) {
        ctx.fillStyle = '#354455'; ctx.strokeStyle = '#161d26'; ctx.lineWidth = 5; ctx.fillRect(-40, -70, 80, 70); ctx.strokeRect(-40, -70, 80, 70);
        ctx.fillStyle = '#64d1e6'; ctx.fillRect(-29, -58, 58, 28); ctx.fillStyle = '#d9bd61'; ctx.fillRect(-23, -20, 18, 7); ctx.fillRect(5, -20, 18, 7);
      } else if (prop.id.startsWith('tank')) {
        ctx.fillStyle = '#45566d'; ctx.strokeStyle = '#1d2632'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-25, -92, 50, 92, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(105,217,238,.55)'; ctx.fillRect(-16, -70, 32, 48); ctx.fillStyle = '#d9bd61'; ctx.fillRect(-22, -12, 44, 7);
      } else if (prop.id.startsWith('crate')) {
        ctx.fillStyle = '#8c6039'; ctx.strokeStyle = '#3d2a20'; ctx.lineWidth = 5; ctx.fillRect(-31, -55, 62, 55); ctx.strokeRect(-31, -55, 62, 55);
        ctx.beginPath(); ctx.moveTo(-27, -50); ctx.lineTo(27, -5); ctx.moveTo(27, -50); ctx.lineTo(-27, -5); ctx.stroke();
      } else {
        ctx.fillStyle = '#a53c42'; ctx.strokeStyle = '#47252b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-16, -46, 32, 46, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d8b050'; ctx.fillRect(-22, -37, 44, 8);
      }
      const ratio = prop.hp / prop.maxHp;
      if (ratio < .98) { ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(-28, -76, 56, 5); ctx.fillStyle = ratio > .45 ? '#e8bd56' : '#d65a52'; ctx.fillRect(-28, -76, 56 * ratio, 5); }
      ctx.restore();
    }
  }

  private drawStageBackdropArt(ctx: CanvasRenderingContext2D): void {
    const art = artImage(stageArtKey(this.stageId));
    if (!art) return;
    ctx.save();
    ctx.globalAlpha = .94;
    ctx.drawImage(art, 0, 0, this.stageLength, 720);
    ctx.fillStyle = 'rgba(7,10,16,.12)';
    ctx.fillRect(0, 0, this.stageLength, 720);
    ctx.restore();
  }

  private drawStageBackdrop(ctx: CanvasRenderingContext2D): void {
    if (this.stageId === 2) { this.drawHongKong(ctx); return; }
    if (this.stageId === 3) { this.drawJapan(ctx); return; }
    if (this.stageId === 4) { this.drawLondon(ctx); return; }
    if (this.stageId === 5) { this.drawSecretSociety(ctx); return; }
    const sky = ctx.createLinearGradient(0, 0, 0, 520);
    sky.addColorStop(0, '#384967');
    sky.addColorStop(.5, '#a05c58');
    sky.addColorStop(1, '#e0996b');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.stageLength, 720);
    this.drawStageBackdropArt(ctx);
    ctx.fillStyle = 'rgba(247,190,117,.16)'; ctx.beginPath(); ctx.arc(1080, 120, 86, 0, Math.PI * 2); ctx.fill();

    const buildings = [
      [0, 160, 168, 362, '#1e2735'], [150, 92, 150, 430, '#273244'], [286, 128, 178, 394, '#222b39'],
      [450, 55, 138, 467, '#303745'], [574, 120, 182, 402, '#242c38'], [740, 82, 155, 440, '#313543'],
      [880, 152, 132, 370, '#242a35'], [1000, 72, 190, 450, '#2c3341'], [1172, 132, 120, 390, '#202734'],
    ] as const;
    for (let district = 0; district < 3; district += 1) {
      const ox = district * 1220;
      for (const [x, y, w, h, color] of buildings) {
        ctx.fillStyle = color; ctx.fillRect(x + ox, y, w, h);
        ctx.fillStyle = 'rgba(244,191,103,.34)';
        for (let wy = y + 24; wy < y + h - 20; wy += 30) {
          for (let wx = x + 14; wx < x + w - 12; wx += 25) {
            if (((wx + wy + district * 17) / 5) % 3 > 1) ctx.fillRect(wx + ox, wy, 9, 12);
          }
        }
      }
      ctx.fillStyle = district === 1 ? '#23485b' : '#9c3642'; ctx.fillRect(650 + ox, 450, 195, 110);
      ctx.fillStyle = '#e4c679'; ctx.font = '900 28px Impact, sans-serif'; ctx.fillText(district === 2 ? 'FIGHT BLOCK' : district === 1 ? 'BASKETBALL' : 'DOWNTOWN', 674 + ox, 497);
    }

    ctx.fillStyle = '#121822'; ctx.fillRect(0, 475, this.stageLength, 85);
    ctx.fillStyle = '#222b34'; ctx.fillRect(0, 560, this.stageLength, 160);

    ctx.fillStyle = '#0c1119'; ctx.fillRect(95, 430, 112, 130);
    ctx.fillStyle = '#d1d7df'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText('SUBWAY', 112, 457);
    ctx.strokeStyle = '#d1d7df'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(151, 497, 29, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = 'rgba(15,18,24,.78)'; ctx.lineWidth = 7;
    for (let x = 320; x < 560; x += 56) { ctx.beginPath(); ctx.moveTo(x, 275); ctx.lineTo(x, 478); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(302, 300); ctx.lineTo(576, 300); ctx.stroke();
  }

  private drawHongKong(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, 520);
    sky.addColorStop(0, '#0b1732');
    sky.addColorStop(.52, '#241849');
    sky.addColorStop(1, '#5c204f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.stageLength, 720);
    this.drawStageBackdropArt(ctx);
    ctx.fillStyle = 'rgba(110,125,255,.13)'; ctx.beginPath(); ctx.arc(760, 106, 102, 0, Math.PI * 2); ctx.fill();
    for (let district = 0; district < 4; district += 1) {
      const ox = district * 980;
      ctx.fillStyle = district % 2 ? '#10182d' : '#15172a'; ctx.fillRect(ox, 150 - district % 2 * 45, 390, 380 + district % 2 * 45);
      ctx.fillStyle = district % 2 ? '#17142a' : '#101c2c'; ctx.fillRect(ox + 390, 80 + district % 3 * 35, 310, 450);
      ctx.fillStyle = '#25162b'; ctx.fillRect(ox + 700, 190, 280, 340);
      const signColors = ['#ff3d81', '#29d4ff', '#f3c84a', '#8f6cff'];
      for (let sign = 0; sign < 4; sign += 1) {
        const sx = ox + 90 + sign * 205;
        const sy = 215 + (sign % 2) * 70;
        ctx.fillStyle = `${signColors[(district + sign) % signColors.length]}33`; ctx.fillRect(sx - 8, sy - 34, 146, 66);
        ctx.strokeStyle = signColors[(district + sign) % signColors.length]!; ctx.lineWidth = 4; ctx.strokeRect(sx, sy - 28, 130, 54);
        ctx.fillStyle = signColors[(district + sign) % signColors.length]!; ctx.font = '900 16px Arial Black, sans-serif';
        ctx.fillText(sign % 2 ? 'NIGHT FOOD' : 'MARKET', sx + 10, sy + 5);
      }
      ctx.fillStyle = '#64264a'; ctx.fillRect(ox + 110, 470, 250, 78);
      ctx.fillStyle = '#d8a94a'; ctx.fillRect(ox + 118, 480, 234, 8);
      ctx.fillStyle = '#314f63'; ctx.fillRect(ox + 500, 485, 225, 63);
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 3;
      for (let lamp = 0; lamp < 7; lamp += 1) {
        const lx = ox + 35 + lamp * 135; ctx.beginPath(); ctx.moveTo(lx, 405); ctx.lineTo(lx + 70, 438); ctx.stroke();
        ctx.fillStyle = lamp % 2 ? '#f05475' : '#efc54d'; ctx.beginPath(); ctx.arc(lx + 35, 424, 8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#181a28'; ctx.fillRect(0, 520, this.stageLength, 200);
    ctx.fillStyle = 'rgba(45,135,170,.15)';
    for (let x = 0; x < this.stageLength; x += 180) ctx.fillRect(x, 555 + (x / 180 % 2) * 40, 120, 4);
  }

  private drawJapan(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, 500);
    sky.addColorStop(0, '#6f88a2');
    sky.addColorStop(.58, '#d8b39a');
    sky.addColorStop(1, '#e7c8a5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.stageLength, 720);
    this.drawStageBackdropArt(ctx);
    ctx.fillStyle = 'rgba(250,225,185,.34)'; ctx.beginPath(); ctx.arc(570, 115, 62, 0, Math.PI * 2); ctx.fill();

    for (let district = 0; district < 4; district += 1) {
      const ox = district * 1010;
      if (district < 2) {
        ctx.fillStyle = district % 2 ? '#ddd7cf' : '#c8c4be'; ctx.fillRect(ox, 250, 420, 285);
        ctx.fillStyle = '#3d4851'; ctx.fillRect(ox + 20, 286, 380, 18);
        ctx.fillStyle = '#e8e2d9'; ctx.fillRect(ox + 445, 190, 360, 345);
        ctx.fillStyle = '#53626b'; ctx.fillRect(ox + 468, 225, 312, 18);
        ctx.fillStyle = '#bd403a'; ctx.fillRect(ox + 120, 360, 128, 42);
        ctx.fillStyle = '#fff4de'; ctx.font = '900 17px Arial Black, sans-serif'; ctx.fillText('商店街  KARATE', ox + 136, 387);
        for (let wx = ox + 40; wx < ox + 760; wx += 110) { ctx.fillStyle = '#6ea4bb'; ctx.fillRect(wx, 320, 72, 92); }
      } else if (district === 2) {
        ctx.fillStyle = '#a19a86'; ctx.fillRect(ox, 300, 1010, 235);
        ctx.fillStyle = '#59402f'; ctx.fillRect(ox + 190, 245, 570, 290);
        ctx.fillStyle = '#e8dfcb'; ctx.fillRect(ox + 215, 275, 520, 230);
        ctx.fillStyle = '#5c3030'; ctx.fillRect(ox + 378, 300, 188, 55);
        ctx.fillStyle = '#f1e6cf'; ctx.font = '900 23px serif'; ctx.fillText('道 場', ox + 435, 338);
        ctx.strokeStyle = '#2e2926'; ctx.lineWidth = 8; for (let x = ox + 235; x < ox + 720; x += 82) { ctx.beginPath(); ctx.moveTo(x, 370); ctx.lineTo(x, 505); ctx.stroke(); }
      } else {
        ctx.fillStyle = '#73836b'; ctx.beginPath(); ctx.moveTo(ox, 535); ctx.lineTo(ox + 230, 265); ctx.lineTo(ox + 420, 535); ctx.fill();
        ctx.fillStyle = '#586a56'; ctx.beginPath(); ctx.moveTo(ox + 310, 535); ctx.lineTo(ox + 610, 210); ctx.lineTo(ox + 890, 535); ctx.fill();
        ctx.fillStyle = '#7d654c'; ctx.fillRect(ox + 330, 372, 390, 163);
        ctx.fillStyle = '#e2d7c2'; ctx.fillRect(ox + 355, 397, 340, 138);
        ctx.fillStyle = '#4f3328'; ctx.fillRect(ox + 445, 420, 160, 115);
      }
      ctx.strokeStyle = 'rgba(58,64,69,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ox + 30, 460); ctx.lineTo(ox + 960, 460); ctx.stroke();
      ctx.fillStyle = '#39454e'; for (let pole = 0; pole < 5; pole += 1) ctx.fillRect(ox + 90 + pole * 190, 410, 8, 125);
    }
    ctx.fillStyle = '#3a4147'; ctx.fillRect(0, 520, this.stageLength, 200);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3; for (let x = 40; x < this.stageLength; x += 180) { ctx.beginPath(); ctx.moveTo(x, 548); ctx.lineTo(x + 95, 548); ctx.stroke(); }
  }

  private drawLondon(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, 520);
    sky.addColorStop(0, '#263746'); sky.addColorStop(.55, '#465563'); sky.addColorStop(1, '#6c6763');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.stageLength, 720);
    this.drawStageBackdropArt(ctx);
    ctx.fillStyle = 'rgba(210,225,235,.08)'; for (let i = 0; i < 7; i += 1) ctx.fillRect(i * 650, 70 + (i % 3) * 60, 560, 3);

    for (let district = 0; district < 4; district += 1) {
      const ox = district * 1040;
      if (district === 0) {
        ctx.fillStyle = '#5b403b'; ctx.fillRect(ox, 220, 680, 320);
        ctx.fillStyle = '#2b3137'; ctx.fillRect(ox + 700, 150, 340, 390);
        ctx.fillStyle = '#8c5139'; ctx.fillRect(ox + 120, 348, 210, 90);
        ctx.fillStyle = '#e1c07a'; ctx.font = '900 23px serif'; ctx.fillText('THE CROWN', ox + 153, 390);
        for (let wx = ox + 55; wx < ox + 960; wx += 126) { ctx.fillStyle = '#d8b06a'; ctx.fillRect(wx, 282, 55, 78); }
      } else if (district === 1) {
        ctx.fillStyle = '#30383f'; ctx.fillRect(ox, 180, 1040, 360);
        ctx.fillStyle = '#161d23'; ctx.fillRect(ox + 130, 300, 760, 240);
        ctx.strokeStyle = '#6b757c'; ctx.lineWidth = 7; for (let x = ox + 150; x < ox + 880; x += 88) { ctx.beginPath(); ctx.moveTo(x, 310); ctx.lineTo(x, 535); ctx.stroke(); }
        ctx.fillStyle = '#bd4e45'; ctx.fillRect(ox + 350, 220, 320, 58); ctx.fillStyle = '#f1e8d8'; ctx.font = '900 25px Impact, sans-serif'; ctx.fillText('BOXING GYM', ox + 430, 259);
      } else {
        ctx.fillStyle = '#161b21'; ctx.fillRect(ox, 120, 1040, 420);
        ctx.strokeStyle = '#69737b'; ctx.lineWidth = 5;
        for (let x = ox + 25; x < ox + 1030; x += 52) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x + 90, 540); ctx.stroke(); }
        ctx.fillStyle = '#11151a'; ctx.fillRect(ox + 210, 225, 620, 315);
        ctx.strokeStyle = '#87939b'; ctx.lineWidth = 6; ctx.strokeRect(ox + 260, 320, 520, 190);
        ctx.fillStyle = '#d8b849'; ctx.fillRect(ox + 375, 238, 290, 50); ctx.fillStyle = '#111'; ctx.font = '900 23px Impact, sans-serif'; ctx.fillText('UNDERGROUND', ox + 425, 272);
        ctx.fillStyle = 'rgba(245,240,220,.12)'; ctx.beginPath(); ctx.moveTo(ox + 450, 0); ctx.lineTo(ox + 300, 520); ctx.lineTo(ox + 700, 520); ctx.lineTo(ox + 575, 0); ctx.fill();
      }
    }
    ctx.fillStyle = '#22282d'; ctx.fillRect(0, 520, this.stageLength, 200);
    ctx.fillStyle = 'rgba(145,185,205,.13)'; for (let x = 0; x < this.stageLength; x += 170) ctx.fillRect(x, 550 + (x / 170 % 3) * 34, 118, 5);
    ctx.strokeStyle = 'rgba(220,235,245,.13)'; ctx.lineWidth = 2; for (let x = 15; x < this.stageLength; x += 85) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 60, 500); ctx.stroke(); }
  }

  private drawSecretSociety(ctx: CanvasRenderingContext2D): void {
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, '#101523'); bg.addColorStop(.56, '#252b3a'); bg.addColorStop(1, '#151922');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.stageLength, 720);
    this.drawStageBackdropArt(ctx);
    for (let district = 0; district < 4; district += 1) {
      const ox = district * 1080;
      ctx.fillStyle = district < 1 ? '#2d323e' : district < 3 ? '#1c2631' : '#211c32'; ctx.fillRect(ox, 110, 1080, 430);
      ctx.strokeStyle = district === 3 ? '#6657a6' : '#536271'; ctx.lineWidth = 5;
      for (let x = ox + 35; x < ox + 1050; x += 112) { ctx.strokeRect(x, 160, 76, 328); }
      ctx.fillStyle = district === 3 ? 'rgba(126,96,210,.18)' : 'rgba(74,199,225,.11)';
      for (let x = ox + 80; x < ox + 1010; x += 180) ctx.fillRect(x, 190, 112, 230);
      if (district === 0) {
        ctx.fillStyle = '#374557'; ctx.fillRect(ox + 160, 320, 760, 210);
        ctx.fillStyle = '#d8be68'; ctx.font = '900 26px Impact, sans-serif'; ctx.fillText('RESTRICTED ACCESS', ox + 390, 365);
      } else if (district === 1) {
        ctx.fillStyle = '#243846'; ctx.fillRect(ox + 190, 260, 700, 270);
        ctx.fillStyle = '#6bd2e8'; for (let i = 0; i < 6; i += 1) ctx.fillRect(ox + 250 + i * 92, 300 + (i % 2) * 40, 54, 92);
      } else if (district === 2) {
        ctx.fillStyle = '#2f3444'; ctx.fillRect(ox + 130, 235, 820, 295);
        ctx.strokeStyle = '#d7bd65'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ox + 540, 380, 118, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(220,190,95,.12)'; ctx.beginPath(); ctx.arc(ox + 540, 380, 95, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#171322'; ctx.fillRect(ox + 120, 185, 840, 345);
        ctx.strokeStyle = '#816bd0'; ctx.lineWidth = 7; ctx.strokeRect(ox + 230, 270, 620, 250);
        ctx.fillStyle = 'rgba(127,94,220,.16)'; ctx.beginPath(); ctx.moveTo(ox + 540, 0); ctx.lineTo(ox + 360, 520); ctx.lineTo(ox + 730, 520); ctx.fill();
        ctx.fillStyle = '#e7d487'; ctx.font = '900 29px Impact, sans-serif'; ctx.fillText('INNER SANCTUM', ox + 405, 235);
      }
    }
    ctx.fillStyle = '#181d27'; ctx.fillRect(0, 520, this.stageLength, 200);
    ctx.strokeStyle = 'rgba(109,170,195,.18)'; ctx.lineWidth = 2; for (let x = 0; x < this.stageLength; x += 95) { ctx.beginPath(); ctx.moveTo(x, 520); ctx.lineTo(x + 70, 720); ctx.stroke(); }
    ctx.fillStyle = 'rgba(106,213,235,.13)'; for (let x = 30; x < this.stageLength; x += 260) ctx.fillRect(x, 560, 180, 5);
  }

  private drawArenaFloor(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 510, 0, 720);
    g.addColorStop(0, 'rgba(44,52,61,.96)');
    g.addColorStop(1, '#171d24');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 500); ctx.lineTo(this.stageLength, 500); ctx.lineTo(this.stageLength, 720); ctx.lineTo(0, 720); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
    for (let y = 540; y < 720; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.stageLength, y); ctx.stroke(); }
    for (let x = 0; x < this.stageLength; x += 96) { ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x - 80, 720); ctx.stroke(); }
    ctx.fillStyle = this.stageId === 2 ? '#5b2f72' : this.stageId === 3 ? '#7f2f2d' : this.stageId === 4 ? '#2f5367' : this.stageId === 5 ? '#534c8a' : '#5e242d'; ctx.fillRect(0, 505, this.stageLength, 5);
    const visualProfile = stageVisualProfile(this.stageId);
    const reflection = ctx.createLinearGradient(0, 512, 0, 680);
    reflection.addColorStop(0, visualProfile.floorReflect); reflection.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = reflection; ctx.fillRect(0, 512, this.stageLength, 168);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const player = this.world.player;
    const enemy = this.world.enemy;
    const finalBoss = this.stageId === 5 && this.phase === 'final-duel' && enemy.character.id === 'GILL';
    if (finalBoss) this.drawBossHud(ctx, player, enemy);
    else if (this.world.rules.mode === 'duel') this.drawDuelHud(ctx, player, enemy);
    else this.drawBeltHud(ctx, player);

    if (this.world.playerComboTimer > 0 && this.world.playerComboHits > 0) {
      const comboP = Math.min(1, this.world.playerComboTimer / 18);
      const x = 76;
      const y = 154;
      ctx.save();
      ctx.globalAlpha = comboP;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(6,8,13,.76)';
      ctx.beginPath(); ctx.roundRect(x - 12, y - 34, 190, 70, 10); ctx.fill();
      ctx.fillStyle = this.world.playerComboHits >= 5 ? '#fff0a6' : '#f7f2e8';
      ctx.font = '900 29px Impact, Arial Black, sans-serif';
      ctx.fillText(`${this.world.playerComboHits} HIT`, x, y);
      ctx.fillStyle = 'rgba(255,255,255,.68)';
      ctx.font = '800 11px Arial, sans-serif';
      ctx.fillText(`${this.world.playerComboDamage} DAMAGE`, x + 2, y + 24);
      ctx.restore();
    } else if (this.world.lastPlayerHitTimer > 0) {
      const p = Math.min(1, this.world.lastPlayerHitTimer / 12);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '800 11px Arial, sans-serif';
      ctx.fillText(`${this.world.lastPlayerHitDamage} DAMAGE`, 78, 160);
      ctx.restore();
    }

    if (this.world.enemyComboTimer > 0 && this.world.enemyComboHits >= 2) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,125,112,.9)';
      ctx.font = '900 24px Impact, Arial Black, sans-serif';
      ctx.fillText(`${this.world.enemyComboHits} HIT`, 1204, 152);
      ctx.font = '800 10px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,205,196,.7)';
      ctx.fillText(`${this.world.enemyComboDamage} DAMAGE`, 1204, 173);
      ctx.restore();
    }

    if (player.currentMove) {
      ctx.fillStyle = 'rgba(8,10,15,.75)'; ctx.beginPath(); ctx.roundRect(485, 112, 310, 40, 9); ctx.fill();
      ctx.fillStyle = player.currentMove.color; ctx.font = '900 17px Arial Black, sans-serif'; ctx.fillText(player.currentMove.label, 640, 139);
    }
    if (this.world.rules.mode === 'duel' && enemy.aiCornerPressureFrames > 0) {
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,144,96,.9)'; ctx.font = '900 11px Arial Black, sans-serif';
      ctx.fillText('CORNER PRESSURE', 1228, 118);
    }
  }

  private drawHudPortrait(ctx: CanvasRenderingContext2D, character: CharacterDef, x: number, y: number, size: number, right = false, accent?: string): void {
    const key = characterPortraitKey(character.id);
    const image = key ? artImage(key) : null;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, Math.max(6, size * .18));
    ctx.clip();
    if (image) {
      const iw = image.naturalWidth || size;
      const ih = image.naturalHeight || size;
      const scale = Math.max(size / iw, size / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = x + (size - dw) * .5 + (right ? -size * .03 : size * .03);
      const dy = y + (size - dh) * .12;
      ctx.drawImage(image, dx, dy, dw, dh);
      const shade = ctx.createLinearGradient(x, y, x, y + size);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(3,5,9,.5)');
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, size, size);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(x, y, size, size);
      drawCharacterPreview(ctx, character, x + size * .5, y + size * 1.12, size / 132, right ? -1 : 1, this.time, 'idle');
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = accent ?? character.accent;
    ctx.globalAlpha = .78;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, Math.max(6, size * .18));
    ctx.stroke();
    ctx.restore();
  }

  private drawBeltHud(ctx: CanvasRenderingContext2D, player: Fighter): void {
    const presentation = stagePresentationProfile(this.stageId);
    const layout = hudModeProfile('belt');
    ctx.save();
    const panel = ctx.createLinearGradient(24, 18, 520, 112); panel.addColorStop(0, 'rgba(6,9,14,.94)'); panel.addColorStop(1, 'rgba(12,18,26,.66)');
    ctx.fillStyle = panel; ctx.beginPath(); ctx.roundRect(24, 18, layout.playerPanelWidth + 72, 92, 13); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${layout.borderAlpha})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = presentation.hudAccent; ctx.fillRect(31, 25, 6, 78);
    this.drawHudPortrait(ctx, player.character, 45, 30, 48, false, presentation.hudAccent);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff7e9'; ctx.font = '900 22px Arial Black, sans-serif'; ctx.fillText(this.playerDef.name, 104, 49);
    ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.font = '800 8px ui-monospace, monospace'; ctx.fillText(`${presentation.locationCode} // BELT ACTION`, 104, 62);
    this.drawHudHp(ctx, 104, 69, Math.max(210, layout.playerPanelWidth - 55), player.hp / player.maxHp, presentation.hudAccent, false);
    this.drawSuperMeter(ctx, player, 104, 93, 255, false, '#51c7f4');

    const threatX = 1005;
    ctx.fillStyle = 'rgba(7,10,15,.86)'; ctx.beginPath(); ctx.roundRect(threatX, 18, 249, 92, 12); ctx.fill();
    ctx.strokeStyle = `${presentation.hudEnemy}55`; ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillStyle = presentation.hudEnemy; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText('THREAT GRID', 1238, 41);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 9px ui-monospace, monospace'; ctx.fillText(`AREA ${this.beltWave + 1}/${this.beltWaveCount} • ${this.defeatedEnemies} DOWN`, 1238, 56);
    for (let i = 0; i < this.world.enemies.length; i += 1) {
      const e = this.world.enemies[i]!; const y = 67 + i * 9;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(1050, y, 186, 5);
      ctx.fillStyle = e.hp > 0 ? presentation.hudEnemy : '#39414c'; ctx.fillRect(1050, y, 186 * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff7e8'; ctx.font = '900 31px Impact, sans-serif'; ctx.fillText(String(Math.ceil(this.stageTime)).padStart(2, '0'), 640, 49);
    ctx.fillStyle = presentation.hudAccent; ctx.fillRect(606, 58, 68, 2);
    ctx.fillStyle = 'rgba(255,255,255,.48)'; ctx.font = '800 9px ui-monospace, monospace'; ctx.fillText('SCROLL FORWARD // CLEAR ACTIVE THREATS', 640, 77);
    ctx.restore();
  }

  private drawDuelHud(ctx: CanvasRenderingContext2D, player: Fighter, enemy: Fighter): void {
    const presentation = stagePresentationProfile(this.stageId);
    const layout = hudModeProfile('duel');
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,11,.9)'; ctx.beginPath(); ctx.roundRect(22, 18, 1236, 102, 14); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${layout.borderAlpha})`; ctx.lineWidth = 1; ctx.stroke();
    this.drawHudPortrait(ctx, player.character, 39, 25, 30, false, presentation.hudAccent);
    this.drawHudPortrait(ctx, enemy.character, 1208, 25, 30, true, presentation.hudEnemy);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff7e8'; ctx.font = '900 21px Arial Black, sans-serif'; ctx.fillText(player.character.name, 78, 46);
    ctx.textAlign = 'right'; ctx.fillText(enemy.character.name, 1199, 46);
    this.drawHudHp(ctx, 44, 58, layout.playerPanelWidth, player.hp / player.maxHp, presentation.hudAccent, false);
    this.drawHudHp(ctx, 761, 58, layout.enemyPanelWidth, enemy.hp / enemy.maxHp, presentation.hudEnemy, true);
    this.drawSuperMeter(ctx, player, 44, 87, 330, false, '#51c7f4');
    this.drawSuperMeter(ctx, enemy, 906, 87, 330, true, '#a37cff');
    ctx.fillStyle = 'rgba(8,10,16,.98)'; ctx.beginPath(); ctx.arc(640, 62, layout.timerRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = presentation.hudAccent; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff7e8'; ctx.font = '900 31px Impact, sans-serif'; ctx.fillText(String(Math.ceil(this.stageTime)).padStart(2, '0'), 640, 72);
    ctx.font = '900 9px Arial Black, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText(`DUEL // ${presentation.locationCode}`, 640, 108);
    ctx.restore();
  }

  private drawBossHud(ctx: CanvasRenderingContext2D, player: Fighter, boss: Fighter): void {
    const presentation = stagePresentationProfile(this.stageId);
    const layout = hudModeProfile('duel', true);
    const hpRatio = Math.max(0, boss.hp / Math.max(1, boss.maxHp));
    const phaseHud = bossHudPhaseProfile(this.gillPhase, hpRatio);
    const pulse = .58 + Math.sin(this.time * phaseHud.pulseSpeed) * .22;
    ctx.save();
    const bossGrad = ctx.createLinearGradient(620, 12, 1260, 112); bossGrad.addColorStop(0, 'rgba(19,14,30,.5)'); bossGrad.addColorStop(1, 'rgba(8,7,15,.96)');
    ctx.fillStyle = bossGrad; ctx.beginPath(); ctx.roundRect(18, 14, 1244, 108, 15); ctx.fill();
    ctx.strokeStyle = `${phaseHud.accent}99`; ctx.lineWidth = 2; ctx.stroke();

    // Boss HUD scan line: gives the final fight its own living instrumentation instead of a static bar.
    const scanX = 604 + ((this.time * phaseHud.scanSpeed) % 630);
    const scan = ctx.createLinearGradient(scanX - 90, 0, scanX + 90, 0);
    scan.addColorStop(0, 'rgba(255,255,255,0)'); scan.addColorStop(.5, `${phaseHud.core}24`); scan.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = scan; ctx.fillRect(594, 16, 650, 102);

    this.drawHudPortrait(ctx, player.character, 38, 25, 32, false, presentation.hudAccent);
    this.drawHudPortrait(ctx, boss.character, 1195, 25, 42, true, phaseHud.accent);
    ctx.textAlign = 'left'; ctx.fillStyle = presentation.hudAccent; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText('CHALLENGER', 79, 38);
    ctx.fillStyle = '#fff6e7'; ctx.font = '900 21px Arial Black, sans-serif'; ctx.fillText(player.character.name, 79, 60);
    this.drawHudHp(ctx, 40, 70, layout.playerPanelWidth, player.hp / player.maxHp, presentation.hudAccent, false);
    this.drawSuperMeter(ctx, player, 40, 96, 300, false, '#51c7f4');

    ctx.textAlign = 'right'; ctx.fillStyle = phaseHud.accent; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(layout.bossLabel ?? 'BOSS', 1184, 31);
    ctx.fillStyle = '#fff'; ctx.font = '900 29px Impact, sans-serif'; ctx.fillText(boss.character.name, 1184, 57);
    this.drawHudHp(ctx, 612, 68, layout.enemyPanelWidth, hpRatio, phaseHud.accent, true);

    // Threshold ticks expose the actual phase structure: 66% -> Phase II, 30% -> Final.
    const hpX = 612; const hpW = layout.enemyPanelWidth;
    for (const threshold of [.66, .3]) {
      const tx = hpX + hpW * (1 - threshold); ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, 65); ctx.lineTo(tx, 89); ctx.stroke();
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = phaseHud.accent; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(`${phaseHud.label} // ${phaseHud.subtitle}`, 1238, 99);
    ctx.fillStyle = 'rgba(255,255,255,.48)'; ctx.font = '800 8px ui-monospace, monospace'; ctx.fillText(`SERAPHIC CORE ${Math.round(hpRatio * 100)}%`, 1238, 112);

    // Phase core meter pulses harder as Gill approaches the next transformation.
    const coreX = 1094; const coreY = 102; const coreR = 8 + pulse * 2.5;
    for (let phase = 1; phase <= 3; phase += 1) {
      const x = coreX + phase * 27;
      ctx.fillStyle = phase <= this.gillPhase ? (phase === this.gillPhase ? phaseHud.accent : 'rgba(190,155,255,.72)') : 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.arc(x, coreY, phase === this.gillPhase ? coreR : 6.5, 0, Math.PI * 2); ctx.fill();
      if (phase === this.gillPhase) { ctx.strokeStyle = `${phaseHud.core}aa`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, coreY, coreR + 5 + phaseHud.phaseProgress * 4, 0, Math.PI * 2); ctx.stroke(); }
    }

    ctx.fillStyle = 'rgba(8,10,16,.98)'; ctx.beginPath(); ctx.arc(560, 66, layout.timerRadius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = phaseHud.accent; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff4ca'; ctx.font = '900 30px Impact, sans-serif'; ctx.fillText(String(Math.ceil(this.stageTime)).padStart(2, '0'), 560, 76);
    ctx.restore();
  }

  private drawHudHp(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, color: string, right: boolean): void {
    const value = Math.max(0, Math.min(1, ratio)); const w = width * value;
    ctx.fillStyle = 'rgba(255,255,255,.085)'; ctx.beginPath(); ctx.roundRect(x, y, width, 17, 4); ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + width, y); grad.addColorStop(0, color); grad.addColorStop(.7, color); grad.addColorStop(1, '#fff1aa');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(right ? x + width - w : x, y, w, 17, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(right ? x + width - w : x, y + 2, w, 2);
  }


  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const projectile of this.world.projectiles) {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.globalCompositeOperation = 'screen';
      const radius = projectile.radius;
      const ownerId = projectile.owner.character.id;
      const trail = projectileTrailProfile(projectile.move, ownerId);
      const direction = Math.sign(projectile.vx) || projectile.owner.facing;
      ctx.save();
      ctx.globalAlpha = trail.alpha * (runtimeQuality.currentTier === 'low' ? .72 : 1);
      ctx.strokeStyle = trail.color ?? projectile.move.color; ctx.lineWidth = trail.width;
      if (trail.style === 'electric') {
        for (let i = 0; i < trail.segments; i += 1) { const x0 = -direction * (12 + i * trail.length / trail.segments); const y0 = ((i % 2) * 2 - 1) * (5 + i * 2); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - direction * (9 + i * 3), -y0 * .55); ctx.lineTo(x0 - direction * 20, y0 * .25); ctx.stroke(); }
      } else if (trail.style === 'spiral') {
        for (let i = 0; i < trail.segments; i += 1) { ctx.beginPath(); ctx.arc(-direction * (i * 12 + 14), 0, 8 + i * 3, this.time * 7 + i, this.time * 7 + i + 2.2); ctx.stroke(); }
      } else if (trail.style === 'flame') {
        ctx.fillStyle = trail.color ?? projectile.move.color;
        for (let i = 0; i < trail.segments; i += 1) { const d = 16 + i * trail.length / trail.segments; const wave = Math.sin(this.time * 13 + i * 1.7) * (5 + i); ctx.beginPath(); ctx.moveTo(-direction * d, wave); ctx.quadraticCurveTo(-direction * (d + 16), -wave * .7, -direction * (d + 28 + i * 3), wave * .2); ctx.lineTo(-direction * (d + 11), wave + 5); ctx.closePath(); ctx.fill(); }
      } else if (trail.style === 'cold') {
        for (let i = 0; i < trail.segments; i += 1) { const d = 16 + i * trail.length / trail.segments; const y = Math.sin(this.time * 5 + i * 1.8) * (4 + i * .9); ctx.save(); ctx.translate(-direction * d, y); ctx.rotate(this.time * .9 + i * .7); ctx.strokeRect(-3 - i * .25, -3 - i * .25, 6 + i * .5, 6 + i * .5); ctx.restore(); }
      } else if (trail.style === 'kunai') {
        for (let i = 0; i < trail.segments; i += 1) { const d = 12 + i * trail.length / Math.max(1, trail.segments - 1); const y = i % 2 ? 4 : -4; ctx.beginPath(); ctx.moveTo(-direction * d, y); ctx.lineTo(-direction * (d + 24), y * .35); ctx.stroke(); }
      } else {
        for (let i = 0; i < trail.segments; i += 1) { const d = 12 + i * trail.length / Math.max(1, trail.segments - 1); ctx.beginPath(); ctx.arc(-direction * d, 0, 7 + i * 2.3, direction > 0 ? -1.2 : Math.PI - 1.9, direction > 0 ? 1.2 : Math.PI + 1.9); ctx.stroke(); }
      }
      ctx.restore();

      if (ownerId === 'URIEN' && projectile.move.id === 'URIEN_SUPER') {
        const pulse = .72 + Math.sin(this.time * 9) * .18;
        ctx.fillStyle = `rgba(185,111,255,${pulse * .24})`; ctx.fillRect(-radius * .55, -radius * 2.1, radius * 1.1, radius * 4.2);
        ctx.strokeStyle = `rgba(232,191,255,${pulse})`; ctx.lineWidth = 6; ctx.strokeRect(-radius * .48, -radius * 2, radius * .96, radius * 4);
        ctx.strokeStyle = `rgba(139,96,235,${pulse * .8})`; ctx.lineWidth = 3;
        for (let y = -radius * 1.6; y <= radius * 1.6; y += radius * .8) { ctx.beginPath(); ctx.moveTo(-radius * .38, y); ctx.lineTo(radius * .38, y + radius * .45); ctx.stroke(); }
        ctx.restore();
        continue;
      }

      if (ownerId === 'IBUKI') {
        ctx.rotate(this.time * 10);
        ctx.fillStyle = projectile.move.color; ctx.strokeStyle = '#fff0c9'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(radius * 1.4, 0); ctx.lineTo(0, radius * .48); ctx.lineTo(-radius * 1.4, 0); ctx.lineTo(0, -radius * .48); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        continue;
      }

      const gillCold = ownerId === 'GILL' && projectile.y < projectile.owner.y - 92;
      const coreColor = ownerId === 'GILL' ? (gillCold ? '#75c9ff' : '#ff8759') : projectile.move.color;
      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, radius * 1.9);
      glow.addColorStop(0, 'rgba(255,255,255,.96)'); glow.addColorStop(.28, coreColor); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = coreColor; ctx.lineWidth = ownerId === 'GILL' ? 7 : 5; ctx.beginPath(); ctx.arc(0, 0, radius * .82, 0, Math.PI * 2); ctx.stroke();
      const streaks = ownerId === 'GILL' ? 6 : 4;
      for (let i = 0; i < streaks; i += 1) {
        const a = this.time * (ownerId === 'GILL' ? 11 : 8) + i * Math.PI * 2 / streaks;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * radius * .35, Math.sin(a) * radius * .35); ctx.lineTo(Math.cos(a) * radius * 1.45 - Math.sign(projectile.vx) * 22, Math.sin(a) * radius * 1.45); ctx.stroke();
      }
      if (ownerId === 'GILL' && projectile.move.id === 'GILL_SUPER') {
        ctx.strokeStyle = `rgba(255,244,185,.72)`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-radius * .5, 0); ctx.quadraticCurveTo(-radius * 1.8, -radius * 1.4, -radius * 2.2, 0); ctx.moveTo(radius * .5, 0); ctx.quadraticCurveTo(radius * 1.8, -radius * 1.4, radius * 2.2, 0); ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawFx(ctx: CanvasRenderingContext2D): void {
    for (const event of this.world.events) {
      const fx = fxPolishProfile(event);
      const rawP = Math.max(0, Math.min(1, event.ttl / fx.baseTtl));
      const p = Math.pow(rawP, fx.fadePower);
      const fxScale = fx.size;
      if (fx.afterglow > 0 && event.type !== 'ko') {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(event.x, event.y, 2, event.x, event.y, 28 + event.power * .08 * fxScale);
        glow.addColorStop(0, `rgba(255,242,204,${p * fx.afterglow})`); glow.addColorStop(1, 'rgba(255,242,204,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(event.x, event.y, 32 + event.power * .09 * fxScale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (event.type === 'parry' || event.type === 'red-parry') {
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = event.type === 'red-parry' ? `rgba(255,80,106,${p})` : `rgba(88,211,255,${p})`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(0, 0, 52 * fxScale * (1.1 - p * .35), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = event.type === 'red-parry' ? `rgba(255,210,220,${p * .36})` : `rgba(205,248,255,${p * .34})`;
        ctx.beginPath(); ctx.arc(0, 0, (15 + (1 - p) * 11) * fxScale, 0, Math.PI * 2); ctx.fill();
        const parryRays = runtimeQuality.currentTier === 'high' ? 12 : runtimeQuality.currentTier === 'balanced' ? 9 : 7;
        for (let i = 0; i < parryRays; i += 1) {
          const a = i * Math.PI * 2 / parryRays + this.time * 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 78 * fxScale, Math.sin(a) * 78 * fxScale); ctx.stroke();
        }
        ctx.restore();
      } else if (event.type === 'hit' || event.type === 'air-hit' || event.type === 'command-hit' || event.type === 'target-hit' || event.type === 'counter' || event.type === 'block' || event.type === 'throw-escape') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.rotate(this.time * 5);
        const spark = event.type === 'block' ? `rgba(180,200,226,${p})` : event.type === 'counter' ? `rgba(255,94,75,${p})` : event.type === 'throw-escape' ? `rgba(136,240,220,${p})` : event.type === 'air-hit' ? `rgba(136,222,255,${p})` : event.type === 'command-hit' ? `rgba(255,166,83,${p})` : event.type === 'target-hit' ? `rgba(255,237,112,${p})` : `rgba(255,210,82,${p})`;
        ctx.fillStyle = spark;
        const shape = hitSparkProfile(event);
        const rays = Math.max(shape.rays, combatFxDensity(runtimeQuality.currentTier, event.power));
        ctx.rotate(shape.rotation);
        if (shape.shape === 'ring' || shape.shape === 'guard') {
          ctx.strokeStyle = spark; ctx.lineWidth = shape.width;
          ctx.beginPath(); ctx.arc(0, 0, (shape.core + (1 - p) * 34) * fxScale, 0, Math.PI * 2); ctx.stroke();
          if (shape.shape === 'guard') { ctx.beginPath(); ctx.arc(0, 0, (shape.core + 14) * fxScale, -.8, .8); ctx.stroke(); }
        }
        for (let i = 0; i < rays; i += 1) {
          ctx.save(); ctx.rotate(Math.PI * 2 * i / rays);
          if (shape.shape === 'cross' && i % 2) ctx.rotate(.32);
          if (shape.shape === 'shards') { ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(shape.length * fxScale, -shape.width * fxScale); ctx.lineTo(shape.length * .72 * fxScale, shape.width * fxScale); ctx.closePath(); ctx.fill(); }
          else ctx.fillRect(shape.core * .45, -shape.width * .5, (shape.length + event.power * .05) * fxScale, shape.width * fxScale);
          ctx.restore();
        }
        ctx.restore();
        if (event.type === 'counter' || event.type === 'throw-escape' || event.type === 'command-hit' || event.type === 'target-hit') {
          ctx.textAlign = 'center';
          ctx.font = '900 18px Arial Black, sans-serif';
          ctx.fillStyle = event.type === 'counter' ? `rgba(255,110,92,${p})` : event.type === 'throw-escape' ? `rgba(155,255,230,${p})` : event.type === 'command-hit' ? `rgba(255,190,110,${p})` : `rgba(255,244,145,${p})`;
          const text = event.type === 'counter' ? 'COUNTER!' : event.type === 'throw-escape' ? 'THROW ESCAPE!' : event.type === 'command-hit' ? (event.label ?? 'COMMAND NORMAL') : (event.label ?? 'TARGET COMBO');
          ctx.fillText(text, event.x, event.y - 34);
        }
      } else if (event.type === 'super-impact') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.globalCompositeOperation = 'screen';
        const color = event.color ?? '#fff06b';
        ctx.strokeStyle = event.accent ?? color; ctx.lineWidth = 10 * p + 3;
        for (let ring = 0; ring < (runtimeQuality.currentTier === 'high' ? 4 : 3); ring += 1) { ctx.beginPath(); ctx.arc(0, 0, (34 + ring * 30 + (1 - p) * 96) * fxScale, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = `rgba(255,255,255,${p * .75})`;
        const superRays = combatFxDensity(runtimeQuality.currentTier, event.power + 80);
        for (let i = 0; i < superRays; i += 1) { const a = i * Math.PI * 2 / superRays + this.time * .7; ctx.save(); ctx.rotate(a); ctx.fillRect(22, -4, (100 + event.power * .12) * fxScale, 8 * fxScale); ctx.restore(); }
        ctx.restore();
        if (event.label) { ctx.textAlign = 'center'; ctx.font = '900 21px Impact, sans-serif'; ctx.fillStyle = `rgba(255,248,205,${p})`; ctx.fillText(event.label, event.x, event.y - 72); }
      } else if (event.type === 'super-flash') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = event.color ?? '#fff5a0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, (54 + (1 - p) * 88) * fxScale, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      } else if (event.type === 'boss-warning' || event.type === 'boss-burst') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.globalCompositeOperation = 'screen';
        const warning = event.type === 'boss-warning';
        ctx.strokeStyle = warning ? `rgba(255,224,130,${p})` : `rgba(205,132,255,${p})`;
        ctx.lineWidth = warning ? 5 : 9;
        const radius = (warning ? 44 + (1 - p) * 42 : 54 + (1 - p) * 76) * fxScale;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < (warning ? 6 : 10); i += 1) { const a = i * Math.PI * 2 / (warning ? 6 : 10) + this.time * 1.6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * radius * 1.35, Math.sin(a) * radius * 1.35); ctx.stroke(); }
        ctx.restore();
        if (event.label) { ctx.textAlign = 'center'; ctx.font = warning ? '900 15px Arial Black, sans-serif' : '900 19px Impact, sans-serif'; ctx.fillStyle = warning ? `rgba(255,235,170,${p})` : `rgba(228,195,255,${p})`; ctx.fillText(event.label, event.x, event.y - radius - 12); }
      } else if (event.type === 'juggle' || event.type === 'wall-bounce' || event.type === 'ground-bounce') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.globalCompositeOperation = 'screen';
        const isJuggle = event.type === 'juggle';
        const isWallBounce = event.type === 'wall-bounce';
        ctx.strokeStyle = isJuggle ? `rgba(116,222,255,${p})` : isWallBounce ? `rgba(255,113,84,${p})` : `rgba(255,211,93,${p})`;
        ctx.lineWidth = isJuggle ? 4 : 7;
        const rays = isJuggle ? 6 : 10;
        for (let i = 0; i < rays; i += 1) { const a = i * Math.PI * 2 / rays + this.time * (isJuggle ? 2.4 : 1.1); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.lineTo(Math.cos(a) * (isJuggle ? 54 : 82) * fxScale, Math.sin(a) * (isJuggle ? 54 : 82) * fxScale); ctx.stroke(); }
        if (isWallBounce) { ctx.beginPath(); ctx.moveTo(-48, -54); ctx.lineTo(-48, 54); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-62, -40); ctx.lineTo(-48, -55); ctx.lineTo(-34, -40); ctx.stroke(); }
        if (event.type === 'ground-bounce') { ctx.beginPath(); ctx.ellipse(0, 28, 76, 16, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        ctx.textAlign = 'center'; ctx.font = isJuggle ? '900 16px Arial Black, sans-serif' : '900 19px Impact, sans-serif';
        ctx.fillStyle = isJuggle ? `rgba(155,235,255,${p})` : isWallBounce ? `rgba(255,158,123,${p})` : `rgba(255,230,139,${p})`;
        ctx.fillText(event.label ?? (isJuggle ? 'JUGGLE' : isWallBounce ? 'WALL BOUNCE' : 'GROUND BOUNCE'), event.x, event.y - 42);
      } else if (event.type === 'enemy-collision' || event.type === 'wall-impact' || event.type === 'prop-hit' || event.type === 'prop-break') {
        ctx.save(); ctx.translate(event.x, event.y); ctx.globalCompositeOperation = 'screen';
        const isBreak = event.type === 'prop-break';
        const isWall = event.type === 'wall-impact';
        ctx.strokeStyle = isBreak ? `rgba(255,190,96,${p})` : isWall ? `rgba(255,122,92,${p})` : `rgba(246,218,138,${p})`;
        ctx.lineWidth = isBreak ? 7 : 5;
        for (let i = 0; i < (isBreak ? 12 : 8); i += 1) {
          const a = i * Math.PI * 2 / (isBreak ? 12 : 8);
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * (42 + event.power * .08), Math.sin(a) * (42 + event.power * .08)); ctx.stroke();
        }
        ctx.restore();
        if (event.type === 'enemy-collision' || isBreak) {
          ctx.textAlign = 'center'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillStyle = `rgba(255,232,180,${p})`;
          ctx.fillText(event.type === 'enemy-collision' ? 'COLLISION!' : `${event.label ?? 'OBJECT'} BREAK!`, event.x, event.y - 28);
        }
      } else if (event.type === 'ko') {
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,220,145,${p * .10})`; ctx.fillRect(0, 0, 1280, 720); ctx.strokeStyle = `rgba(255,105,85,${p * .65})`; ctx.lineWidth = 5; for (let i = 0; i < 10; i += 1) { const x = 140 + i * 112; ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(640 + (x - 640) * .35, 540); ctx.stroke(); } ctx.restore(); ctx.textAlign = 'center'; ctx.font = '900 108px Impact, sans-serif'; ctx.fillStyle = `rgba(255,236,190,${Math.min(1, p * 1.8)})`; ctx.strokeStyle = '#8b1e2b'; ctx.lineWidth = 10; ctx.strokeText('K.O.', 640, 360); ctx.fillText('K.O.', 640, 360); ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillStyle = `rgba(255,214,143,${p})`; ctx.fillText('FINAL HIT', 640, 398);
      }
    }
  }

  private drawSuperOverlay(ctx: CanvasRenderingContext2D): void {
    const flash = [...this.world.events].reverse().find((event) => event.type === 'super-flash');
    if (!flash) return;
    const p = Math.max(0, Math.min(1, flash.ttl / 36));
    const burst = Math.sin((1 - p) * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,246,190,${.08 + p * .18})`;
    ctx.fillRect(0, 0, 1280, 720);
    const color = flash.color ?? '#fff06b';
    const grad = ctx.createRadialGradient(640, 345, 20, 640, 345, 520 + burst * 120);
    grad.addColorStop(0, `rgba(255,255,255,${.36 * p})`);
    grad.addColorStop(.3, `${color}${Math.round(.28 * p * 255).toString(16).padStart(2, '0')}`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    ctx.strokeStyle = flash.accent ?? color;
    ctx.lineWidth = 5;
    const motif = flash.style ?? 'burst';
    if (motif === 'wave' || motif === 'electric' || motif === 'kunai') {
      for (let i = 0; i < 9; i += 1) { const y = 160 + i * 52; ctx.beginPath(); ctx.moveTo(70, y); for (let x = 160; x <= 1210; x += 110) ctx.lineTo(x, y + Math.sin(i * 1.7 + x * .018 + this.time * 8) * (motif === 'electric' ? 24 : 10)); ctx.stroke(); }
    } else if (motif === 'uppercut' || motif === 'launch' || motif === 'aerial' || motif === 'leap') {
      for (let i = 0; i < 10; i += 1) { const x = 300 + i * 75; ctx.beginPath(); ctx.moveTo(x, 650); ctx.quadraticCurveTo(640, 420, 640 + (i - 5) * 12, 125); ctx.stroke(); }
    } else if (motif === 'rush' || motif === 'barrage' || motif === 'spiral') {
      for (let i = 0; i < 13; i += 1) { const y = 100 + i * 45; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y - 90 + i * 8); ctx.stroke(); }
    } else if (motif === 'throw' || motif === 'punch' || motif === 'burst') {
      for (let i = 0; i < 16; i += 1) { const a = i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(640 + Math.cos(a) * 80, 345 + Math.sin(a) * 80); ctx.lineTo(640 + Math.cos(a) * 560, 345 + Math.sin(a) * 340); ctx.stroke(); }
    } else if (motif === 'install' || motif === 'flame') {
      for (let ring = 0; ring < 5; ring += 1) { ctx.beginPath(); ctx.arc(640, 345, 95 + ring * 72 + burst * 18, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 42px Impact, Arial Black, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,.72)'; ctx.lineWidth = 8;
    ctx.fillStyle = `rgba(255,248,210,${Math.min(1, p * 1.5)})`;
    const label = flash.label ?? 'SUPER ART';
    ctx.strokeText(label, 640, 188); ctx.fillText(label, 640, 188);
    ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillStyle = `rgba(255,225,125,${p})`;
    ctx.fillText('SUPER ART', 640, 215);
    ctx.restore();
  }

  private drawSuperMeter(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, width: number, rightAligned: boolean, color: string): void {
    const max = Math.max(1, fighter.superGaugeMax);
    const ratio = Math.max(0, Math.min(1, fighter.superGauge / max));
    ctx.fillStyle = '#222831'; ctx.fillRect(x, y, width, 8);
    ctx.fillStyle = color;
    if (rightAligned) ctx.fillRect(x + width - width * ratio, y, width * ratio, 8);
    else ctx.fillRect(x, y, width * ratio, 8);
    const stocks = Math.max(1, fighter.selectedSuperArt?.stocks ?? 1);
    ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 1;
    for (let i = 1; i < stocks; i += 1) { const sx = x + width * (i / stocks); ctx.beginPath(); ctx.moveTo(sx, y - 1); ctx.lineTo(sx, y + 9); ctx.stroke(); }
    if (fighter.selectedSuperArt) {
      ctx.textAlign = rightAligned ? 'right' : 'left'; ctx.font = '800 8px Arial, sans-serif'; ctx.fillStyle = fighter.superStocksReady > 0 ? '#fff0a6' : 'rgba(255,255,255,.45)';
      ctx.fillText(`SA${fighter.selectedSuperArt.id} • ${fighter.superStocksReady}/${fighter.selectedSuperArt.stocks}`, rightAligned ? x + width : x, y + 20);
    }
  }

  private drawInstallAura(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const pulse = .55 + Math.sin(this.time * 12) * .18;
    ctx.save(); ctx.translate(fighter.x, fighter.y - fighter.jumpHeight - 88); ctx.globalCompositeOperation = 'screen';
    const radius = fighter.character.id === 'YUN' ? 66 : 74;
    ctx.strokeStyle = fighter.character.id === 'YUN' ? `rgba(255,238,100,${pulse})` : `rgba(255,118,68,${pulse})`;
    ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4 + this.time * (fighter.character.id === 'YUN' ? 4 : -2.2); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 38, Math.sin(a) * 38); ctx.lineTo(Math.cos(a) * (radius + 18), Math.sin(a) * (radius + 18)); ctx.stroke(); }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,247,194,.9)'; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(`${fighter.installLabel} ${Math.ceil(fighter.installFrames / 60)}s`, fighter.x, fighter.y - fighter.jumpHeight - 178);
  }

  private drawPortraitIntroCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const portraitKey = characterPortraitKey(this.playerDef.id);
    const portrait = portraitKey ? artImage(portraitKey) : null;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.clip();
    if (portrait) {
      const iw = portrait.naturalWidth || width;
      const ih = portrait.naturalHeight || height;
      const scale = Math.max(width / iw, height / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;
      const dx = x + (width - drawW) * .5;
      const dy = y + (height - drawH) * .1;
      ctx.drawImage(portrait, dx, dy, drawW, drawH);
      const fade = ctx.createLinearGradient(x, y, x + width, y + height);
      fade.addColorStop(0, 'rgba(0,0,0,.08)');
      fade.addColorStop(.65, 'rgba(0,0,0,.18)');
      fade.addColorStop(1, 'rgba(3,5,9,.65)');
      ctx.fillStyle = fade;
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.fillStyle = 'rgba(12,18,28,.72)';
      ctx.fillRect(x, y, width, height);
      drawCharacterPreview(ctx, this.playerDef, x + width * .52, y + height + 26, 1.05, 1, this.time);
    }
    ctx.restore();
    ctx.strokeStyle = `${stagePresentationProfile(this.stageId).hudAccent}AA`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.stroke();
  }

  private drawIntro(ctx: CanvasRenderingContext2D): void {
    if (this.introFrames <= 0) return;
    const presentation = stagePresentationProfile(this.stageId);
    const p = 1 - this.introFrames / 105;
    const reveal = Math.min(1, p * 2.8);
    const exit = Math.max(0, (p - .72) / .28);
    ctx.save();
    ctx.fillStyle = `rgba(3,5,9,${Math.max(0, .92 - exit * .92)})`; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = `${presentation.hudAccent}${Math.round((.11 + reveal * .08) * 255).toString(16).padStart(2,'0')}`;
    ctx.beginPath(); ctx.moveTo(0, 184); ctx.lineTo(760, 112); ctx.lineTo(1280, 180); ctx.lineTo(1280, 214); ctx.lineTo(520, 148); ctx.lineTo(0, 224); ctx.closePath(); ctx.fill();
    if (this.introFrames > 22) {
      this.drawPortraitIntroCard(ctx, 116, 210, 218, 298);
      ctx.fillStyle = 'rgba(4,7,12,.62)'; ctx.beginPath(); ctx.roundRect(96, 196, 1040, 330, 22); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(96, 196, 1040, 330, 22); ctx.stroke();
      this.drawPortraitIntroCard(ctx, 116, 210, 218, 298);
      ctx.textAlign = 'center';
      ctx.fillStyle = presentation.hudAccent; ctx.font = '900 12px ui-monospace, monospace'; ctx.fillText(presentation.introEyebrow, 690, 246);
      ctx.fillStyle = '#fff7ec'; ctx.font = '900 58px Impact, Arial Black, sans-serif'; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 8; ctx.strokeText(this.stageTitle(), 690, 318); ctx.fillText(this.stageTitle(), 690, 318);
      ctx.fillStyle = 'rgba(255,255,255,.66)'; ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillText(presentation.introSubtitle, 690, 350);
      ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.font = '800 10px ui-monospace, monospace'; ctx.fillText(presentation.objective, 690, 387);
      ctx.fillStyle = presentation.hudAccent; ctx.fillRect(462, 410, 456 * reveal, 3);
      ctx.fillStyle = 'rgba(255,255,255,.56)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText(`${this.playerDef.name}  •  SA ${this.superArt.id}: ${this.superArt.name}`, 690, 438);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f7f0e3'; ctx.font = '900 30px Impact, Arial Black, sans-serif'; ctx.fillText(this.playerDef.name, 140, 542);
      ctx.fillStyle = presentation.hudAccent; ctx.font = '800 12px Arial Black, sans-serif'; ctx.fillText(this.playerDef.style, 142, 564);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(5,8,13,.7)'; ctx.beginPath(); ctx.roundRect(462, 463, 456, 34, 10); ctx.fill();
      ctx.fillStyle = presentation.hudAccent; ctx.font = '900 9px ui-monospace, monospace';
      ctx.fillText(this.stageId === 5 ? 'BELT ACTION  •  URIEN DUEL  •  GILL FINAL' : 'BELT ACTION  •  ELITE DUEL  •  STAGE CLEAR', 690, 485);
    }
    ctx.restore();
  }


  private absorbWorldMetrics(): void {
    this.carriedDamageDealt += this.world.totalPlayerDamage;
    this.carriedDamageTaken += this.world.totalEnemyDamage;
    this.carriedMaxComboHits = Math.max(this.carriedMaxComboHits, this.world.maxPlayerComboHits);
    this.carriedMaxComboDamage = Math.max(this.carriedMaxComboDamage, this.world.maxPlayerComboDamage);
    this.carriedParries += this.world.playerParries;
    this.carriedRedParries += this.world.playerRedParries;
    this.carriedSupersUsed += this.world.playerSupersUsed;
    this.carriedThrowsLanded += this.world.playerThrowsLanded;
  }

  private stageResult(): StageResult {
    const duelDefeats = this.stageId === 5 ? 2 : 1;
    return {
      stageId: this.stageId,
      clearSeconds: this.elapsedCombatFrames / 60,
      defeatedEnemies: this.defeatedEnemies + duelDefeats,
      damageDealt: this.carriedDamageDealt + this.world.totalPlayerDamage,
      damageTaken: this.carriedDamageTaken + this.world.totalEnemyDamage,
      maxComboHits: Math.max(this.carriedMaxComboHits, this.world.maxPlayerComboHits),
      maxComboDamage: Math.max(this.carriedMaxComboDamage, this.world.maxPlayerComboDamage),
      parries: this.carriedParries + this.world.playerParries,
      redParries: this.carriedRedParries + this.world.playerRedParries,
      supersUsed: this.carriedSupersUsed + this.world.playerSupersUsed,
      throwsLanded: this.carriedThrowsLanded + this.world.playerThrowsLanded,
    };
  }


  private prepareDuel(): void {
    this.absorbWorldMetrics();
    const hp = Math.max(1, this.world.player.hp);
    const gauge = this.world.player.superGauge;
    const boss = this.stageId === 2
      ? (this.playerDef.id === 'YUN' ? getCharacter('CHUNLI') : getCharacter('YUN'))
      : this.stageId === 3
        ? (this.playerDef.id === 'MAKOTO' ? getCharacter('RYU') : getCharacter('MAKOTO'))
        : this.stageId === 4
          ? (this.playerDef.id === 'DUDLEY' ? getCharacter('ALEX') : getCharacter('DUDLEY'))
          : this.stageId === 5
            ? getCharacter('URIEN')
            : (this.playerDef.id === 'DUDLEY' ? getCharacter('ALEX') : getCharacter('DUDLEY'));
    const duel = new CombatWorld(this.playerDef, boss, 'duel', this.superArt);
    duel.player.hp = hp;
    duel.player.superGauge = gauge;
    duel.enemy.hp = 1000;
    this.world = duel;
    this.stageTime = 99;
    this.cameraX = 0;
    this.cameraFocusFrames = 54;
    this.cameraFocusX = duel.enemy.x;
    this.cameraFocusY = duel.enemy.y - 105;
    this.cameraFocusZoom = this.stageId === 5 ? 1.115 : 1.085;
    this.cameraLetterboxFrames = 64;
    this.bossPatternCooldown = this.stageId === 5 ? 150 : 0;
    this.bossPatternIndex = 0;
  }

  private prepareFinalDuel(): void {
    this.absorbWorldMetrics();
    const hp = Math.max(1, this.world.player.hp);
    const gauge = this.world.player.superGauge;
    const duel = new CombatWorld(this.playerDef, getCharacter('GILL'), 'duel', this.superArt);
    duel.player.hp = hp;
    duel.player.superGauge = gauge;
    duel.enemy.hp = 1500;
    duel.enemy.maxHp = 1500;
    duel.enemy.superGauge = 65;
    duel.enemy.aiTempoScale = 1.08;
    duel.enemy.aiSuperBias = .08;
    this.gillPhase = 1;
    this.gillPhaseBanner = 90;
    this.world = duel;
    this.stageTime = 99;
    this.cameraX = 0;
    this.cameraFocusFrames = 78;
    this.cameraFocusX = duel.enemy.x;
    this.cameraFocusY = duel.enemy.y - 115;
    this.cameraFocusZoom = 1.16;
    this.cameraLetterboxFrames = 90;
    this.cameraSlowFrames = 18;
    this.bossPatternCooldown = 140;
    this.bossPatternIndex = 0;
  }

  private startBossScriptedMove(boss: Fighter, move: ReturnType<typeof specialMovesFor>['primary']): void {
    const cost = move.superCost ?? move.exCost ?? 0;
    if (cost > 0) boss.superGauge = Math.max(boss.superGauge, cost);
    boss.startMove(move);
    boss.moveEffectTriggered = true;
  }

  private updateUrienPattern(): void {
    const boss = this.world.enemy;
    if (boss.character.id !== 'URIEN' || boss.hp <= 0) return;
    this.bossPatternCooldown -= 1;
    if (this.bossPatternCooldown > 0 || (boss.state === 'attack' && !(boss.moveEffectTriggered && boss.currentMove?.kind === 'projectile')) || boss.hitStop > 0) return;
    const specials = specialMovesFor('URIEN');
    const pattern = this.bossPatternIndex++ % 3;
    if (pattern === 0) {
      const aegis = specials.super;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 150, power: 0, ttl: 42, label: 'AEGIS REFLECTOR' });
      this.startBossScriptedMove(boss, aegis);
      this.world.spawnProjectileBurst(boss, aegis, 1, 0, 1);
      this.world.events.push({ type: 'boss-burst', x: boss.x + boss.facing * 54, y: boss.y - 92, power: aegis.damage, ttl: 30, label: 'AEGIS WALL' });
      this.bossPatternCooldown = 238;
    } else if (pattern === 1) {
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 150, power: 0, ttl: 34, label: 'CHARGING TACKLE' });
      boss.startMove(specials.mobility);
      this.world.events.push({ type: 'boss-burst', x: boss.x, y: boss.y - 92, power: specials.mobility.damage, ttl: 26, label: 'TACKLE RUSH' });
      this.bossPatternCooldown = 168;
    } else {
      const punish = this.world.player.airborne ? specials.antiAir : specials.exPrimary;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 150, power: 0, ttl: 34, label: this.world.player.airborne ? 'DANGER KNEE' : 'METALLIC CROSS FIRE' });
      if (punish.kind === 'projectile') { this.startBossScriptedMove(boss, punish); this.world.spawnProjectileBurst(boss, punish, 2, 34, 1.06); }
      else boss.startMove(punish);
      this.world.events.push({ type: 'boss-burst', x: boss.x, y: boss.y - 96, power: punish.damage, ttl: 28, label: punish.label });
      this.bossPatternCooldown = 192;
    }
    this.bossPatternFlash = 36;
  }

  private updateGillPattern(): void {
    const boss = this.world.enemy;
    if (boss.character.id !== 'GILL' || boss.hp <= 0) return;
    this.bossPatternCooldown -= 1;
    if (this.bossPatternCooldown > 0 || (boss.state === 'attack' && !(boss.moveEffectTriggered && boss.currentMove?.kind === 'projectile')) || boss.hitStop > 0) return;

    const specials = specialMovesFor('GILL');
    // Keep Gill readable while making each phase materially broader:
    // I: sphere / anti-air-or-lariat, II: + EX cross / seraphic volley, III: all five families + rain finisher.
    const sequences = this.gillPhase === 1 ? [0, 2] : this.gillPhase === 2 ? [1, 0, 2, 3] : [3, 4, 2, 0, 1];
    const pattern = sequences[this.bossPatternIndex++ % sequences.length]!;
    let label = 'ELEMENTAL SPHERE';
    let power = specials.primary.damage;
    let cooldown = this.gillPhase === 1 ? 220 : this.gillPhase === 2 ? 168 : 122;

    if (pattern === 0) {
      label = this.gillPhase === 3 ? 'SERAPHIC SPHERE' : 'ELEMENTAL SPHERE';
      power = specials.primary.damage;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 160, power: 0, ttl: 34, label });
      this.startBossScriptedMove(boss, specials.primary);
      this.world.spawnProjectileBurst(boss, specials.primary, 1, 0, 1.02 + this.gillPhase * .03);
    } else if (pattern === 1) {
      label = this.gillPhase === 3 ? 'SERAPHIC CROSS' : 'CROSS ELEMENT';
      power = specials.exPrimary.damage;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 160, power: 0, ttl: 36, label });
      this.startBossScriptedMove(boss, specials.exPrimary);
      this.world.spawnProjectileBurst(boss, specials.exPrimary, this.gillPhase === 3 ? 3 : 2, this.gillPhase === 3 ? 48 : 38, 1.08);
      cooldown += 10;
    } else if (pattern === 2) {
      const antiAir = this.world.player.airborne || this.world.player.jumpHeight > 24;
      const move = antiAir ? specials.antiAir : specials.mobility;
      label = antiAir ? (this.gillPhase === 3 ? 'SERAPHIC ASCENT' : 'CRYO ASCENT') : this.gillPhase === 3 ? 'SERAPHIC LARIAT' : 'ELEMENTAL LARIAT';
      power = move.damage;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 160, power: 0, ttl: 32, label });
      boss.startMove(move);
      cooldown -= 8;
    } else if (pattern === 3) {
      label = this.gillPhase === 3 ? 'SERAPHIC VOLLEY' : 'DIVINE VOLLEY';
      power = specials.super.damage;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 160, power: 0, ttl: 40, label });
      this.startBossScriptedMove(boss, specials.super);
      this.world.spawnProjectileBurst(boss, specials.super, this.gillPhase === 3 ? 3 : 2, this.gillPhase === 3 ? 46 : 36, this.gillPhase === 3 ? 1.14 : 1.08);
      cooldown += 16;
    } else {
      label = 'SERAPHIC RAIN';
      power = specials.super.damage;
      this.world.events.push({ type: 'boss-warning', x: boss.x, y: boss.y - 160, power: 0, ttl: 46, label });
      this.startBossScriptedMove(boss, specials.super);
      this.world.spawnProjectileBurst(boss, specials.super, 5, 52, 1.16);
      cooldown += 34;
    }

    this.world.events.push({ type: 'boss-burst', x: boss.x, y: boss.y - 100, power, ttl: 34, label });
    this.bossPatternFlash = pattern === 4 ? 54 : 40;
    this.bossPatternCooldown = Math.max(88, cooldown);
  }

  private updateGillPhase(): void {
    const boss = this.world.enemy;
    if (boss.character.id !== 'GILL' || boss.maxHp <= 0) return;
    const ratio = boss.hp / boss.maxHp;
    if (this.gillPhase === 1 && ratio <= .66) {
      this.gillPhase = 2;
      this.gillPhaseBanner = 125;
      boss.aiTempoScale = 1.2;
      boss.aiSuperBias = .26;
      boss.superGauge = boss.superStockCost;
      boss.hitStop = Math.max(boss.hitStop, 18);
      this.world.superFreezeFrames = Math.max(this.world.superFreezeFrames, 18);
      this.world.events.push({ type: 'boss-burst', x: boss.x, y: boss.y - 110, power: 220, ttl: 55, label: 'ELEMENTAL AWAKENING' });
    } else if (this.gillPhase === 2 && ratio <= .3) {
      this.gillPhase = 3;
      this.gillPhaseBanner = 150;
      boss.aiTempoScale = 1.38;
      boss.aiSuperBias = .48;
      boss.superGauge = boss.superStockCost;
      boss.hitStop = Math.max(boss.hitStop, 22);
      this.world.superFreezeFrames = Math.max(this.world.superFreezeFrames, 22);
      this.world.events.push({ type: 'boss-burst', x: boss.x, y: boss.y - 110, power: 320, ttl: 70, label: 'SERAPHIC ASCENSION' });
    }
  }

  private drawStageLighting(ctx: CanvasRenderingContext2D): void {
    const light = stageLightingProfile(this.stageId);
    const qualityScale = runtimeQuality.currentTier === 'low' ? .58 : runtimeQuality.currentTier === 'balanced' ? .82 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = light.ambient;
    ctx.fillRect(0, 120, this.stageLength, 470);
    const beamCount = Math.max(1, Math.round(light.beamCount * qualityScale));
    for (let i = 0; i < beamCount; i += 1) {
      const baseX = (i + .5) * (this.stageLength / beamCount) + Math.sin(this.time * light.pulse + i * 1.7) * 70;
      const beam = ctx.createLinearGradient(baseX, 100, baseX + 120, 610);
      beam.addColorStop(0, `${i % 2 ? light.rim : light.key}20`);
      beam.addColorStop(.72, `${i % 2 ? light.rim : light.key}09`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(baseX - 68, 80); ctx.lineTo(baseX + 62, 80); ctx.lineTo(baseX + 220, 620); ctx.lineTo(baseX - 180, 620); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  private drawFighterContrastFields(ctx: CanvasRenderingContext2D, fighters: readonly Fighter[]): void {
    const profile = fighterReadabilityProfile(this.stageId);
    const fxLoad = Math.min(1, (this.world.events.length + this.world.projectiles.length * .7) / 12);
    const extra = fxLoad * (1 - profile.fxProtection) * .16;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (const fighter of fighters) {
      if (fighter.hp <= 0 && fighter.state === 'ko') continue;
      const air = Math.max(.78, 1 - fighter.jumpHeight / 620);
      const cx = fighter.x;
      const cy = fighter.y - fighter.jumpHeight - 92;
      const rx = profile.contrastRadiusX * fighter.character.widthScale * (fighter.state === 'attack' ? 1.1 : 1);
      const ry = profile.contrastRadiusY * fighter.character.heightScale * air;
      const g = ctx.createRadialGradient(cx, cy, Math.max(16, rx * .18), cx, cy, Math.max(rx, ry));
      g.addColorStop(0, `rgba(8,10,15,${profile.contrastAlpha + extra})`);
      g.addColorStop(.48, `rgba(8,10,15,${(profile.contrastAlpha + extra) * .52})`);
      g.addColorStop(1, 'rgba(8,10,15,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawCloseSpacingSeparation(ctx: CanvasRenderingContext2D, fighters: readonly Fighter[]): void {
    if (fighters.length < 2) return;
    const profile = fighterReadabilityProfile(this.stageId);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < fighters.length; i += 1) {
      for (let j = i + 1; j < fighters.length; j += 1) {
        const a = fighters[i]!;
        const b = fighters[j]!;
        const dx = b.x - a.x;
        const dy = (b.y - b.jumpHeight * .45) - (a.y - a.jumpHeight * .45);
        const distance = Math.hypot(dx, dy * .7);
        const strength = closeSpacingStrength(this.stageId, distance);
        if (strength <= .01) continue;
        const mx = (a.x + b.x) * .5;
        const my = (a.y + b.y - a.jumpHeight - b.jumpHeight) * .5 - 82;
        ctx.fillStyle = `rgba(3,5,9,${profile.separationAlpha * strength})`;
        ctx.beginPath();
        ctx.ellipse(mx, my, 24 + 26 * strength, 82 + 22 * strength, Math.atan2(dy, dx) * .08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFighterRimLight(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    if (runtimeQuality.currentTier === 'low' && fighter.state !== 'attack' && fighter.state !== 'parry') return;
    const profile = fighterReadabilityProfile(this.stageId);
    const light = stageLightingProfile(this.stageId);
    const activeBoost = fighter.state === 'attack' || fighter.state === 'parry' ? 1.24 : 1;
    const air = Math.max(.82, 1 - fighter.jumpHeight / 720);
    const height = 126 * fighter.character.heightScale * air;
    const width = 43 * fighter.character.widthScale;
    const centerY = fighter.y - fighter.jumpHeight - height * .54;
    const side = light.shadowOffsetX >= 0 ? -1 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = light.rim;
    ctx.globalAlpha = profile.rimAlpha * activeBoost;
    ctx.lineWidth = profile.rimWidth * (runtimeQuality.currentTier === 'balanced' ? .86 : 1);
    ctx.filter = runtimeQuality.currentTier === 'high' ? 'blur(.5px)' : 'none';
    ctx.beginPath();
    ctx.ellipse(fighter.x + side * width * .12, centerY, width, height * .54, 0, side < 0 ? Math.PI * .56 : -Math.PI * .44, side < 0 ? Math.PI * 1.44 : Math.PI * .44);
    ctx.stroke();
    ctx.filter = 'none';
    ctx.globalAlpha *= .58;
    ctx.lineWidth = Math.max(1.5, profile.rimWidth * .42);
    ctx.strokeStyle = fighter.character.accent;
    ctx.beginPath();
    ctx.ellipse(fighter.x - side * width * .08, centerY + 5, width * .88, height * .47, 0, side < 0 ? -Math.PI * .42 : Math.PI * .58, side < 0 ? Math.PI * .42 : Math.PI * 1.42);
    ctx.stroke();
    ctx.restore();
  }

  private drawFighterStageShadow(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const light = stageLightingProfile(this.stageId);
    const airScale = Math.max(.42, 1 - fighter.jumpHeight / 310);
    const active = fighter.state === 'attack' && !!fighter.currentMove;
    ctx.save();
    ctx.translate(fighter.x + light.shadowOffsetX * airScale, fighter.y + 5);
    ctx.scale(light.shadowStretch * (active ? 1.08 : 1), airScale);
    ctx.fillStyle = light.shadow;
    ctx.filter = runtimeQuality.currentTier === 'low' ? 'none' : 'blur(3px)';
    ctx.beginPath(); ctx.ellipse(0, 0, active ? 51 : 43, active ? 12 : 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.filter = 'none';
    if (active && runtimeQuality.current.secondaryFx) {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .17; ctx.fillStyle = light.rim;
      ctx.beginPath(); ctx.ellipse(-fighter.facing * 15, -1, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawFighterFloorReflection(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    if (fighter.jumpHeight > 24 || runtimeQuality.currentTier === 'low') return;
    const strength = this.stageId === 2 ? .18 : this.stageId === 4 ? .12 : this.stageId === 5 ? .15 : .055;
    const velocity = Math.min(1, Math.abs(fighter.x - fighter.previousX) / 5.5);
    const height = 48 + velocity * 24;
    const width = 28 + fighter.character.widthScale * 15 + velocity * 12;
    ctx.save();
    ctx.translate(fighter.x + fighter.facing * 4, fighter.y + 10);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = strength * Math.max(.35, 1 - fighter.jumpHeight / 30);
    const reflection = ctx.createLinearGradient(0, 0, 0, height);
    reflection.addColorStop(0, fighter.character.accent);
    reflection.addColorStop(.32, `${fighter.character.primary}AA`);
    reflection.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = reflection;
    ctx.filter = 'blur(5px)';
    ctx.beginPath();
    ctx.ellipse(0, height * .46, width, height * .5, -fighter.facing * .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }

  private drawFighterGroundInteraction(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    if (fighter.airborne && fighter.jumpHeight > 12) return;
    const dx = fighter.x - fighter.previousX;
    const dy = fighter.y - fighter.previousY;
    const speed = Math.min(1.5, Math.hypot(dx, dy) / 5.2);
    const locomotion = locomotionProfile(fighter.character.id);
    const landing = Math.min(1, fighter.landingFrames / 10) * locomotion.landingSquash;
    const dash = fighter.dashFrames > 0 ? locomotion.dashDrive : 0;
    const attackDrive = fighter.state === 'attack' && fighter.currentMove ? Math.min(1, Math.abs(dx) / 4 + (fighter.isMoveActive() ? .42 : .12)) : 0;
    const signature = signatureMoveProfile(fighter.character.id);
    const intensity = Math.max(landing, dash * .9, speed * .48, attackDrive * .72) * signature.groundBurst;
    if (intensity < .13 || !runtimeQuality.current.secondaryFx) return;
    const profile = stagePresentationProfile(this.stageId);
    ctx.save();
    ctx.translate(fighter.x - fighter.facing * Math.min(18, Math.abs(dx) * 2.4), fighter.y + 3);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `${profile.hudAccent}${Math.round(Math.min(.34, intensity * .22) * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 2;
    const count = (runtimeQuality.currentTier === 'high' ? 5 : 3) + (signature.groundBurst > 1.14 ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const phase = ((fighter.stateFrame * .31 + i * .73) % 1 + 1) % 1;
      const spread = 14 + i * (7 * signature.arcSpan) + intensity * (12 * signature.groundBurst);
      const x = -fighter.facing * (6 + phase * spread);
      const y = -2 - Math.sin(phase * Math.PI) * (5 + i * 1.5) * intensity;
      ctx.globalAlpha = (1 - phase) * intensity * (.48 + signature.trailDensity * .07);
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.quadraticCurveTo(x - fighter.facing * 5, y - 3, x - fighter.facing * 10, y);
      ctx.stroke();
    }
    if (landing > .08) {
      ctx.globalAlpha = landing * .35;
      ctx.beginPath(); ctx.ellipse(0, 0, 28 + landing * 36 * signature.groundBurst, 6 + landing * 5 * Math.min(1.5, signature.groundBurst), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawAttackMotionArc(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const move = fighter.currentMove;
    if (!move || fighter.state !== 'attack' || !fighter.isMoveActive() || !runtimeQuality.current.secondaryFx) return;
    const isKick = move.button?.endsWith('k') ?? false;
    const isSuper = !!move.superCost;
    const isSpecial = !move.button && !isSuper;
    const signature = signatureMoveProfile(fighter.character.id);
    const reach = Math.max(48, Math.min(164, (move.hitbox.forward + move.hitbox.back * .35) * (isKick ? 1.05 : .88) * signature.arcSpan));
    const alpha = (isSuper ? .34 : isSpecial ? .24 : .14) * (.9 + signature.trailDensity * .08);
    const color = move.color || fighter.character.accent;
    ctx.save();
    ctx.translate(fighter.x + fighter.facing * (isKick ? 16 : 28), fighter.y - fighter.jumpHeight - ((isKick ? 82 : 116) + (signature.arcLift - 1) * 12));
    ctx.scale(fighter.facing, 1);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    const trails = (isSuper ? 4 : isSpecial ? 3 : 2) + (signature.trailDensity > 1.14 ? 1 : 0);
    for (let i = 0; i < trails; i += 1) {
      ctx.lineWidth = Math.max(2, 8 - i * 1.8);
      const r = reach + i * (11 * signature.arcSpan);
      ctx.beginPath();
      if (isKick) ctx.arc(0, 0, r, -(.9 + (signature.arcLift - 1) * .12) - i * .035, (.42 + (signature.followThrough - 1) * .08) + i * .025);
      else ctx.arc(0, 0, r, -1.05 - i * .025, (-.08 + (signature.followThrough - 1) * .06) + i * .02);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * .42;
    ctx.fillStyle = color;
    const streaks = (isSuper ? 7 : 4) + (signature.trailDensity > 1.16 ? 1 : 0);
    for (let i = 0; i < streaks; i += 1) {
      const y = (i - (streaks - 1) * .5) * 8;
      ctx.fillRect(24 + i * 5, y, reach * (.42 + i * .035) * signature.arcSpan, Math.max(1.5, (4 - i * .3) * Math.min(1.18, signature.trailDensity)));
    }
    ctx.restore();
  }

  private drawHeroContactSequence(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const sample = heroContactSample(fighter);
    const move = fighter.currentMove;
    const profile = sample.profile;
    if (!move || !profile || !sample.active || !runtimeQuality.current.secondaryFx) return;
    const color = move.color || fighter.character.accent;
    const facing = fighter.facing;
    const p = sample.intensity;
    const impact = sample.phase === 'impact' ? 1 : sample.phase === 'lead' ? .55 : .72;
    const x = fighter.x + facing * Math.max(22, move.hitbox.forward * .5);
    const y = fighter.y - fighter.jumpHeight - (profile.style === 'uppercut' ? 126 : profile.style === 'kickstorm' ? 82 : 104);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    const ring = (42 + move.damage * .08) * profile.ringScale * (.75 + p * .3);
    const alpha = Math.min(.42, (.11 + p * .24) * profile.chroma * impact);
    ctx.globalAlpha = alpha;

    if (profile.style === 'wave' || profile.style === 'palm') {
      for (let i = 0; i < (profile.style === 'palm' ? 3 : 4); i += 1) {
        const rx = ring * (.72 + i * .23);
        const ry = ring * (.24 + i * .055);
        ctx.lineWidth = Math.max(2, 6 - i);
        ctx.beginPath(); ctx.ellipse(12 + i * 11, 0, rx, ry, 0, -1.15, 1.15); ctx.stroke();
      }
      ctx.globalAlpha *= .62;
      for (let i = 0; i < profile.streaks; i += 1) {
        const sy = (i - (profile.streaks - 1) * .5) * 7;
        ctx.fillRect(-8 - i * 4, sy, ring * (.8 + i * .04), Math.max(1.5, 4 - i * .18));
      }
    } else if (profile.style === 'uppercut') {
      for (let i = 0; i < 4; i += 1) {
        ctx.lineWidth = 7 - i * 1.2;
        ctx.beginPath();
        ctx.arc(-10 + i * 4, 18, ring * (.72 + i * .16), -1.55, -.08 + i * .08);
        ctx.stroke();
      }
      ctx.globalAlpha *= .58;
      for (let i = 0; i < profile.streaks; i += 1) {
        const sx = -18 + i * 5;
        ctx.beginPath(); ctx.moveTo(sx, 34); ctx.lineTo(sx + 22 + i * 3, -ring * (.52 + i * .035)); ctx.stroke();
      }
    } else if (profile.style === 'spin') {
      for (let i = 0; i < 4; i += 1) {
        ctx.lineWidth = 6 - i;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring * (.8 + i * .17), ring * (.22 + i * .045), -.12 + i * .08, 0, Math.PI * 1.8);
        ctx.stroke();
      }
    } else if (profile.style === 'kickstorm') {
      for (let i = 0; i < profile.streaks; i += 1) {
        const angle = -.82 + (i / Math.max(1, profile.streaks - 1)) * 1.42;
        const len = ring * (1 + (i % 3) * .08);
        ctx.lineWidth = Math.max(1.5, 6 - i * .28);
        ctx.beginPath();
        ctx.arc(-12, 6, len, angle - .18, angle + .18);
        ctx.stroke();
      }
    } else if (profile.style === 'crush') {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0, 24, ring * 1.1, ring * .22, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < profile.streaks; i += 1) {
        const a = -.75 + i * (1.5 / Math.max(1, profile.streaks - 1));
        ctx.lineWidth = 4 - Math.min(2, i * .15);
        ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(Math.cos(a) * ring * 1.15, 16 + Math.sin(a) * ring * .7); ctx.stroke();
      }
    } else if (profile.style === 'barrage' || profile.style === 'rush') {
      for (let i = 0; i < profile.streaks; i += 1) {
        const yy = (i - (profile.streaks - 1) * .5) * (profile.style === 'rush' ? 6 : 8);
        const lead = (i % 3) * 10;
        ctx.lineWidth = Math.max(1.5, 5 - i * .18);
        ctx.beginPath(); ctx.moveTo(-ring * .55 - lead, yy); ctx.quadraticCurveTo(0, yy * .4, ring * (1 + i * .025), yy * .18); ctx.stroke();
      }
      if (profile.style === 'rush') {
        ctx.globalAlpha *= .6;
        for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.ellipse(-18 - i * 20, i * 4, 38 + i * 12, 9 + i * 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
    }

    if (sample.phase === 'impact') {
      ctx.globalAlpha = Math.min(.3, .12 * profile.chroma + p * .12);
      const flash = ctx.createRadialGradient(0, 0, 2, 0, 0, ring * .78);
      flash.addColorStop(0, 'rgba(255,255,255,.95)');
      flash.addColorStop(.18, color);
      flash.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flash;
      ctx.beginPath(); ctx.arc(0, 0, ring * .78, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawSignatureContactBloom(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const envelope = contactVisualEnvelope(fighter);
    const move = fighter.currentMove;
    if (!move || envelope <= .02 || !runtimeQuality.current.secondaryFx) return;
    const profile = contactVisualProfile(fighter);
    const isKick = move.button?.endsWith('k') ?? false;
    const reach = Math.max(46, Math.min(142, move.hitbox.forward * .72 * profile.arcBias));
    const cx = fighter.x + fighter.facing * (isKick ? reach * .52 : reach * .62);
    const cy = fighter.y - fighter.jumpHeight - (isKick ? 78 : 112) - profile.lift * .4;
    const color = move.color || fighter.character.accent;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const radius = (move.superCost ? 78 : move.button ? 46 : 58) * profile.bloom * (.72 + envelope * .28);
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
    glow.addColorStop(0, `rgba(255,255,255,${.18 + envelope * .22})`);
    glow.addColorStop(.24, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(.34, (.13 + envelope * .19) * profile.bloom);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

    const rays = runtimeQuality.currentTier === 'high' ? (move.superCost ? 8 : 5) : 4;
    ctx.translate(cx, cy);
    ctx.rotate(fighter.facing > 0 ? 0 : Math.PI);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < rays; i += 1) {
      const spread = (i - (rays - 1) * .5) * (.13 + .035 / Math.max(.75, profile.arcBias));
      const length = radius * (.72 + i * .055) * profile.arcBias;
      ctx.globalAlpha = envelope * (.16 + (i % 2) * .035) * profile.echo;
      ctx.lineWidth = Math.max(1.5, (move.superCost ? 5 : 3.2) - i * .25);
      ctx.beginPath();
      ctx.moveTo(8, spread * 12);
      ctx.quadraticCurveTo(length * .45, spread * length * .55, length, spread * length);
      ctx.stroke();
    }
    if (profile.family === 'antiAir') {
      ctx.globalAlpha = envelope * .16 * profile.bloom;
      ctx.beginPath(); ctx.arc(0, 0, radius * .74, -1.6, -.2); ctx.stroke();
    } else if (profile.family === 'mobility') {
      ctx.globalAlpha = envelope * .12 * profile.echo;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.ellipse(-22 - i * 18, i * 5, 38 + i * 10, 9 + i * 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (profile.family === 'super') {
      ctx.globalAlpha = envelope * .18 * profile.bloom;
      for (let i = 0; i < 2; i += 1) {
        ctx.beginPath(); ctx.arc(0, 0, radius * (.56 + i * .23), -.95, .95); ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawStageSetDressing(ctx: CanvasRenderingContext2D): void {
    const profile = stageVisualProfile(this.stageId);
    const motionScale = runtimeQuality.current.backgroundMotionScale;
    const midCount = qualityDetailCount(profile.midDetail, motionScale);
    const farCount = qualityDetailCount(profile.farDetail, motionScale);
    ctx.save();
    if (this.stageId === 1) {
      ctx.strokeStyle = 'rgba(13,18,25,.78)'; ctx.lineWidth = 5;
      for (let district = 0; district < 3; district += 1) {
        const ox = district * 1220;
        for (let i = 0; i < Math.max(2, Math.floor(midCount / 4)); i += 1) {
          const x = ox + 250 + i * 230;
          ctx.beginPath(); ctx.moveTo(x, 210); ctx.lineTo(x, 440); ctx.lineTo(x + 92, 440); ctx.lineTo(x + 92, 250); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, 290); ctx.lineTo(x + 92, 330); ctx.moveTo(x + 92, 290); ctx.lineTo(x, 330); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(245,190,87,.16)';
      for (let i = 0; i < farCount; i += 1) { const x = 70 + i * 310; ctx.fillRect(x, 523, 116, 3); }
      ctx.strokeStyle = '#91454b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(2160, 424, 44, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2160, 424); ctx.lineTo(2160, 505); ctx.stroke();
    } else if (this.stageId === 2) {
      for (let i = 0; i < midCount; i += 1) {
        const x = 90 + i * 260;
        const swing = Math.sin(this.time * 2.4 + i) * 7 * motionScale;
        ctx.strokeStyle = 'rgba(255,232,202,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 116); ctx.lineTo(x + swing, 184); ctx.stroke();
        ctx.fillStyle = i % 2 ? 'rgba(255,68,145,.46)' : 'rgba(242,196,62,.48)'; ctx.beginPath(); ctx.ellipse(x + swing, 190, 15, 20, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(16,12,25,.8)'; for (let i = 0; i < Math.max(2, Math.floor(farCount / 3)); i += 1) ctx.fillRect(350 + i * 720, 458, 160, 62);
      ctx.fillStyle = 'rgba(255,255,255,.11)'; for (let i = 0; i < midCount; i += 1) ctx.fillRect(40 + i * 220, 584 + (i % 3) * 12, 90, 2);
    } else if (this.stageId === 3) {
      ctx.strokeStyle = 'rgba(52,58,62,.44)'; ctx.lineWidth = 3;
      for (let i = 0; i < Math.max(4, Math.floor(midCount / 2)); i += 1) { const x = 120 + i * 430; ctx.beginPath(); ctx.moveTo(x, 165); ctx.lineTo(x, 480); ctx.moveTo(x, 210); ctx.lineTo(x + 360, 175 + (i % 2) * 28); ctx.stroke(); }
      for (let i = 0; i < Math.max(3, Math.floor(farCount / 2)); i += 1) { const x = 520 + i * 650; ctx.fillStyle = '#b43b37'; ctx.fillRect(x, 390, 46, 92); ctx.fillStyle = 'rgba(250,250,245,.88)'; ctx.fillRect(x + 5, 398, 36, 54); ctx.fillStyle = 'rgba(80,120,150,.72)'; ctx.fillRect(x + 10, 404, 26, 20); }
    } else if (this.stageId === 4) {
      ctx.fillStyle = 'rgba(230,226,214,.09)';
      for (let i = 0; i < farCount; i += 1) { const x = 120 + i * 290; ctx.beginPath(); ctx.arc(x, 494, 18 + i % 3 * 5, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 18, 494, 36, 38); }
      ctx.strokeStyle = 'rgba(139,151,160,.28)'; ctx.lineWidth = 2;
      for (let i = 0; i < midCount; i += 1) { const x = 220 + i * 260; ctx.beginPath(); ctx.moveTo(x, 318); ctx.lineTo(x + 82, 506); ctx.moveTo(x + 82, 318); ctx.lineTo(x, 506); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(101,210,235,.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < midCount; i += 1) { const x = 90 + i * 240; const y = 230 + (i % 4) * 54; ctx.strokeRect(x, y, 112, 44); ctx.fillStyle = i % 3 ? 'rgba(95,206,232,.06)' : 'rgba(145,99,224,.07)'; ctx.fillRect(x + 6, y + 6, 100, 32); }
      ctx.strokeStyle = 'rgba(220,190,95,.16)';
      for (let i = 0; i < Math.max(3, Math.floor(farCount / 3)); i += 1) { const x = 420 + i * 760; ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x - 80, 520); ctx.moveTo(x + 120, 120); ctx.lineTo(x + 200, 520); ctx.stroke(); }
    }
    ctx.restore();
  }

  private drawFighterReadabilityAccent(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
    const profile = stageVisualProfile(this.stageId);
    const active = fighter.state === 'attack' && fighter.currentMove && fighter.isMoveActive();
    const fastMove = Math.abs(fighter.x - fighter.previousX) > 2.4 || fighter.dashFrames > 0;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const groundAlpha = fighter.hp <= 0 ? .04 : active ? .19 : .08;
    ctx.fillStyle = fighter === this.world.player ? `rgba(90,205,255,${groundAlpha})` : `rgba(255,118,91,${groundAlpha * .86})`;
    ctx.beginPath(); ctx.ellipse(fighter.x, fighter.y + 3, active ? 62 : 48, active ? 13 : 9, 0, 0, Math.PI * 2); ctx.fill();
    if (active) {
      const facing = fighter.facing;
      const radius = 54 + Math.min(70, (fighter.currentMove?.damage ?? 50) * .42);
      ctx.strokeStyle = fighter === this.world.player ? `${profile.glow}aa` : 'rgba(255,151,104,.6)';
      ctx.lineWidth = runtimeQuality.currentTier === 'low' ? 3 : 5;
      ctx.beginPath(); ctx.arc(fighter.x + facing * 18, fighter.y - 94 - fighter.jumpHeight, radius, facing > 0 ? -1.08 : Math.PI - 2.06, facing > 0 ? .85 : Math.PI + 2.06); ctx.stroke();
    }
    if (fastMove && runtimeQuality.current.secondaryFx) {
      ctx.globalAlpha = .16; ctx.fillStyle = fighter.character.accent;
      for (let i = 1; i <= 2; i += 1) { ctx.beginPath(); ctx.ellipse(fighter.x - fighter.facing * 22 * i, fighter.y - 70, 20 + i * 8, 58 - i * 8, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    if (active && fighter.currentMove && runtimeQuality.current.secondaryFx) {
      const trail = attackTrailProfile(fighter.currentMove);
      const cy = fighter.y - 92 - fighter.jumpHeight;
      ctx.globalAlpha = trail.alpha;
      ctx.strokeStyle = fighter.currentMove.color || fighter.character.accent;
      ctx.lineWidth = trail.width;
      if (trail.style === 'spiral') {
        for (let i = 0; i < trail.segments; i += 1) { const r = 28 + i * 9; ctx.beginPath(); ctx.arc(fighter.x, cy, r, this.time * 5 + i * .4, this.time * 5 + i * .4 + 1.5); ctx.stroke(); }
      } else if (trail.style === 'rush') {
        for (let i = 0; i < trail.segments; i += 1) { const spread = (i - (trail.segments - 1) * .5) * 10; ctx.beginPath(); ctx.moveTo(fighter.x - fighter.facing * (28 + i * 15), cy + spread); ctx.quadraticCurveTo(fighter.x, cy + spread * .4, fighter.x + fighter.facing * trail.length, cy); ctx.stroke(); }
      } else if (trail.style === 'heavy') {
        for (let i = 0; i < trail.segments; i += 1) { const r = trail.length * (.62 + i * .12); ctx.beginPath(); ctx.arc(fighter.x + fighter.facing * 10, cy, r, fighter.facing > 0 ? -.9 : Math.PI - 2.2, fighter.facing > 0 ? .7 : Math.PI + 2.2); ctx.stroke(); }
      } else {
        for (let i = 0; i < trail.segments; i += 1) {
          const spread = (i - (trail.segments - 1) * .5) * 9;
          ctx.beginPath(); ctx.moveTo(fighter.x - fighter.facing * (12 + i * 8), cy + spread); ctx.lineTo(fighter.x + fighter.facing * (trail.length - i * 6), cy + spread * .35); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private drawAtmosphere(ctx: CanvasRenderingContext2D): void {
    const quality = runtimeQuality.current;
    const count = (base: number) => runtimeQuality.particleCount(base);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if (this.stageId === 4) {
      ctx.strokeStyle = 'rgba(190,220,238,.14)'; ctx.lineWidth = 2;
      for (let i = 0; i < count(34); i += 1) { const x = (i * 83 + this.time * 220) % 1360 - 40; const y = (i * 47 + this.time * 310) % 760 - 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 16, y + 42); ctx.stroke(); }
    } else if (this.stageId === 3) {
      ctx.fillStyle = 'rgba(245,191,116,.2)';
      for (let i = 0; i < count(16); i += 1) { const x = (i * 97 + this.time * 46) % 1320 - 20; const y = 120 + ((i * 59 + this.time * 24) % 470); ctx.save(); ctx.translate(x, y); ctx.rotate(this.time * 1.8 + i); ctx.fillRect(-5, -2, 10, 4); ctx.restore(); }
    } else if (this.stageId === 2) {
      for (let i = 0; i < count(12); i += 1) { const x = 80 + i * 104; const a = .04 + (Math.sin(this.time * 3 + i) + 1) * .035; ctx.fillStyle = i % 2 ? `rgba(255,65,165,${a})` : `rgba(75,190,255,${a})`; ctx.fillRect(x, 120, 32, 480); }
    } else if (this.stageId === 5) {
      for (let i = 0; i < count(24); i += 1) { const x = (i * 71 + this.time * 18) % 1300; const y = 110 + (i * 43 + Math.sin(this.time + i) * 38) % 500; const r = 1.5 + (i % 3); ctx.fillStyle = i % 2 ? 'rgba(112,210,255,.22)' : 'rgba(182,121,255,.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = 'rgba(255,191,112,.09)';
      for (let i = 0; i < count(18); i += 1) { const x = (i * 89 + this.time * 28) % 1320; const y = 360 + (i * 37 % 250); ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    const vignette = ctx.createRadialGradient(640, 350, 250, 640, 350, 760);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.34)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1280, 720);
    if (quality.scanlines) { ctx.fillStyle = 'rgba(255,255,255,.018)'; for (let y = 0; y < 720; y += 4) ctx.fillRect(0, y, 1280, 1); }
  }

  private drawStageColorGrade(ctx: CanvasRenderingContext2D): void {
    const profile = stagePresentationProfile(this.stageId);
    const quality = runtimeQuality.currentTier;
    const alpha = profile.gradeAlpha * (quality === 'low' ? .72 : quality === 'balanced' ? .88 : 1);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const top = ctx.createLinearGradient(0, 0, 0, 720);
    top.addColorStop(0, `${profile.gradeTop}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`);
    top.addColorStop(.48, 'rgba(0,0,0,0)');
    top.addColorStop(1, `${profile.gradeBottom}${Math.round(alpha * .55 * 255).toString(16).padStart(2,'0')}`);
    ctx.fillStyle = top; ctx.fillRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.stageId === 4 ? 'rgba(8,18,26,.08)' : this.stageId === 2 ? 'rgba(24,4,30,.045)' : 'rgba(12,12,16,.035)'; ctx.fillRect(0,0,1280,720);
    ctx.restore();
  }

  private drawBossArenaAura(ctx: CanvasRenderingContext2D): void {
    if (this.stageId !== 5 || (this.phase !== 'duel' && this.phase !== 'final-duel')) return;
    const boss = this.world.enemy;
    const pulse = .5 + Math.sin(this.time * (this.phase === 'final-duel' ? 4.8 : 3.4)) * .18;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if (this.phase === 'duel' && boss.character.id === 'URIEN') {
      ctx.strokeStyle = `rgba(179,125,255,${.18 + pulse * .22})`; ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.ellipse(boss.x, boss.y - 24, 115 + i * 34 + pulse * 12, 28 + i * 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else if (boss.character.id === 'GILL') {
      const radius = 130 + this.gillPhase * 24 + pulse * 18;
      const left = ctx.createRadialGradient(boss.x - 28, boss.y - 105, 12, boss.x - 28, boss.y - 105, radius);
      left.addColorStop(0, `rgba(255,93,51,${.24 + pulse * .18})`); left.addColorStop(1, 'rgba(255,70,30,0)');
      ctx.fillStyle = left; ctx.beginPath(); ctx.arc(boss.x - 28, boss.y - 105, radius, 0, Math.PI * 2); ctx.fill();
      const right = ctx.createRadialGradient(boss.x + 28, boss.y - 105, 12, boss.x + 28, boss.y - 105, radius);
      right.addColorStop(0, `rgba(76,178,255,${.24 + pulse * .18})`); right.addColorStop(1, 'rgba(60,130,255,0)');
      ctx.fillStyle = right; ctx.beginPath(); ctx.arc(boss.x + 28, boss.y - 105, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(245,218,112,${.18 + this.gillPhase * .08})`; ctx.lineWidth = 3;
      for (let i = 0; i < 2 + this.gillPhase; i += 1) { const r = 95 + i * 34 + Math.sin(this.time * 3 + i) * 10; ctx.beginPath(); ctx.arc(boss.x, boss.y - 90, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  private drawGillPhaseOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'final-duel') return;
    const boss = this.world.enemy;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12,8,22,.82)'; ctx.beginPath(); ctx.roundRect(482, 108, 316, 34, 9); ctx.fill();
    ctx.fillStyle = this.gillPhase === 1 ? '#e3cf8a' : this.gillPhase === 2 ? '#9cd9ff' : '#ff9a77';
    ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText(`FINAL BOSS • PHASE ${this.gillPhase} • ${Math.ceil(boss.hp)} / ${boss.maxHp}`, 640, 130);
    if (this.gillPhaseBanner <= 0) return;
    const p = Math.min(1, this.gillPhaseBanner / 45);
    ctx.fillStyle = `rgba(6,5,14,${Math.min(.62, p * .62)})`; ctx.fillRect(0, 170, 1280, 330);
    ctx.fillStyle = this.gillPhase === 3 ? `rgba(255,126,88,${p * .22})` : `rgba(105,172,255,${p * .18})`;
    ctx.beginPath(); ctx.arc(640, 335, 180 + (1 - p) * 120, 0, Math.PI * 2); ctx.fill();
    const phaseProgress = Math.max(0, Math.min(1, 1 - this.gillPhaseBanner / (this.gillPhase === 3 ? 150 : 125)));
    if (this.gillPhase >= 2) this.drawBossCinematicPortrait(ctx, getCharacter('GILL'), this.gillPhase === 3 ? 'gill-phase3' : 'gill-phase2', 640, 548, this.gillPhase === 3 ? 1.62 : 1.48, 1, phaseProgress);
    ctx.fillStyle = '#fff'; ctx.font = '900 54px Impact, sans-serif';
    ctx.fillText(this.gillPhase === 1 ? 'GILL' : this.gillPhase === 2 ? 'PHASE II — AWAKENED' : 'FINAL SEGMENT', 640, 330);
    ctx.fillStyle = this.gillPhase === 3 ? '#ffb07b' : '#d6eaff'; ctx.font = '900 17px Arial Black, sans-serif';
    ctx.fillText(this.gillPhase === 1 ? 'THE FINAL DUEL BEGINS' : this.gillPhase === 2 ? 'ATTACK TEMPO INCREASED • SUPER READY' : 'MAXIMUM PRESSURE • SUPER FREQUENCY UP', 640, 372);
  }

  private drawBossPatternFlash(ctx: CanvasRenderingContext2D): void {
    if (this.bossPatternFlash <= 0) return;
    const p = this.bossPatternFlash / 38;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = this.phase === 'final-duel' ? `rgba(255,128,86,${p * .12})` : `rgba(178,120,255,${p * .11})`;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  private drawFinalTransition(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'final-transition') return;
    const progress = 1 - this.phaseFrames / transitionPolishProfile(this.stageId).duelFrames;
    const pulse = .48 + Math.sin(this.time * 5) * .12;
    ctx.fillStyle = `rgba(4,5,12,${Math.min(.88, .42 + progress * .42)})`; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = `rgba(94,76,160,${pulse * .45})`; ctx.beginPath(); ctx.arc(640, 330, 260 + progress * 120, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    if (this.phaseFrames > transitionPolishProfile(this.stageId).duelPrepareAt) {
      ctx.fillStyle = '#d9c06a'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillText('URIEN DEFEATED', 640, 280);
      ctx.fillStyle = '#fff'; ctx.font = '900 50px Impact, sans-serif'; ctx.fillText('THE INNER SANCTUM OPENS', 640, 350);
    } else {
      const boss = getCharacter('GILL');
      this.drawBossVersusCloseup(ctx, boss, progress, true);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 13px Arial, sans-serif'; ctx.fillText('FINAL APPROACH', 640, 245);
      ctx.fillStyle = '#f0cf73'; ctx.font = '900 72px Impact, sans-serif'; ctx.fillText('GILL', 640, 355);
      ctx.fillStyle = '#fff'; ctx.font = '900 28px Arial Black, sans-serif'; ctx.fillText('FINAL DUEL', 640, 405);
      if (this.phaseFrames < 55) { ctx.fillStyle = '#fff3bc'; ctx.font = '900 88px Impact, sans-serif'; ctx.fillText('FIGHT!', 640, 520); }
    }
  }

  private drawTransition(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'transition') return;
    const progress = 1 - this.phaseFrames / transitionPolishProfile(this.stageId).duelFrames;
    ctx.fillStyle = `rgba(4,6,10,${Math.min(.72, .22 + Math.sin(progress * Math.PI) * .6)})`;
    ctx.fillRect(0, 0, 1280, 720);
    const bar = Math.sin(Math.min(1, progress * 1.8) * Math.PI * .5) * 86;
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, 1280, bar);
    ctx.fillRect(0, 720 - bar, 1280, bar);

    ctx.textAlign = 'center';
    if (this.phaseFrames > transitionPolishProfile(this.stageId).duelPrepareAt) {
      ctx.fillStyle = '#f1bb4e';
      ctx.font = '900 15px Arial Black, sans-serif';
      ctx.fillText('THE STREET FALLS QUIET', 640, 300);
      ctx.fillStyle = '#fff';
      ctx.font = '900 48px Impact, Arial Black, sans-serif';
      ctx.fillText('A CHALLENGER APPROACHES', 640, 354);
    } else {
      const boss = this.stageBossDef();
      this.drawBossVersusCloseup(ctx, boss, progress, false);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = '800 13px Arial, sans-serif';
      ctx.fillText('BELT MODE → DUEL MODE', 640, 242);
      ctx.fillStyle = this.playerDef.accent;
      ctx.font = '900 46px Impact, Arial Black, sans-serif';
      ctx.fillText(this.playerDef.name, 420, 340);
      ctx.fillStyle = '#f2eee7';
      ctx.font = '900 22px Arial Black, sans-serif';
      ctx.fillText('VS', 640, 335);
      ctx.fillStyle = boss.accent;
      ctx.font = '900 46px Impact, Arial Black, sans-serif';
      ctx.fillText(boss.name, 860, 340);
      if (this.phaseFrames < 55) {
        const pulse = .74 + Math.sin(this.time * 11) * .2;
        ctx.fillStyle = `rgba(255,245,205,${pulse})`;
        ctx.strokeStyle = '#8f2634';
        ctx.lineWidth = 8;
        ctx.font = '900 92px Impact, Arial Black, sans-serif';
        ctx.strokeText('FIGHT!', 640, 480);
        ctx.fillText('FIGHT!', 640, 480);
      }
    }
  }

  private drawStageClear(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'clear') return;
    const timing = transitionPolishProfile(this.stageId);
    const total = this.stageId === 5 ? timing.finalClearFrames : timing.clearFrames;
    const p = Math.max(0, Math.min(1, 1 - this.phaseFrames / total));
    const reveal = Math.min(1, p * 2.4);
    const sweep = Math.min(1, Math.max(0, (p - .12) * 2.1));
    ctx.save();
    const shade = ctx.createLinearGradient(0, 0, 1280, 720);
    shade.addColorStop(0, `rgba(5,7,11,${Math.min(.82, p * .86)})`);
    shade.addColorStop(.5, `rgba(12,13,20,${Math.min(.66, p * .72)})`);
    shade.addColorStop(1, `rgba(5,7,11,${Math.min(.84, p * .88)})`);
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(241,189,81,${.08 * reveal})`;
    ctx.beginPath(); ctx.moveTo(-120, 560); ctx.lineTo(760 + sweep * 420, 120); ctx.lineTo(1040 + sweep * 280, 120); ctx.lineTo(250, 650); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(241,189,81,${reveal})`;
    ctx.font = '900 15px Arial Black, sans-serif';
    ctx.fillText(this.stageId === 5 ? 'SECRET SOCIETY INCIDENT' : this.stageTitle(), 640, 268);
    ctx.fillStyle = `rgba(255,255,255,${reveal})`;
    ctx.font = '900 84px Impact, Arial Black, sans-serif';
    ctx.strokeStyle = 'rgba(93,25,35,.92)'; ctx.lineWidth = 10;
    const clearLabel = this.stageId === 5 ? 'CAMPAIGN CLEAR' : 'STAGE CLEAR';
    ctx.strokeText(clearLabel, 640, 365); ctx.fillText(clearLabel, 640, 365);
    ctx.fillStyle = `rgba(255,255,255,${.64 * reveal})`;
    ctx.font = '800 12px Arial, sans-serif';
    const result = this.stageResult();
    ctx.fillText(`${this.playerDef.name} • SA ${this.superArt.id}: ${this.superArt.name} • ${result.defeatedEnemies} FIGHTERS DEFEATED`, 640, 408);
    ctx.fillStyle = `rgba(255,255,255,${.76 * reveal})`; ctx.font = '900 11px ui-monospace, monospace';
    ctx.fillText(`TIME ${formatClearTime(result.clearSeconds)}   DMG ${result.damageDealt}   TAKEN ${result.damageTaken}   MAX ${result.maxComboHits} HIT / ${result.maxComboDamage}`, 640, 428);
    ctx.fillStyle = `rgba(241,189,81,${.95 * reveal})`; ctx.fillRect(456, 446, 368 * sweep, 3);
    ctx.fillStyle = `rgba(255,255,255,${.48 * reveal})`; ctx.font = '900 10px Arial Black, sans-serif';
    ctx.fillText(this.stageId === 5 ? `GILL DEFEATED • PARRY ${result.parries} • SUPER ${result.supersUsed} • ENDING ROUTE OPEN` : `PARRY ${result.parries} • THROW ${result.throwsLanded} • SUPER ${result.supersUsed} • NEXT STAGE READY`, 640, 478);
    if (this.stageId === 5) {
      const bridge = Math.max(0, Math.min(1, (p - .48) / .52));
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255,225,154,${bridge * .22})`; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) { const r = 150 + i * 54 + bridge * 70; ctx.beginPath(); ctx.arc(640, 350, r, Math.PI * .08, Math.PI * .92); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,248,224,${Math.max(0, bridge - .55) * 1.18})`; ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
      if (bridge > .18) {
        const a = Math.min(1, (bridge - .18) * 1.7);
        ctx.fillStyle = `rgba(246,229,184,${a})`; ctx.font = '900 13px Arial Black, sans-serif';
        ctx.fillText('SECRET SOCIETY SIGNAL — LOST', 640, 518);
        ctx.fillStyle = `rgba(255,255,255,${a * .82})`; ctx.font = '800 11px ui-monospace, monospace';
        ctx.fillText('FINAL BATTLE RECORD SEALED  •  TRANSFERRING TO ENDING', 640, 542);
      }
    }
    ctx.restore();
  }


  private drawDefeat(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'defeat') return;
    const total = 120;
    const elapsed = total - this.defeatFrames;
    const reveal = Math.max(0, Math.min(1, elapsed / 18));
    const retryReveal = Math.max(0, Math.min(1, (elapsed - 36) / 22));
    ctx.save();
    ctx.fillStyle = `rgba(3,4,8,${.58 * reveal})`;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.strokeStyle = `rgba(66,13,20,${.95 * reveal})`;
    ctx.lineWidth = 12;
    ctx.fillStyle = `rgba(255,245,235,${reveal})`;
    ctx.font = '900 112px Impact, Arial Black, sans-serif';
    const defeatTitle = this.defeatReason === 'double-ko' ? 'DOUBLE K.O.' : this.defeatReason === 'time-over' ? 'TIME OVER' : 'K.O.';
    ctx.strokeText(defeatTitle, 640, 350);
    ctx.fillText(defeatTitle, 640, 350);
    ctx.fillStyle = `rgba(241,189,81,${retryReveal})`;
    ctx.font = '900 16px Arial Black, sans-serif';
    ctx.fillText(this.defeatFrames > 0 ? 'BATTLE STOPPED' : 'PRESS START / P / ENTER / ATTACK TO RETRY', 640, 406);
    ctx.fillStyle = `rgba(255,255,255,${.62 * retryReveal})`;
    ctx.font = '800 11px Arial, sans-serif';
    ctx.fillText('CHARACTER / SUPER ART / CAMPAIGN PROGRESS KEPT', 640, 430);
    ctx.restore();
  }

  private drawPause(ctx: CanvasRenderingContext2D): void {
    if (!this.paused || this.phase === 'defeat') return;
    ctx.save();
    ctx.fillStyle = 'rgba(3,4,8,.72)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 82px Impact, Arial Black, sans-serif';
    ctx.fillText('PAUSED', 640, 334);
    ctx.fillStyle = '#f1bd51';
    ctx.font = '900 16px Arial Black, sans-serif';
    ctx.fillText('START / P : CONTINUE', 640, 388);
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.font = '800 11px Arial, sans-serif';
    ctx.fillText('SPACE / JUMP : JUMP   •   ↑ ↓ : DEPTH MOVE IN BELT MODE', 640, 416);
    ctx.restore();
  }

  private stageBossDef(): CharacterDef {
    if (this.stageId === 2) return this.playerDef.id === 'YUN' ? getCharacter('CHUNLI') : getCharacter('YUN');
    if (this.stageId === 3) return this.playerDef.id === 'MAKOTO' ? getCharacter('RYU') : getCharacter('MAKOTO');
    if (this.stageId === 4) return this.playerDef.id === 'DUDLEY' ? getCharacter('ALEX') : getCharacter('DUDLEY');
    if (this.stageId === 5) return getCharacter('URIEN');
    return this.playerDef.id === 'DUDLEY' ? getCharacter('ALEX') : getCharacter('DUDLEY');
  }

  private drawCinematicPortraitAsset(ctx: CanvasRenderingContext2D, character: CharacterDef, x: number, y: number, width: number, height: number, facing: 1 | -1, alpha: number): boolean {
    const key = characterPortraitKey(character.id);
    const portrait = key ? artImage(key) : null;
    if (!portrait) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 26);
    ctx.clip();
    const iw = portrait.naturalWidth || width;
    const ih = portrait.naturalHeight || height;
    const scale = Math.max(width / iw, height / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    let dx = x + (width - drawW) * .5;
    const dy = y + (height - drawH) * .12;
    if (facing < 0) {
      ctx.translate(x + width, 0);
      ctx.scale(-1, 1);
      dx = 0 + (width - drawW) * .5;
      ctx.drawImage(portrait, dx, dy, drawW, drawH);
    } else {
      ctx.drawImage(portrait, dx, dy, drawW, drawH);
    }
    const fade = ctx.createLinearGradient(x, y, x, y + height);
    fade.addColorStop(0, 'rgba(0,0,0,.02)');
    fade.addColorStop(.7, 'rgba(0,0,0,.08)');
    fade.addColorStop(1, 'rgba(4,6,10,.58)');
    ctx.fillStyle = fade;
    ctx.fillRect(facing < 0 ? 0 : x, y, width, height);
    ctx.restore();
    return true;
  }

  private drawBossVersusCloseup(ctx: CanvasRenderingContext2D, boss: CharacterDef, progress: number, finalBoss: boolean): void {
    const reveal = Math.max(0, Math.min(1, (progress - .36) * 2.7));
    if (reveal <= 0) return;
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.beginPath(); ctx.rect(0, 100, 1280, 430); ctx.clip();
    ctx.fillStyle = `rgba(12,13,22,${.66 * reveal})`; ctx.fillRect(0, 100, 1280, 430);
    const leftGlow = ctx.createRadialGradient(330, 330, 30, 330, 330, 310);
    leftGlow.addColorStop(0, `${this.playerDef.accent}55`); leftGlow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = leftGlow; ctx.fillRect(0, 100, 640, 430);
    const rightGlow = ctx.createRadialGradient(950, 330, 30, 950, 330, 330);
    rightGlow.addColorStop(0, `${boss.accent}${finalBoss ? '88' : '5d'}`); rightGlow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rightGlow; ctx.fillRect(640, 100, 640, 430);
    const playerArt = this.drawCinematicPortraitAsset(ctx, this.playerDef, 118 - 30 * (1 - reveal), 128, 430, 392, 1, reveal);
    if (!playerArt) { ctx.save(); ctx.translate(-30 * (1 - reveal), 8); drawCharacterPreview(ctx, this.playerDef, 365, 570, 1.95, 1, this.time, 'signature'); ctx.restore(); }
    const bossArt = this.drawCinematicPortraitAsset(ctx, boss, 732 + 30 * (1 - reveal), 128, 430, 392, -1, reveal);
    if (!bossArt) {
      if (boss.id === 'URIEN') this.drawBossCinematicPortrait(ctx, boss, 'urien-intro', 915, 570, 2.02, -1, reveal);
      else if (boss.id === 'GILL') this.drawBossCinematicPortrait(ctx, boss, 'gill-intro', 915, 570, finalBoss ? 2.16 : 2.04, -1, reveal);
      else { ctx.save(); ctx.translate(30 * (1 - reveal), 8); drawCharacterPreview(ctx, boss, 915, 570, 2.02, -1, this.time + .35, 'signature'); ctx.restore(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.save(); ctx.translate(640, 310); ctx.rotate(-.18); ctx.fillRect(-4, -250, 8, 500); ctx.restore();
    ctx.restore();
  }

  private drawBossCinematicPortrait(ctx: CanvasRenderingContext2D, boss: CharacterDef, kind: BossCinematicKind, x: number, y: number, scale: number, facing: 1 | -1, progress: number): void {
    const pose = bossCinematicPose(kind, progress);
    ctx.save();
    ctx.translate(x + pose.x * facing, y + pose.y);
    ctx.rotate(pose.rotation * facing);
    ctx.scale(pose.scale, pose.scale);
    if (pose.aura > .12) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const glowColor = boss.id === 'GILL' ? '255,197,108' : '180,119,255';
      const radius = 100 + pose.aura * 120;
      const g = ctx.createRadialGradient(0, -112, 12, 0, -112, radius);
      g.addColorStop(0, `rgba(${glowColor},${.18 + pose.aura * .28})`); g.addColorStop(1, `rgba(${glowColor},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -112, radius, 0, Math.PI * 2); ctx.fill();
      if (boss.id === 'GILL' && pose.wing > .15) {
        ctx.strokeStyle = `rgba(255,231,161,${pose.wing * .48})`; ctx.lineWidth = 7;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 18, -128); ctx.quadraticCurveTo(side * (75 + pose.wing * 65), -185, side * (118 + pose.wing * 78), -82); ctx.stroke(); }
      }
      ctx.restore();
    }
    drawCharacterPreview(ctx, boss, 0, 0, scale, facing, this.time + progress * .8, boss.id === 'GILL' ? 'victory' : 'signature');
    ctx.restore();
  }

  private drawFinalArenaEscalation(ctx: CanvasRenderingContext2D): void {
    if (this.stageId !== 5 || (this.phase !== 'final-duel' && this.phase !== 'final-ko')) return;
    const phase = this.gillPhase;
    const pulse = .5 + Math.sin(this.time * (3.2 + phase * .8)) * .5;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const left = ctx.createLinearGradient(0, 130, 520, 610);
    left.addColorStop(0, `rgba(255,91,47,${.025 + phase * .018})`); left.addColorStop(1, 'rgba(255,91,47,0)');
    ctx.fillStyle = left; ctx.fillRect(0, 120, 560, 500);
    const right = ctx.createLinearGradient(1280, 130, 730, 610);
    right.addColorStop(0, `rgba(69,164,255,${.025 + phase * .018})`); right.addColorStop(1, 'rgba(69,164,255,0)');
    ctx.fillStyle = right; ctx.fillRect(720, 120, 560, 500);
    if (phase >= 2) {
      ctx.strokeStyle = `rgba(245,213,118,${.12 + pulse * .08})`; ctx.lineWidth = 3;
      for (let i = 0; i < 6 + phase * 2; i += 1) { const x = 130 + i * 128; const spread = 36 + (i % 3) * 17; ctx.beginPath(); ctx.moveTo(x, 704); ctx.lineTo(x + spread, 614 - (i % 2) * 24); ctx.lineTo(x + spread * .35, 548 - (i % 3) * 18); ctx.stroke(); }
    }
    if (phase === 3) {
      ctx.strokeStyle = `rgba(255,245,188,${.18 + pulse * .14})`; ctx.lineWidth = 4;
      for (let i = 0; i < 5; i += 1) { const r = 135 + i * 48 + pulse * 8; ctx.beginPath(); ctx.arc(640, 325, r, Math.PI * .05, Math.PI * .95); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,255,225,${.025 + pulse * .025})`; ctx.fillRect(0, 0, 1280, 720);
    }
    ctx.restore();
  }

  private drawFinalKoSequence(ctx: CanvasRenderingContext2D): void {
    if (this.stageId !== 5 || this.phase !== 'final-ko') return;
    const boss = this.world.enemy;
    const progress = Math.max(0, Math.min(1, 1 - this.finalKoFrames / 180));
    const pose = finalKoPose(progress);
    ctx.save();
    ctx.translate(boss.x + pose.x, boss.y + pose.y);
    ctx.rotate(pose.rotation);
    ctx.scale(pose.scale, pose.scale);
    if (pose.aura > .02) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(0, -116, 12, 0, -116, 150 + pose.aura * 100);
      glow.addColorStop(0, `rgba(255,238,164,${pose.aura * .34})`); glow.addColorStop(.45, `rgba(172,120,255,${pose.aura * .18})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -116, 180 + pose.aura * 80, 0, Math.PI * 2); ctx.fill();
      if (pose.wing > .04) { ctx.strokeStyle = `rgba(255,242,183,${pose.wing * .5})`; ctx.lineWidth = 6; for (const side of [-1,1]) { ctx.beginPath(); ctx.moveTo(side * 16, -132); ctx.quadraticCurveTo(side * (85 + pose.wing * 70), -190, side * (126 + pose.wing * 74), -74); ctx.stroke(); } }
      ctx.restore();
    }
    drawCharacterPreview(ctx, boss.character, 0, 0, 1.08, boss.facing, this.time + progress, progress < .3 ? 'parry' : 'signature');
    ctx.restore();

    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const fade = 1 - progress;
    if (progress > .2) {
      ctx.strokeStyle = `rgba(255,231,162,${Math.max(0, fade) * .34})`; ctx.lineWidth = 3;
      for (let i = 0; i < 12; i += 1) { const a = i * Math.PI / 6 + progress * .7; const r = 70 + progress * 240; ctx.beginPath(); ctx.moveTo(boss.x + Math.cos(a) * 24, boss.y - 110 + Math.sin(a) * 24); ctx.lineTo(boss.x + Math.cos(a) * r, boss.y - 110 + Math.sin(a) * r); ctx.stroke(); }
    }
    ctx.restore();

    ctx.save(); ctx.textAlign = 'center';
    if (progress < .35) { ctx.font = '900 82px Impact, sans-serif'; ctx.fillStyle = `rgba(255,244,199,${1-progress*1.7})`; ctx.strokeStyle = 'rgba(99,26,42,.92)'; ctx.lineWidth = 9; ctx.strokeText('FINAL K.O.', 640, 282); ctx.fillText('FINAL K.O.', 640, 282); }
    else if (progress < .78) { ctx.font = '900 24px Arial Black, sans-serif'; ctx.fillStyle = `rgba(255,224,154,${1-Math.abs(progress-.55)*3.1})`; ctx.fillText('GILL — DIVINITY COLLAPSING', 640, 282); }
    else { const a = Math.min(1,(progress-.78)/.22); ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillStyle = `rgba(255,244,210,${a})`; ctx.fillText('THE INCIDENT IS OVER', 640, 282); }
    ctx.restore();
  }

  private drawBackgroundMotion(ctx: CanvasRenderingContext2D): void {
    const quality = runtimeQuality.current;
    const count = (base: number) => Math.max(1, Math.round(base * quality.backgroundMotionScale));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const t = this.time;
    if (this.stageId === 1) {
      for (let district = 0; district < count(3); district += 1) {
        const taxiX = district * 1220 + ((t * 110 + district * 430) % 1080);
        ctx.fillStyle = 'rgba(247,184,61,.28)'; ctx.fillRect(taxiX, 487, 70, 20); ctx.fillStyle = 'rgba(255,242,194,.24)'; ctx.fillRect(taxiX + 54, 488, 22, 7);
      }
      ctx.strokeStyle = 'rgba(255,213,138,.14)'; ctx.lineWidth = 2;
      for (let i = 0; i < count(8); i += 1) { const x = 180 + i * 430 + Math.sin(t * .8 + i) * 14; ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x + 90, 120); ctx.stroke(); }
    } else if (this.stageId === 2) {
      for (let i = 0; i < count(24); i += 1) { const x = 55 + i * 160; const y = 405 + Math.sin(t * 2.1 + i * .7) * 7; ctx.fillStyle = i % 2 ? 'rgba(255,66,145,.25)' : 'rgba(246,198,71,.24)'; ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(t * 3 + i) * 1.5, 0, Math.PI * 2); ctx.fill(); }
      const shimmerX = (t * 150) % this.stageLength; ctx.fillStyle = 'rgba(84,212,255,.07)'; ctx.fillRect(shimmerX, 535, 180, 6);
    } else if (this.stageId === 3) {
      const trainX = (t * 155) % (this.stageLength + 850) - 850;
      ctx.fillStyle = 'rgba(224,229,232,.16)'; ctx.fillRect(trainX, 445, 720, 54); ctx.fillStyle = 'rgba(86,126,145,.22)';
      for (let x = trainX + 36; x < trainX + 690; x += 72) ctx.fillRect(x, 456, 44, 20);
    } else if (this.stageId === 4) {
      for (let i = 0; i < count(4); i += 1) { const ox = i * 1040; const sweep = 480 + Math.sin(t * .7 + i) * 180; const g = ctx.createLinearGradient(ox + sweep - 100, 100, ox + sweep + 140, 520); g.addColorStop(0, 'rgba(235,244,255,.11)'); g.addColorStop(1, 'rgba(235,244,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox + sweep, 60); ctx.lineTo(ox + sweep - 160, 520); ctx.lineTo(ox + sweep + 210, 520); ctx.closePath(); ctx.fill(); }
    } else {
      for (let i = 0; i < count(10); i += 1) { const x = 150 + i * 410; const scanY = 180 + ((t * 95 + i * 61) % 285); ctx.fillStyle = i % 2 ? 'rgba(109,214,236,.08)' : 'rgba(148,108,225,.08)'; ctx.fillRect(x, scanY, 225, 5); }
      const coreX = 3240; ctx.strokeStyle = `rgba(219,190,95,${.16 + Math.sin(t * 2.4) * .05})`; ctx.lineWidth = 4; for (let r = 70; r <= 170; r += 50) { ctx.beginPath(); ctx.arc(coreX, 360, r + Math.sin(t * 2 + r) * 7, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  private drawStageForegroundArt(ctx: CanvasRenderingContext2D, scroll: number): void {
    const art = artImage(stageForegroundKey(this.stageId));
    if (!art) return;
    const profile = stageDepthProfile(this.stageId);
    ctx.save();
    const sway = Math.sin(this.time * (.34 + this.stageId * .025)) * (runtimeQuality.currentTier === 'low' ? .8 : 2.2);
    const breathingPan = Math.sin(this.time * .17 + this.stageId) * (runtimeQuality.currentTier === 'high' ? 4 : 2);
    ctx.translate(scroll * (1 - profile.nearFactor) + breathingPan, sway);
    ctx.globalAlpha = runtimeQuality.currentTier === 'low' ? .28 : runtimeQuality.currentTier === 'balanced' ? .39 : .5;
    ctx.drawImage(art, 0, 408, this.stageLength, 314);
    ctx.globalCompositeOperation = 'multiply';
    const shade = ctx.createLinearGradient(0, 430, 0, 720);
    shade.addColorStop(0, 'rgba(18,20,28,0)');
    shade.addColorStop(1, this.stageId === 2 ? 'rgba(20,8,28,.28)' : this.stageId === 5 ? 'rgba(8,10,22,.32)' : 'rgba(8,10,14,.25)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 410, this.stageLength, 310);
    ctx.restore();
  }

  private drawForegroundMotion(ctx: CanvasRenderingContext2D, fighters: readonly Fighter[]): void {
    if (!runtimeQuality.current.secondaryFx) return;
    ctx.save();
    const t = this.time;
    const alphaAt = (x: number, y: number): number => {
      let nearest = Number.POSITIVE_INFINITY;
      for (const fighter of fighters) {
        const dx = x - fighter.x;
        const dy = y - (fighter.y - fighter.jumpHeight * .35);
        nearest = Math.min(nearest, Math.hypot(dx, dy * .72));
      }
      return foregroundOcclusionAlpha(this.stageId, nearest);
    };
    if (this.stageId === 1) {
      ctx.fillStyle = 'rgba(12,16,24,.68)';
      for (let x = 520; x < this.stageLength; x += 760) { const a = alphaAt(x + 6, 540); ctx.save(); ctx.globalAlpha = a; ctx.fillRect(x, 460, 12, 180); ctx.fillStyle = `rgba(255,208,125,${.18 + Math.sin(t * 2 + x) * .04})`; ctx.beginPath(); ctx.arc(x + 6, 458, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(12,16,24,.68)'; }
    } else if (this.stageId === 2) {
      for (let x = 310; x < this.stageLength; x += 520) { ctx.save(); ctx.globalAlpha = alphaAt(x, 600); ctx.strokeStyle = 'rgba(32,25,38,.66)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x + Math.sin(t * 1.8 + x) * 7, 710); ctx.stroke(); ctx.restore(); }
    } else if (this.stageId === 3) {
      ctx.fillStyle = 'rgba(42,49,45,.44)'; for (let x = 250; x < this.stageLength; x += 690) { ctx.save(); ctx.globalAlpha = alphaAt(x, 590); ctx.beginPath(); ctx.arc(x, 590, 68, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    } else if (this.stageId === 4) {
      ctx.fillStyle = 'rgba(8,12,17,.32)'; for (let x = 90; x < this.stageLength; x += 520) { ctx.save(); ctx.globalAlpha = alphaAt(x, 600); ctx.fillRect(x, 495, 18, 225); ctx.restore(); }
    } else {
      ctx.strokeStyle = 'rgba(82,115,142,.34)'; ctx.lineWidth = 8; for (let x = 420; x < this.stageLength; x += 790) { ctx.save(); ctx.globalAlpha = alphaAt(x - 24, 610); ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x - 65, 720); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  }

  private drawDepthParallax(ctx: CanvasRenderingContext2D, scroll: number, layer: 'far' | 'near'): void {
    if (this.world.rules.mode !== 'belt') return;
    const profile = stageDepthProfile(this.stageId);
    const factor = layer === 'far' ? profile.farFactor : profile.nearFactor;
    const alpha = layer === 'far' ? profile.farAlpha : profile.nearAlpha;
    const count = layer === 'far' ? profile.farCount : profile.nearCount;
    const quality = runtimeQuality.currentTier === 'low' ? .55 : runtimeQuality.currentTier === 'balanced' ? .78 : 1;
    const rendered = Math.max(2, Math.round(count * quality));
    ctx.save();
    // The world has already been translated by -scroll. Offset it back/forward to create real parallax depth.
    ctx.translate(scroll * (1 - factor), 0);
    ctx.globalAlpha = alpha;
    const span = this.stageLength / rendered;
    if (layer === 'far') {
      ctx.fillStyle = profile.color;
      ctx.strokeStyle = `${profile.accent}55`;
      ctx.lineWidth = 2;
      for (let i = 0; i < rendered; i += 1) {
        const x = i * span + 70 + Math.sin(this.time * .35 + i) * 12;
        const h = 110 + (i % 4) * 36;
        if (this.stageId === 2) {
          ctx.fillRect(x, 320 - h, 78, h); ctx.strokeRect(x + 10, 338 - h, 58, 24);
        } else if (this.stageId === 4) {
          ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x + 38, 240 - (i % 3) * 34); ctx.lineTo(x + 76, 500); ctx.closePath(); ctx.fill();
        } else if (this.stageId === 5) {
          ctx.strokeRect(x, 190 + (i % 3) * 22, 86, 170); ctx.beginPath(); ctx.moveTo(x + 43, 190); ctx.lineTo(x + 43, 520); ctx.stroke();
        } else {
          ctx.fillRect(x, 400 - h, 86, h); ctx.fillRect(x + 16, 410 - h, 8, 18); ctx.fillRect(x + 47, 430 - h, 9, 16);
        }
      }
    } else {
      ctx.fillStyle = profile.color;
      ctx.strokeStyle = profile.accent;
      ctx.lineWidth = this.stageId === 5 ? 6 : 4;
      for (let i = 0; i < rendered; i += 1) {
        const x = i * span + 110;
        if (this.stageId === 1) {
          ctx.fillRect(x, 438, 10, 282); ctx.beginPath(); ctx.moveTo(x + 5, 438); ctx.lineTo(x + 70, 390); ctx.stroke();
        } else if (this.stageId === 2) {
          const sway = Math.sin(this.time * 1.7 + i) * 9; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sway, 184); ctx.stroke(); ctx.beginPath(); ctx.arc(x + sway, 208, 24, 0, Math.PI * 2); ctx.fill();
        } else if (this.stageId === 3) {
          ctx.beginPath(); ctx.arc(x, 610, 80 + (i % 2) * 28, Math.PI, 0); ctx.fill();
        } else if (this.stageId === 4) {
          ctx.fillRect(x, 455, 18, 265); ctx.beginPath(); ctx.moveTo(x + 9, 455); ctx.lineTo(x + 95, 408); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(x, 720); ctx.lineTo(x + 44, 472); ctx.lineTo(x + 76, 720); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = `${profile.accent}88`; ctx.beginPath(); ctx.moveTo(x + 44, 472); ctx.lineTo(x + 44, 290); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private stageTitle(): string {
    if (this.stageId === 2) return 'HONG KONG — NIGHT MARKET';
    if (this.stageId === 3) return 'JAPAN — KARATE DISTRICT';
    if (this.stageId === 4) return 'LONDON — UNDERGROUND FIGHT CLUB';
    if (this.stageId === 5) return 'SECRET SOCIETY FACILITY';
    return 'NEW YORK — DOWNTOWN';
  }

  private drawHelp(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5,7,12,.72)'; ctx.beginPath(); ctx.roundRect(22, 628, 1236, 76, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.74)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText(this.world.rules.mode === 'duel' ? 'DUEL: ← → WALK   ↑ / SPACE JUMP   ↓ CROUCH   •   LP MP HP / LK MK HK' : 'BELT: ← → ADVANCE   ↑ ↓ DEPTH   •   SPACE / JUMP BUTTON = JUMP   •   LP MP HP / LK MK HK', 38, 650);
    ctx.fillText('PARRY: TAP FORWARD   •   LOW PARRY: TAP DOWN   •   THROW: LP+LK   •   START / P: PAUSE', 38, 669);
    const techniques = techniqueCatalogFor(this.playerDef.id);
    const command = techniques.command;
    ctx.fillStyle = 'rgba(255,226,132,.9)';
    ctx.fillText(`COMMAND: F+${command?.button?.toUpperCase() ?? '—'} ${command?.label ?? '—'}   •   AIR: JUMP + ATTACK   •   TARGET COMBO: HIT → FOLLOW-UP`, 38, 690);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(155,222,255,.82)';
    const specials = specialMovesFor(this.playerDef.id);
    ctx.fillText(`${specials.primary.label} ↓↘→+P   ${specials.antiAir.label} →↓↘+P   ${specials.mobility.label} ↓↙←+K`, 1242, 650);
    ctx.fillStyle = 'rgba(255,244,187,.82)';
    ctx.fillText(`SUPER ART ${this.superArt.id}: ${this.superArt.name}   ↓↘→ ↓↘→ + P`, 1242, 690);
  }
}
