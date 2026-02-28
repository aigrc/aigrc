/**
 * Kill Switch Module (SPEC-RT-005)
 * Remote termination of AI agents
 *
 * AIGOS-E7: Full implementation with multiple channel support
 *
 * Features:
 * - SSE (Server-Sent Events) for real-time commands (AIGOS-703)
 * - HTTP Polling fallback for restrictive environments (AIGOS-704)
 * - File-based listener for local development (AIGOS-705)
 * - Command signature verification (AIGOS-706)
 * - Target filtering (instance, asset, root) (AIGOS-707)
 * - TERMINATE, PAUSE, RESUME commands (AIGOS-708)
 * - Automatic reconnection with exponential backoff
 * - Event-driven architecture
 *
 * @example
 * ```typescript
 * import { createKillSwitchReceiver } from '@aigrc/runtime';
 *
 * const killSwitch = createKillSwitchReceiver({
 *   enabled: true,
 *   channel: 'sse',
 *   endpoint: 'https://control.example.com/kill-switch',
 *   authToken: process.env.KILL_SWITCH_TOKEN,
 *   onTerminate: (identity, command, reason) => {
 *     console.log(`Terminating: ${reason}`);
 *     cleanup();
 *     process.exit(0);
 *   },
 *   onPause: (identity, command) => {
 *     console.log('Pausing agent');
 *     pauseOperations();
 *   },
 *   onResume: (identity, command) => {
 *     console.log('Resuming agent');
 *     resumeOperations();
 *   },
 * });
 *
 * // Start listening
 * await killSwitch.start(identity);
 *
 * // Monitor events
 * killSwitch.onEvent((event) => {
 *   console.log('Kill switch event:', event.type);
 * });
 * ```
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type {
  // Core command type from @aigrc/core
  KillSwitchCommand,
  // Channel and connection types
  KillSwitchChannelType,
  ConnectionState,
  // Configuration
  KillSwitchConfig,
  // Handlers
  KillSwitchTerminateHandler,
  KillSwitchPauseHandler,
  KillSwitchResumeHandler,
  // Events
  KillSwitchEventType,
  KillSwitchEvent,
  KillSwitchEventHandler,
  KillSwitchConnectedEvent,
  KillSwitchDisconnectedEvent,
  KillSwitchReconnectingEvent,
  KillSwitchCommandReceivedEvent,
  KillSwitchCommandVerifiedEvent,
  KillSwitchCommandExecutedEvent,
  KillSwitchCommandFailedEvent,
  KillSwitchVerificationFailedEvent,
  KillSwitchErrorEvent,
  // Results
  CommandExecutionResult,
  CommandVerificationResult,
  // Listener interface
  ChannelListener,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CLASSES AND FUNCTIONS
// ─────────────────────────────────────────────────────────────────

export {
  KillSwitchReceiver,
  KillSwitchError,
  createKillSwitchReceiver,
  executeKillSwitch,
} from "./kill-switch-receiver.js";
