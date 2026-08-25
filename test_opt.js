const text = `Originating Passenger Traffic 
(Million Passengers)
209.50  212.30
18.80   73.80   222.70  17.90   17.40
-2.8
70.20  71.63`;

const lines = text.split('\n');
let tokens = [];
for (const l of lines) {
  const m = l.match(/-?[\d,]+\.\d{1,2}|(?<=\s)-(?=\s)|(?<=^)-(?=\s)/g);
  if (m) tokens.push(...m);
}
console.log(tokens);
