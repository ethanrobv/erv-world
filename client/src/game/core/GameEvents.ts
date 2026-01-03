import { EventEmitter } from 'events';

/**
 * Singleton Bridge between Phaser and React.
 */
class GameEmitter extends EventEmitter {
}

export const GameEvents = new GameEmitter();
