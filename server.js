const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accountroutes');
const app = express();
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = new Map();


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/cars', require('./routes/carRoutes'));
app.use('/arabalar', express.static(path.join(__dirname, 'arabalar')));
app.use('/markalar', express.static(path.join(__dirname, 'markalar')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Example route
const verifyToken = require('./authMiddleware');
app.get('/api/user/stats', verifyToken, (req, res) => {
    res.json({ message: `Welcome back, User #${req.user.id}! Here are your race stats.` });
});




io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomCode, user }) => {
        socket.join(roomCode);

        // Initialize room if it doesn't exist
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, {
                code: roomCode,
                players: [],
                settings: { modes: ['Sprints'], questionCount: 10, timeLimit: 20, isPrivate: false }
            });
        }

        const room = rooms.get(roomCode);

        const playerData = {
            id: socket.id,
            username: user.username || 'Anonymous',
            racer_name: user.racer_name || user.username || 'Rookie',
            fav_car: user.fav_car || 'Spectator',
            fav_avatar: user.fav_avatar || '',
            license_plate: user.license_plate || '35 REV 35', // Fallback safety
            isHost: room.players.length === 0
        };
        // Prevent duplicate entries if the user refreshes
        room.players = room.players.filter(p => p.id !== socket.id);
        room.players.push(playerData);

        socket.data.roomCode = roomCode;

        // Broadcast the updated room state to EVERYONE in that room
        io.to(roomCode).emit('room_update', room);
        console.log(`Driver ${playerData.racer_name} joined room: ${roomCode}`);
    });




    const handlePlayerExit = () => {
        const roomCode = socket.data.roomCode;
        if (!roomCode || !rooms.has(roomCode)) return;

        const room = rooms.get(roomCode);
        const exitingPlayer = room.players.find(p => p.id === socket.id);

        // 1. Remove the player from the list
        room.players = room.players.filter(p => p.id !== socket.id);

        // 2. Check if room is now empty
        if (room.players.length === 0) {
            console.log(`Room ${roomCode} deleted (Empty)`);
            rooms.delete(roomCode);
            return;
        }

        // 3. Reassign Host if the host left
        if (exitingPlayer?.isHost) {
            // Pick a random index from the remaining players
            const newHostIndex = Math.floor(Math.random() * room.players.length);
            room.players[newHostIndex].isHost = true;

            // Notify chat about the new leader
            io.to(roomCode).emit('chat_message', {
                user: 'SYSTEM',
                text: `Host left. ${room.players[newHostIndex].racer_name} is now the Lead Driver!`,
                type: 'alert'
            });
        }

        // 4. Notify chat that someone left
        io.to(roomCode).emit('chat_message', {
            user: 'SYSTEM',
            text: `${exitingPlayer?.racer_name || 'A driver'} pulled into the pits (Left).`,
            type: 'info'
        });

        // 5. Broadcast updated room state
        io.to(roomCode).emit('room_update', room);

        // Clean up socket data so we don't trigger this twice
        socket.data.roomCode = null;
    };

    // Trigger on manual leave button
    socket.on('leave_room', handlePlayerExit);

    // Trigger on tab close / crash
    socket.on('disconnect', handlePlayerExit);

    // --- CHAT SYSTEM ---
    socket.on('send_message', (msg) => {
        const roomCode = socket.data.roomCode;
        console.log("Room " + roomCode + ", " + msg.user + " said: " +  msg.text);
        if (!roomCode) return;

        io.to(roomCode).emit('chat_message', {
            user: msg.user || "Unknown Driver", // Fallback for safety
            text: msg.text,
            senderId: socket.id
        });
    });
});


//#region dev endpoints room


// GET /api/rooms/:code
// Returns the current players, their car/plate stats, and the room settings
app.get('/api/rooms/:code', (req, res) => {
    const roomCode = req.params.code.toUpperCase();

    if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode);

        // Return a structured object
        res.json({
            success: true,
            roomCode: room.code,
            playerCount: room.players.length,
            settings: room.settings,
            players: room.players.map(p => ({
                id: p.id,
                racer_name: p.racer_name,
                username: p.username,
                fav_car: p.fav_car,
                fav_avatar: p.fav_avatar,
                license_plate: p.license_plate,
                isHost: p.isHost
            }))
        });
    } else {
        res.status(404).json({
            success: false,
            message: `Room ${roomCode} not found or has expired.`
        });
    }
});

// GET /api/rooms
// Returns a list of all active rooms and their metadata
app.get('/api/rooms', (req, res) => {
    const allRooms = Array.from(rooms.values()).map(room => ({
        roomCode: room.code,
        playerCount: room.players.length,
        isPrivate: room.settings.isPrivate,
        activeModes: room.settings.modes,
        hostName: room.players.find(p => p.isHost)?.racer_name || "Unknown"
    }));

    res.json({
        success: true,
        totalActiveRooms: allRooms.length,
        rooms: allRooms
    });
});


//#endregion




server.listen(process.env.PORT || 3001, () => {
    console.log(`----------------------------------`);
    console.log(`🏎️  REVVgea Server is warming up...`);
    console.log(`🏁 Running at: http://localhost:${process.env.PORT || 3001}`);
    console.log(`----------------------------------`);
});