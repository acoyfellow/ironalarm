# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - Helper utilities for DRY test code

### Fixed
- **runSubSteps callback handling**: Fixed `runSubSteps()` to correctly handle `onSubStep` callbacks that return either `Promise<void>` or `Effect.Effect<void>`
