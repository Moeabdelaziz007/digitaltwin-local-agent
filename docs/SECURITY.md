# Security Policy 🔐

## Protocol: Local Silence
DigitalMiniTwin is designed to operate without ever leaking data to the cloud.

### 1. Data Handling
- **Audio**: All voice recording is converted to WAV locally and processed by `whisper.cpp` on your machine. No raw audio is uploaded to any cloud provider.
- **Transcripts**: Stored in a local PocketBase SQLite database.
- **LLM Context**: Only sent to your local Ollama instance.

### 2. Secret Management
Our `.gitignore` is configured to catch:
- `.env` files
- PEM/SSH keys
- PocketBase binaries and data folders
- Whisper model binaries (`.bin`)

**Action Required**: Never force-add files to git. Use `scripts/setup-whisper.sh` to download models locally.

### 3. Reporting a Vulnerability
If you find a security issue, please contact **Mohamed Hossameldin Abdelaziz** directly via the contact methods listed in the project metadata. Do not open a public issue for zero-day vulnerabilities.
