# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-08

### Breaking Changes
- **⚠️ Effect-TS Migration**: All public APIs now return `Effect<T, E, never>` instead of `Promise<T>`
  - `schedule()`, `runNow()`, `checkpoint()`, `completeTask()`, `getTask()`, `getTasks()` all return Effect types
  - Users must wrap API calls with `Effect.runPromise()` or use in Effect contexts
  - Task handlers signature changed from `(scheduler, taskId, params) => Effect` to `(taskId, params) => Effect`
  - Handlers now use `SchedulerService` from Effect context instead of injected scheduler parameter

### Added
- **Effect-TS Integration**: Complete rewrite using Effect-TS for composable error handling and dependency injection
- **SchedulerService**: Context.Tag providing type-safe access to scheduler methods within task handlers
- **Tagged Errors**: `HandlerMissing`, `TaskNotFound`, `TaskConflict` with proper error types
- **Automatic Retry**: Built-in exponential backoff retry logic with `Effect.retry` + `Schedule.exponential`
- **Fiber Concurrency**: `Effect.forEach` for structured concurrent task processing
- **Structured Logging**: `Effect.log*` replacing console methods for observability
- **DO Sharding**: Hash-based routing for horizontal scaling across multiple DO instances
- **Hibernation Optimization**: Removed setTimeout calls to enable proper DO hibernation
- **Broadcast Debouncing**: WebSocket broadcast optimization with configurable intervals
- **Transaction Safety**: Atomic resource operations to prevent race conditions
- **Error Recovery**: Auto-recovery mechanisms for failed global state tasks
- **Cleanup Framework**: Configurable auto-deletion of completed/failed tasks

### Changed
- **Task Handler API**: Simplified signature using Effect context instead of parameter injection
- **Concurrency Control**: Fiber-based processing replaces Promise.all batching
- **Error Handling**: Typed errors with Data.TaggedError throughout
- **Logging**: Structured logging with appropriate levels (log, logError, logWarning)
- **Performance**: Optimized for Cloudflare DO hibernation and cost efficiency

### Removed
- **Promise-based APIs**: All public methods now return Effect types
- **Injected Scheduler**: Handlers use Context service instead of parameter
- **Manual Retry Logic**: Replaced with Effect's composable retry policies
- **setTimeout Hibernation Blocks**: Eliminated for cost optimization
- **Polling Dependencies**: WebSocket-only real-time updates

## [0.1.0] - 2026-01-08

### Added
- **Priority scheduling**: Tasks now support priority levels (0=high, 1=medium, 2=low)
  - `runNow()` accepts `options.priority`
  - `schedule()` accepts `options.priority`
  - When multiple tasks are due simultaneously, higher priority tasks execute first
  - Default priority is 1 (medium) for backward compatibility
  - Existing tasks without priority field default to medium priority
- **Comprehensive test suite**: Added 75+ tests covering core functionality, lifecycle management, priority scheduling, multi-step tasks, error handling, and integration scenarios
  - Test harness using Vitest with Cloudflare Workers integration
  - Tests for critical failure modes (handler missing, error recovery, state preservation)
  - Integration tests for concurrency limits and rapid mutations
  - Helper utilities for DRY test code### Fixed
- **runSubSteps callback handling**: Fixed `runSubSteps()` to correctly handle `onSubStep` callbacks that return either `Promise<void>` or `Effect.Effect<void>`