// Initialize Firebase with your config
import { auth, database, onAuthStateChanged, ref, update, get, push, set } from "./firebaseConfig.js";

document.addEventListener('DOMContentLoaded', function () {
    let formattedEmail = '';
    
    // Format email for Firebase path (matching login.js approach)
    function formatEmail(email) {
        const formatted = email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
        return formatted;
    }
    
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "tracker.html";
        } else {
            formattedEmail = formatEmail(user.email);
            loadActivities();
        }
    });
    
    // Initialize Chart.js
    const ctx = document.getElementById('calories-chart');
    let caloriesChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Calories Burned',
                data: [],
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Calories'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

    const activityForm = document.getElementById('activity-form');
    
    activityForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form values
        const activityName = document.getElementById('activity-name').value;
        const activityDuration = parseInt(document.getElementById('activity-duration').value);
        const activityCalories = parseInt(document.getElementById('activity-calories').value);
        const activityDate = document.getElementById('activity-date').value;
        const activityNotes = document.getElementById('activity-notes').value;

        // Create activity object
        const activity = {
            name: activityName,
            duration: activityDuration,
            calories: activityCalories,
            date: activityDate,
            notes: activityNotes,
            timestamp: Date.now()
        };

        try {
            const activitiesRef = ref(database, `users/${formattedEmail}/activities`);
            const newActivityRef = push(activitiesRef);
            const newActivityKey = newActivityRef.key;
            
            const updates = {};
            updates[`users/${formattedEmail}/activities/${newActivityKey}`] = activity;
            
            await update(ref(database), updates);
            
            activityForm.reset();
            document.getElementById('activity-date').valueAsDate = new Date();
            alert('Activity saved successfully!');
            loadActivities();
        } catch (error) {
            alert('Error saving activity. Please try again.');
        }
    });

    // Set today's date as default for the date input
    const dateInput = document.getElementById('activity-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Load activities from Firebase
    async function loadActivities() {
        const activitiesList = document.getElementById('activities-list');
        
        if (!activitiesList) {
            return;
        }
        
        activitiesList.innerHTML = '<div class="loading-activities">Loading your activities...</div>';

        try {
            const activitiesRef = ref(database, `users/${formattedEmail}/activities`);
            const snapshot = await get(activitiesRef);
            const activities = [];
            if (snapshot.exists()) {
                Object.entries(snapshot.val()).forEach(([key, value]) => {
                    activities.push({
                        id: key,
                        ...value
                    });
                });
            }

            if (activities.length === 0) {
                activitiesList.innerHTML = `
                    <div class="no-activities">
                        <div class="empty-state-icon" aria-hidden="true">
                            <i class="fa-solid fa-person-running"></i>
                        </div>
                        <h3>No activities yet</h3>
                        <p>Add your first activity above to start building your movement history.</p>
                    </div>`;
                return;
            }

            sortActivities(activities);
            updateChart(activities);
        } catch (error) {
            activitiesList.innerHTML = '<div class="loading-error">Error loading activities. Please refresh the page.</div>';
        }
    }

    // Sort and display activities
    function sortActivities(activities) {
        const sortSelect = document.getElementById('activity-sort');
        
        if (!sortSelect) {
            return;
        }
        
        const sortValue = sortSelect.value;
        
        switch (sortValue) {
            case 'date-desc':
                activities.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                activities.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'calories-desc':
                activities.sort((a, b) => b.calories - a.calories);
                break;
            case 'calories-asc':
                activities.sort((a, b) => a.calories - b.calories);
                break;
            case 'duration-desc':
                activities.sort((a, b) => b.duration - a.duration);
                break;
            case 'duration-asc':
                activities.sort((a, b) => a.duration - b.duration);
                break;
            default:
                break;
        }
    
        displayActivities(activities);
    }
    

    // Display activities in the list
    function displayActivities(activities) {
        const activitiesList = document.getElementById('activities-list');
        
        if (!activitiesList) {
            return;
        }
        
        const searchInput = document.getElementById('activity-search');
        const searchValue = searchInput ? searchInput.value.toLowerCase() : '';

        const filteredActivities = activities.filter(activity => {
            const nameMatch = activity.name.toLowerCase().includes(searchValue);
            const notesMatch = activity.notes && activity.notes.toLowerCase().includes(searchValue);
            return nameMatch || notesMatch;
        });

        if (filteredActivities.length === 0) {
            activitiesList.innerHTML = `
                <div class="no-activities">
                    <div class="empty-state-icon" aria-hidden="true">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <h3>No matching activities</h3>
                    <p>Try a different search term or clear the search to see your activity history.</p>
                </div>`;
            return;
        }

        activitiesList.innerHTML = '';

        filteredActivities.forEach(activity => {
            const activityDate = new Date(activity.date).toLocaleDateString();

            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-details">
                    <h3>${activity.name}</h3>
                    <p>${activity.notes || 'No notes'}</p>
                </div>
                <div class="activity-meta">
                    <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${activityDate}</span>
                    <span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${activity.duration} min</span>
                    <span><i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i> ${activity.calories} cal</span>
                </div>
                <div class="activity-actions">
                    <button class="edit-btn" data-id="${activity.id}" aria-label="Edit ${activity.name}"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                    <button class="delete-btn" data-id="${activity.id}" aria-label="Delete ${activity.name}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                </div>
            `;

            activitiesList.appendChild(activityItem);

            const deleteBtn = activityItem.querySelector('.delete-btn');
            const editBtn = activityItem.querySelector('.edit-btn');
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function () {
                    if (confirm('Are you sure you want to delete this activity?')) {
                        deleteActivity(activity.id);
                    }
                });
            }

            if (editBtn) {
                editBtn.addEventListener('click', function () {
                    editActivity(activity);
                });
            }
        });
    }

    // Delete activity
    async function deleteActivity(activityId) {
        try {
            const updates = {};
            updates[`users/${formattedEmail}/activities/${activityId}`] = null;
            
            await update(ref(database), updates);
            alert('Activity deleted successfully!');
            loadActivities();
        } catch (error) {
            alert('Error deleting activity. Please try again.');
        }
    }

    // Edit activity
    function editActivity(activity) {
        const nameInput = document.getElementById('activity-name');
        const durationInput = document.getElementById('activity-duration');
        const caloriesInput = document.getElementById('activity-calories');
        const dateInput = document.getElementById('activity-date');
        const notesInput = document.getElementById('activity-notes');
        
        if (nameInput) nameInput.value = activity.name;
        if (durationInput) durationInput.value = activity.duration;
        if (caloriesInput) caloriesInput.value = activity.calories;
        if (dateInput) dateInput.value = activity.date;
        if (notesInput) notesInput.value = activity.notes || '';

        const submitBtn = document.querySelector('.save-activity-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Update Activity';
            submitBtn.dataset.editId = activity.id;
        }

        const formContainer = document.querySelector('.activity-form-container');
        if (formContainer) {
            formContainer.scrollIntoView({ behavior: 'smooth' });
        }

        activityForm.onsubmit = async function (e) {
            e.preventDefault();

            const activityName = document.getElementById('activity-name').value;
            const activityDuration = parseInt(document.getElementById('activity-duration').value);
            const activityCalories = parseInt(document.getElementById('activity-calories').value);
            const activityDate = document.getElementById('activity-date').value;
            const activityNotes = document.getElementById('activity-notes').value;

            const updatedActivity = {
                name: activityName,
                duration: activityDuration,
                calories: activityCalories,
                date: activityDate,
                notes: activityNotes,
                timestamp: activity.timestamp,
                updated: Date.now()
            };

            try {
                const updates = {};
                updates[`users/${formattedEmail}/activities/${activity.id}`] = updatedActivity;
                
                await update(ref(database), updates);
                
                activityForm.reset();
                document.getElementById('activity-date').valueAsDate = new Date();
                submitBtn.textContent = 'Save Activity';
                delete submitBtn.dataset.editId;

                activityForm.onsubmit = null;

                alert('Activity updated successfully!');
                loadActivities();
            } catch (error) {
                alert('Error updating activity. Please try again.');
            }
        };
    }

    // Update chart with activities data
    function updateChart(activities) {
        const last7Days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        const caloriesPerDay = {};
        last7Days.forEach(day => {
            caloriesPerDay[day] = 0;
        });

        activities.forEach(activity => {
            if (last7Days.includes(activity.date)) {
                caloriesPerDay[activity.date] += activity.calories;
            }
        });

        caloriesChart.data.labels = last7Days.map(day => {
            const date = new Date(day);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        caloriesChart.data.datasets[0].data = last7Days.map(day => caloriesPerDay[day]);
        caloriesChart.update();
    }

    // Event listeners for sorting and searching
    const sortSelect = document.getElementById('activity-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            loadActivities();
        });
    }

    const searchInput = document.getElementById('activity-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            loadActivities();
        });
    }
});