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
    status: 'active',
    department: 'IT',
    createdAt: new Date('2023-01-15').toISOString()
  },
  {
    id: '2',
    name: 'Anna Schmidt',
    email: 'anna@example.com',
    role: 'User',
    status: 'active',
    department: 'Marketing',
    createdAt: new Date('2023-02-20').toISOString()
  },
  {
    id: '3',
    name: 'Peter Weber',
    email: 'peter@example.com',
    role: 'Manager',
    status: 'inactive',
    department: 'Sales',
    createdAt: new Date('2023-03-10').toISOString()
  },
  {
    id: '4',
    name: 'Lisa Müller',
    email: 'lisa@example.com',
    role: 'User',
    status: 'active',
    department: 'HR',
    createdAt: new Date('2023-04-05').toISOString()
  },
  {
    id: '5',
    name: 'Thomas Klein',
    email: 'thomas@example.com',
    role: 'Admin',
    status: 'pending',
    department: 'IT',
    createdAt: new Date('2023-05-12').toISOString()
  }
];

// Helper Funktionen für Filterung
function filterUsers(users, filters) {
  return users.filter(user => {
    // Name Filter (case-insensitive)
    if (filters.name && !user.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    // Email Filter (case-insensitive)
    if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) {
      return false;
    }
    
    // Role Filter (exact match)
    if (filters.role && user.role !== filters.role) {
      return false;
    }
    
    // Status Filter (exact match)
    if (filters.status && user.status !== filters.status) {
      return false;
    }
    
    // Department Filter (exact match)
    if (filters.department && user.department !== filters.department) {
      return false;
    }
    
    // Date Range Filter
    if (filters.dateFrom) {
      const userDate = new Date(user.createdAt);
      const fromDate = new Date(filters.dateFrom);
      if (userDate < fromDate) {
        return false;
      }
    }
    
    if (filters.dateTo) {
      const userDate = new Date(user.createdAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (userDate > toDate) {
        return false;
      }
    }
    
    return true;
  });
}

function sortUsers(users, sortBy, sortDirection = 'asc') {
  if (!sortBy) return users;
  
  return [...users].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle date sorting
    if (sortBy === 'createdAt') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    // Handle string sorting (case-insensitive)
    if (typeof aValue === 'string' && sortBy !== 'createdAt') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function paginateUsers(users, page = 1, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    users: users.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(users.length / limit),
      totalItems: users.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < users.length,
      hasPreviousPage: page > 1
    }
  };
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CRUD API is running',
    timestamp: new Date().toISOString()
  });
});

// GET - Alle Users abrufen mit erweiterten Filteroptionen
app.get('/api/users', (req, res) => {
  const {
    name,
    email,
    role,
    status,
    department,
    dateFrom,
    dateTo,
    sortBy,
    sortDirection,
    page,
    limit,
    search
  } = req.query;
  
  let filteredUsers = [...users];
  
  // Global Search (durchsucht Name und Email)
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredUsers = filteredUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }
  
  // Spezifische Filter anwenden
  const filters = {
    name,
    email,
    role,
    status,
    department,
    dateFrom,
    dateTo
  };
  
  // Nur Felder mit Werten filtern
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => value !== undefined && value !== '')
  );
  
  if (Object.keys(activeFilters).length > 0) {
    filteredUsers = filterUsers(filteredUsers, activeFilters);
  }
  
  // Sortierung anwenden
  if (sortBy) {
    filteredUsers = sortUsers(filteredUsers, sortBy, sortDirection);
  }
  
  // Paginierung anwenden
  let result;
  if (page || limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    result = paginateUsers(filteredUsers, pageNum, limitNum);
  } else {
    result = {
      users: filteredUsers,
      pagination: {
        totalItems: filteredUsers.length,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: filteredUsers.length,
        hasNextPage: false,
        hasPreviousPage: false
      }
    };
  }
  
  console.log(`[${new Date().toISOString()}] GET /api/users - Applied filters:`, activeFilters);
  console.log(`[${new Date().toISOString()}] GET /api/users - Returning ${result.users.length} of ${users.length} users`);
  
  res.json({
    success: true,
    data: result.users,
    pagination: result.pagination,
    filters: {
      applied: activeFilters,
      search: search || null
    },
    sorting: sortBy ? {
      field: sortBy,
      direction: sortDirection || 'asc'
    } : null
  });
});

// GET - Filter-Optionen abrufen (für Dropdowns)
app.get('/api/users/filter-options', (req, res) => {
  const roles = [...new Set(users.map(user => user.role))];
  const statuses = [...new Set(users.map(user => user.status))];
  const departments = [...new Set(users.map(user => user.department))];
  
  console.log(`[${new Date().toISOString()}] GET /api/users/filter-options - Returning filter options`);
  
  res.json({
    success: true,
    data: {
      roles: roles.sort(),
      statuses: statuses.sort(),
      departments: departments.sort(),
      sortableFields: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' },
        { key: 'department', label: 'Department' },
        { key: 'createdAt', label: 'Created Date' }
      ]
    }
  });
});

// GET - User-Statistiken
app.get('/api/users/stats', (req, res) => {
  const stats = {
    total: users.length,
    byRole: {},
    byStatus: {},
    byDepartment: {},
    recentlyCreated: users.filter(user => {
      const createdDate = new Date(user.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length
  };
  
  // Statistiken nach Role
  users.forEach(user => {
    stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
  });
  
  // Statistiken nach Status
  users.forEach(user => {
    stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
  });
  
  // Statistiken nach Department
  users.forEach(user => {
    stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
  });
  
  console.log(`[${new Date().toISOString()}] GET /api/users/stats - Returning user statistics`);
  
  res.json({
    success: true,
    data: stats
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
  const { name, email, role, status, department } = req.body;
  
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
    status: status || 'active',
    department: department || 'General',
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
  const { name, email, role, status, department } = req.body;
  
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
    status: status || users[userIndex].status,
    department: department || users[userIndex].department,
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
  console.log(`🔍 Filter options: http://localhost:${PORT}/api/users/filter-options`);
  console.log(`📊 User stats: http://localhost:${PORT}/api/users/stats`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});