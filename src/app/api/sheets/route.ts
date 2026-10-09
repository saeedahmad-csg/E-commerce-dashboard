import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { Order, OrderStatus } from '@/types/order';

const SPREADSHEET_ID = '15pMvy6wDYyzl1FRxU4mr00BEIJYeca2XLIfrTty-91g';
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'gen-lang-client-0764638400-312481755508.json');

// Force dynamic fetch so Next.js doesn't cache sheet results
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      return NextResponse.json(
        { error: 'Service account credentials file not found on server.' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Read the sheet range (fetch all rows A:Z)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:Z',
    });

    const rows = response.data.values;
    console.log(`[Google Sheets] Fetched ${rows ? rows.length : 0} total rows (including headers) from sheet.`);
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ orders: [], message: 'No rows found in sheet.' });
    }


    // Match column indexes by inspecting header row
    const headers = rows[0].map((h: string) => String(h || '').trim().toLowerCase());

    const findCol = (terms: string[]) => {
      return headers.findIndex((h) => terms.some((term) => h.includes(term)));
    };

    const idIdx = findCol(['order id', 'order_id', 'id']);
    const customerIdx = findCol(['customer', 'name']);
    const prodCatIdx = findCol(['product & category', 'product and category']);
    const prodIdx = findCol(['product_name', 'product']);
    const catIdx = findCol(['category']);
    const amountIdx = findCol(['amount', 'price', 'usd', 'total']);
    const statusIdx = findCol(['status']);
    const dateIdx = findCol(['date']);

    const orders: Order[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const clean = (val: unknown) => String(val ?? '').trim();

      // Extract Product and Category:
      // If the sheet combined them like "Product Name\nCategory", split on newline
      let productName = 'General Item';
      let category = 'General';

      if (prodCatIdx !== -1 && row[prodCatIdx]) {
        const combined = clean(row[prodCatIdx]);
        const parts = combined.split('\n').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          productName = parts[0];
          category = parts[1];
        } else if (parts.length === 1) {
          productName = parts[0];
        }
      } else {
        if (prodIdx !== -1 && row[prodIdx]) productName = clean(row[prodIdx]);
        if (catIdx !== -1 && row[catIdx]) category = clean(row[catIdx]);
      }

      // Parse Amount (handle '$', ',', spaces)
      const rawAmount = amountIdx !== -1 ? clean(row[amountIdx]) : '0';
      const parsedAmount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0;

      // Parse Status
      const rawStatus = statusIdx !== -1 ? clean(row[statusIdx]) : '';
      let normalizedStatus: OrderStatus = 'Completed';
      if (/pending/i.test(rawStatus)) {
        normalizedStatus = 'Pending';
      } else if (/cancel/i.test(rawStatus)) {
        normalizedStatus = 'Cancelled';
      }

      // Parse Date
      const rawDate = dateIdx !== -1 ? clean(row[dateIdx]) : '';
      const orderDate = rawDate || new Date().toISOString().split('T')[0];

      // Parse Order ID
      const orderId = idIdx !== -1 && row[idIdx] ? clean(row[idIdx]) : `ORD-${1000 + i}`;

      // Customer
      const customerName = customerIdx !== -1 && row[customerIdx] ? clean(row[customerIdx]) : 'Customer';

      orders.push({
        Order_ID: orderId,
        Customer_Name: customerName,
        Product_Name: productName,
        Category: category,
        Amount_USD: parsedAmount,
        Status: normalizedStatus,
        Order_Date: orderDate,
      });
    }

    console.log(`[Google Sheets API] Processed and returning ${orders.length} parsed orders.`);

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
      syncedAt: new Date().toISOString(),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Google Sheets API error';
    return NextResponse.json(
      {
        error: message,
        hint:
          'Ensure Google Sheet is shared with: kira-l@gen-lang-client-0764638400.iam.gserviceaccount.com as a Viewer.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      return NextResponse.json(
        { error: 'Service account credentials file not found on server.' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Retrieve sheet metadata to find the first sheet name
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetName = sheetMeta.data.sheets?.[0]?.properties?.title || 'Sheet1';

    // Clear data rows starting from row 2 onwards (preserving headers in row 1)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A2:Z10000`,
    });

    return NextResponse.json({
      success: true,
      message: `Cleared all order rows from sheet "${sheetName}" (headers preserved).`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear data from sheet.';
    return NextResponse.json(
      {
        error: message,
        hint:
          'Make sure the Google Sheet is shared with: kira-l@gen-lang-client-0764638400.iam.gserviceaccount.com as an **Editor** (write permission required to clear/delete data).',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {

    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      return NextResponse.json(
        { error: 'Service account credentials file not found on server.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 6769, 1), 10000);

    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetName = sheetMeta.data.sheets?.[0]?.properties?.title || 'Sheet1';

    // Standard e-commerce categories in the $20 - $50 US market
    const catalog = [
      {
        category: 'Electronics & Audio',
        products: [
          'Wireless Earbuds Lite',
          'Fast MagSafe Power Bank',
          'Braided USB-C Cable 3-Pack',
          'Bluetooth Shower Speaker',
          'Ergonomic Wireless Mouse',
          'Adjustable Desk Phone Stand',
          'Dual Port Fast Charger 30W',
          'Laptop Sleeve 14-inch'
        ],
      },
      {
        category: 'Apparel & Accessories',
        products: [
          'Organic Cotton Essential Tee',
          'Polarized UV400 Sunglasses',
          'Comfort Terry Sweatpants',
          'Merino Wool Winter Beanie',
          'Classic Canvas Tote Bag',
          'Running Moisture-Wick Socks 4pk',
          'Handmade Vegan Leather Belt'
        ],
      },
      {
        category: 'Home & Kitchen',
        products: [
          'Insulated Stainless Tumbler 24oz',
          'French Press Glass Coffee Maker',
          'Aromatherapy Ceramic Diffuser',
          'Bamboo Cutting Board Set',
          'Soy Wax Scented Candle Trio',
          'Silicone Utensil Cookware Set',
          'Electric Milk Frother Wand'
        ],
      },
      {
        category: 'Beauty & Wellness',
        products: [
          'Hydrating Facial Mist 100ml',
          'Matcha Detox Face Clay Mask',
          'Deep Tissue Foam Massage Roller',
          'Electric Sonic Toothbrush Lite',
          'Herbal Organic Bath Salts',
          'Natural Vitamin C Serum'
        ],
      },
      {
        category: 'Sports & Outdoors',
        products: [
          'Non-Slip Rubber Yoga Mat',
          'Resistance Band Strength Set',
          'Hydration Sport Bottle 32oz',
          'Tactical LED Camping Flashlight',
          'Quick-Dry Microfiber Camp Towel',
          'Lightweight Running Waist Pack'
        ],
      },
    ];

    const firstNames = [
      'James', 'Olivia', 'Ethan', 'Emma', 'Liam', 'Sophia', 'Noah', 'Ava', 'Lucas', 'Mia',
      'William', 'Isabella', 'Benjamin', 'Charlotte', 'Henry', 'Amelia', 'Alexander', 'Harper',
      'Daniel', 'Evelyn', 'Michael', 'Abigail', 'Elijah', 'Emily', 'Logan', 'Elizabeth', 'Mason', 'Sofia'
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez',
      'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson',
      'Thompson', 'White', 'Lopez', 'Lee', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young'
    ];

    // User specification: Exactly 67 cancelled, 302 pending (to be fulfilled), remainder completed (6,400)
    const cancelledCount = 67;
    const pendingCount = 302;
    const completedCount = Math.max(0, count - cancelledCount - pendingCount);

    const statusList: OrderStatus[] = [
      ...Array(cancelledCount).fill('Cancelled'),
      ...Array(pendingCount).fill('Pending'),
      ...Array(completedCount).fill('Completed'),
    ];

    // Fisher-Yates shuffle so statuses are realistically distributed across dates
    for (let i = statusList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusList[i], statusList[j]] = [statusList[j], statusList[i]];
    }

    // Start dates spanning past 40 days up to today
    const now = Date.now();
    const rowsToAdd: (string | number)[][] = [];

    for (let i = 1; i <= count; i++) {
      const catObj = catalog[Math.floor(Math.random() * catObjLength(catalog))];
      const product = catObj.products[Math.floor(Math.random() * catObj.products.length)];
      const customer = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      
      // Price between $20.00 and $50.00
      const price = parseFloat((20 + Math.random() * 30).toFixed(2));
      const status = statusList[i - 1] || 'Completed';
      
      // Distributed within the last 40 days
      const daysAgo = Math.floor(Math.random() * 40);
      const orderDate = new Date(now - daysAgo * 86400000).toISOString().split('T')[0];
      const orderId = `ORD-US-${10000 + i}`;

      // Standard headers: Order ID, Customer Name, Product Name, Category, Amount, Status, Date
      rowsToAdd.push([
        orderId,
        customer,
        product,
        catObj.category,
        `$${price.toFixed(2)}`,
        status,
        orderDate,
      ]);
    }


    // Ensure header row exists at row 1
    const headers = [['Order ID', 'Customer Name', 'Product Name', 'Category', 'Amount', 'Status', 'Date']];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: headers },
    });

    // Clear old data rows A2:Z10000
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A2:Z10000`,
    });

    // Batch append in chunks of 2,000 rows to stay well within Google API limits
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < rowsToAdd.length; i += CHUNK_SIZE) {
      const chunk = rowsToAdd.slice(i, i + CHUNK_SIZE);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: chunk },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated and uploaded ${rowsToAdd.length} orders ($20-$50, USA customers) to Google Sheet "${sheetName}".`,
      count: rowsToAdd.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to populate sheet.';
    return NextResponse.json(
      {
        error: message,
        hint:
          'Ensure the service account (kira-l@gen-lang-client-0764638400.iam.gserviceaccount.com) has **Editor** permissions on the Google Sheet.',
      },
      { status: 500 }
    );
  }
}

function catObjLength(arr: unknown[]): number {
  return arr.length;
}


