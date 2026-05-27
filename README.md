# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Testing Method

1. After run: npm run dev, open Postman and create new POST method request: http://localhost:3000/api/leads/incoming
2. First scenario success valid:
   Headers -> Key: Authorization -> Value: Bearer ipgmy_1234
   Body (select raw and set format to JSON):
   {
   "leadId": "LD1001",
   "name": "John Tan",
   "phone": "0123456789",
   "email": "john@email.com",
   "source": "Facebook Ads",
   "project": "Residensi Mutiara",
   "budget": 650000,
   "message": "Interested in 3-bedroom unit"
   }
3. Click Send in Postman and watch your browser dashboard instantly update to display the newly allocated lead row assigned to the longest-waiting active agent
4. Second scenario middleware security enforcement (Invalid Token):
   Headers -> Key: Authorization -> Value: Bearer ipgmy_123_abc
   Body (select raw and set format to JSON):
   {
   "leadId": "LD1002",
   "name": "Alex Tan",
   "phone": "0123456788",
   "email": "alex@email.com",
   "source": "Facebook Ads",
   "project": "Residensi Mutiara",
   "budget": 700000,
   "message": "Interested in 4-bedroom unit"
   }
5. Click Send in Postman and verify that it returns a 401 Unauthorized status code. The dashboard interface data stays exactly the same
6. Third scenario structural payload validation guard (Missing Parameters):
   Headers -> Key: Authorization -> Value: Bearer ipgmy_1234
   Body (select raw and set format to JSON):
   {
   "leadId": "LD1002",
   "name": "Alex Tan"
   }
7. Click Send in Postman and verify that it returns a 400 Bad Request status code indicating that the mandatory phone and email values are missing.
8. Fourth scenario isolation of duplicate leads (Contact Matching Guard):
   Headers -> Key: Authorization -> Value: Bearer ipgmy_1234
   Body (select raw and set format to JSON):
   {
   "leadId": "LD1004",
   "name": "John Tan Clone",
   "phone": "0123456789",
   "email": "john@email.com",
   "source": "Google Ads"
   }
9. Click Send in Postman and verify that it returns a 409 Conflict status code. The system blocks the entry because the email and phone properties match the lead sent in Step 2.
10. Fifth scenario real-time presence dynamic queue routing (Agent Offline Toggle):

Go to the UI Agent Dashboard on your browser (http://localhost:3000).

Find Agent B (the next online agent waiting for an assignment) and click the status switch button to change their status to Offline (indicator changes from green to red).

Back in Postman, send this unique payload:
Headers -> Key: Authorization -> Value: Bearer ipgmy_1234
Body (select raw and set format to JSON):
{
"leadId": "LD1005",
"name": "Siti Aminah",
"phone": "0123456782",
"email": "siti.aminah@example.com",
"source": "Google Ads",
"project": "Eco Horizon",
"budget": 850000,
"message": "Requesting a corner unit layout."
} 11. Click Send in Postman and watch your browser dashboard. The system automatically skips the offline Agent B and loops the assignment right over to Agent C.
