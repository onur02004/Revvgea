
//#region NAVIGATION
const screens = ['screen-landing', 'screen-login', 'screen-avatar', 'screen-join', 'screen-account', 'screen-lobby'];

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = 'flex';
        setTimeout(() => target.classList.add('active'), 10);

        if (screenId === 'screen-account') {
            loadBasicMe();
        }
    }

    window.location.hash = screenId;
}

function goHome() {
    showScreen("screen-landing");
}



//#endregion

//#region Helpers

/**
 * Gets the current user identity or generates a random guest name
 * @returns {Object} {username, racer_name}
 */
function getDriverIdentity() {
    const savedUser = localStorage.getItem('revv_user');
    if (savedUser) {
        return JSON.parse(savedUser);
    }

    // If no account, check if we already gave them a guest name this session
    let guestName = sessionStorage.getItem('revv_guest_name');
    if (!guestName) {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        guestName = `Driver-${randomId}`;
        sessionStorage.setItem('revv_guest_name', guestName);
    }

    return { 
        username: guestName, 
        racer_name: guestName // For guests, these can be the same
    };
}

//#endregion





//#region NOTIFICATION SYSTEM

/**
 * Small Corner Alert (Toast)
 * @param {string} msg - The message to show
 * @param {number} duration - ms before it disappears
 */
function showToast(msg, duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

/**
 * Big Popup Alert (Modal)
 * @param {Object} options - {title, message, buttons: [{text, type, callback}]}
 */
function showModal({ title, message, buttons = [] }) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const actionsEl = document.getElementById('modal-actions');

    titleEl.innerText = title;
    msgEl.innerText = message;
    actionsEl.innerHTML = ''; // Clear old buttons

    // If no buttons provided, add a default Close button
    if (buttons.length === 0) {
        buttons = [{ text: 'Understood', type: 'primary', callback: () => { } }];
    }

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn btn-${btn.type || 'secondary'}`;
        button.innerText = btn.text;
        button.onclick = () => {
            overlay.style.display = 'none';
            if (btn.callback) btn.callback();
        };
        actionsEl.appendChild(button);
    });

    overlay.style.display = 'flex';
}

//#endregion


//#region LOGIN REGISTER
function GoogleLoginClicked() {
    showToast("Google Login Option implementing soon. (umrm)");
}

function initializeAuth() {
    const authBtn = document.getElementById('main-auth-btn');
    if (!authBtn) return; // Safety check

    const savedUser = localStorage.getItem('revv_user');

    if (savedUser) {
        // User is logged in
        const user = JSON.parse(savedUser);
        authBtn.innerText = "ACCOUNT";
        authBtn.onclick = () => showScreen('screen-account');
    } else {
        // User is logged out
        authBtn.innerText = "LOGIN!";
        authBtn.onclick = () => showScreen('screen-login');
    }

    // Reveal the button now that the text and click action are correct
    authBtn.style.visibility = 'visible';
}

async function doLogin() {
    const email = document.querySelector('#auth-login input[type="email"]').value;
    const password = document.querySelector('#auth-login input[type="password"]').value;

    try {
        // Pointing to the correct backend route defined in your server.js
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save the JWT for future requests
            localStorage.setItem('revv_token', data.token);
            localStorage.setItem('revv_user', JSON.stringify(data.user));

            showToast(`Welcome back, ${data.user.username}!`);

            initializeAuth();

            // Redirect to the new account screen
            showScreen('screen-account');
        } else {
            showToast(data.message || "Login failed");
        }
    } catch (error) {
        showToast("Connection error to server");
    }
}

async function doRegister() {
    const username = document.querySelector('#auth-signup input[placeholder="Speed Racer"]').value;
    const email = document.querySelector('#auth-signup input[type="email"]').value;
    const password = document.querySelector('#auth-signup input[placeholder="Min 8 characters"]').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Account created! Please Sign In.");
            // Switch to login tab automatically
            switchAuthTab('login', document.querySelector('.auth-tab'));
        } else {
            showToast(data.message || "Registration failed");
        }
    } catch (error) {
        showToast("Connection error");
    }
}

// Add this to your NAVIGATION or LOGIN/REGISTER region
function handleLogout() {
    localStorage.removeItem('revv_token');
    localStorage.removeItem('revv_user');

    initializeAuth();

    showScreen('screen-landing');
    showToast("Signed out successfully.");
}


/* ── AUTH TABS ── */
function switchAuthTab(which, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('auth-login').style.display = which === 'login' ? 'flex' : 'none';
    document.getElementById('auth-signup').style.display = which === 'signup' ? 'flex' : 'none';
}
document.getElementById('auth-login').style.display = 'flex';
document.getElementById('auth-signup').style.display = 'none';

//#endregion


//#region Account

/* ── ACCOUNT TABS ── */
function switchAcctTab(panel, btn) {
    document.querySelectorAll('.acct-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.acct-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + panel).classList.add('active');
}

async function loadBasicMe() {
    const token = localStorage.getItem('revv_token');
    if (!token) return;

    try {
        const response = await fetch('/api/account/basic-me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            // Token is likely expired or invalid
            handleLogout();
            return;
        }

        if (response.ok) {
            const data = await response.json();
            console.log(data);

            // 1. Update Hero Section
            document.querySelector('.profile-name').innerText = data.racer_name;
            document.querySelector('.profile-handle').innerText = `@${data.user_name} · ${data.fav_car}`;
            document.querySelector('.profile-avatar').innerText = data.fav_avatar;

            const licence = document.getElementById('myLicence');
            if (licence) {
                licence.updateField('out-id', data.user_id);
                licence.updateField('out-car', data.fav_car);
                licence.updateField('out-plate', data.license_plate);
                licence.updateField('out-user', data.user_name);
                licence.updateField('out-racer', data.racer_name);
                licence.updateField('photo-slot', data.profile_pic_path);
                licence.updateField('barcode-img', data.user_id);
            }

            // 3. Update Settings Panel (Visual only)
            const settingsRows = document.querySelectorAll('.setting-row-full .sr-desc');
            if (settingsRows.length >= 2) {
                settingsRows[0].innerText = data.racer_name; // Display Name
                settingsRows[1].innerText = data.fav_car;   // Default Car
            }

            // Update Profile Pic if you have an <img> tag for it
            const profilePic = document.querySelector('.profile-avatar-img');
            if (profilePic && data.profile_pic_path) {
                profilePic.src = data.profile_pic_path;
            }

        } else {
            const err = await response.json();
            console.error("Failed to load racer profile:", err.error);
            showToast("Please set up your Racer Profile.");
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}


/**
 * Opens the License Plate Editor
 */
function openPlateEditor() {
    const overlay = document.getElementById('plate-modal');
    const input = document.getElementById('plateInput');
    
    // Pre-fill with existing plate if available
    const identity = getDriverIdentity();
    const currentPlate = document.getElementById('myLicence')?.shadowRoot?.querySelector('.plate-number')?.innerText || "";
    
    input.value = currentPlate;
    overlay.style.display = 'flex';
    input.focus();
}

function closePlateEditor() {
    document.getElementById('plate-modal').style.display = 'none';
}

/**
 * Saves the plate to the backend via HTTP
 */
async function saveCustomPlate() {
    const newPlate = document.getElementById('plateInput').value.trim().toUpperCase();
    const token = localStorage.getItem('revv_token');
    
    if (!newPlate) {
        showToast("Plate cannot be empty!");
        return;
    }

    // 1. Update local UI component immediately for responsiveness
    const licence = document.getElementById('myLicence');
    if (licence) {
        licence.updateField('out-plate', newPlate);
    }

    // 2. HTTP Request to Backend
    try {
        const response = await fetch('/api/account/update-plate', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ license_plate: newPlate })
        });

        if (response.ok) {
            // Update local user object in storage
            const savedUser = localStorage.getItem('revv_user');
            if (savedUser) {
                let userObj = JSON.parse(savedUser);
                userObj.license_plate = newPlate;
                localStorage.setItem('revv_user', JSON.stringify(userObj));
            }
            showToast("License plate synced with server! 🇹🇷");
        } else {
            const data = await response.json();
            showToast(data.message || "Failed to sync with server");
        }
    } catch (error) {
        console.error("Plate sync error:", error);
        showToast("Connection error: Plate saved locally only.");
        // Fallback: save to session if offline
        sessionStorage.setItem('revv_guest_plate', newPlate);
    }

    closePlateEditor();
}

// Update getDriverIdentity to include the saved plate
function getDriverIdentity() {
    const savedUser = localStorage.getItem('revv_user');
    const guestPlate = sessionStorage.getItem('revv_guest_plate') || "REVV-GUEST";
    
    if (savedUser) {
        return JSON.parse(savedUser);
    }

    let guestName = sessionStorage.getItem('revv_guest_name');
    if (!guestName) {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        guestName = `Driver-${randomId}`;
        sessionStorage.setItem('revv_guest_name', guestName);
    }

    return { 
        username: guestName, 
        racer_name: guestName,
        license_plate: guestPlate
    };
}

// Add this to your initialization or script.js
document.getElementById('plateInput')?.addEventListener('input', function(e) {
    // Force Uppercase
    this.value = this.value.toUpperCase();
    // Remove special characters, allow only alphanumeric and spaces
    this.value = this.value.replace(/[^A-Z0-9 ]/g, '');
});

//#endregion


//#region Avatars
let allCars = []; // Store fetched cars globally for filtering
let currentSelectedCarData = null;
async function initGarage() {
    const grid = document.getElementById('avatarCarGrid');
    if (!grid) return;

    grid.innerHTML = '<p style="padding: 20px;">Loading Showroom...</p>';

    try {
        const response = await fetch('/api/cars/avatars');
        if (!response.ok) throw new Error('Network response was not ok');

        allCars = await response.json();

        // 1. Generate the dynamic filter buttons
        generateFilters(allCars);

        // 2. Render the initial grid
        renderCarGrid(allCars);

    } catch (err) {
        console.error("Garage Error:", err);
        grid.innerHTML = `<p class="error" style="color: var(--red); padding: 20px;">Failed to load cars: ${err.message}</p>`;
    }
}

let currentBrandFilter = 'all';
let currentYearFilter = 'all';
let currentCategoryFilter = 'all';

function generateFilters(cars) {
    const brandBar = document.getElementById('filterBar');
    const yearBar = document.getElementById('yearFilterBar');
    const categoryBar = document.getElementById('categoryFilterBar');

    // 1. Brand Filters
    const uniqueBrands = [...new Set(cars.map(c => c.brand))].filter(Boolean).sort();
    setupFilterBar(brandBar, uniqueBrands, filterCars);

    // 2. Year Filters (Sorted newest to oldest)
    const years = cars.map(c => c.year_range ? c.year_range.split('-')[0] : null).filter(Boolean);
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
    setupFilterBar(yearBar, uniqueYears, filterByYear);

    // 3. Category/Tag Filters
    // Flattens the tags arrays from all cars into one unique list
    const allTags = cars.flatMap(c => Array.isArray(c.tags) ? c.tags : []);
    const uniqueCategories = [...new Set(allTags)].filter(Boolean).sort();
    setupFilterBar(categoryBar, uniqueCategories, filterByCategory);
}

// Helper to keep code DRY (Don't Repeat Yourself)
function setupFilterBar(barEl, items, clickFn) {
    if (!barEl) return;

    // Find the existing "All" button to preserve its functionality
    const firstBtn = barEl.querySelector('.filter-btn');

    // Clear the bar
    barEl.innerHTML = '';

    // If we found the "All" button, put it back in first
    if (firstBtn) {
        barEl.appendChild(firstBtn);
    }

    // Add the new dynamic buttons
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = item;
        btn.onclick = (e) => clickFn(item, e.target);
        barEl.appendChild(btn);
    });
}

function cleanModelName(name) {
    if (!name) return "";
    // Regex matches patterns like "2013-2018", " 2013", or " (2013-2018)"
    return name.replace(/\s*\(?\d{4}-\d{4}\)?/g, '').replace(/\s*\d{4}/g, '').trim();
}

function renderCarGrid(cars) {
    const grid = document.getElementById('avatarCarGrid');
    grid.innerHTML = '';

    cars.forEach((car) => {
        const card = document.createElement('div');
        card.className = 'ac-card';

        const tags = Array.isArray(car.tags) ? car.tags : [];
        const cleanedName = cleanModelName(car.model_name); // Clean name here

        card.innerHTML = `
            <div class="ac-img-wrap">
                <img class="ac-real-img" src="${encodeURI(car.image_path)}" alt="${cleanedName}">
                <div class="ac-selected-badge">✓</div>
            </div>
            <div class="ac-info">
                <div class="ac-brand">${car.brand}</div>
                <div class="ac-model">${cleanedName}</div>
                <div class="ac-tags-row">
                    <span class="ac-body-badge year">${car.year_range}</span>
                    ${tags.map(t => `<span class="ac-body-badge segment">${t}</span>`).join('')}
                </div>
            </div>`;

        card.onclick = () => {
            document.querySelectorAll('.ac-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            updatePreview(car);
        };
        grid.appendChild(card);
    });
}

// Add this helper to handle broken links
function handleImageError(imgEl, emojiId) {
    console.warn(`Failed to load image: ${imgEl.src}`);
    imgEl.style.display = 'none';
    const emojiEl = document.getElementById(emojiId);
    if (emojiEl) emojiEl.style.display = 'flex';
}

function filterCars(brand, btn) {
    updateBtnState('#filterBar', btn);
    currentBrandFilter = brand;
    applyCombinedFilters();
}

function filterByYear(year, btn) {
    updateBtnState('#yearFilterBar', btn);
    currentYearFilter = year;
    applyCombinedFilters();
}

function filterByCategory(cat, btn) {
    updateBtnState('#categoryFilterBar', btn);
    currentCategoryFilter = cat;
    applyCombinedFilters();
}

function updateBtnState(containerId, activeBtn) {
    document.querySelectorAll(`${containerId} .filter-btn`).forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
}

function applyCombinedFilters() {
    let filtered = allCars;

    if (currentBrandFilter !== 'all') {
        filtered = filtered.filter(c => c.brand === currentBrandFilter);
    }

    if (currentYearFilter !== 'all') {
        const selectedYear = parseInt(currentYearFilter);
        filtered = filtered.filter(c => {
            if (!c.year_range) return false;
            // Split "2013-2019" into [2013, 2019]
            const range = c.year_range.split('-').map(y => parseInt(y.trim()));
            const start = range[0];
            const end = range[1] || start; // Default to start year if no end year exists
            return selectedYear >= start && selectedYear <= end;
        });
    }

    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(c => Array.isArray(c.tags) && c.tags.includes(currentCategoryFilter));
    }

    renderCarGrid(filtered);
}

let chosenACar = false;
function updatePreview(car) {
    chosenACar = true;
    currentSelectedCarData = car;
    // ... existing variable declarations ...
    const previewImg = document.getElementById('previewImg');
    const previewNoImg = document.getElementById('previewNoImg');
    const badgeImg = document.getElementById('previewBadge');
    const badgeWrap = document.getElementById('previewBadgeWrap');
    const tagContainer = document.getElementById('previewTags');
    const rideLabel = document.getElementById('previewRideLabel');

    // 1. Update Typography (Applying the clean name helper)
    document.getElementById('previewBrand').innerText = car.brand || "—";
    document.getElementById('previewModel').innerText = cleanModelName(car.model_name) || "Select a car";
    document.getElementById('previewVariant').innerText = car.year_range || "";

    // ... rest of the existing function ...
    document.getElementById('previewConfirm').style.display = 'block';
    if (rideLabel) rideLabel.style.display = 'block';

    if (car.image_path) {
        previewImg.src = car.image_path;
        previewImg.style.display = 'block';
        previewNoImg.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        previewNoImg.style.display = 'flex';
    }

    if (car.brand && badgeImg && badgeWrap) {
        const brandName = car.brand.toLowerCase().replace(/\s+/g, '');
        badgeImg.src = `markalar/${brandName}.png`;
        badgeWrap.style.display = 'block';
        badgeImg.onerror = () => { badgeWrap.style.display = 'none'; };
    } else if (badgeWrap) {
        badgeWrap.style.display = 'none';
    }

    tagContainer.innerHTML = '';
    const tags = Array.isArray(car.tags) ? car.tags : [];
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'preview-tag';
        span.innerText = tag;
        tagContainer.appendChild(span);
    });

    if (window.innerWidth < 768) {
        document.getElementById('garagePreview').scrollIntoView({ behavior: 'smooth' });
    }
}

// Fixed showScreen wrapper
const baseShowScreen = showScreen;
window.showScreen = function (id) {
    baseShowScreen(id);
    if (id === 'screen-avatar') initGarage();
};

/**
 * Swaps the emoji placeholder for the actual car image once loaded.
 * @param {HTMLImageElement} imgEl - The image that just finished loading.
 * @param {string} emojiId - The ID of the emoji div to hide.
 */
function revealCarImage(imgEl, emojiId) {
    const emojiEl = document.getElementById(emojiId);
    if (emojiEl) {
        emojiEl.style.display = 'none'; // Hide the emoji
    }
    imgEl.style.display = 'block';     // Show the car image
    imgEl.classList.add('fade-in');    // Optional: Add a CSS fade for polish
}

/**
 * Generates a random Izmir (35) plate for guests
 * Format: 35 XXX 000
 */
function generateIzmirPlate() {
    const letters = "ABCDEFGHJKLMNPRSTUVYZ";
    const randomLetters = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const randomDigits = Math.floor(100 + Math.random() * 899);
    return `35 ${randomLetters} ${randomDigits}`;
}

async function confirmRide() {
    if (!chosenACar || !currentSelectedCarData) {
        showToast("Please select a car first!");
        return;
    }

    // 1. Check for logged-in user data
    const savedUser = localStorage.getItem('revv_user');
    let identity = savedUser ? JSON.parse(savedUser) : null;
    
    let finalPlate;
    let username;
    let racerName;

    if (identity && identity.license_plate) {
        // USER IS LOGGED IN: Use the plate from the DB
        finalPlate = identity.license_plate;
        username = identity.username;
        racerName = identity.racer_name || identity.username;
    } else {
        // USER IS GUEST: Generate Izmir Plate
        finalPlate = generateIzmirPlate();
        
        // Handle guest naming
        let guestName = sessionStorage.getItem('revv_guest_name');
        if (!guestName) {
            guestName = `Driver-${Math.floor(1000 + Math.random() * 9000)}`;
            sessionStorage.setItem('revv_guest_name', guestName);
        }
        username = guestName;
        racerName = guestName;
    }

    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    const driverProfile = {
        username: username,
        racer_name: racerName,
        fav_car: currentSelectedCarData.model_name,
        fav_avatar: currentSelectedCarData.image_path,
        license_plate: finalPlate // This variable now holds the correct plate
    };

    console.log("Joining Lobby with Plate:", finalPlate);
    joinLobby(roomCode, driverProfile);
}
//#endregion


//#region Lobby

function leaveRoom() {
    // 1. Tell the server we are leaving
    socket.emit('leave_room');
    
    // 2. Show a toast locally
    showToast("Left the lobby.");
    
    // 3. Go back home
    goHome();
}

const socket = io();

function joinLobby(code, driverProfile) {
    // Show the screen first so the UI is ready to receive the update
    showScreen('screen-lobby');
    // Send the full profile to the server
    socket.emit('join_room', { roomCode: code, user: driverProfile });
}

socket.on('room_update', (room) => {
    const grid = document.getElementById('playersGrid');
    const lobbyCount = document.getElementById('lobbyCount');
    const roomCodeDisplay = document.querySelector('.room-code');
    
    if (!grid || !room) return;

    // 1. Correct the Player Count & Room Code
    if (lobbyCount) lobbyCount.innerText = `${room.players.length} / 12`;
    if (roomCodeDisplay) roomCodeDisplay.innerText = room.code;

    // 2. Clear and Rebuild the Grid
    grid.innerHTML = ''; 
    room.players.forEach(p => {
        const isMe = p.id === socket.id;
        const card = document.createElement('div');
        
        // Add classes for styling
        card.className = `big-player-card ${p.isHost ? 'host-card' : ''} ${isMe ? 'me-card' : ''} fade-in`;
        
        card.innerHTML = `
            ${p.isHost ? '<span class="host-badge" style="position:absolute; top:12px; right:12px;">LEAD DRIVER</span>' : ''}
            ${isMe ? '<span class="me-badge">YOU</span>' : ''} 
            <img class="big-p-avatar" src="${p.fav_avatar}" onerror="this.src='https://via.placeholder.com/150?text=No+Car'">
            <div class="big-p-username">${p.racer_name}</div>
            <div class="big-p-racer">@${p.username} • ${p.fav_car}</div>
            <div class="lobby-plate">
                <div class="lobby-plate-blue"><span>TR</span></div>
                <div class="lobby-plate-number">${p.license_plate || 'REVV-NEW'}</div>
            </div>
        `;
        grid.appendChild(card);
    });

    // 3. Cache room data for settings logic
    socket.roomCache = room; 
    
    // 4. Update Host Controls
    const amIHost = room.players.find(p => p.id === socket.id)?.isHost;
    const hostControls = document.querySelector('.host-only');
    if (hostControls) {
        hostControls.style.display = amIHost ? 'block' : 'none';
    }
    
    // 5. Refresh the settings panel UI
    renderSettings(amIHost, room.settings);
});

// Listen for messages (System alerts or User chats)
socket.on('chat_message', (msg) => {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const isMe = msg.senderId === socket.id;
    const msgDiv = document.createElement('div');
    
    if (msg.user === 'SYSTEM') {
        msgDiv.className = 'msg system-msg';
        msgDiv.innerHTML = `<i style="color:var(--muted)">— ${msg.text} —</i>`;
    } else {
        msgDiv.className = `msg ${isMe ? 'msg-me' : ''} fade-in`;
        // Use msg.user directly, which we ensured is a string in step 1
        msgDiv.innerHTML = `
            <b>${msg.user || 'Anonymous'}</b>
            <span>${msg.text}</span>
        `;
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
});

/**
 * Sends a message from the lobby input
 */
function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    // Get the current identity
    const identity = getDriverIdentity();
    
    // Ensure we are sending a STRING, not an object
    // We use racer_name (e.g., "Speed Racer") or username as fallback
    const senderName = identity.racer_name || identity.username || "Driver";

    socket.emit('send_message', {
        user: senderName, // This must be a string
        text: text
    });

    input.value = '';
}

let isHost = false;

function updateLobbyUI(room) {
    const grid = document.getElementById('playersGrid');
    const myId = socket.id;
    const me = room.players.find(p => p.id === myId);
    const amIHost = me?.isHost || false;

    // 1. Update Room Code & Count
    document.querySelector('.room-code').innerText = room.code || '----';
    document.getElementById('lobbyCount').innerText = `${room.players.length} / 12`;

    // 2. Render Driver Cards
    grid.innerHTML = '';
    room.players.forEach(p => {
        const card = document.createElement('div');
        card.className = `big-player-card ${p.isHost ? 'host-card' : ''}`;
        
        // Dynamic Plate Generation
        const plate = p.license_plate || `REV-${p.username.substring(0,3).toUpperCase()}`;
        const avatarImg = p.fav_avatar || '🏎️';

        card.innerHTML = `
            ${p.isHost ? '<span class="host-badge" style="position:absolute; top:10px; right:10px;">PRO-HOST</span>' : ''}
            <img class="big-p-avatar" src="${avatarImg}">
            <div class="big-p-username">${p.username}</div>
            <div class="big-p-racer">${p.fav_car || "SPECTATOR"}</div>
            <div class="big-p-plate">${plate}</div>
        `;
        grid.appendChild(card);
    });

    // 3. Render Creative Settings
    renderSettings(amIHost, room.settings || {});
}

function switchSideTab(tab, btn) {
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');

    const panelId = tab === 'chat' ? 'side-panel-chat' : 'side-panel-config';
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
}


const RACE_MODES_DATABASE = {
    "Sprints": {
        icon: "⏱️",
        desc: "High-speed rapid fire. Less time to think, more points for speed."
    },
    "Endurance": {
        icon: "🔋",
        desc: "Marathon session. 50+ questions testing your deep car knowledge."
    },
    "Drift-Trivia": {
        icon: "💨",
        desc: "Questions about drifting culture, JDM legends, and tire tech."
    },
    "Night Race": {
        icon: "🌙",
        desc: "Visual challenge. Car images are darkened or blurred."
    }
};

function renderSettings(isHost, settings) {
    const container = document.getElementById('settings-container');
    const currentModes = settings.modes || ["Sprints"];
    const qCount = settings.questionCount || 10;
    const timeLimit = settings.timeLimit || 20; // Default 20s

    container.innerHTML = `
        <div class="config-section-header">LOBBY CONFIGURATION</div>
        
        <div class="config-group status-box ${settings.isPrivate ? 'is-private' : 'is-public'}">
            <span class="config-label">Access Level</span>
            ${isHost ? 
                `<select onchange="updateRoom({isPrivate: this.value === 'true'})" class="sr-select">
                    <option value="false" ${!settings.isPrivate ? 'selected' : ''}>PUBLIC ACCESS</option>
                    <option value="true" ${settings.isPrivate ? 'selected' : ''}>PRIVATE (INVITE ONLY)</option>
                </select>` : 
                `<div class="status-display">${settings.isPrivate ? '🔒 PRIVATE LOBBY' : '🌐 PUBLIC LOBBY'}</div>`
            }
        </div>

        <div class="config-group">
            <div class="range-header">
                <span class="config-label">Race Distance</span>
                <span class="range-value" id="qValDisplay">${qCount} <small style="font-size:12px; color:var(--muted)">KM / Q's</small></span>
            </div>
            <div class="range-container">
                ${isHost ? `
                    <input type="range" min="5" max="50" step="5" value="${qCount}" 
                        class="q-slider" id="qSlider"
                        oninput="document.getElementById('qValDisplay').innerHTML = this.value + ' <small style=\\'font-size:12px; color:var(--muted)\\'>KM / Q\\'s</small>'"
                        onchange="updateRoom({questionCount: parseInt(this.value)})">
                ` : `
                    <div class="static-gauge-wrap">
                        <div class="static-gauge-fill" style="width: ${(qCount / 50) * 100}%"></div>
                    </div>
                `}
            </div>
        </div>

        <div class="config-group" style="border-color: var(--accent3)">
            <span class="config-label">Pit Crew Clock (Seconds per Turn)</span>
            <div class="timer-scroller-wrap">
                <div class="digital-readout" id="timeDisplay">${timeLimit}s</div>
                
                <div class="timer-input-group">
                    ${isHost ? `
                        <input type="range" min="5" max="60" step="5" value="${timeLimit}" 
                            class="t-slider"
                            oninput="document.getElementById('timeDisplay').innerText = this.value + 's'"
                            onchange="updateRoom({timeLimit: parseInt(this.value)})">
                        <div class="timer-label-row">
                            <span>QUALIFYING (Fast)</span>
                            <span>ENDURANCE (Slow)</span>
                        </div>
                    ` : `
                        <div class="timer-label-row" style="justify-content: center">
                            <span style="letter-spacing: 1px">FIXED PIT DURATION</span>
                        </div>
                    `}
                </div>
            </div>
        </div>

        <div class="config-section-header">SELECT RACE PROGRAMS</div>
        <div class="mode-selection-list">
            ${Object.keys(RACE_MODES_DATABASE).map(modeKey => {
                const mode = RACE_MODES_DATABASE[modeKey];
                const isActive = currentModes.includes(modeKey);
                return `
                    <div class="mode-mega-card ${isActive ? 'active' : ''} ${isHost ? 'host-clickable' : ''}" 
                         onclick="${isHost ? `toggleMode('${modeKey}')` : ''}">
                        <div class="mode-icon">${mode.icon}</div>
                        <div class="mode-body">
                            <div class="mode-title">${modeKey.toUpperCase()}</div>
                            <div class="mode-desc">${mode.desc}</div>
                        </div>
                        <div class="mode-status-indicator">
                            ${isActive ? '<span class="status-tag active">ACTIVE</span>' : '<span class="status-tag">DISABLED</span>'}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function toggleMode(modeName) {
    // Simple logic to add/remove mode from the list
    let currentModes = socket.roomCache?.settings?.modes || ["Sprints"];
    if (currentModes.includes(modeName)) {
        currentModes = currentModes.filter(m => m !== modeName);
    } else {
        currentModes.push(modeName);
    }
    updateRoom({ modes: currentModes });
}

function updateRoom(newSettings) {
    socket.emit('update_room_settings', newSettings);
}


/**
 * Switches between Grid, Minigame, and CarPlay
 */
function switchShowroom(viewId, btn) {
    // UI Updates
    document.querySelectorAll('.s-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.showroom-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');

    // Logic Trigger
    if (viewId === 'minigame') {
        initLobbyMiniGame();
    }
}

/**
 * Initializes the top‑down game inside the lobby's minigame container.
 * This is a direct port of topdowndemo.html, adapted only to fit the container.
 */
function initLobbyMiniGame() {
    // Prevent double initialization
    if (window._minigameActive) return;
    window._minigameActive = true;

    const container = document.querySelector('.minigame-container');
    const canvas = document.getElementById('lobbyMiniGameCanvas');
    if (!canvas || !container) return;

    // ---------- CREATE GAME HUD INSIDE CONTAINER ----------
    // Remove any leftover HUD elements from previous runs
    const oldHUD = container.querySelectorAll('.game-hud-element');
    oldHUD.forEach(el => el.remove());

    // Inject the game's HUD (speed, nitro, score, hint)
    const hudHTML = `
        <div class="game-hud-element" id="hud" style="position: absolute; top: 24px; right: 28px; text-align: right; pointer-events: none; z-index: 20;">
            <div id="speedText" style="font-size: 80px; font-weight: 900; color: #00ffe1; text-shadow: 0 0 25px #00ffe1, 0 0 50px #0066ff; line-height: 0.7; letter-spacing: 4px;">0</div>
            <small style="font-size: 14px; color: #aaccff; letter-spacing: 6px; display: block; margin-top: -8px;">KM/H</small>
        </div>
        <div class="game-hud-element" id="scoreHUD" style="position: absolute; left: 50%; top: 28px; transform: translateX(-50%); font-weight: 900; font-size: 52px; color: #fff35c; text-shadow: 0 0 20px #ffd966, 0 0 40px #ffaa33; letter-spacing: 4px; background: rgba(0,0,0,0.3); padding: 8px 28px; border-radius: 80px; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,100,0.4); z-index: 15;">
            🎯 <span id="scoreVal">0</span>
        </div>
        <div class="game-hud-element" id="nitroBar" style="position: absolute; bottom: 40px; left: 40px; width: 240px; height: 18px; background: rgba(20,20,40,0.7); border-radius: 40px; overflow: hidden; backdrop-filter: blur(4px); border: 1px solid #33ffff; box-shadow: 0 0 20px cyan; z-index: 30;">
            <div id="nitroFill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #88ffff, #00ffcc, #44ffff); box-shadow: 0 0 30px #00ffff; transition: width 0.1s ease;"></div>
        </div>
        <div class="game-hud-element" id="hint" style="position: absolute; bottom: 40px; right: 40px; color: #b0d0ff; font-size: 13px; background: rgba(8,12,30,0.6); padding: 8px 18px; border-radius: 40px; backdrop-filter: blur(3px); border: 1px solid cyan; letter-spacing: 0.5px;">
            ⚡ SHIFT to powerslide • collect cubes
        </div>
    `;
    container.insertAdjacentHTML('beforeend', hudHTML);

    // ---------- GAME CONSTANTS & VARIABLES (from topdowndemo) ----------
    const ctx = canvas.getContext('2d');
    const MAP_SIZE = 3000;
    const MAX_PARTICLES = 400;
    const MAX_SKIDMARKS = 250;

    // Game state
    let gameMode = 'none';          // not used (no cops/ai in lobby)
    let score = 0;
    let currentMap = 'downtown';
    let mapObjects = [];
    let streetObjects = [];
    let particles = [];
    let skidMarks = [];
    let cops = [];
    let trackPath = [];

    // Camera
    let shake = 0;
    const zoom = 1.2;

    // Player car
    const car = {
        x: 0, y: 0, angle: 0,
        speed: 0, velX: 0, velY: 0,
        width: 22, height: 46,
        accel: 0.18,
        maxSpeed: 6.8,
        friction: 0.982,
        grip: 0.18,
        driftGrip: 0.06,
        rotationSpeed: 0.052,
        nitro: 100,
        drifting: false
    };

    // AI target (not used)
    const ai = { active: false };

    // ---------- HELPER FUNCTIONS (from topdowndemo) ----------
    function buildingCollision(v) {
        for (let o of mapObjects) {
            if (v.x > o.x && v.x < o.x+o.w && v.y > o.y && v.y < o.y+o.h) {
                v.x -= v.velX * 1.2;
                v.y -= v.velY * 1.2;
                v.velX *= -0.4;
                v.velY *= -0.4;
                v.speed *= 0.5;
                shake = 12;
                break;
            }
        }
    }

    function handleCollect(v) {
        for (let obj of streetObjects) {
            if (!obj.destroyed && Math.hypot(v.x - obj.x, v.y - obj.y) < 35) {
                obj.destroyed = true;
                if (v === car) {
                    score += obj.score;
                    document.getElementById('scoreVal').innerText = score;
                    shake = 6;
                    let count = Math.min(10, MAX_PARTICLES - particles.length);
                    for (let i = 0; i < count; i++) {
                        particles.push({
                            x: obj.x, y: obj.y,
                            vx: (Math.random() - 0.5) * 10,
                            vy: (Math.random() - 0.5) * 10,
                            life: 1.0,
                            color: obj.color,
                            size: 6
                        });
                    }
                }
            }
        }
    }

    // Simplified map generation (downtown only)
    function generateDowntownMap() {
        mapObjects = [];
        streetObjects = [];
        for (let x = -MAP_SIZE; x <= MAP_SIZE; x += 550) {
            for (let y = -MAP_SIZE; y <= MAP_SIZE; y += 550) {
                if (Math.hypot(x, y) < 700) continue;
                mapObjects.push({ x: x+40, y: y+30, w: 360, h: 360, color: `hsl(${280 + (x*0.02 + y*0.01) % 30}, 70%, 15%)` });
                if (Math.random() < 0.4) {
                    streetObjects.push({ x: x+200+Math.random()*200, y: y+200*Math.random(), w: 18, h: 18, color: '#ffcc00', score: 70, destroyed: false });
                }
            }
        }
        for (let i=0; i<25; i++) {
            streetObjects.push({ 
                x: (Math.random()-0.5)*2800, y: (Math.random()-0.5)*2800,
                w: 15, h: 15, color: '#ff66aa', score: 150, destroyed: false 
            });
        }
    }

    // ---------- KEY HANDLING (scoped to minigame) ----------
    const keys = {};
    function handleKeyDown(e) {
        if (!document.getElementById('view-minigame').classList.contains('active')) return;
        // Ignore if chat input is focused
        if (document.activeElement && document.activeElement.id === 'chatInput') return;
        keys[e.code] = true;
        e.preventDefault(); // prevent page scrolling with arrow keys
    }
    function handleKeyUp(e) {
        keys[e.code] = false;
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ---------- RESIZE (use container dimensions) ----------
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Generate initial map
    generateDowntownMap();
    car.x = 0; car.y = 0;

    // ---------- UPDATE LOOP ----------
    let animationFrame;
    function update() {
        // Only run if the minigame view is active
        if (!document.getElementById('view-minigame').classList.contains('active')) {
            animationFrame = requestAnimationFrame(update);
            return;
        }

        // Nitro
        let nitroBoost = 0;
        if (keys['Space'] && car.nitro > 0) {
            car.nitro -= 1.2;
            nitroBoost = car.accel * 3.2;
            shake = 3;
        } else {
            car.nitro = Math.min(car.nitro + 0.25, 100);
        }

        // Drifting
        car.drifting = keys['ShiftLeft'];
        let currentGrip = car.drifting ? car.driftGrip : car.grip;
        if (car.drifting && Math.abs(car.speed) > 1.5 && skidMarks.length < MAX_SKIDMARKS) {
            skidMarks.push({ x: car.x, y: car.y, life: 0.9 });
        }

        // Throttle
        if (keys['KeyW']) car.speed += car.accel + nitroBoost;
        if (keys['KeyS']) car.speed -= car.accel * 0.7;
        let rot = car.rotationSpeed;
        if (car.drifting) rot *= 1.6;
        if (keys['KeyA']) car.angle -= rot * Math.min(1, Math.abs(car.speed) / 3.5);
        if (keys['KeyD']) car.angle += rot * Math.min(1, Math.abs(car.speed) / 3.5);

        car.speed = Math.min(Math.max(car.speed, -2.5), nitroBoost > 0 ? 9.5 : car.maxSpeed);

        // Physics
        car.velX += (Math.sin(car.angle) * car.speed - car.velX) * currentGrip;
        car.velY += (-Math.cos(car.angle) * car.speed - car.velY) * currentGrip;

        car.x += car.velX;
        car.y += car.velY;
        car.speed *= car.friction;

        // Collisions & collectibles
        buildingCollision(car);
        handleCollect(car);

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= 0.015;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Skidmarks
        for (let i = skidMarks.length - 1; i >= 0; i--) {
            skidMarks[i].life -= 0.02;
            if (skidMarks[i].life <= 0) skidMarks.splice(i, 1);
        }

        // Update HUD
        const speedEl = document.getElementById('speedText');
        const nitroFill = document.getElementById('nitroFill');
        if (speedEl) speedEl.innerText = Math.floor(Math.abs(car.speed) * 38);
        if (nitroFill) nitroFill.style.width = car.nitro + '%';

        draw();
        animationFrame = requestAnimationFrame(update);
    }

    // ---------- DRAW (adapted from topdowndemo) ----------
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        // Camera
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(zoom, zoom);
        if (shake > 0.2) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
            shake *= 0.92;
        }
        ctx.translate(-car.x, -car.y);

        // Ambient fog
        let gradient = ctx.createRadialGradient(car.x, car.y, 300, car.x, car.y, 2500);
        gradient.addColorStop(0, 'rgba(20,30,70,0)');
        gradient.addColorStop(1, '#030310');
        ctx.fillStyle = gradient;
        ctx.fillRect(car.x - 2000, car.y - 2000, 4000, 4000);

        // Buildings
        for (let o of mapObjects) {
            ctx.fillStyle = o.color;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#aaccff';
            ctx.fillRect(o.x, o.y, o.w, o.h);
        }
        ctx.shadowBlur = 0;

        // Collectibles
        for (let o of streetObjects) {
            if (!o.destroyed) {
                ctx.shadowBlur = 30;
                ctx.shadowColor = o.color;
                ctx.fillStyle = o.color;
                ctx.fillRect(o.x - o.w/2, o.y - o.h/2, o.w, o.h);
            }
        }

        // Skidmarks
        ctx.globalAlpha = 0.5;
        for (let s of skidMarks) {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 10 * s.life, 0, 2*Math.PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Particles
        for (let p of particles) {
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 25;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Player car
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#66ffff';
        ctx.fillRect(-11, -23, 22, 46);
        // Headlights
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'white';
        ctx.fillRect(6, -24, 6, 8);
        ctx.fillRect(-12, -24, 6, 8);
        ctx.restore();

        ctx.restore(); // camera
    }

    // Start the loop
    update();

    // Cleanup when leaving lobby (optional, but good practice)
    window._stopMinigame = function() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('resize', resizeCanvas);
        window._minigameActive = false;
    };
}

// Ensure the game stops when switching away from minigame (called in switchShowroom)
const originalSwitchShowroom = window.switchShowroom;
window.switchShowroom = function(viewId, btn) {
    if (viewId !== 'minigame' && window._stopMinigame) {
        window._stopMinigame();
    }
    originalSwitchShowroom(viewId, btn);
};

//#endregion


//#region Join

// Add to your existing script.js

/**
 * Fetches active rooms from the server and renders them
 */
async function refreshRooms() {
    const listContainer = document.getElementById('globalRoomList');
    listContainer.innerHTML = '<div class="room-loader">Scanning frequencies...</div>';

    try {
        const response = await fetch('/api/rooms');
        const data = await response.json();

        if (data.success && data.rooms.length > 0) {
            listContainer.innerHTML = ''; // Clear loader
            data.rooms.forEach(room => {
                // Don't show private rooms in the public browser
                if (room.isPrivate) return;

                const card = document.createElement('div');
                card.className = 'room-entry fade-in';
                card.onclick = () => {
                    document.getElementById('joinCodeInput').value = room.roomCode;
                    manualJoin();
                };

                card.innerHTML = `
                    <div class="room-info-main">
                        <div class="room-id-tag">${room.roomCode}</div>
                        <div>
                            <div class="host-meta">Lead Driver</div>
                            <div class="host-name-val">${room.hostName}</div>
                        </div>
                    </div>
                    <div class="room-stats-pill">
                        <div class="p-count-pill">${room.playerCount} / 12</div>
                        <div class="join-btn-arrow">🏁</div>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } else {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--muted); border: 1px dashed var(--border); border-radius:12px;">
                    <p style="font-family:'Bebas Neue'; font-size:20px;">The track is empty...</p>
                    <p class="sr-desc">No public lobbies found. Why not host one?</p>
                </div>`;
        }
    } catch (err) {
        listContainer.innerHTML = '<div class="room-loader" style="color:var(--red)">Connection to HQ lost.</div>';
    }
}

/**
 * Handles manual entry of a room code
 */
function manualJoin() {
    const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
    if (code.length < 4) {
        showToast("Enter a valid 4-digit code");
        return;
    }

    // Reuse your existing identity and lobby logic
    const identity = getDriverIdentity();
    
    // We move to the avatar screen FIRST so they can pick a car before joining
    // OR, if they already picked a car, we join. Let's assume they pick car first:
    showModal({
        title: "ENTER GARAGE",
        message: `Join Room ${code}? You'll need to select your ride first.`,
        buttons: [
            { 
                text: 'Select Car & Join', 
                type: 'primary', 
                callback: () => {
                    // Temporarily store the code they want to join
                    sessionStorage.setItem('pending_room_code', code);
                    showScreen('screen-avatar');
                } 
            }
        ]
    });
}

// Update your existing confirmRide function to check for the pending code
const originalConfirmRide = confirmRide;
confirmRide = async function() {
    const pendingCode = sessionStorage.getItem('pending_room_code');
    
    if (pendingCode) {
        // If joining an existing room
        const identity = getDriverIdentity();
        const driverProfile = {
            username: identity.username,
            racer_name: identity.racer_name,
            fav_car: currentSelectedCarData.model_name,
            fav_avatar: currentSelectedCarData.image_path,
            license_plate: identity.license_plate || generateIzmirPlate()
        };
        
        sessionStorage.removeItem('pending_room_code');
        joinLobby(pendingCode, driverProfile);
    } else {
        // If hosting a new room (original logic)
        originalConfirmRide();
    }
};

// Auto-refresh when entering the join screen
const baseShowScreenJoin = showScreen;
window.showScreen = function(id) {
    if (id === 'screen-join') refreshRooms();
    baseShowScreenJoin(id);
};

//#endregion









//#region AUDIO ENGINE

const clickSfx = new Audio('sound/sfx/ince_click_short.mp3');
const hoverSfx = new Audio('sound/sfx/subtle_click.mp3');

/**
 * Global click listener
 * Automatically plays the sfx if the target is a button or has a .btn class
 */
document.addEventListener('click', (e) => {
    // Check if the clicked element is a button or inside a button
    const isButton = e.target.closest('button') || e.target.closest('.btn') || e.target.closest('.nav-btn');
    
    if (isButton) {
        // 2. Check the UI toggle state from your settings
        // Looking for the checkbox in your 'Gameplay' settings section
        const sfxEnabled = document.querySelector('.settings-list input[type="checkbox"]')?.checked;

        if (sfxEnabled !== false) { // Default to playing if toggle isn't found
            clickSfx.currentTime = 0; // Reset to start for rapid clicks
            clickSfx.play().catch(err => {
                console.log("Playback blocked: Interact with the page first.");
            });
        }
    }
});

/**
 * Global hover listener for car cards
 * Uses event delegation to detect mouseenter on .ac-card elements
 */
document.addEventListener('mouseover', (e) => {
    // Check if we are hovering over a car card
    const card = e.target.closest('.ac-card');
    
    // Ensure it's a new hover (not moving between elements inside the same card)
    if (card && !card.dataset.hovered) {
        card.dataset.hovered = "true";

        // Check if SFX is enabled in settings
        const sfxEnabled = document.querySelector('.settings-list input[type="checkbox"]')?.checked;

        if (sfxEnabled !== false) {
            hoverSfx.currentTime = 0; // Reset for rapid hovering
            hoverSfx.volume = 0.4;    // Set to 40% volume so it stays "subtle"
            hoverSfx.play().catch(() => {}); // Catch browser block errors
        }
    }
});

// Reset the hover state when the mouse leaves the card
document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.ac-card');
    if (card && !e.relatedTarget?.closest('.ac-card')) {
        delete card.dataset.hovered;
    }
});

//#endregion



window.onpopstate = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) showScreen(hash);
    else showScreen('screen-landing');
};

window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('revv_user');
});

initializeAuth();