#!/bin/bash
echo "🧱 BrickValue Monthly Update"
echo "============================"

cd /Users/aj/Desktop/my-app

echo ""
echo "1. Updating all set dates to today..."
node scripts/update-dates.js

echo ""
echo "2. Importing new sets from Rebrickable..."
npm run import-rebrickable

echo ""
echo "3. Done! Check Brickset for any new exit dates and re-run the retiring soon update if needed."
echo ""
echo "To update retiring soon data:"
echo "  1. Export your Brickset collection as CSV"
echo "  2. Save to ~/Desktop/brickset.csv"
echo "  3. Run: node /tmp/fix-retiring2.js"
echo ""
echo "✅ Monthly update complete!"
