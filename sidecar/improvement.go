package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Feedback struct {
	ID        string                 `json:"id"`
	TraceID   string                 `json:"trace_id"`
	Rating    int                    `json:"rating"`
	Tags      []string               `json:"tags"`
	Comment   string                 `json:"comment"`
	Metadata  map[string]interface{} `json:"metadata"`
}

type ImprovementProposal struct {
	Subsystem      string                 `json:"subsystem"`
	ProposalType   string                 `json:"proposal_type"`
	Hypothesis     string                 `json:"hypothesis"`
	ProposedChange map[string]interface{} `json:"proposed_change"`
	Status         string                 `json:"status"` // draft, pending_approval
}

func runImprovementJob(userID string) {
	log.Printf("[Improvement Agent] Starting reflection for User: %s", userID)

	// 1. Fetch negative feedback from PocketBase
	feedbackItems, err := fetchNegativeFeedback(userID)
	if err != nil {
		log.Printf("[Improvement Agent] Error fetching feedback: %v", err)
		return
	}

	if len(feedbackItems) == 0 {
		log.Println("[Improvement Agent] No negative feedback found. Stay the course.")
		return
	}

	// 2. Cluster / Analyze (Simplified for Phase 1)
	for _, fb := range feedbackItems {
		// Fetch trace details to give context to the LLM
		traceData, _ := fetchTraceDetails(fb.TraceID)
		
		// 3. Ask Ollama for a suggested adjustment (Prompt Variant vs Threshold)
		proposal := suggestImprovement(fb, traceData)
		if proposal != nil {
			saveImprovementProposal(*proposal)
		}
	}
}

func fetchNegativeFeedback(userID string) ([]Feedback, error) {
	url := fmt.Sprintf("%s/api/collections/feedback/records?filter=(user_id='%s'%%26%%26rating<0)", pbURL, userID)
	resp, err := http.Get(url)
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

func fetchTraceDetails(traceID string) (string, error) {
	// Simplified: Fetch names and attributes of spans in this trace
	url := fmt.Sprintf("%s/api/collections/traces/records?filter=(trace_id='%s')", pbURL, traceID)
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Items []map[string]interface{} `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	
	b, _ := json.Marshal(result.Items)
	return string(b), nil
}

func suggestImprovement(fb Feedback, traceData string) *ImprovementProposal {
	prompt := fmt.Sprintf(`
		Analyze this AI agent failure and suggest ONE bounded improvement.
		Subsystems available: prompt_variants, memory_weighting, retrieval_thresholds.
		
		FAILURE:
		Tags: %v
		User Comment: %s
		
		TRACE_SNAPSHOT:
		%s
		
		Respond with JSON only:
		{
			"subsystem": "retrieval_thresholds",
			"proposal_type": "adjust_threshold",
			"hypothesis": "The retrieval was too verbose, decreasing threshold might help.",
			"proposed_change": {"key": "MEMORY_DEDUP_THRESHOLD", "value": 0.92}
		}
	`, fb.Tags, fb.Comment, traceData)

	resp, err := callOllamaInternal(prompt)
	if err != nil {
		return nil
	}

	var proposal ImprovementProposal
	if err := json.Unmarshal([]byte(resp), &proposal); err != nil {
		return nil
	}
	proposal.Status = "pending_approval"
	return &proposal
}

func saveImprovementProposal(proposal ImprovementProposal) {
	payload, _ := json.Marshal(proposal)
	resp, err := http.Post(pbURL+"/api/collections/improvement_proposals/records", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to save proposal: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[Improvement Agent] Proposal saved: %s", proposal.Hypothesis)
}

func callOllamaInternal(prompt string) (string, error) {
	payload := map[string]interface{}{
		"model":  ollamaModel,
		"prompt": prompt,
		"stream": false,
	}
	b, _ := json.Marshal(payload)
	resp, err := http.Post(ollamaURL+"/api/generate", "application/json", bytes.NewBuffer(b))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var res struct {
		Response string `json:"response"`
	}
	json.NewDecoder(resp.Body).Decode(&res)
	return res.Response, nil
}
