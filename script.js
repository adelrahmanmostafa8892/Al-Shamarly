        document.addEventListener('DOMContentLoaded', function() {
            // DOM Elements
            const tasksContainer = document.getElementById('tasksContainer');
            const searchInput = document.getElementById('searchInput');
            const scrollToTopBtn = document.getElementById('scrollToTop');
            const filterButtons = document.querySelectorAll('.filter-btn');
            const totalTasksEl = document.getElementById('totalTasks');
            const completedTasksEl = document.getElementById('completedTasks');
            const inProgressTasksEl = document.getElementById('inProgressTasks');
            const pendingTasksEl = document.getElementById('pendingTasks');
            
            // Constants
            const TOTAL_TASKS = 604;
            const TASK_ITEMS = [
                "تحسين رسم الصفحة وعملها PDF",
                "عمل TTF مبدئي",
                "تعديل احترافي لل TTF",
                "مراجعة الصفحة",
                "نشر الصفحة على التلجرام"
            ];
            const STORAGE_KEY = 'mushaf_shamarly_tasks_v2';
            
            // State
            let tasksState = {};
            let currentFilter = 'all';
            let currentSearch = '';
            
            // Initialize the app
            function init() {
                loadTasksFromStorage();
                renderAllTasks();
                updateStats();
                setupEventListeners();
            }
            
            // Load tasks from localStorage
            function loadTasksFromStorage() {
                const savedTasks = localStorage.getItem(STORAGE_KEY);
                if (savedTasks) {
                    tasksState = JSON.parse(savedTasks);
                } else {
                    // Initialize empty state for all tasks
                    for (let i = 1; i <= TOTAL_TASKS; i++) {
                        const taskId = `A-${i.toString().padStart(3, '0')}`;
                        tasksState[taskId] = {
                            items: TASK_ITEMS.map(item => ({ 
                                text: item, 
                                completed: false, 
                                inProgress: false 
                            })),
                            completed: false,
                            inProgress: false
                        };
                    }
                    saveTasksToStorage();
                }
            }
            
            // Save tasks to localStorage
            function saveTasksToStorage() {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksState));
                updateStats();
            }
            
            // Render all tasks based on current filter and search
            function renderAllTasks() {
                tasksContainer.innerHTML = '';
                
                let hasVisibleTasks = false;
                
                for (let i = 1; i <= TOTAL_TASKS; i++) {
                    const taskId = `A-${i.toString().padStart(3, '0')}`;
                    const taskData = tasksState[taskId];
                    
                    // Skip if doesn't match search
                    if (currentSearch && !taskId.includes(currentSearch)) {
                        let hasMatchingItem = false;
                        for (const item of taskData.items) {
                            if (item.text.includes(currentSearch)) {
                                hasMatchingItem = true;
                                break;
                            }
                        }
                        if (!hasMatchingItem) continue;
                    }
                    
                    // Skip if doesn't match filter
                    if (currentFilter === 'completed' && !taskData.completed) continue;
                    if (currentFilter === 'in-progress' && !taskData.inProgress) continue;
                    if (currentFilter === 'pending' && (taskData.completed || taskData.inProgress)) continue;
                    
                    hasVisibleTasks = true;
                    
                    const taskCard = createTaskCard(taskId, taskData);
                    tasksContainer.appendChild(taskCard);
                }
                
                if (!hasVisibleTasks) {
                    showEmptyState();
                }
            }
            
            // Create a single task card
            function createTaskCard(taskId, taskData) {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.dataset.id = taskId;
                
                // Determine card status class
                if (taskData.completed) {
                    taskCard.classList.add('completed');
                } else if (taskData.inProgress) {
                    taskCard.classList.add('in-progress');
                }
                
                // Calculate progress
                const completedItems = taskData.items.filter(item => item.completed).length;
                const progress = (completedItems / TASK_ITEMS.length) * 100;
                
                // Determine status text
                let statusText = 'معلقة';
                if (taskData.completed) {
                    statusText = 'مكتملة';
                } else if (taskData.inProgress) {
                    statusText = 'قيد التنفيذ';
                }
                
                // Create task items HTML
                const taskItemsHTML = taskData.items.map((item, index) => {
                    let itemClass = '';
                    if (item.completed) itemClass = 'completed';
                    else if (item.inProgress) itemClass = 'in-progress';
                    
                    return `
                        <li class="task-item ${itemClass}" data-index="${index}">
                            ${item.text}
                        </li>
                    `;
                }).join('');
                
                taskCard.innerHTML = `
                    <div class="task-header">
                        <span class="task-id">${taskId}</span>
                        <span class="task-status">${statusText}</span>
                    </div>
                    <ul class="task-checklist">
                        ${taskItemsHTML}
                    </ul>
                    <button class="complete-all-btn" data-id="${taskId}">
                        <i class="fas fa-check-double"></i> إكمال الكل
                    </button>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                        <div class="progress-text">${Math.round(progress)}%</div>
                    </div>
                `;
                
                // Add event listeners to task items
                const taskItems = taskCard.querySelectorAll('.task-item');
                taskItems.forEach(item => {
                    item.addEventListener('click', function() {
                        const itemIndex = parseInt(this.dataset.index);
                        toggleTaskItemStatus(taskId, itemIndex);
                    });
                });
                
                // Add event listener to complete all button
                const completeAllBtn = taskCard.querySelector('.complete-all-btn');
                completeAllBtn.addEventListener('click', function() {
                    completeAllTaskItems(taskId);
                });
                
                return taskCard;
            }
            
            // Complete all items in a task
            function completeAllTaskItems(taskId) {
                const task = tasksState[taskId];
                
                // Check if all items are already completed
                const allCompleted = task.items.every(item => item.completed);
                
                if (allCompleted) {
                    // If all completed, uncomplete all
                    task.items.forEach(item => {
                        item.completed = false;
                        item.inProgress = false;
                    });
                } else {
                    // Otherwise, complete all
                    task.items.forEach(item => {
                        item.completed = true;
                        item.inProgress = false;
                    });
                }
                
                // Update task overall status
                updateTaskOverallStatus(taskId);
                
                // Save and update UI
                saveTasksToStorage();
                updateSingleTaskCard(taskId);
            }
            
            // Toggle task item status (completed/in-progress/none)
            function toggleTaskItemStatus(taskId, itemIndex) {
                const task = tasksState[taskId];
                const item = task.items[itemIndex];
                
                // Cycle through states: none -> in-progress -> completed -> none
                if (!item.completed && !item.inProgress) {
                    // Set to in-progress
                    item.inProgress = true;
                    item.completed = false;
                    task.inProgress = true;
                } else if (item.inProgress) {
                    // Set to completed
                    item.inProgress = false;
                    item.completed = true;
                } else if (item.completed) {
                    // Set to none
                    item.inProgress = false;
                    item.completed = false;
                }
                
                // Update task overall status
                updateTaskOverallStatus(taskId);
                
                // Save and update UI
                saveTasksToStorage();
                updateSingleTaskCard(taskId);
            }
            
            // Update single task card instead of re-rendering all
            function updateSingleTaskCard(taskId) {
                const existingCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
                if (existingCard) {
                    const taskData = tasksState[taskId];
                    const newCard = createTaskCard(taskId, taskData);
                    existingCard.parentNode.replaceChild(newCard, existingCard);
                }
            }
            
            // Update task overall status based on items
            function updateTaskOverallStatus(taskId) {
                const task = tasksState[taskId];
                const allCompleted = task.items.every(item => item.completed);
                const anyInProgress = task.items.some(item => item.inProgress);
                const anyCompleted = task.items.some(item => item.completed);
                
                task.completed = allCompleted;
                task.inProgress = !allCompleted && (anyInProgress || anyCompleted);
            }
            
            // Update statistics
            function updateStats() {
                let completed = 0;
                let inProgress = 0;
                
                for (const taskId in tasksState) {
                    if (tasksState[taskId].completed) completed++;
                    else if (tasksState[taskId].inProgress) inProgress++;
                }
                
                completedTasksEl.textContent = completed;
                inProgressTasksEl.textContent = inProgress;
                pendingTasksEl.textContent = TOTAL_TASKS - completed - inProgress;
            }
            
            // Show empty state when no tasks match filter/search
            function showEmptyState() {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <div class="empty-icon">
                        <i class="fas fa-box-open"></i>
                    </div>
                    <p class="empty-text">لا توجد صفحات تطابق معايير البحث المحددة</p>
                `;
                tasksContainer.appendChild(emptyState);
            }
            
            // Set up event listeners
            function setupEventListeners() {
                // Search functionality
                searchInput.addEventListener('input', function() {
                    currentSearch = this.value;
                    renderAllTasks();
                });
                
                // Filter buttons
                filterButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        filterButtons.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        currentFilter = this.dataset.filter;
                        renderAllTasks();
                    });
                });
                
                // Scroll to top button
                scrollToTopBtn.addEventListener('click', function() {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
                
                window.addEventListener('scroll', function() {
                    if (window.pageYOffset > 300) {
                        scrollToTopBtn.classList.add('visible');
                    } else {
                        scrollToTopBtn.classList.remove('visible');
                    }
                });
            }
            
            // Initialize the application
            init();
        });
