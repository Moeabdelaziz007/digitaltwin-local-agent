package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

var (
	pbURL         = getEnv("POCKETBASE_URL", "http://127.0.0.1:8090")
	ollamaURL     = getEnv("OLLAMA_URL", "http://127.0.0.1:11434")
	ollamaModel   = getEnv("OLLAMA_MODEL", "gemma")
	adminEmail    = getEnv("PB_ADMIN_EMAIL", "admin@twin.local")
	adminPass     = getEnv("PB_ADMIN_PASSWORD", "changeme_on_first_run")
)

// Orchestration Structs
type JobType string

const (
	JobRelayChat   JobType = "RELAY_CHAT"
	JobReflect     JobType = "REFLECT_MEMORY"
	JobBuildGraph  JobType = "BUILD_GRAPH"
	JobTTS         JobType = "TTS_RENDER"
	JobReviewJSON  JobType = "REVIEW_JSON"
)

type Job struct {
	Type      JobType                `json:"type"`
	UserID    string                 `json:"user_id"`
	SessionID string                 `json:"session_id"`
	Payload   map[string]interface{} `json:"payload"`
}

// Orchestra Agent: The Internal Queue
var JobQueue = make(chan Job, 100)

func main() {
	// ... config setup
	if pb := os.Getenv("POCKETBASE_URL"); pb != "" {
		pbURL = pb
	}
	if ol := os.Getenv("OLLAMA_URL"); ol != "" {
		ollamaURL = ol
	}
	if md := os.Getenv("OLLAMA_MODEL"); md != "" {
		ollamaModel = md
	}

	// 1. Boot up the Orchestra Agent (Worker Pool)
	log.Println("[Orchestra Agent] Booting up internal task swarm (3 workers)...")
	for i := 1; i <= 3; i++ {
		go patternAgentWorker(i, JobQueue)
	}

	// 2. Expose the Ingestion Endpoint
	http.HandleFunc("/api/jobs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var job Job
		if err := json.NewDecoder(r.Body).Decode(&job); err != nil {
			http.Error(w, "Invalid job payload", http.StatusBadRequest)
			return
		}

		select {
		case JobQueue <- job:
			w.WriteHeader(http.StatusAccepted)
			fmt.Fprintf(w, `{"status":"accepted", "job_type":"%s"}`, job.Type)
		default:
			http.Error(w, "Orchestra queue is full", http.StatusTooManyRequests)
		}
	})

	// 3. Audio Ingestion Endpoint (STT Bridge)
	http.HandleFunc("/api/jobs/audio", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// 10 MB limit for voice clips
		r.ParseMultipartForm(10 << 20)
		file, _, err := r.FormFile("audio")
		if err != nil {
			http.Error(w, "Missing audio file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		userId := r.FormValue("user_id")
		sessionId := r.FormValue("session_id")
		
		// In a real app we'd save this to disk, but for mock pipeline we just read length
		audioBytes := make([]byte, 1024)
		n, _ := file.Read(audioBytes)

		// Fire and forget
		go processAudioMock(userId, sessionId, audioBytes[:n])

		w.WriteHeader(http.StatusAccepted)
		fmt.Fprintf(w, `{"status":"accepted", "message":"Audio handed to Whisper Swarm"}`)
	})

	log.Println("🐝 MyDigitalTwin Sidecar (Orchestra) listening on :4242")
	log.Fatal(http.ListenAndServe(":4242", nil))
}

// Pattern Agent: Decides the execution workflow for each job
func patternAgentWorker(id int, jobs <-chan Job) {
	for job := range jobs {
		log.Printf("[Pattern Agent Worker %d] Routing Job: %s for User: %s", id, job.Type, job.UserID)

		switch job.Type {
		case JobReflect:
			// LLM Reflection Agent
			runReflectionJob(job.UserID, job.SessionID)
			
			// Chain Reaction: Reflection is done, trigger Graph Build async
			JobQueue <- Job{Type: JobBuildGraph, UserID: job.UserID} // Graph Handoff
			
		case JobBuildGraph:
			// Rule-based Graph Agent
			buildGraphJob(job.UserID)

		case JobTTS:
			log.Printf("[Worker %d] TTS Job executed", id)

		case JobReviewJSON:
			log.Printf("[Worker %d] Reviewing JSON structures", id)

		default:
			log.Printf("[Worker %d] Unknown Pattern: %s", id, job.Type)
		}
	}
}
