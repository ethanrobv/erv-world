import { GameEvents } from '@/game/core/GameEvents';
import { PLANETS } from '@/game/data/Planets';

/**
 * Manages the planetary day/night cycle.
 * Calculates lighting palettes and in-game clock time based on the specific planet's day length.
 */
export class TimeSystem {
    private currentPlanetId: string = 'earth';
    private lastUpdate: number = 0;

    public setPlanet(id: string) {
        this.currentPlanetId = id;
    }

    /**
     * Updates the time simulation.
     * Throttled to run approximately once per second to reduce event noise.
     * @param time - Phaser internal time.
     * @param now - Real-world timestamp (synced via NetworkManager for consistency).
     */
    public update(time: number, now: number) {
        // Throttle updates to ~1 second to save performance and network/event traffic
        if (time - this.lastUpdate < 1000) return;
        this.lastUpdate = time;

        const planet = PLANETS[this.currentPlanetId];
        if (!planet) return;

        // Calc sun ratio (0.0 to 1.0) based on the planet's defined day length
        const msPerDay = planet.dayLengthMinutes * 60000;
        const cycleProgress = (now % msPerDay) / msPerDay; // 0.0 = Start of Day, 0.5 = Mid

        // Determine Lighting Palette based on time of day
        let palette = planet.palettes.night;
        if (cycleProgress > 0.25 && cycleProgress < 0.7) palette = planet.palettes.day;
        else if (cycleProgress >= 0.7 && cycleProgress < 0.8) palette = planet.palettes.sunset;

        // Calculate Formatted Clock Time (Scales 0-1 cycle to a 24h clock)
        const totalMinutes = Math.floor(cycleProgress * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12; // Convert 0 to 12
        const timeString = `${ displayHour }:${ minutes.toString().padStart(2, '0') } ${ ampm }`;

        // Emit update with both visual palette and UI text
        GameEvents.emit('TIME_UPDATE', {
            palette,
            timeString,
            dayProgress: cycleProgress
        });
    }
}
