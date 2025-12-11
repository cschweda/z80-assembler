import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

// Plugin to copy roms directory to dist and show build completion message
function copyRomsPlugin() {
  return {
    name: 'copy-roms',
    closeBundle() {
      const srcDir = 'roms';
      const destDir = 'dist/roms';
      
      try {
        if (existsSync(srcDir) && statSync(srcDir).isDirectory()) {
          mkdirSync(destDir, { recursive: true });
          const files = readdirSync(srcDir);
          files.forEach(file => {
            const srcPath = join(srcDir, file);
            const destPath = join(destDir, file);
            if (statSync(srcPath).isFile()) {
              copyFileSync(srcPath, destPath);
            }
          });
          console.log(`✓ Copied ${files.length} ROM file(s) to dist/roms`);
        }
      } catch (error) {
        console.warn('Warning: Could not copy roms directory:', error.message);
      }
      
      // Show build completion message
      console.log('\n' + '='.repeat(60));
      console.log('✓ Build completed successfully!');
      console.log('='.repeat(60));
      console.log('📁 Output directory: dist/');
      console.log('📄 Static HTML files ready for deployment');
      console.log('🚀 Preview options:');
      console.log('   • yarn preview');
      console.log('   • serve dist');
      console.log('   • npx http-server dist');
      console.log('='.repeat(60) + '\n');
    }
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [copyRomsPlugin()]
});

