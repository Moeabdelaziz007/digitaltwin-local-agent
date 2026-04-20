package main

import (
	"log"
)

// GraphNode matches 'facts' in PocketBase
type GraphNode struct {
	ID         string   `json:"id"`
	FactText   string   `json:"fact_text"`
	Category   string   `json:"category"`
	Tags       []string `json:"tags"`
	Confidence float64  `json:"confidence"`
	ReinfCount int      `json:"reinforced_count"`
	IsActive   bool     `json:"is_active"`
	Importance float64  `json:"importance"`
}

// GraphEdge matches 'memory_edges'
type GraphEdge struct {
	ID               string  `json:"id"`
	SourceFact       string  `json:"source_fact"`
	TargetFact       string  `json:"target_fact"`
	RelationshipType string  `json:"relationship_type"`
	Weight           float64 `json:"weight"`
	CreatedBy        string  `json:"created_by"`
}

// CanvasMap is the compiled cache for React Flow
type CanvasMap struct {
	Nodes []map[string]interface{} `json:"nodes"`
	Edges []map[string]interface{} `json:"edges"`
}

// Graph Pattern Agent (Worker)
func buildGraphJob(userID string) {
	log.Printf("[Graph Agent] Orchestrating Graph Build for %s", userID)

	token, err := getAdminToken()
	if err != nil {
		log.Printf("[Graph Error] Auth failed: %v", err)
		return
	}

	// 1. Fetch all active facts
	facts, err := fetchActiveFacts(userID, token)
	if err != nil {
		log.Printf("[Graph Error] Failed to fetch facts: %v", err)
		return
	}

	// 2. Rule-based Edge Generation
	edgesCreated := ruleBasedEdgeInference(userID, token, facts)
	
	// 3. Rebuild the derived cache canvas_map.json
	err = rebuildCanvasMapCache(userID, token)
	if err != nil {
		log.Printf("[Graph Error] Cache rebuild failed: %v", err)
		return
	}

	log.Printf("[Graph Agent] Built canvas cache for %s. Discovered %d new semantic edges.", userID, edgesCreated)
}

// A simple rule-based system instead of heavy LLM calls
func ruleBasedEdgeInference(userID, token string, facts []GraphNode) int {
	newEdges := 0
	
	// Example Rule: Tag overlap -> related_to
	for i := 0; i < len(facts); i++ {
		for j := i + 1; j < len(facts); j++ {
			sharedTags := countSharedTags(facts[i].Tags, facts[j].Tags)
			if sharedTags >= 2 {
				// Prevent duplicate edges by checking DB first in a real prod env
				// For now, we simulate linking
				_ = createMemoryEdge(userID, token, facts[i].ID, facts[j].ID, "related_to", float64(sharedTags))
				newEdges++
			}
		}
	}
	return newEdges
}

func countSharedTags(t1, t2 []string) int {
	count := 0
	m := make(map[string]bool)
	for _, t := range t1 {
		m[t] = true
	}
	for _, t := range t2 {
		if m[t] {
			count++
		}
	}
	return count
}

func fetchActiveFacts(userID, token string) ([]GraphNode, error) {
	url := fmt.Sprintf("%s/api/collections/facts/records?filter=user_id='%s'&&is_active=true&perPage=200", pbURL, userID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Items []GraphNode `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Items, nil
}

func createMemoryEdge(userID, token, src, target, rel string, weight float64) error {
	payload := map[string]interface{}{
		"user_id":           userID,
		"source_fact":        src,
		"target_fact":        target,
		"relationship_type":  rel,
		"weight":            weight,
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/api/collections/memory_edges/records", pbURL)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func rebuildCanvasMapCache(userID, token string) error {
	// 1. Fetch facts (nodes)
	facts, _ := fetchActiveFacts(userID, token)
	
	// 2. Fetch edges
	url := fmt.Sprintf("%s/api/collections/memory_edges/records?filter=user_id='%s'", pbURL, userID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", token)
	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	
	var edgeResult struct {
		Items []GraphEdge `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&edgeResult)

	// 3. Construct CanvasMap
	canvas := CanvasMap{
		Nodes: make([]map[string]interface{}, 0),
		Edges: make([]map[string]interface{}, 0),
	}

	for _, f := range facts {
		canvas.Nodes = append(canvas.Nodes, map[string]interface{}{
			"id":   f.ID,
			"type": "factNode",
			"data": map[string]interface{}{"label": f.FactText, "category": f.Category},
		})
	}

	for _, e := range edgeResult.Items {
		canvas.Edges = append(canvas.Edges, map[string]interface{}{
			"id":     e.ID,
			"source": e.SourceFact,
			"target": e.TargetFact,
			"label":  e.RelationshipType,
		})
	}

	// 4. Update the user_profile cache
	profileURL := fmt.Sprintf("%s/api/collections/user_profiles/records?filter=user_id='%s'", pbURL, userID)
	reqP, _ := http.NewRequest("GET", profileURL, nil)
	reqP.Header.Set("Authorization", token)
	respP, _ := http.DefaultClient.Do(reqP)
	defer respP.Body.Close()
	
	var profResult struct {
		Items []struct{ ID string `json:"id"` } `json:"items"`
	}
	json.NewDecoder(respP.Body).Decode(&profResult)

	if len(profResult.Items) > 0 {
		cacheJSON, _ := json.Marshal(canvas)
		updateURL := fmt.Sprintf("%s/api/collections/user_profiles/records/%s", pbURL, profResult.Items[0].ID)
		patchBody, _ := json.Marshal(map[string]interface{}{"memory_map_cache": string(cacheJSON)})
		reqU, _ := http.NewRequest("PATCH", updateURL, bytes.NewBuffer(patchBody))
		reqU.Header.Set("Authorization", token)
		reqU.Header.Set("Content-Type", "application/json")
		http.DefaultClient.Do(reqU)
	}

	return nil
}
