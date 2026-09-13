const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Add dark classes
  content = content.replace(/bg-white/g, 'bg-white dark:bg-gray-800');
  content = content.replace(/bg-gray-50/g, 'bg-gray-50 dark:bg-gray-900');
  content = content.replace(/text-gray-900/g, 'text-gray-900 dark:text-gray-100');
  content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-200');
  content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-gray-300');
  content = content.replace(/text-gray-600/g, 'text-gray-600 dark:text-gray-400');
  content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-gray-400');
  content = content.replace(/border-gray-100/g, 'border-gray-100 dark:border-gray-700');
  content = content.replace(/border-gray-200/g, 'border-gray-200 dark:border-gray-700');
  content = content.replace(/border-gray-300/g, 'border-gray-300 dark:border-gray-600');
  content = content.replace(/shadow-card/g, 'shadow-card dark:shadow-none');
  content = content.replace(/shadow-sm/g, 'shadow-sm dark:shadow-none');
  content = content.replace(/shadow-md/g, 'shadow-md dark:shadow-none');
  
  // Custom Recharts dark mode - we'll handle this manually or via css

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      // Don't overwrite Navbar and Layout if already done manually
      if (!fullPath.includes('Navbar.jsx') && !fullPath.includes('Layout.jsx') && !fullPath.includes('App.jsx') && !fullPath.includes('ThemeContext.jsx')) {
        processFile(fullPath);
      }
    }
  });
}

walk(srcDir);
