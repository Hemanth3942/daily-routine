document.addEventListener('DOMContentLoaded', () => {
    // === Core State ===
    // Older tasks might not have a date, we migrate them implicitly during render
    let tasks = JSON.parse(localStorage.getItem('routineTasks')) || [];
    let notes = localStorage.getItem('routineNotes') || '';
    
    // Default to today
    let selectedDate = new Date();
    selectedDate.setHours(0,0,0,0);
    let selectedDateString = getISODateString(selectedDate);
    
    // === DOM Elements ===
    const tabs = document.querySelectorAll('.tab-content');
    const navItems = document.querySelectorAll('.nav-item');
    const taskList = document.getElementById('task-list');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    // Modal Elements
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const addTaskForm = document.getElementById('add-task-form');
    
    // Notes
    const notesArea = document.getElementById('daily-reflection');
    
    // General
    const dateTitle = document.getElementById('current-date');
    
    // Initialize App
    init();

    // Expose app methods globally for HTML onclick handlers
    window.app = {
        addTemplate: handleAddTemplate
    };

    function init() {
        // Migration script for old tasks without dates
        const todayStr = getISODateString(new Date());
        let migrated = false;
        tasks.forEach(t => {
            if (!t.date) {
                t.date = todayStr;
                migrated = true;
            }
        });
        if (migrated) saveTasks();

        setDateHeader();
        setupNavigation();
        renderTasks();
        setupModal();
        renderCalendar();
        calculateStreak();
        renderSuggestions();
        setupNotifications();
        
        // Setup notes
        notesArea.value = notes;
        notesArea.addEventListener('input', (e) => {
            localStorage.setItem('routineNotes', e.target.value);
        });
    }

    // === Notifications ===
    function setupNotifications() {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            // Attempt to ask for permission silently or via user interaction ideally, doing it gently on load for now
            Notification.requestPermission();
        }

        const notifyBtn = document.querySelector('.header-actions .icon-btn');
        if (notifyBtn) {
            notifyBtn.addEventListener('click', () => {
                if ("Notification" in window) {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            alert('Notifications are enabled!');
                        }
                    });
                }
            });
        }

        // Check tasks every minute to see if they start in 5 minutes
        setInterval(() => {
            if ("Notification" in window && Notification.permission === "granted") {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();

                tasks.forEach(task => {
                    if (!task.completed && !task.notified) {
                        const [th, tm] = task.start.split(':').map(Number);
                        const taskTime = th * 60 + tm;
                        const currentTime = h * 60 + m;

                        if (taskTime - currentTime > 0 && taskTime - currentTime <= 5) {
                            new Notification(`Upcoming Time Block: ${task.title}`, {
                                body: `Starts at ${formatTime(task.start)}. Let's go!`,
                            });
                            task.notified = true;
                            saveTasks();
                        }
                    }
                });
            }
        }, 60000);
    }

    // === Navigation ===
    function setupNavigation() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active classes
                navItems.forEach(nav => nav.classList.remove('active'));
                tabs.forEach(tab => tab.classList.remove('active'));
                
                // Add active to clicked nav
                const btn = e.currentTarget;
                btn.classList.add('active');
                
                // Show corresponding tab
                const targetId = btn.getAttribute('data-tab');
                document.getElementById(`tab-${targetId}`).classList.add('active');
            });
        });
    }

    // === Date Setup ===
    function setDateHeader() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        // If selectedDate is today, say "Today", else show actual Date
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (selectedDate.getTime() === today.getTime()) {
            document.getElementById('current-day').textContent = "Today";
        } else {
            const shortOpts = { weekday: 'short', month: 'short', day: 'numeric' };
            document.getElementById('current-day').textContent = selectedDate.toLocaleDateString('en-US', shortOpts);
        }
        
        dateTitle.textContent = selectedDate.toLocaleDateString('en-US', options);
    }

    function getISODateString(dateObj) {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    }

    // === Task Management ===
    function renderTasks() {
        taskList.innerHTML = '';
        
        // Filter tasks for selected date only
        let todaysTasks = tasks.filter(t => t.date === selectedDateString);

        // Sort tasks by start time
        todaysTasks.sort((a, b) => a.start.localeCompare(b.start));

        let completedCount = 0;

        if (todaysTasks.length === 0) {
            taskList.innerHTML = `
                <div class="glass-card" style="padding: 2rem; border-style: dashed; border-color: var(--border-strong);">
                    <p>No tasks scheduled for this day. Tap the + icon to add a time block.</p>
                </div>
            `;
        }

        todaysTasks.forEach((task) => {
            if (task.completed) completedCount++;

            // Find global index for binding
            const globalIdx = tasks.findIndex(t => t.id === task.id);

            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" data-index="${globalIdx}" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <h3 class="task-title">${escapeHTML(task.title)}</h3>
                    <div class="task-time">
                        <i class="ph ph-clock"></i>
                        <span>${formatTime(task.start)} - ${formatTime(task.end)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="delete-btn" data-index="${globalIdx}"><i class="ph ph-trash"></i></button>
                </div>
            `;
            taskList.appendChild(li);
        });

        // Update Progress
        const progressPercentage = todaysTasks.length > 0 ? (completedCount / todaysTasks.length) * 100 : 0;
        progressFill.style.width = `${progressPercentage}%`;
        progressText.textContent = `${Math.round(progressPercentage)}%`;
        
        // Update Global Stats in Profile
        const globalCompletedCount = tasks.filter(t => t.completed).length;
        document.getElementById('total-tasks-done').textContent = globalCompletedCount;

        bindTaskEvents();
        saveTasks();
        renderSuggestions();
        
        // Dynamic Streak Update for Today
        const realTodayStr = getISODateString(new Date());
        if (selectedDateString === realTodayStr && todaysTasks.length > 0 && completedCount === todaysTasks.length) {
            let lastStreakDate = localStorage.getItem('lastStreakDate');
            if (lastStreakDate !== realTodayStr) {
                let currentStreak = parseInt(localStorage.getItem('routineStreak') || '0', 10);
                currentStreak++;
                localStorage.setItem('routineStreak', currentStreak.toString());
                localStorage.setItem('lastStreakDate', realTodayStr);
                
                const streakEl = document.getElementById('streak-count');
                if (streakEl) streakEl.textContent = currentStreak;
            }
        }
    }

    function bindTaskEvents() {
        const checkboxes = document.querySelectorAll('.task-checkbox');
        checkboxes.forEach(box => {
            box.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                tasks[idx].completed = e.target.checked;
                renderTasks();
            });
        });

        const deleteBtns = document.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                tasks.splice(idx, 1);
                renderTasks();
            });
        });
    }

    function saveTasks() {
        localStorage.setItem('routineTasks', JSON.stringify(tasks));
    }

    // === Modal Logic ===
    function setupModal() {
        addTaskBtn.addEventListener('click', () => {
            addTaskModal.classList.remove('hidden');
            // Auto-focus title input
            setTimeout(() => document.getElementById('task-title').focus(), 100);
        });

        closeModalBtn.addEventListener('click', () => {
            addTaskModal.classList.add('hidden');
        });

        // Close when clicking outside of modal content
        addTaskModal.addEventListener('click', (e) => {
            if (e.target === addTaskModal) {
                addTaskModal.classList.add('hidden');
            }
        });

        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('task-title').value;
            const start = document.getElementById('task-start').value;
            const end = document.getElementById('task-end').value;

            if (title && start && end) {
                tasks.push({
                    title,
                    start,
                    end,
                    completed: false,
                    id: Date.now() + Math.random(),
                    date: selectedDateString
                });
                
                addTaskForm.reset();
                addTaskModal.classList.add('hidden');
                renderTasks();
            }
        });
    }

    // === Weekly Calendar ===
    function renderCalendar() {
        const calContainer = document.getElementById('weekly-calendar');
        if (!calContainer) return;

        // Render previous 7 days and next 7 days from today
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = '';
        // Start from -7 days
        for (let i = -14; i <= 14; i++) {
            const dayDate = new Date(today);
            dayDate.setDate(today.getDate() + i);
            
            const isSelected = getISODateString(dayDate) === selectedDateString;
            
            html += `
                <div class="day-card ${isSelected ? 'active' : ''}" data-date="${getISODateString(dayDate)}">
                    <span class="day-name">${days[dayDate.getDay()]}</span>
                    <span class="day-number">${dayDate.getDate()}</span>
                </div>
            `;
        }
        calContainer.innerHTML = html;

        // Bind clicks to calendar days
        const dayCards = calContainer.querySelectorAll('.day-card');
        dayCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const targetDateStr = e.currentTarget.getAttribute('data-date');
                selectedDateString = targetDateStr;
                selectedDate = new Date(targetDateStr + 'T00:00:00');
                
                // Re-render calendar so active state updates
                renderCalendar();
                // Update specific Home tab components
                setDateHeader();
                renderTasks();
                
                // Navigate back to Home Tab to see the schedule for that day
                document.querySelector('.nav-item[data-tab="home"]').click();
            });
        });
        
        // Auto-scroll the calendar to center on selected Date
        setTimeout(() => {
            const activeCard = calContainer.querySelector('.day-card.active');
            if (activeCard) {
                // Scroll into view horizontally center
                activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 300);
    }

    // === Routine Templates ===
    function handleAddTemplate(type) {
        const templates = {
            morning: [
                { title: 'Morning Hydration & Stretch', start: '07:00', end: '07:30' },
                { title: 'Deep Work / Reading', start: '07:30', end: '09:00' },
                { title: 'Healthy Breakfast', start: '09:00', end: '09:30' }
            ],
            evening: [
                { title: 'Digital Sunset', start: '21:00', end: '21:30' },
                { title: 'Reading & Wind Down', start: '21:30', end: '22:30' }
            ]
        };

        const toAdd = templates[type];
        if (toAdd) {
            toAdd.forEach(t => {
                tasks.push({
                    title: t.title,
                    start: t.start,
                    end: t.end,
                    completed: false,
                    id: Date.now() + Math.random(), // Ensure unique ID
                    date: selectedDateString
                });
            });
            saveTasks();
            renderTasks();
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} template added to Today!`);
            
            // Switch to Home tab
            document.querySelector('.nav-item[data-tab="home"]').click();
        }
    }

    // === Streaks & Suggestions ===
    function calculateStreak() {
        let streak = parseInt(localStorage.getItem('routineStreak') || '0', 10);
        let lastStreakDate = localStorage.getItem('lastStreakDate');
        const realTodayStr = getISODateString(new Date());
        
        // If lastStreakDate is older than yesterday, reset streak to 0
        if (lastStreakDate) {
            const lastDate = new Date(lastStreakDate + 'T00:00:00');
            const todayDate = new Date(realTodayStr + 'T00:00:00');
            const diffTime = Math.abs(todayDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (diffDays > 1) {
                streak = 0;
                localStorage.setItem('routineStreak', '0');
            }
        }

        const streakEl = document.getElementById('streak-count');
        if (streakEl) streakEl.textContent = streak;
    }

    function renderSuggestions() {
        const container = document.getElementById('suggestions-list');
        if (!container) return;

        const viewTasks = tasks.filter(t => t.date === selectedDateString);
        const uncompleted = viewTasks.filter(t => !t.completed);
        let suggestionsHTML = '';

        const isToday = selectedDateString === getISODateString(new Date());
        const dayWord = isToday ? "today" : "this day";

        if (viewTasks.length === 0) {
            suggestionsHTML += createSuggestionHTML('ph-plus-circle', 'Plan Your Day', `You have no tasks scheduled for ${dayWord}. Use a template to get started!`);
        } else if (uncompleted.length > 0) {
            suggestionsHTML += createSuggestionHTML('ph-target', 'Stay Focused', `You have ${uncompleted.length} tasks left ${dayWord}. Keep going!`);
        } else {
            suggestionsHTML += createSuggestionHTML('ph-confetti', 'Great Job!', `You completed all tasks for ${dayWord}. Take some time to rest.`);
        }

        // Add a generic improvement suggestion
        suggestionsHTML += createSuggestionHTML('ph-lightbulb', 'Optimize Routine', 'Consider adding a 10-minute mindfulness block to reduce stress.');

        container.innerHTML = suggestionsHTML;
    }

    function createSuggestionHTML(iconClass, title, text) {
        return `
            <div class="suggestion-card">
                <div class="suggestion-icon"><i class="ph ${iconClass}"></i></div>
                <div class="suggestion-text">
                    <h4>${title}</h4>
                    <p>${text}</p>
                </div>
            </div>
        `;
    }

    // === Utility Tools ===
    function formatTime(timeString) {
        // timeString is like "14:30"
        const [hour, min] = timeString.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHr = h % 12 || 12;
        return `${displayHr}:${min} ${ampm}`;
    }

    function escapeHTML(str) {
        // Prevent XSS from local inputs if any
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
