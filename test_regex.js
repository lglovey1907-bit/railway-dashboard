const fs = require('fs');
const text = fs.readFileSync('pdf_content_test.txt', 'utf8');

const regex = /-?[\d,]+\.\d{1,2}|(?<=\s)-(?=\s)|(?<=^)-(?=\s)/g;

function getTokens(str) {
  const idx = text.indexOf(str);
  if (idx !== -1) {
    const chunk = text.substring(idx, idx + 150);
    const nums = chunk.match(regex) || [];
    console.log("Tokens for", str, ":", nums);
  }
}

getTokens("Passenger Revenue");
getTokens("Parcel/Luggage");
getTokens("Ticket Checking");
getTokens("PF Tickets");
getTokens("Other Misc");
getTokens("Freight Revenue");
getTokens("Parking Contracts");

