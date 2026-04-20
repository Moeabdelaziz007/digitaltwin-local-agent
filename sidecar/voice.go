package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// processAudioReal handles the actual STT pipeline: WebM -> WAV (16k) -> Whisper
func processAudioReal(userID string, sessionID string, audioBytes []byte) {
	log.Printf("[Voice Bridge] Processing Real Audio (%d bytes) from User: %s", len(audioBytes), userID)

	// 1. Setup paths
	tmpDir := "sidecar/tmp"
	_ = os.MkdirAll(tmpDir, 0755)

	inputPath := filepath.Join(tmpDir, fmt.Sprintf("%s_input.webm", sessionID))
	wavPath := filepath.Join(tmpDir, fmt.Sprintf("%s_processed.wav", sessionID))
	
	ffmpegPath := "sidecar/bin/ffmpeg"
	whisperPath := "sidecar/whisper/main"
	modelPath := "sidecar/whisper/models/ggml-base.en.bin"

	// 2. Persist blob to disk
	if err := os.WriteFile(inputPath, audioBytes, 0644); err != nil {
		log.Printf("❌ Write Error: %v", err)
		return
	}
	defer os.Remove(inputPath)

	// 3. Transcode to WAV (16kHz, Mono) for whisper.cpp
	log.Println("[Voice Bridge] Transcoding to 16kHz WAV...")
	cmdFfmpeg := exec.Command(ffmpegPath, "-y", "-i", inputPath, "-ar", "16000", "-ac", "1", wavPath)
	if err := cmdFfmpeg.Run(); err != nil {
		log.Printf("❌ FFmpeg Error: %v. Is static binary present in sidecar/bin?", err)
		return
	}
	defer os.Remove(wavPath)

	// 4. Local Inference via Whisper
	log.Println("[Voice Bridge] Running local Whisper inference...")
	cmdWhisper := exec.Command(whisperPath, "-m", modelPath, "-f", wavPath, "-nt")
	var out bytes.Buffer
	cmdWhisper.Stdout = &out
	if err := cmdWhisper.Run(); err != nil {
		log.Printf("❌ Whisper Error: %v. Have you run setup-whisper.sh?", err)
		return
	}

	transcribedText := strings.TrimSpace(out.String())
	log.Printf("[Voice Bridge] Result: '%s'", transcribedText)

	if transcribedText == "" {
		log.Println("⚠️  Transcription empty, skipping job relay.")
		return
	}

	// 5. Relay to Orchestra Agent (Chat/Memory)
	JobQueue <- Job{
		Type:      JobRelayChat,
		UserID:    userID,
		SessionID: sessionID,
		Payload: map[string]interface{}{
			"text": transcribedText,
		},
	}
}

// Keep the mock function signature if main.go depends on it, or just use the real one.
func processAudioMock(userID string, sessionID string, audioBytes []byte) {
	processAudioReal(userID, sessionID, audioBytes)
}

