import React, { useRef, useEffect, useCallback, useState } from "react";
import * as Tone from "tone";


const drumSamples = {
  kick: "/assets/kick.wav",
  snare: "/assets/snare.wav",
  piano: "/assets/piano.wav",
};

const instrumentNoteMap: { [key: string]: string } = {
  kick: "C1",
  snare: "D1",
  piano: "F1",
};

type DrumStep = string[];
type DrumTrack = DrumStep[];

interface DrumMachineOptions {
  notes: DrumTrack;
  onStepChange?: (stepIndex: number) => void;
}

export const useDrumMachine: ({notes, onStepChange}: DrumMachineOptions) => {
    isPlaying: boolean;
    togglePlayback: () => Promise<void>;
    isLoaded: boolean;
  } = ({ notes, onStepChange }: DrumMachineOptions): { isPlaying: boolean; togglePlayback:() => Promise<void>; isLoaded: boolean } => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const sampler: React.RefObject<Tone.Sampler | null> = useRef<Tone.Sampler | null>(null);
  const part: React.RefObject<Tone.Part | null> = useRef<Tone.Part | null>(null);
  const animationFrameId: React.RefObject<number> = useRef<number>(0);

  useEffect((): () => void => {
    sampler.current = new Tone.Sampler({
      urls: {
        [instrumentNoteMap.kick]: drumSamples.kick,
        [instrumentNoteMap.snare]: drumSamples.snare,
        [instrumentNoteMap.piano]: drumSamples.piano,
      },
      onload: (): void => {
        setIsLoaded(true);
      },
      baseUrl: window.location.origin,
    }).toDestination();

    Tone.getTransport().bpm.value = 100;

    return (): void => {
      sampler.current?.dispose();
    };
  }, []);

  useEffect((): () => void => {
    part.current?.dispose();
    const events: { time: { "16n": number }; instruments: string[] }[] =
    notes.map((stepInstruments: DrumStep, i: number): { time: { "16n": number }; instruments: string[] } => {
      return ({
        time: { "16n": i },
        instruments: stepInstruments,
      });
    });

    part.current = new Tone.Part((time: number, event: { time: { "16n": number }; instruments: string[] }): void => {
      if (event.instruments && event.instruments.length > 0) {
        event.instruments.forEach((instrument: string): void => {
          const noteToPlay: string = instrumentNoteMap[instrument];
          if (noteToPlay) {
            sampler.current?.triggerAttack(noteToPlay, time);
          }
        });
      }
    }, events).start(0);

    part.current.loop = true;
    part.current.loopEnd = { "16n": notes.length };

    return (): void => {
      part.current?.dispose();
    };
  }, [notes]);

  const animationLoop: () => void = useCallback((): void => {
    if (onStepChange && part.current) {
      onStepChange(Math.floor(part.current.progress * notes.length));
    }
    animationFrameId.current = requestAnimationFrame(animationLoop);
  }, [onStepChange, notes.length]);

  useEffect((): () => void => {
    if (isPlaying) {
      animationFrameId.current = requestAnimationFrame(animationLoop);
    } else {
      cancelAnimationFrame(animationFrameId.current);
    }
    return (): void => cancelAnimationFrame(animationFrameId.current);
  }, [isPlaying, animationLoop]);

  const togglePlayback: () => Promise<void> = useCallback(async (): Promise<void> => {
    if (!isLoaded) {
      return;
    }
    if (Tone.getContext().state !== "running") {
      await Tone.start();
    }
    await Tone.start();
    if (Tone.getTransport().state === 'started') {
      Tone.getTransport().stop();
      setIsPlaying(false);
    } else {
      Tone.getTransport().start();
      setIsPlaying(true);
    }
  }, [isLoaded]);

  return { isPlaying, togglePlayback, isLoaded };
};
