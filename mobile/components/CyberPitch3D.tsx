import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PITCH_WIDTH = 290;
const PITCH_HEIGHT = 175;

export const CyberPitch3D: React.FC = () => {
  // ─── 1. MOTION PULSES & WAVES ─────────────────────────────────────
  const shockwave1 = useRef(new Animated.Value(0)).current;
  const shockwave2 = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  // ─── 2. MATCH SIMULATION ENGINE (Photon Ball & Players) ───────────
  // Ball position on the pitch coordinate plane [0..PITCH_WIDTH, 0..PITCH_HEIGHT]
  const ballPos = useRef(new Animated.ValueXY({ x: 145, y: 87.5 })).current;
  const ballScale = useRef(new Animated.Value(1)).current;

  // Goal Celebration state & animators
  const [isGoalScored, setIsGoalScored] = useState(false);
  const [scoringTeam, setScoringTeam] = useState<'GREEN' | 'BLUE'>('GREEN');
  const goalBannerScale = useRef(new Animated.Value(0)).current;
  const goalBannerOpacity = useRef(new Animated.Value(0)).current;
  const goalShockwave = useRef(new Animated.Value(0)).current;
  const floodlightStrobe = useRef(new Animated.Value(1)).current;

  // Player Breathing Pulses
  const playerPulse = useRef(new Animated.Value(1)).current;

  // ─── 6. MATCH SIMULATION LOOP ─────────────────────────────────────
  // Tactical player positions on the 290x175 pitch
  const teamGreen = [
    { id: 'g1', x: 38, y: 87.5 },  // Defender
    { id: 'g2', x: 86, y: 44 },   // Midfield Top
    { id: 'g3', x: 108, y: 124 }, // Midfield Bottom
  ];

  const teamBlue = [
    { id: 'b1', x: 252, y: 87.5 }, // Defender
    { id: 'b2', x: 204, y: 44 },   // Midfield Top
    { id: 'b3', x: 182, y: 124 },  // Midfield Bottom
  ];

  const runMatchCycle = (attackDirection: 'GREEN_SCORES' | 'BLUE_SCORES') => {
    // Phase 1: Passing plays
    const passes = attackDirection === 'GREEN_SCORES'
      ? [
          { to: { x: 86, y: 44 }, duration: 650, easing: Easing.out(Easing.quad) },   // pass to G2
          { to: { x: 108, y: 124 }, duration: 600, easing: Easing.inOut(Easing.quad) }, // pass to G3
          { to: { x: 148, y: 70 }, duration: 550, easing: Easing.out(Easing.sin) },   // pass back to center
          { to: { x: 195, y: 110 }, duration: 500, easing: Easing.linear },           // through ball to attack
          { to: { x: 284, y: 87.5 }, duration: 420, easing: Easing.in(Easing.cubic) }, // ROCKET SHOT INTO NET!
        ]
      : [
          { to: { x: 204, y: 44 }, duration: 650, easing: Easing.out(Easing.quad) },   // pass to B2
          { to: { x: 182, y: 124 }, duration: 600, easing: Easing.inOut(Easing.quad) }, // pass to B3
          { to: { x: 142, y: 105 }, duration: 550, easing: Easing.out(Easing.sin) },  // pass into center
          { to: { x: 95, y: 65 }, duration: 500, easing: Easing.linear },             // through ball to attack
          { to: { x: 6, y: 87.5 }, duration: 420, easing: Easing.in(Easing.cubic) },  // ROCKET SHOT INTO NET!
        ];

    // Execute pass sequence
    let sequence = passes.map((p) =>
      Animated.timing(ballPos, {
        toValue: p.to,
        duration: p.duration,
        easing: p.easing,
        useNativeDriver: false,
      })
    );

    Animated.sequence(sequence).start(() => {
      // ─── GOAL EVENT TRIGGER ─────────────────────────────
      const isGreen = attackDirection === 'GREEN_SCORES';
      setScoringTeam(isGreen ? 'GREEN' : 'BLUE');
      setIsGoalScored(true);

      // A. Goal Shockwave from net
      goalShockwave.setValue(0);
      Animated.timing(goalShockwave, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      // B. Floodlight celebration strobe
      Animated.sequence([
        Animated.timing(floodlightStrobe, { toValue: 2.2, duration: 120, useNativeDriver: true }),
        Animated.timing(floodlightStrobe, { toValue: 0.6, duration: 120, useNativeDriver: true }),
        Animated.timing(floodlightStrobe, { toValue: 2.0, duration: 120, useNativeDriver: true }),
        Animated.timing(floodlightStrobe, { toValue: 1.0, duration: 200, useNativeDriver: true }),
      ]).start();

      // C. Banner Scale & Fade
      Animated.parallel([
        Animated.spring(goalBannerScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(goalBannerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Wait 1.8 seconds in celebration, then reset to kickoff
        setTimeout(() => {
          Animated.timing(goalBannerOpacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }).start(() => {
            setIsGoalScored(false);
            goalBannerScale.setValue(0);

            // Reset ball to center spot with kickoff bounce
            Animated.timing(ballPos, {
              toValue: { x: 145, y: 87.5 },
              duration: 450,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }).start(() => {
              // Alternate direction for next play
              setTimeout(() => {
                runMatchCycle(isGreen ? 'BLUE_SCORES' : 'GREEN_SCORES');
              }, 800);
            });
          });
        }, 1800);
      });
    });
  };

  useEffect(() => {
    // Start player idle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(playerPulse, { toValue: 1.25, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(playerPulse, { toValue: 0.85, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Ambient Shockwaves
    Animated.loop(
      Animated.timing(shockwave1, {
        toValue: 1,
        duration: 3200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    const timer1 = setTimeout(() => {
      Animated.loop(
        Animated.timing(shockwave2, {
          toValue: 1,
          duration: 3200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    }, 1600);

    // Scanline sweep
    Animated.loop(
      Animated.timing(scanlineAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();

    // Kickoff initial match simulation cycle!
    const kickoffTimer = setTimeout(() => {
      runMatchCycle('GREEN_SCORES');
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(kickoffTimer);
    };
  }, []);

  // Ambient Shockwave 1 & 2
  const swScale1 = shockwave1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 3.4] });
  const swOpacity1 = shockwave1.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.85, 0.35, 0] });
  const swScale2 = shockwave2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 3.4] });
  const swOpacity2 = shockwave2.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.85, 0.35, 0] });

  // Scanline Translate
  const scanlineTranslateX = scanlineAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });

  // Goal Shockwave Interpolations
  const goalWaveSize = goalShockwave.interpolate({ inputRange: [0, 1], outputRange: [10, 95] });
  const goalWaveOpacity = goalShockwave.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0.9, 0.4, 0] });

  return (
    <View style={styles.outerStage}>
      {/* 3D STATIC ISOMETRIC STADIUM CONTAINER (Fixed Perspective, No 360 Spin) */}
      <View
        style={[
          styles.pitchWrapper3D,
          {
            transform: [
              { perspective: 900 },
              { rotateX: '58deg' },
              { rotateZ: '-16deg' },
              { rotateY: '0deg' },
            ],
          },
        ]}
      >
        {/* ─── 3D FOUNDATION SLAB (Midnight Charcoal Poydevor) ─── */}
        <View style={styles.foundationSlab}>
          <View style={styles.slabBevel} />
        </View>

        {/* ─── PITCH SURFACE WITH NEON TURF & MARKINGS ─── */}
        <View style={styles.pitchSurface}>
          {/* Cyber Grid Mesh */}
          <View style={styles.gridOverlay}>
            <View style={[styles.gridLineH, { top: '25%' }]} />
            <View style={[styles.gridLineH, { top: '50%' }]} />
            <View style={[styles.gridLineH, { top: '75%' }]} />
            <View style={[styles.gridLineV, { left: '25%' }]} />
            <View style={[styles.gridLineV, { left: '75%' }]} />
          </View>

          {/* Halfway Line */}
          <View style={styles.centerLine} />

          {/* Center Spot & Ambient Pulsing Shockwaves */}
          <View style={styles.centerSpotContainer}>
            <View style={styles.centerCircle}>
              <View style={styles.centerPoint} />
            </View>

            <Animated.View
              style={[
                styles.shockwaveRing,
                { transform: [{ scale: swScale1 }], opacity: swOpacity1 },
              ]}
            />
            <Animated.View
              style={[
                styles.shockwaveRing,
                { transform: [{ scale: swScale2 }], opacity: swOpacity2, borderColor: '#38BDF8' },
              ]}
            />
          </View>

          {/* Left Penalty Area & Goal Post */}
          <View style={styles.leftPenaltyBox}>
            <View style={styles.leftGoalPost} />
          </View>

          {/* Right Penalty Area & Goal Post */}
          <View style={styles.rightPenaltyBox}>
            <View style={styles.rightGoalPost} />
          </View>

          {/* 4 Corner Arcs */}
          <View style={[styles.cornerArc, styles.cornerTL]} />
          <View style={[styles.cornerArc, styles.cornerTR]} />
          <View style={[styles.cornerArc, styles.cornerBL]} />
          <View style={[styles.cornerArc, styles.cornerBR]} />

          {/* Sweeping Energy Laser Beam */}
          <Animated.View
            style={[
              styles.energyBeam,
              { transform: [{ translateX: scanlineTranslateX }] },
            ]}
          />

          {/* ─── 7. NEON PHOTON PLAYERS (2 TEAMS: 3 GREEN vs 3 BLUE) ─── */}
          {/* Team Green (Neon Green Photon Dots) */}
          {teamGreen.map((p) => (
            <View
              key={p.id}
              style={[styles.playerDotContainer, { left: p.x - 7, top: p.y - 7 }]}
            >
              <Animated.View
                style={[
                  styles.playerGlowRing,
                  { borderColor: '#00FF87', transform: [{ scale: playerPulse }] },
                ]}
              />
              <View style={[styles.playerCore, { backgroundColor: '#00FF87', shadowColor: '#00FF87' }]} />
            </View>
          ))}

          {/* Team Blue (Electric Blue Photon Dots) */}
          {teamBlue.map((p) => (
            <View
              key={p.id}
              style={[styles.playerDotContainer, { left: p.x - 7, top: p.y - 7 }]}
            >
              <Animated.View
                style={[
                  styles.playerGlowRing,
                  { borderColor: '#38BDF8', transform: [{ scale: playerPulse }] },
                ]}
              />
              <View style={[styles.playerCore, { backgroundColor: '#38BDF8', shadowColor: '#38BDF8' }]} />
            </View>
          ))}

          {/* ─── 8. THE PHOTON BALL (Glowing White Ball with Aura) ─── */}
          <Animated.View
            style={[
              styles.photonBall,
              {
                transform: [
                  { translateX: ballPos.x },
                  { translateY: ballPos.y },
                ],
              },
            ]}
          >
            <View style={styles.ballCore} />
            <View style={styles.ballAura} />
          </Animated.View>

          {/* ─── 9. GOAL SHOCKWAVE FROM NET ─── */}
          {isGoalScored && (
            <Animated.View
              style={[
                styles.goalWaveCircle,
                scoringTeam === 'GREEN' ? { right: -15, top: PITCH_HEIGHT / 2 - 45 } : { left: -15, top: PITCH_HEIGHT / 2 - 45 },
                {
                  width: goalWaveSize,
                  height: goalWaveSize,
                  borderRadius: 50,
                  opacity: goalWaveOpacity,
                  borderColor: scoringTeam === 'GREEN' ? '#00FF87' : '#38BDF8',
                },
              ]}
            />
          )}

          {/* ─── 10. CELEBRATION "GOOOL!" BADGE ─── */}
          {isGoalScored && (
            <Animated.View
              style={[
                styles.goalCelebrationBadge,
                {
                  transform: [{ scale: goalBannerScale }],
                  opacity: goalBannerOpacity,
                },
              ]}
            >
              <Ionicons name="football" size={16} color="#090D16" />
              <Text style={styles.goalCelebrationText}>GOOOL!</Text>
            </Animated.View>
          )}
        </View>

        {/* ─── 4 CORNER FLOODLIGHT TOWERS (With Strobe Strobe Pulse) ─── */}
        <Animated.View style={[styles.floodlightTower, styles.floodlightTL, { opacity: floodlightStrobe }]}>
          <View style={styles.floodlightPillar} />
          <View style={styles.floodlightHead} />
          <View style={styles.floodlightBeamCone} />
        </Animated.View>

        <Animated.View style={[styles.floodlightTower, styles.floodlightTR, { opacity: floodlightStrobe }]}>
          <View style={styles.floodlightPillar} />
          <View style={styles.floodlightHead} />
          <View style={styles.floodlightBeamCone} />
        </Animated.View>

        <Animated.View style={[styles.floodlightTower, styles.floodlightBL, { opacity: floodlightStrobe }]}>
          <View style={styles.floodlightPillar} />
          <View style={styles.floodlightHead} />
          <View style={styles.floodlightBeamCone} />
        </Animated.View>

        <Animated.View style={[styles.floodlightTower, styles.floodlightBR, { opacity: floodlightStrobe }]}>
          <View style={styles.floodlightPillar} />
          <View style={styles.floodlightHead} />
          <View style={styles.floodlightBeamCone} />
        </Animated.View>

        {/* 3D Depth Ground Shadow */}
        <View style={styles.bottomGroundGlow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    width: '100%',
    overflow: 'visible',
    marginVertical: 4,
    position: 'relative',
  },
  pitchWrapper3D: {
    width: PITCH_WIDTH + 30,
    height: PITCH_HEIGHT + 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 3D Foundation Slab */
  foundationSlab: {
    position: 'absolute',
    top: 15,
    width: PITCH_WIDTH + 14,
    height: PITCH_HEIGHT + 14,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 135, 0.25)',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 20,
  },
  slabBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Main Pitch Surface */
  pitchSurface: {
    width: PITCH_WIDTH,
    height: PITCH_HEIGHT,
    borderRadius: 14,
    backgroundColor: 'rgba(9, 28, 36, 0.88)',
    borderWidth: 2,
    borderColor: '#00FF87',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 16,
    zIndex: 5,
  },

  /* Background Grid Overlay */
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
  },

  /* Center Markings */
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: PITCH_WIDTH / 2 - 1,
    width: 2,
    backgroundColor: 'rgba(0, 255, 135, 0.65)',
    shadowColor: '#00FF87',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  centerSpotContainer: {
    position: 'absolute',
    top: PITCH_HEIGHT / 2 - 28,
    left: PITCH_WIDTH / 2 - 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 135, 0.04)',
    shadowColor: '#00FF87',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  centerPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF87',
    shadowColor: '#00FF87',
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  /* Shockwave Rings */
  shockwaveRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#00FF87',
    backgroundColor: 'transparent',
    shadowColor: '#00FF87',
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },

  /* Penalty Boxes */
  leftPenaltyBox: {
    position: 'absolute',
    top: PITCH_HEIGHT / 2 - 38,
    left: 0,
    width: 44,
    height: 76,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: 'rgba(0, 255, 135, 0.7)',
    backgroundColor: 'rgba(0, 255, 135, 0.03)',
    justifyContent: 'center',
  },
  leftGoalPost: {
    position: 'absolute',
    left: -4,
    width: 6,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  rightPenaltyBox: {
    position: 'absolute',
    top: PITCH_HEIGHT / 2 - 38,
    right: 0,
    width: 44,
    height: 76,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: 'rgba(0, 255, 135, 0.7)',
    backgroundColor: 'rgba(0, 255, 135, 0.03)',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightGoalPost: {
    position: 'absolute',
    right: -4,
    width: 6,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowRadius: 8,
    shadowOpacity: 1,
  },

  /* Corner Arcs */
  cornerArc: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(0, 255, 135, 0.6)',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomRightRadius: 16,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomLeftRadius: 16,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopRightRadius: 16,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
  },

  /* Sweeping Energy Beam */
  energyBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    shadowColor: '#38BDF8',
    shadowRadius: 14,
    shadowOpacity: 0.9,
  },

  /* ─── NEON PHOTON PLAYERS ─── */
  playerDotContainer: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  playerGlowRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  playerCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 4,
  },

  /* ─── THE PHOTON BALL ─── */
  photonBall: {
    position: 'absolute',
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  ballCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 8,
  },
  ballAura: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  /* ─── GOAL SHOCKWAVE FROM NET ─── */
  goalWaveCircle: {
    position: 'absolute',
    borderWidth: 2.5,
    backgroundColor: 'transparent',
    shadowRadius: 12,
    shadowOpacity: 1,
    zIndex: 12,
  },

  /* ─── CELEBRATION "GOOOL!" BADGE ─── */
  goalCelebrationBadge: {
    position: 'absolute',
    top: PITCH_HEIGHT / 2 - 16,
    left: PITCH_WIDTH / 2 - 50,
    width: 100,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00FF87',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#00FF87',
    shadowRadius: 20,
    shadowOpacity: 1,
    elevation: 12,
    zIndex: 20,
  },
  goalCelebrationText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* 4 Floodlight Towers */
  floodlightTower: {
    position: 'absolute',
    width: 14,
    height: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  floodlightTL: { top: 6, left: 4 },
  floodlightTR: { top: 6, right: 4 },
  floodlightBL: { bottom: 6, left: 4 },
  floodlightBR: { bottom: 6, right: 4 },
  floodlightPillar: {
    width: 3,
    height: 16,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  floodlightHead: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF87',
    shadowColor: '#00FF87',
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  floodlightBeamCone: {
    position: 'absolute',
    top: 5,
    width: 22,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
  },

  /* 3D Depth Ground Glow */
  bottomGroundGlow: {
    position: 'absolute',
    bottom: -18,
    width: PITCH_WIDTH * 0.92,
    height: 38,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 255, 135, 0.16)',
    shadowColor: '#00FF87',
    shadowRadius: 40,
    shadowOpacity: 0.85,
    zIndex: -1,
  },

  /* Touch Drag Hint Badge */
  touchHintBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 28, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#00FF87',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  touchHintText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
