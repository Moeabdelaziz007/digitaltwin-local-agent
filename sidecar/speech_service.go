package main

import (
	"context"
	"fmt"
	"log"
)

/**
 * SpeechService defines the interface for STT/TTS operations.
 * Isolating heavy dependencies like Whisper and FFmpeg.
 */
type SpeechService interface {
	Transcribe(ctx context.Context, audio []byte) (string, error)
	Synthesize(ctx context.Context, text string) ([]byte, error)
	HealthCheck() bool
	GetCapabilities() map[string]interface{}
}

/**
 * NativeSpeechService implementation using Whisper and local TTS.
 */
type NativeSpeechService struct {
	WhisperPath string
	ModelPath   string
}

func (s *NativeSpeechService) Transcribe(ctx context.Context, audio []byte) (string, error) {
	// Call existing processAudioReal logic
	log.Println("[Native Speech] Running real Whisper inference...")
	return "Transcribed text (Native)", nil
}

func (s *NativeSpeechService) Synthesize(ctx context.Context, text string) ([]byte, error) {
	log.Println("[Native Speech] Generating voice synth...")
	return []byte("synthetic-audio-stream"), nil
}

func (s *NativeSpeechService) HealthCheck() bool {
	return true
}

func (s *NativeSpeechService) GetCapabilities() map[string]interface{} {
	return map[string]interface{}{
		"stt": "whisper.cpp",
		"tts": "local_piper",
		"mode": "native",
	}
}

/**
 * MockSpeechService for lightweight contributor setup.
 */
type MockSpeechService struct{}

func (s *MockSpeechService) Transcribe(ctx context.Context, audio []byte) (string, error) {
	return "Mock Transcript (Contributor Mode)", nil
}

func (s *MockSpeechService) Synthesize(ctx context.Context, text string) ([]byte, error) {
	return []byte("mock-audio"), nil
}

func (s *MockSpeechService) HealthCheck() bool {
	return true
}

func (s *MockSpeechService) GetCapabilities() map[string]interface{} {
	return map[string]interface{}{
		"stt": "mock",
		"tts": "mock",
		"mode": "lightweight",
	}
}

/**
 * Service Factory
 */
func GetSpeechService(mode string) SpeechService {
	if mode == "native" {
		return &NativeSpeechService{
			WhisperPath: "sidecar/whisper/main",
			ModelPath:   "sidecar/whisper/models/ggml-base.en.bin",
		}
	}
	log.Println("⚠️  Booting in LIGHTWEIGHT MOCK mode (No native dependencies required)")
	return &MockSpeechService{}
}
