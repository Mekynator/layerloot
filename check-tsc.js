const { execSync } = require('child_process');

try {
  const output = execSync('npx tsc --noEmit --skipLibCheck 2>&1', {
    cwd: 'C:\\Users\\meky\\layerloot',
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output);
} catch (error) {
  console.log(error.stdout || error.message);
}
