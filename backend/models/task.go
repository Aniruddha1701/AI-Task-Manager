package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Task model represents a task in MongoDB
type Task struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	AssignedTo  string             `bson:"assigned_to" json:"assigned_to"` // New Field: Assigned user
	DueDate     time.Time          `bson:"due_date,omitempty" json:"due_date,omitempty"` // New Field: Task deadline
	Status      string             `bson:"status" json:"status"`
	Tags        []string           `bson:"tags" json:"tags"` // e.g., ["work", "personal"]
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}
