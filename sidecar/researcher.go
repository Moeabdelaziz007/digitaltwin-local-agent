package main

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

type ResearchConfig struct {
	ID           string `json:"id"`
	UserID       string `json:"user_id"`
	CurrentFocus string `json:"current_focus"`
	IsActive     bool   `json:"is_active"`
}

type ResearchGem struct {
	UserID              string  `json:"user_id"`
	Title               string  `json:"title"`
	URL                 string  `json:"url"`
	Content             string  `json:"content"`
	RelevanceScore      float64 `json:"relevance_score"`
	Category            string  `json:"category"`
	Status              string  `json:"status"`
	ImplementationNotes string  `json:"implementation_notes"`
}

type ArxivEntry struct {
	Title   string `xml:"title"`
	Summary string `xml:"summary"`
	ID      string `xml:"id"`
}

type ArxivFeed struct {
	Entries []ArxivEntry `xml:"entry"`
}

func runResearchJob(userID string) {
	log.Printf("[Researcher] Starting deep research loop for User: %s", userID)

	token, err := getAdminToken()
	if err != nil {
		log.Printf("[Researcher Error] Auth failed: %v", err)
		return
	}

	config, err := fetchResearchConfig(userID, token)
	if err != nil {
		log.Printf("[Researcher] No active research config found for user %s", userID)
		return
	}

	if !config.IsActive {
		log.Printf("[Researcher] Research is disabled for user %s", userID)
		return
	}

	// 1. Fetch from arXiv
	arxivResults := fetchFromArxiv(config.CurrentFocus)
	scoreAndSaveGems(userID, token, arxivResults, "arxiv", config.CurrentFocus)

	// 2. Fetch from GitHub
	githubResults := fetchFromGithub(config.CurrentFocus)
	scoreAndSaveGems(userID, token, githubResults, "github", config.CurrentFocus)

	log.Printf("[Researcher] Completed research loop for %s", userID)
}

func fetchResearchConfig(userID, token string) (*ResearchConfig, error) {
	reqURL := fmt.Sprintf("%s/api/collections/research_config/records?filter=user_id='%s'", pbURL, userID)
	req, _ := http.NewRequest("GET", reqURL, nil)
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Items []ResearchConfig `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("no config found")
	}
	return &result.Items[0], nil
}

func fetchFromArxiv(topic string) []ArxivEntry {
	query := url.QueryEscape(topic)
	reqURL := fmt.Sprintf("http://export.arxiv.org/api/query?search_query=all:%s&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending", query)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var feed ArxivFeed
	xml.Unmarshal(body, &feed)

	return feed.Entries
}

func fetchFromGithub(topic string) []ArxivEntry {
	query := url.QueryEscape(topic)
	reqURL := fmt.Sprintf("https://api.github.com/search/repositories?q=%s&sort=stars&order=desc&per_page=5", query)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var result struct {
		Items []struct {
			FullName    string `json:"full_name"`
			Description string `json:"description"`
			HTMLURL     string `json:"html_url"`
		} `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	entries := make([]ArxivEntry, 0)
	for _, item := range result.Items {
		entries = append(entries, ArxivEntry{
			Title:   item.FullName,
			Summary: item.Description,
			ID:      item.HTMLURL,
		})
	}
	return entries
}

func scoreAndSaveGems(userID, token string, items []ArxivEntry, category, focus string) {
	for _, item := range items {
		prompt := fmt.Sprintf(`
			Rate the relevance of this research item to the focus area: "%s".
			Item Title: %s
			Summary: %s

			Respond in JSON only:
			{
				"relevance_score": 0.0 to 1.0,
				"implementation_notes": "Short note on why this is a 'Gem' or how it could be used for a local digital twin."
			}
		`, focus, item.Title, item.Summary)

		resp, err := callOllamaInternal(prompt)
		if err != nil {
			continue
		}

		var scoring struct {
			Score float64 `json:"relevance_score"`
			Notes string  `json:"implementation_notes"`
		}
		if err := json.Unmarshal([]byte(resp), &scoring); err != nil {
			continue
		}

		if scoring.Score >= 0.7 {
			gem := ResearchGem{
				UserID:              userID,
				Title:               item.Title,
				URL:                 item.ID,
				Content:             item.Summary,
				RelevanceScore:      scoring.Score,
				Category:            category,
				Status:              "new",
				ImplementationNotes: scoring.Notes,
			}
			saveResearchGem(token, gem)
		}
	}
}

func saveResearchGem(token string, gem ResearchGem) {
	data, _ := json.Marshal(gem)
	req, _ := http.NewRequest("POST", pbURL+"/api/collections/research_gems/records", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Admin "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Failed to save research gem: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[Researcher] Gem Saved: %s (Score: %.2f)", gem.Title, gem.RelevanceScore)
}
