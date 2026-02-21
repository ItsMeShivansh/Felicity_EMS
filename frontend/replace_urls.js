const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('/Users/itsmeshivansh/Desktop/Work/Sem_4/DASS/Assignment/Felicity_EMS/frontend/src');

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace 'http://localhost:5001/api/...' with `${import.meta.env.VITE_API_URL}/api/...`
  content = content.replace(/'http:\/\/localhost:5001([^']*)'/g, "`\\${import.meta.env.VITE_API_URL}$1`");
  // Handle double quotes
  content = content.replace(/"http:\/\/localhost:5001([^"]*)"/g, "`\\${import.meta.env.VITE_API_URL}$1`");
  // Handle instances already in backticks
  content = content.replace(/http:\/\/localhost:5001/g, "${import.meta.env.VITE_API_URL}");

  fs.writeFileSync(file, content, 'utf8');
  count++;
});
console.log('Replaced URLs in', count, 'files.');
