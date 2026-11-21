package helpers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"api/server"

	"gorm.io/gorm"
)

// Client is an HTTP test client bound to an in-process Echo server.
type Client struct {
	t     *testing.T
	base  string
	Token string
}

// NewClient boots the API with the given database and returns a test client.
func NewClient(t *testing.T, db *gorm.DB) *Client {
	t.Helper()

	if os.Getenv("JWT_SECRET") == "" {
		_ = os.Setenv("JWT_SECRET", "test-secret")
	}

	e := server.New(db)
	ts := httptest.NewServer(e)
	t.Cleanup(ts.Close)

	return &Client{t: t, base: ts.URL + "/api"}
}

// Do performs a JSON request and decodes the response into out when provided.
func (c *Client) Do(method, path string, body interface{}, out interface{}) int {
	c.t.Helper()

	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("marshal request: %v", err)
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, c.base+path, reader)
	if err != nil {
		c.t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatalf("execute request: %v", err)
	}
	defer resp.Body.Close()

	payload, _ := io.ReadAll(resp.Body)
	if out != nil && len(payload) > 0 {
		_ = json.Unmarshal(payload, out)
	}
	return resp.StatusCode
}

// Login authenticates and stores the JWT on the client.
func (c *Client) Login(email, password string) {
	c.t.Helper()

	var out struct {
		Token string `json:"token"`
	}
	status := c.Do(http.MethodPost, "/users/login", map[string]string{
		"email":    email,
		"password": password,
	}, &out)
	if status != http.StatusOK || out.Token == "" {
		c.t.Fatalf("login %s failed with status %d", email, status)
	}
	c.Token = out.Token
}

// Envelope mirrors dto.SuccessResponse for response decoding.
type Envelope struct {
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}
