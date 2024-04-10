/*
 * NFD Management Service
 *
 * Service for querying and managing NFDs
 *
 * API version: 1.0
 * Contact: feedback@txnlab.dev
 * Generated by: Swagger Codegen (https://github.com/swagger-api/swagger-codegen.git)
 */
package swagger

import (
	"time"
)

// NFDActivity contains the property changes made in a particular NFD contract update call
type NfdActivity struct {
	// Algorand Block number of change
	Block        int64  `json:"block"`
	CacheControl string `json:"cache-control,omitempty"`
	// Changed properties
	Changes map[string]string `json:"changes,omitempty"`
	Etag    string            `json:"etag,omitempty"`
	// Not returned, used in tagging for response to indicate if-none-match etag matched
	MatchCheck string `json:"match-check,omitempty"`
	// NFD Name
	Name        string    `json:"name"`
	TimeChanged time.Time `json:"timeChanged"`
}