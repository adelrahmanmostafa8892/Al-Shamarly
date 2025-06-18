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
    
    // State
    let tasksState = {};
    let currentFilter = 'all';
    let currentSearch = '';
    
    // Socket.io connection
    const socket = io();
    
    // Initialize the app
    function init() {
        setupEventListeners();
        
        // Listen for initial state from server
        socket.on('initialState', (state) => {
            tasksState = state;
            renderAllTasks();
            updateStats();
        });
        
        // Listen for state updates from server
        socket.on('stateUpdate', (state) => {
            tasksState = state;
            renderAllTasks();
            updateStats();
        });
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
                socket.emit('toggleTaskItem', { taskId, itemIndex });
            });
        });
        
        // Add event listener to complete all button
        const completeAllBtn = taskCard.querySelector('.complete-all-btn');
        completeAllBtn.addEventListener('click', function() {
            socket.emit('completeAllItems', taskId);
        });
        
        return taskCard;
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