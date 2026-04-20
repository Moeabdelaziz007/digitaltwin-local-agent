package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Minimal pocketbase client structs
type AuthResponse struct {
	Token string `json:"token"`
}

func getAdminToken() (string, error) {
	body := map[string]string{
		"identity": adminEmail,
		"password": adminPass,
	}
	data, _ := json.Marshal(body)

	resp, err := http.Post(pbURL+"/api/admins/auth-with-password", "application/json", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("failed to auth admin: %d", resp.StatusCode)
	}

	var parsed AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	return parsed.Token, nil
}

func fetchRecentMessages(sessionID, token string) (string, error) {
	filterStr := fmt.Sprintf(`session_id="%s"`, sessionID)
	reqURL := fmt.Sprintf("%s/api/collections/conversations/records?filter=%s&perPage=10&sort=-created", pbURL, url.QueryEscape(filterStr))

	req, _ := http.NewRequest("GET", reqURL, nil)
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Items []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// Reverse to get chronological order
	transcript := ""
	for i := len(result.Items) - 1; i >= 0; i-- {
		msg := result.Items[i]
		transcript += fmt.Sprintf("[%s]: %s\n", msg.Role, msg.Content)
	}
	return transcript, nil
}

func storeFact(userID, token string, fact map[string]interface{}) error {
	body := map[string]interface{}{
		"user_id":          userID,
		"fact":             fact["fact"],
		"category":         fact["category"],
		"confidence":       fact["confidence"],
		"should_store":     true,
		"reinforced_count": 0,
	}
	if evidence, ok := fact["evidence_span"]; ok {
		body["evidence_span"] = evidence
	}

	data, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", pbURL+"/api/collections/facts/records", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase create fact failed: %d %s", resp.StatusCode, string(respBody))
	}
	return nil
}
