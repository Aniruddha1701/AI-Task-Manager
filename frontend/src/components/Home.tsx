"use client";
import { useEffect, useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface AIResponse {
  title: string;
  description: string;
}

const TaskForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey ?? "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    response_mime_type: "application/json",
  });

  const getTasks = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8080/tasks");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      setTasks(json);
    } catch (error) {
      setError("Failed to fetch tasks. Please try again later.");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTask = async () => {
    try {
      setIsGenerating(true);
      const taskList = tasks
        .map(
          (task) => `{title: "${task.title}", description: "${task.description}"}`
        )
        .join("\n");

      const prompt = `
        Given a set of tasks, predict the next logical task that might follow:
        ${taskList}
        
        Return only a JSON object in this format:
        {
          "title": "Task Title",
          "description": "Task Description"
        }`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const cleanedResponse = response.replace(/```json|```/g, "").trim();
      const generatedTask = JSON.parse(cleanedResponse) as AIResponse;

      setFormData({
        title: generatedTask.title,
        description: generatedTask.description,
      });
    } catch (error) {
      setError("Failed to generate task suggestion");
      console.error("AI generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const markTaskAsCompleted = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      await getTasks();
    } catch (error) {
      setError("Failed to mark task as completed");
      console.error("Update error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          status: "pending",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      await getTasks();
      setFormData({ title: "", description: "" });
    } catch (error) {
      setError("Failed to create task. Please try again.");
      console.error("Submit error:", error);
    }
  };

  useEffect(() => {
    getTasks();
  }, [getTasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-800 text-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Task Title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full p-3 border border-gray-500 rounded bg-gray-700 text-white"
            required
          />
          <textarea
            placeholder="Task Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className="w-full p-3 border border-gray-500 rounded bg-gray-700 text-white min-h-[100px]"
            required
          />
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 transition-colors"
            >
              Add Task
            </button>
            <button
              type="button"
              onClick={generateTask}
              disabled={isGenerating}
              className="flex-1 bg-purple-500 text-white px-6 py-3 rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate with AI"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Task List</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No tasks found.</p>
        ) : (
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {task.title}
                    </h3>
                    <p className="text-gray-700 mt-1">{task.description}</p>
                    <span
                      className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                        task.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.status !== "completed" && (
                    <button
                      onClick={() => markTaskAsCompleted(task.id)}
                      className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskForm;