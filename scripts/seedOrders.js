const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SPREADSHEET_ID = '15pMvy6wDYyzl1FRxU4mr00BEIJYeca2XLIfrTty-91g';
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'gen-lang-client-0764638400-312481755508.json');

const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
  'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'Mateo', 'Sophia',
  'Lucas', 'Ava', 'Leo', 'Isabella', 'Julian', 'Mia', 'Ezra', 'Harper', 'Levi', 'Evelyn'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const catalog = [
  { name: 'Noise-Cancelling Headphones Pro', category: 'Electronics', min: 199, max: 349 },
  { name: 'Ultra-Wide 34-inch Monitor', category: 'Electronics', min: 450, max: 799 },
  { name: 'Mechanical Gaming Keyboard RGB', category: 'Electronics', min: 89, max: 189 },
  { name: 'Bluetooth Waterproof Speaker', category: 'Electronics', min: 45, max: 129 },
  { name: 'Wireless Fast Charging Station', category: 'Electronics', min: 29, max: 69 },
  { name: 'Ergonomic Vertical Mouse', category: 'Electronics', min: 39, max: 89 },
  { name: 'USB-C Dual 4K Docking Station', category: 'Electronics', min: 149, max: 259 },
  { name: 'Smart Fitness Tracker Band', category: 'Wearables', min: 79, max: 149 },
  { name: 'Smart GPS Running Watch', category: 'Wearables', min: 199, max: 399 },
  { name: 'Titanium Smart Health Ring', category: 'Wearables', min: 249, max: 329 },
  { name: 'Ergonomic Office Chair', category: 'Furniture', min: 220, max: 480 },
  { name: 'Minimalist Leather Desk Pad', category: 'Furniture', min: 35, max: 65 },
  { name: 'Adjustable Standing Desk Frame', category: 'Furniture', min: 350, max: 620 },
  { name: 'Custom Walnut Monitor Stand', category: 'Furniture', min: 85, max: 160 },
  { name: 'Ceramic Pour-Over Coffee Maker', category: 'Home & Kitchen', min: 32, max: 58 },
  { name: 'Organic Cotton Duvet Set', category: 'Home & Kitchen', min: 89, max: 175 },
  { name: 'Titanium Chef Knife 8-inch', category: 'Home & Kitchen', min: 75, max: 150 },
  { name: 'Smart Temperature Control Mug', category: 'Home & Kitchen', min: 99, max: 145 },
  { name: 'Aromatherapy Diffuser & Oils', category: 'Home & Kitchen', min: 28, max: 55 },
  { name: 'Indoor Hydroponic Garden Kit', category: 'Home & Kitchen', min: 110, max: 210 },
  { name: 'Merino Wool Winter Scarf', category: 'Apparel', min: 45, max: 85 },
  { name: 'Cashmere Knit Sweater', category: 'Apparel', min: 120, max: 240 },
  { name: 'Polarized Aviator Sunglasses', category: 'Apparel', min: 65, max: 130 },
  { name: 'Heavyweight Canvas Backpack', category: 'Apparel', min: 79, max: 155 },
  { name: 'Handmade Italian Leather Belt', category: 'Apparel', min: 55, max: 95 }
];

function getRandomDate() {
  // Between 2026-04-06 and 2026-10-06 (183 days)
  const start = new Date('2026-04-06T00:00:00Z').getTime();
  const end = new Date('2026-10-06T23:59:59Z').getTime();
  const target = new Date(start + Math.random() * (end - start));
  return target.toISOString().split('T')[0];
}

function getRandomStatus() {
  const r = Math.random();
  if (r < 0.82) return 'Completed';
  if (r < 0.94) return 'Pending';
  return 'Cancelled';
}

async function seed() {
  console.log('Authenticating with Google Sheets API...');
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const TOTAL_ORDERS = 6769;
  const rows = [];

  for (let i = 1; i <= TOTAL_ORDERS; i++) {
    const orderId = `ORD-${2000 + i}`;
    const cust = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const item = catalog[Math.floor(Math.random() * catalog.length)];
    const price = (item.min + Math.random() * (item.max - item.min)).toFixed(2);
    const prodCat = `${item.name}\n${item.category}`;
    const status = getRandomStatus();
    const date = getRandomDate();

    // Format matches: Order ID, Customer, Product & Category, Amount (USD), Status, Date
    rows.push([orderId, cust, prodCat, `$${price}`, status, date]);
  }

  // Sort rows chronologically for neatness
  rows.sort((a, b) => a[5].localeCompare(b[5]));

  console.log(`Generated ${rows.length} orders. Pushing in batches...`);

  const BATCH_SIZE = 2500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    console.log(`Appending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)...`);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: batch,
      },
    });
  }

  console.log('SUCCESS: All 6769 orders pushed to Google Sheet!');
}

seed().catch(err => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
