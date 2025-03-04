package controllers

import (
	"context"
	"net/http"
	"task-manager/config"
	"task-manager/models"
	"task-manager/websocket" // Import the websocket package

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Get the tasks collection
func GetTaskCollection() *mongo.Collection {
	if config.DB == nil {
		return nil
	}
	return config.DB.Collection("tasks")
}

// Create a task
func CreateTask(c *gin.Context) {
	collection := GetTaskCollection()
	if collection == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not connected"})
		return
	}

	var task models.Task
	if err := c.BindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	result, err := collection.InsertOne(context.TODO(), task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	// Broadcast task creation to all WebSocket clients
	websocket.Broadcast("New task created: " + task.Title)

	c.JSON(http.StatusCreated, gin.H{"task_id": result.InsertedID})
}

// GetTasks retrieves all tasks from the database
func GetTasks(c *gin.Context) {
	collection := GetTaskCollection()
	if collection == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not connected"})
		return
	}

	// Fetch all tasks
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks"})
		return
	}
	defer cursor.Close(context.TODO())

	var tasks []models.Task
	if err := cursor.All(context.TODO(), &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error parsing tasks"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// UpdateTask updates a task's status
func UpdateTask(c *gin.Context) {
	collection := GetTaskCollection()
	if collection == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not connected"})
		return
	}

	// Get the task ID from the URL parameter
	taskID := c.Param("id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task ID is required"})
		return
	}

	// Convert the task ID to an ObjectID
	objID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// Parse the request body to get the updated status
	var updateData struct {
		Status string `json:"status"` 
	}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Update the task in the database
	filter := bson.M{"_id": objID}
	update := bson.M{"$set": bson.M{"status": updateData.Status}}
	result, err := collection.UpdateOne(context.TODO(), filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	// Check if the task was found and updated
	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Broadcast task update to all WebSocket clients
	websocket.Broadcast("Task updated: " + taskID)

	c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully"})
}
