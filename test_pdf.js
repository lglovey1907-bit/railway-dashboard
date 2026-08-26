const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('/Users/lg/.gemini/antigravity/brain/a8b5d0e5-e1fb-4d81-af8f-b13dbc0bcbca/.user_uploaded/media_1787736842280.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
});
