const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');
const oldText = '<Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />';
const newText = '<Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />';

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(oldText)) {
        content = content.split(oldText).join(newText);
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', path.relative(srcDir, fullPath));
      }
    }
  }
}

walk(srcDir);
console.log('Done!');
