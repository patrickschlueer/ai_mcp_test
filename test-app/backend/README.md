# CRUD Backend API

Einfache REST API für User-Management (CRUD Operationen)

## Features
- ✅ GET /api/users - Alle Users abrufen
- ✅ GET /api/users/:id - Einzelnen User abrufen
- ✅ POST /api/users - Neuen User erstellen
- ✅ PUT /api/users/:id - User aktualisieren
- ✅ DELETE /api/users/:id - User löschen

## Installation

```bash
npm install
```

## Starten

```bash
# Produktiv
npm start

# Development (mit Auto-Reload)
npm run dev
```

Server läuft auf: http://localhost:3000

## API Endpoints

### Health Check
```bash
GET http://localhost:3000/api/health
```

### Alle Users abrufen
```bash
GET http://localhost:3000/api/users
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Max Mustermann",
      "email": "max@example.com",
      "role": "Admin",
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Einzelnen User abrufen
```bash
GET http://localhost:3000/api/users/1
```

### Neuen User erstellen
```bash
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "name": "Peter Pan",
  "email": "peter@example.com",
  "role": "User"
}
```

### User aktualisieren
```bash
PUT http://localhost:3000/api/users/1
Content-Type: application/json

{
  "name": "Max Mustermann Updated",
  "email": "max.new@example.com"
}
```

### User löschen
```bash
DELETE http://localhost:3000/api/users/1
```

## Validierung

- Name und Email sind Pflichtfelder
- Email muss unique sein
- Proper HTTP Status Codes (200, 201, 400, 404, 409, 500)

## Logging

Alle Requests werden in der Console geloggt mit Timestamp.
