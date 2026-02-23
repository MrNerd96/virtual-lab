import { useRef, useEffect, useCallback } from 'react';

/**
 * useHeartbeatSound — Synthesizes realistic heartbeat "lub-dub" sounds
 * using the Web Audio API, synchronized with the cardiac cycle phase.
 * 
 * S1 ("lub") — triggered at the START of atrial systole (phase ~0.0)
 * S2 ("dub") — triggered at the START of ventricular systole (phase ~0.40)
 * 
 * The sounds are generated procedurally — no audio files needed.
 */

interface HeartbeatSoundOptions {
    /** Whether the simulation is actively recording/running */
    isRecording: boolean;
    /** Current phase within the cardiac cycle (0..1) */
    phase: number;
    /** Volume level 0..1 */
    volume: number;
    /** Whether sound is muted */
    muted: boolean;
    /** Whether the heart is currently silent (flatlined, e.g. during Stannius ligature pause) */
    silent?: boolean;
}

// Create a clean heartbeat "thump" using smooth sine oscillators (no noise)
function playHeartSound(
    ctx: AudioContext,
    gainNode: GainNode,
    type: 'S1' | 'S2'
) {
    const now = ctx.currentTime;

    // S1 ("lub") — lower pitch, longer, warm
    // S2 ("dub") — higher pitch, shorter, snappier
    const freq = type === 'S1' ? 55 : 75;
    const duration = type === 'S1' ? 0.14 : 0.09;
    const attackTime = 0.01;
    const peakGain = type === 'S1' ? 1.0 : 0.75;

    // Primary low-frequency oscillator (the deep thump)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(peakGain, now + attackTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(gainNode);

    osc.start(now);
    osc.stop(now + duration + 0.02);

    // Secondary harmonic (adds subtle warmth)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    const harmFreq = type === 'S1' ? 110 : 140;
    osc2.frequency.setValueAtTime(harmFreq, now);
    osc2.frequency.exponentialRampToValueAtTime(harmFreq * 0.5, now + duration);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(peakGain * 0.2, now + attackTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    osc2.connect(osc2Gain);
    osc2Gain.connect(gainNode);

    osc2.start(now);
    osc2.stop(now + duration + 0.02);
}

export function useHeartbeatSound({ isRecording, phase, volume, muted, silent }: HeartbeatSoundOptions) {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const lastS1Ref = useRef(false); // Was S1 zone active last frame?
    const lastS2Ref = useRef(false); // Was S2 zone active last frame?

    // Initialize AudioContext lazily (requires user gesture in some browsers)
    const ensureAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            gainNodeRef.current = audioCtxRef.current.createGain();
            gainNodeRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    // Update volume
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setValueAtTime(
                muted ? 0 : volume,
                audioCtxRef.current?.currentTime || 0
            );
        }
    }, [volume, muted]);

    // Trigger sounds based on phase transitions
    useEffect(() => {
        if (!isRecording || muted) {
            lastS1Ref.current = false;
            lastS2Ref.current = false;
            return;
        }

        // Handle phase = -1 (pause in all-or-none experiment) or silent flag
        if (phase < 0 || silent) {
            lastS1Ref.current = false;
            lastS2Ref.current = false;
            return;
        }

        ensureAudioContext();
        const ctx = audioCtxRef.current;
        const gain = gainNodeRef.current;
        if (!ctx || !gain) return;

        // S1 triggers at END of atrial systole (phase ~0.16, AV valves closing)
        const inS1Zone = phase >= 0.14 && phase < 0.20;
        if (inS1Zone && !lastS1Ref.current) {
            playHeartSound(ctx, gain, 'S1');
        }
        lastS1Ref.current = inS1Zone;

        // S2 triggers at END of ventricular systole (phase ~0.56, semilunar valves closing)
        const inS2Zone = phase >= 0.54 && phase < 0.60;
        if (inS2Zone && !lastS2Ref.current) {
            playHeartSound(ctx, gain, 'S2');
        }
        lastS2Ref.current = inS2Zone;
    }, [phase, isRecording, muted, ensureAudioContext]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, []);

    return { ensureAudioContext };
}
