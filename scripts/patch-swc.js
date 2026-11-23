const fs = require('fs');
const path = require('path');

const swcIndexPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'swc', 'index.js');
if (fs.existsSync(swcIndexPath)) {
  let content = fs.readFileSync(swcIndexPath, 'utf8');
  if (!content.includes('wasmFallback')) {
    content = content.replace(
      'try {\n            return resolve(loadNative());\n        } catch (a) {',
      'try {\n            return resolve(loadNative());\n        } catch (a) {\n            const wasmFallback = await tryLoadWasmWithFallback(attempts);\n            if (wasmFallback) return resolve(wasmFallback);'
    );
    fs.writeFileSync(swcIndexPath, content);
  }
}
