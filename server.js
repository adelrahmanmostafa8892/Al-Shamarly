const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(__dirname));

const TOTAL_TASKS = 604;
const TASK_ITEMS = [
  "تحسين رسم الصفحة وعملها PDF",
  "عمل TTF مبدئي",
  "تعديل احترافي لل TTF",
  "مراجعة الصفحة",
  "نشر الصفحة على التلجرام"
];

async function loadTasks() {
  const { data, error } = await supabase.from('tasks').select('*');
  
  if (error) {
    console.error('Error loading tasks:', error);
    return {};
  }

  if (data.length === 0) {
    const initialTasks = {};
    for (let i = 1; i <= TOTAL_TASKS; i++) {
      const taskId = `A-${i.toString().padStart(3, '0')}`;
      initialTasks[taskId] = {
        items: TASK_ITEMS.map(item => ({ 
          text: item, 
          completed: false, 
          inProgress: false 
        })),
        completed: false,
        inProgress: false
      };
    }
    await saveTasks(initialTasks);
    return initialTasks;
  }

  return data.reduce((acc, task) => ({ ...acc, [task.id]: task }), {});
}

async function saveTasks(tasks) {
  const tasksArray = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));
  const { error } = await supabase.from('tasks').upsert(tasksArray);
  
  if (error) {
    console.error('Error saving tasks:', error);
  }
}

io.on('connection', async (socket) => {
  console.log('New client connected');
  const tasksState = await loadTasks();
  socket.emit('initialState', tasksState);

  socket.on('toggleTaskItem', async ({ taskId, itemIndex }) => {
    const tasksState = await loadTasks();
    const task = tasksState[taskId];
    const item = task.items[itemIndex];
    
    if (!item.completed && !item.inProgress) {
      item.inProgress = true;
      item.completed = false;
      task.inProgress = true;
    } else if (item.inProgress) {
      item.inProgress = false;
      item.completed = true;
    } else if (item.completed) {
      item.inProgress = false;
      item.completed = false;
    }
    
    updateTaskOverallStatus(taskId, tasksState);
    await saveTasks(tasksState);
    io.emit('stateUpdate', tasksState);
  });

  socket.on('completeAllItems', async (taskId) => {
    const tasksState = await loadTasks();
    const task = tasksState[taskId];
    const allCompleted = task.items.every(item => item.completed);
    
    if (allCompleted) {
      task.items.forEach(item => {
        item.completed = false;
        item.inProgress = false;
      });
    } else {
      task.items.forEach(item => {
        item.completed = true;
        item.inProgress = false;
      });
    }
    
    updateTaskOverallStatus(taskId, tasksState);
    await saveTasks(tasksState);
    io.emit('stateUpdate', tasksState);
  });
});

function updateTaskOverallStatus(taskId, tasksState) {
  const task = tasksState[taskId];
  const allCompleted = task.items.every(item => item.completed);
  const anyInProgress = task.items.some(item => item.inProgress);
  const anyCompleted = task.items.some(item => item.completed);
  
  task.completed = allCompleted;
  task.inProgress = !allCompleted && (anyInProgress || anyCompleted);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});