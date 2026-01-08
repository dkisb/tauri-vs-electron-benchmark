import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Task = {
  _id: Id<"tasks">;
  text: string;
  isCompleted: boolean;
};

type FilterType = "all" | "active" | "completed";

const TASKS_PER_PAGE = 25;

export default function App() {
  const tasks = useQuery(api.tasks.getTasks) as Task[] | undefined;
  const toggleTask = useMutation(api.tasks.toggleTask);
  const createTask = useMutation(api.tasks.createTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const updateTask = useMutation(api.tasks.updateTask);

  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | null>(null);
  const [editText, setEditText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownPage, setDropdownPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filter === "active") {
      filtered = filtered.filter(task => !task.isCompleted);
    } else if (filter === "completed") {
      filtered = filtered.filter(task => task.isCompleted);
    }
    
    return filtered;
  }, [tasks, searchQuery, filter]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
    setDropdownPage(1);
  }, [searchQuery, filter]);

  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * TASKS_PER_PAGE,
    currentPage * TASKS_PER_PAGE
  );

  const dropdownTotalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const dropdownPaginatedTasks = filteredTasks.slice(
    (dropdownPage - 1) * TASKS_PER_PAGE,
    dropdownPage * TASKS_PER_PAGE
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !tasks) return null;
    return tasks.find(t => t._id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, active: 0 };
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.isCompleted).length,
      active: tasks.filter(t => !t.isCompleted).length,
    };
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    await createTask({ text: newTaskText.trim() });
    setNewTaskText("");
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task._id);
    setEditText(task.text);
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editText.trim()) return;
    await updateTask({ id: editingTaskId, text: editText.trim() });
    setEditingTaskId(null);
    setEditText("");
  };

  const handleSelectFromDropdown = (taskId: Id<"tasks">) => {
    setSelectedTaskId(taskId);
    setIsDropdownOpen(false);
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(goToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setGoToPage("");
    }
  };

  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push("...");
      pages.push(total);
    }
    return pages;
  };

  if (!tasks) {
    return (
      <main className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>📋 Todo App</h1>
        <p className="subtitle">Manage your {stats.total.toLocaleString()} tasks</p>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{stats.total.toLocaleString()}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value active">{stats.active.toLocaleString()}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat">
          <span className="stat-value completed">{stats.completed.toLocaleString()}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      {/* Create New Task */}
      <form className="create-task-form" onSubmit={handleCreateTask}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          className="task-input"
        />
        <button type="submit" className="btn btn-primary">
          Add Task
        </button>
      </form>

      {/* Task Selector Dropdown */}
      <div className="dropdown-container">
        <label className="dropdown-label">Quick Select Task</label>
        <div className="dropdown-wrapper">
          <button 
            className="dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedTask ? (
              <span className={selectedTask.isCompleted ? "completed-text" : ""}>
                {selectedTask.text}
              </span>
            ) : (
              <span className="placeholder">Select from {stats.total.toLocaleString()} tasks...</span>
            )}
            <span className="dropdown-arrow">{isDropdownOpen ? "▲" : "▼"}</span>
          </button>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dropdown-search"
                autoFocus
              />
              <div className="dropdown-list">
                {dropdownPaginatedTasks.map((task) => (
                  <div
                    key={task._id}
                    className={`dropdown-item ${task._id === selectedTaskId ? "selected" : ""} ${task.isCompleted ? "completed" : ""}`}
                    onClick={() => handleSelectFromDropdown(task._id)}
                  >
                    <span className={`status-dot ${task.isCompleted ? "done" : "pending"}`}></span>
                    <span className="item-text">{task.text}</span>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="dropdown-empty">No tasks found</div>
                )}
              </div>
              {dropdownTotalPages > 1 && (
                <div className="dropdown-pagination">
                  <button 
                    className="pagination-btn"
                    onClick={() => setDropdownPage(p => Math.max(1, p - 1))}
                    disabled={dropdownPage === 1}
                  >
                    ←
                  </button>
                  <span className="pagination-info">
                    Page {dropdownPage} of {dropdownTotalPages.toLocaleString()}
                  </span>
                  <button 
                    className="pagination-btn"
                    onClick={() => setDropdownPage(p => Math.min(dropdownTotalPages, p + 1))}
                    disabled={dropdownPage === dropdownTotalPages}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Task Detail */}
      {selectedTask && (
        <div className="task-detail">
          <h3>Selected Task</h3>
          <div className="task-detail-card">
            {editingTaskId === selectedTask._id ? (
              <div className="edit-mode">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="edit-input"
                  autoFocus
                />
                <div className="edit-actions">
                  <button className="btn btn-success" onClick={handleSaveEdit}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingTaskId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="task-info">
                  <span className={`task-status ${selectedTask.isCompleted ? "done" : "pending"}`}>
                    {selectedTask.isCompleted ? "✓ Completed" : "○ In Progress"}
                  </span>
                  <p className={`task-text ${selectedTask.isCompleted ? "completed-text" : ""}`}>
                    {selectedTask.text}
                  </p>
                </div>
                <div className="task-actions">
                  <button 
                    className={`btn ${selectedTask.isCompleted ? "btn-warning" : "btn-success"}`}
                    onClick={() => toggleTask({ id: selectedTask._id })}
                  >
                    {selectedTask.isCompleted ? "Mark Active" : "Mark Done"}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleStartEdit(selectedTask)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      deleteTask({ id: selectedTask._id });
                      setSelectedTaskId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active
          </button>
          <button 
            className={`filter-tab ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-search"
        />
      </div>

      {/* Pagination Info */}
      {filteredTasks.length > 0 && (
        <div className="pagination-header">
          <span>
            Showing {((currentPage - 1) * TASKS_PER_PAGE) + 1}–{Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length.toLocaleString()} tasks
          </span>
        </div>
      )}

      {/* Task List */}
      <div className="task-list">
        {paginatedTasks.map((task) => (
          <div 
            key={task._id} 
            className={`task-item ${task._id === selectedTaskId ? "selected" : ""} ${task.isCompleted ? "completed" : ""}`}
            onClick={() => setSelectedTaskId(task._id)}
          >
            <button
              className={`checkbox ${task.isCompleted ? "checked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleTask({ id: task._id });
              }}
            >
              {task.isCompleted && "✓"}
            </button>
            <span className={`task-item-text ${task.isCompleted ? "completed-text" : ""}`}>
              {task.text}
            </span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                deleteTask({ id: task._id });
                if (selectedTaskId === task._id) setSelectedTaskId(null);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="task-list-empty">
            {searchQuery ? "No tasks match your search" : "No tasks yet. Create one above!"}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            ««
          </button>
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            title="Previous page"
          >
            ←
          </button>
          
          <div className="pagination-pages">
            {getPageNumbers(currentPage, totalPages).map((page, i) => (
              typeof page === "number" ? (
                <button
                  key={i}
                  className={`pagination-page ${currentPage === page ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ) : (
                <span key={i} className="pagination-ellipsis">{page}</span>
              )
            ))}
          </div>

          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            →
          </button>
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            »»
          </button>

          <form className="pagination-goto" onSubmit={handleGoToPage}>
            <input
              type="number"
              placeholder="Go to..."
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              min={1}
              max={totalPages}
              className="goto-input"
            />
            <button type="submit" className="btn btn-sm">Go</button>
          </form>
        </div>
      )}
    </main>
  );
}
