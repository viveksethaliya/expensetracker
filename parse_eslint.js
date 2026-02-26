const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));
data.forEach(file => {
    const errors = file.messages.filter(m => m.severity === 2);
    if (errors.length > 0) {
        console.log(file.filePath);
        errors.forEach(e => console.log(`  ${e.line}:${e.column} ${e.message}`));
    }
});
