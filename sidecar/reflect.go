package main

import (
	"encoding/json"
	"log"
)

type ReflectionResult struct {
	NewFacts []map[string]interface{} `json:"new_facts"`
	InferredDislikes []string `json:"inferred_dislikes"`
	StaleFactsToDemote []string `json:"stale_facts_to_demote"`
	RecommendedSoulShift string `json:"recommended_soul_shift"`
	LearningProgressDelta int `json:"learning_progress_delta"`
}

func runReflectionJob(userID, sessionID string) {
	log.Printf("[Reflect] Triggered for user %s", userID)

	token, err := getAdminToken()
	if err != nil {
		log.Printf("[Reflect Error] Auth failed: %v", err)
		return
	}

	transcript, err := fetchRecentMessages(sessionID, token)
	if err != nil {
		return
	}

	prompt := `You are the Cognitive Reflection Engine for MyDigitalTwin.
Analyze the following batch of recent conversation turns.
Respond STRICTLY in JSON format with no additional text.

[CONVERSATION BATCH]
` + transcript + `

EXPECTED JSON FORMAT:
{
  "new_facts": [
    {
      "fact": "Declarative statement",
      "category": "preference|biographical|habit",
      "confidence": 0.9,
      "should_store_fact": true
    }
  ],
  "inferred_dislikes": ["User hates long explanations"],
  "stale_facts_to_demote": ["user_loves_coffee"],
  "recommended_soul_shift": "Increase directness. Reduce fluff.",
  "learning_progress_delta": 2
}`

	rawJSON, err := callOllama(prompt)
	if err != nil {
		log.Printf("[Reflect Error] Ollama failed: %v", err)
		return
	}

	var result ReflectionResult
	if err := json.Unmarshal([]byte(rawJSON), &result); err != nil {
		log.Printf("[Reflect Error] Invalid JSON from Ollama: %v", err)
		return
	}

	factsStored := 0
	for _, f := range result.NewFacts {
		shouldStore, _ := f["should_store_fact"].(bool)
		confidence, _ := f["confidence"].(float64)

		if shouldStore && confidence >= 0.7 {
			err := storeFact(userID, token, f)
			if err == nil {
				factsStored++
			}
		}
	}
	
	// Simulated Memory Decay (in a real system we'd decrement reinforced_count in DB)
	for _, sf := range result.StaleFactsToDemote {
		log.Printf("[Reflect Decay] Marked for decay: %s", sf)
	}

	log.Printf("[Reflect] Shift recommended: %s", result.RecommendedSoulShift)
	log.Printf("[Reflect] Completed for %s. Facts Added: %d", userID, factsStored)
}
