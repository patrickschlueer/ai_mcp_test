const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-Memory Datenbank (für Demo-Zwecke)
let users = [
  {
    id: '1',
    name: 'Max Mustermann',
    email: 'max@example.com',
    role: 'Admin',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Anna Schmidt',
    email: 'anna@example.com',
    role: 'User',
    createdAt: new Date().toISOString()
  }
];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CRUD API is running',
    timestamp: new Date().toISOString()
  });
});

// GET - Alle Users abrufen
app.get('/api/users', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/users - Returning ${users.length} users`);
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// GET - Einzelnen User abrufen
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  
  if (!user) {
    console.log(`[${new Date().toISOString()}] GET /api/users/${id} - User not found`);
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  console.log(`[${new Date().toISOString()}] GET /api/users/${id} - User found: ${user.name}`);
  res.json({
    success: true,
    data: user
  });
});

// POST - Neuen User erstellen
app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;
  
  // Validierung
  if (!name || !email) {
    console.log(`[${new Date().toISOString()}] POST /api/users - Validation failed`);
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }
  
  // Email-Duplikat prüfen
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    console.log(`[${new Date().toISOString()}] POST /api/users - Email already exists: ${email}`);
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists'
    });
  }
  
  const newUser = {
    id: uuidv4(),
    name,
    email,
    role: role || 'User',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  console.log(`[${new Date().toISOString()}] POST /api/users - User created: ${newUser.name} (${newUser.id})`);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser
  });
});

// PUT - User aktualisieren
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    console.log(`[${new Date().toISOString()}] PUT /api/users/${id} - User not found`);
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Email-Duplikat prüfen (außer bei sich selbst)
  if (email) {
    const existingUser = users.find(u => u.email === email && u.id !== id);
    if (existingUser) {
      console.log(`[${new Date().toISOString()}] PUT /api/users/${id} - Email already exists: ${email}`);
      return res.status(409).json({
        success: false,
        message: 'Another user with this email already exists'
      });
    }
  }
  
  // Update User
  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    email: email || users[userIndex].email,
    role: role || users[userIndex].role,
    updatedAt: new Date().toISOString()
  };
  
  console.log(`[${new Date().toISOString()}] PUT /api/users/${id} - User updated: ${users[userIndex].name}`);
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: users[userIndex]
  });
});

// DELETE - User löschen
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    console.log(`[${new Date().toISOString()}] DELETE /api/users/${id} - User not found`);
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const deletedUser = users[userIndex];
  users.splice(userIndex, 1);
  
  console.log(`[${new Date().toISOString()}] DELETE /api/users/${id} - User deleted: ${deletedUser.name}`);
  
  res.json({
    success: true,
    message: 'User deleted successfully',
    data: deletedUser
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Server starten
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 CRUD API Server started successfully!`);
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 Users endpoint: http://localhost:${PORT}/api/users`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});
