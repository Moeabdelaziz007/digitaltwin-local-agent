# Contributor Guide: Dependency Modes

DigitalMiniTwin uses heavy native dependencies for real-time voice (Whisper) and high-performance inference. To reduce friction for new contributors, we support a **Lightweight Mode** that mocks these capabilities.

## 🛠 Choose Your Mode

### 1. Lightweight Mode (Default)
Ideal for UI/UX work, frontend logic, and core platform development. **No C++ compilation or heavy models required.**

- **Execution**: The Go sidecar boots with `MockSpeechService`.
- **Requirements**: Just Node.js and Go.
- **Command**:
  ```bash
  # In sidecar directory
  go run . -mode=lightweight
  ```

### 2. Full Native Mode
Required for working on voice features, STT/TTS logic, and low-latency interaction hardening.

- **Execution**: Boots `NativeSpeechService` (Whisper.cpp + FFmpeg).
- **Requirements**: 
  - FFmpeg (static binary in `sidecar/bin/`)
  - Whisper models in `sidecar/whisper/models/`
- **Command**:
  ```bash
  # Setup whisper first
  ./scripts/setup-whisper.sh
  
  # Run sidecar
  go run . -mode=native
  ```

## 🏗 Service Boundary
All native capabilities are isolated behind the `SpeechService` interface in `sidecar/speech_service.go`. 

- **Do NOT** call native binaries directly from `main.go`.
- **DO** inject the appropriate service via the `GetSpeechService(mode)` factory.

## 🧪 CI Validation
Our CI pipeline validates the **Lightweight Mode** on every push to ensure the core application logic is always stable even without native runtimes.
