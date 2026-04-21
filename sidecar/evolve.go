package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type SkillDraft struct {
	UserID               string                 `json:"user_id"`
	TraceID              string                 `json:"trace_id"`
	ProposedName         string                 `json:"proposed_name"`
	ProposedMetadata     map[string]interface{} `json:"proposed_metadata"`
	ProposedInstructions string                 `json:"proposed_instructions"`
	Status               string                 `json:"status"`
}

func runSkillEvolutionJob(userID string) {
	log.Printf("[Evolve] Analyzing successes for User: %s", userID)

	token, err := getAdminToken()
	if err != nil {
		return
	}

	// 1. Fetch successful feedback (rating = 1)
	successes, err := fetchSuccessfulTraces(userID, token)
	if err != nil {
		return
	}

	for _, fb := range successes {
		// Check if we already have a draft for this trace to avoid duplicates
		if hasExistingDraft(fb.TraceID, token) {
			continue
		}

		// 2. Fetch Trace Details
		traceData, _ := fetchTraceDetails(fb.TraceID)

		// 3. Generate Skill Draft
		draft := suggestSkillFromTrace(userID, fb.TraceID, traceData)
		if draft != nil {
			saveSkillDraft(token, *draft)
		}
	}
}

func fetchSuccessfulTraces(userID, token string) ([]Feedback, error) {
	url := fmt.Sprintf("%s/api/collections/feedback/records?filter=(user_id='%s'%%26%%26rating=1)", pbURL, userID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Items []Feedback `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	return result.Items, nil
}

func hasExistingDraft(traceID, token string) bool {
	url := fmt.Sprintf("%s/api/collections/skill_drafts/records?filter=trace_id='%s'", pbURL, traceID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var result struct {
		TotalItems int `json:"totalItems"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	return result.TotalItems > 0
}

func suggestSkillFromTrace(userID, traceID, traceData string) *SkillDraft {
	prompt := fmt.Sprintf(`
		Analyze this successful AI agent interaction and generalize it into a reusable 'Skill'.
		A Skill consists of:
		1. Name: camelCase unique name.
		2. Description: Clear purpose.
		3. Instructions: How the LLM should execute this skill in the future.
		4. When to use: Trigger conditions.

		TRACE DATA:
		%s

		Respond with JSON only:
		{
			"proposed_name": "researchLegalPrecedents",
			"proposed_metadata": {
				"version": "1.0.0",
				"description": "Generalizing the pattern used to find case law...",
				"when_to_use": "When the user asks for legal analysis of a specific case.",
				"permissions": ["network", "memory_read"],
				"required_tools": ["recallMemory", "searchArxiv"]
			},
			"proposed_instructions": "1. Start by recalling user preferences... 2. Use specific tags..."
		}
	`, traceData)

	resp, err := callOllamaInternal(prompt)
	if err != nil {
		return nil
	}

	var draft SkillDraft
	if err := json.Unmarshal([]byte(resp), &draft); err != nil {
		return nil
	}
	draft.UserID = userID
	draft.TraceID = traceID
	draft.Status = "pending"
	return &draft
}

func saveSkillDraft(token string, draft SkillDraft) {
	data, _ := json.Marshal(draft)
	req, _ := http.NewRequest("POST", pbURL+"/api/collections/skill_drafts/records", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[Evolve] Failed to save skill draft: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[Evolve] New Skill Drafted: %s (from trace %s)", draft.ProposedName, draft.TraceID)
}
