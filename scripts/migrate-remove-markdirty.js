#!/usr/bin/env node

/**
 * Migration script to remove markDirty calls and update to new architecture
 * Run: node scripts/migrate-remove-markdirty.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  srcDir: path.join(__dirname, '../src'),
  backupDir: path.join(__dirname, '../backup'),
  patterns: {
    markDirty: /renderManagerService\.markDirty\([^)]*\);?\s*/g,
    importRenderManager: /import\s+.*renderManagerService.*from.*RenderManagerService.*;\s*/g,
    eventBusEmit: /canvasEventBus\.emit\(['"]([^'"]+)['"]/g,
    eventBusOn: /canvasEventBus\.on\(['"]([^'"]+)['"]/g,
  },
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx']
};

// Statistics tracking
const stats = {
  filesProcessed: 0,
  markDirtyRemoved: 0,
  importsRemoved: 0,
  eventBusReferences: [],
  errors: []
};

/**
 * Create backup of a file
 */
function backupFile(filePath) {
  const relativePath = path.relative(config.srcDir, filePath);
  const backupPath = path.join(config.backupDir, relativePath);
  
  // Create backup directory if it doesn't exist
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Copy file to backup
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Count and remove markDirty calls
    const markDirtyMatches = content.match(config.patterns.markDirty);
    if (markDirtyMatches) {
      stats.markDirtyRemoved += markDirtyMatches.length;
      content = content.replace(config.patterns.markDirty, '');
      
      console.log(`  ✓ Removed ${markDirtyMatches.length} markDirty calls`);
    }
    
    // Remove renderManagerService imports if no longer used
    if (!content.includes('renderManagerService') || 
        (content.match(/renderManagerService/g) || []).length === 1) {
      const importMatches = content.match(config.patterns.importRenderManager);
      if (importMatches) {
        stats.importsRemoved += importMatches.length;
        content = content.replace(config.patterns.importRenderManager, '');
        console.log(`  ✓ Removed renderManagerService import`);
      }
    }
    
    // Track event bus usage (for reporting)
    const eventEmitMatches = [...content.matchAll(config.patterns.eventBusEmit)];
    const eventOnMatches = [...content.matchAll(config.patterns.eventBusOn)];
    
    if (eventEmitMatches.length > 0 || eventOnMatches.length > 0) {
      stats.eventBusReferences.push({
        file: filePath,
        emits: eventEmitMatches.map(m => m[1]),
        listeners: eventOnMatches.map(m => m[1])
      });
    }
    
    // Add migration comments for complex cases
    if (content !== originalContent) {
      // Add TODO comment at the top of modified files
      const todoComment = `// TODO: File migrated - review changes and test thoroughly\n// Migration date: ${new Date().toISOString()}\n\n`;
      
      if (!content.startsWith('// TODO: File migrated')) {
        content = todoComment + content;
      }
      
      // Backup original file
      const backupPath = backupFile(filePath);
      console.log(`  📁 Backup created: ${path.relative(config.srcDir, backupPath)}`);
      
      // Write modified content
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesProcessed++;
      
      return true;
    }
    
    return false;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  const reportPath = path.join(__dirname, '../migration-report.md');
  
  let report = `# Migration Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- Files processed: ${stats.filesProcessed}\n`;
  report += `- markDirty calls removed: ${stats.markDirtyRemoved}\n`;
  report += `- RenderManagerService imports removed: ${stats.importsRemoved}\n`;
  report += `- Files with event bus references: ${stats.eventBusReferences.length}\n`;
  report += `- Errors: ${stats.errors.length}\n\n`;
  
  if (stats.eventBusReferences.length > 0) {
    report += `## Event Bus References (Need Manual Migration)\n\n`;
    
    stats.eventBusReferences.forEach(ref => {
      report += `### ${path.relative(config.srcDir, ref.file)}\n\n`;
      
      if (ref.emits.length > 0) {
        report += `**Emits:**\n`;
        ref.emits.forEach(event => {
          report += `- ${event} → ${getCommandSuggestion(event)}\n`;
        });
        report += `\n`;
      }
      
      if (ref.listeners.length > 0) {
        report += `**Listens:**\n`;
        ref.listeners.forEach(event => {
          report += `- ${event} → ${getHandlerSuggestion(event)}\n`;
        });
        report += `\n`;
      }
    });
  }
  
  if (stats.errors.length > 0) {
    report += `## Errors\n\n`;
    stats.errors.forEach(err => {
      report += `- ${err.file}: ${err.error}\n`;
    });
  }
  
  report += `\n## Next Steps\n\n`;
  report += `1. Review all modified files (marked with TODO comments)\n`;
  report += `2. Migrate event bus references to commands\n`;
  report += `3. Test thoroughly\n`;
  report += `4. Remove backup directory when confident\n`;
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

/**
 * Get command suggestion for event
 */
function getCommandSuggestion(event) {
  const suggestions = {
    'room:create': 'CreateEntityCommand',
    'room:delete': 'DeleteEntityCommand',
    'room:move': 'MoveEntityCommand',
    'room:rotate': 'RotateEntityCommand',
    'vertex:add': 'AddVertexCommand',
    'vertex:delete': 'DeleteVertexCommand',
    'vertex:move': 'EditVertexCommand',
    'constraint:add': 'AddConstraintCommand',
    'constraint:remove': 'RemoveConstraintCommand',
    'entity:select': 'selectionStore.selectEntity()',
    'selection:clear': 'selectionStore.clearEntitySelection()'
  };
  
  // Find best match
  for (const [pattern, suggestion] of Object.entries(suggestions)) {
    if (event.includes(pattern.split(':')[0])) {
      return suggestion;
    }
  }
  
  return 'Create custom command';
}

/**
 * Get handler suggestion for event listener
 */
function getHandlerSuggestion(event) {
  if (event.startsWith('mouse:')) {
    return 'Move to UnifiedInputHandler';
  }
  if (event.includes('select')) {
    return 'Use SelectionStore subscription';
  }
  if (event.includes('drag') || event.includes('move')) {
    return 'Use GeometryStore or MoveSystemRefactored';
  }
  return 'Create service method or use store';
}

/**
 * Main migration function
 */
function migrate() {
  console.log('🚀 Starting migration...\n');
  
  // Create backup directory
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
  
  // Find all source files
  const pattern = path.join(config.srcDir, '**/*.{ts,tsx,js,jsx}');
  const files = glob.sync(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  console.log(`Found ${files.length} files to process\n`);
  
  // Process each file
  files.forEach(file => {
    console.log(`Processing: ${path.relative(config.srcDir, file)}`);
    processFile(file);
  });
  
  // Generate report
  generateReport();
  
  // Print summary
  console.log('\n✅ Migration complete!\n');
  console.log('Summary:');
  console.log(`  - Files modified: ${stats.filesProcessed}`);
  console.log(`  - markDirty calls removed: ${stats.markDirtyRemoved}`);
  console.log(`  - Imports cleaned: ${stats.importsRemoved}`);
  console.log(`  - Files needing manual migration: ${stats.eventBusReferences.length}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors occurred - check migration-report.md`);
  }
  
  console.log('\n📁 Original files backed up to:', config.backupDir);
  console.log('💡 Review the migration-report.md for detailed information');
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate, processFile };