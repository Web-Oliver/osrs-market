# Manual API Testing with curl

## Test 1: POST /api/market-data/snapshot

Create a new market snapshot:

```bash
curl -X POST http://localhost:3001/api/market-data/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 4151,
    "timestamp": 1752769032149,
    "interval": "latest",
    "highPrice": 2500000,
    "lowPrice": 2450000,
    "volume": 100,
    "source": "osrs_wiki_api"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "itemId": 4151,
    "timestamp": 1752769032149,
    "interval": "latest",
    "highPrice": 2500000,
    "lowPrice": 2450000,
    "volume": 100,
    "source": "osrs_wiki_api",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "timestamp": 1752769032149
}
```

## Test 2: GET /api/market-data/:itemId

Retrieve market snapshots for item 4151:

```bash
curl http://localhost:3001/api/market-data/4151
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "itemId": 4151,
      "timestamp": 1752769032149,
      "interval": "latest",
      "highPrice": 2500000,
      "lowPrice": 2450000,
      "volume": 100,
      "source": "osrs_wiki_api",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "count": 1,
  "timestamp": 1752769032149
}
```

## Test 3: GET with query parameters

Filter by interval:
```bash
curl "http://localhost:3001/api/market-data/4151?interval=latest"
```

Filter by date range:
```bash
curl "http://localhost:3001/api/market-data/4151?startDate=1752769000000&endDate=1752769100000"
```

## Test 4: Error cases

Test invalid data:
```bash
curl -X POST http://localhost:3001/api/market-data/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 4151,
    "interval": "invalid_interval",
    "highPrice": 2500000,
    "lowPrice": 2450000,
    "volume": 100
  }'
```

Test invalid itemId:
```bash
curl http://localhost:3001/api/market-data/invalid
```

Test non-existent item:
```bash
curl http://localhost:3001/api/market-data/99999
```