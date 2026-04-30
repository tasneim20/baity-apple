const fs = require('fs');
const files = [
  '/tmp/sandbox/src/app/pages/Auth.tsx',
  '/tmp/sandbox/src/app/pages/Messages.tsx',
  '/tmp/sandbox/src/app/components/PropertiesMap.tsx',
  '/tmp/sandbox/src/app/components/PropertyCard.tsx',
  '/tmp/sandbox/src/app/components/BackButton.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const isAr = language === "ar";/g, '');
    content = content.replace(/isAr/g, 'language === "ar"');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
