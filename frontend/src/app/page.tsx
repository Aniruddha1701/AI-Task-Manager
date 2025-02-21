'use client';
import TaskForm from "../components/Home";

export default function Home() {
  console.log("Rendering Home Component");
  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">AI Task Manager</h1>
      <TaskForm />
    </div>
  );
}
