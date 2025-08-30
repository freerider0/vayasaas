/**
 * ModeSelectorBarRefactored - Example of UI component without markDirty
 * Shows how to handle mode changes with the new architecture
 */

import React, { useCallback } from 'react';
import { 
  $toolMode, 
  $editorMode, 
  setTool, 
  setEditorMode,
  ToolMode, 
  EditorMode 
} from '../stores/canvasStore';
import { useStore } from '@nanostores/react';
import { commandManager } from '../commands/CommandManager';
import { selectionStore } from '../stores/SelectionStore';
import { geometryStore } from '../stores/GeometryStore';

interface ModeSelectorBarProps {
  worldRef?: React.RefObject<any>;
  onModeChange?: (mode: EditorMode) => void;
}

export const ModeSelectorBarRefactored: React.FC<ModeSelectorBarProps> = ({ 
  worldRef,
  onModeChange 
}) => {
  const currentTool = useStore($toolMode);
  const currentMode = useStore($editorMode);
  const canUndo = useStore(commandManager.$canUndo);
  const canRedo = useStore(commandManager.$canRedo);
  
  const handleModeChange = useCallback((mode: EditorMode) => {
    // Clean up current mode
    if (currentMode === EditorMode.Edit) {
      // Exit geometry editing
      geometryStore.stopEditing();
      selectionStore.clearGeometrySelection();
    }
    
    // Set new mode
    setEditorMode(mode);
    
    // Callback if provided
    onModeChange?.(mode);
    
    // No need for markDirty - stores will trigger re-render automatically!
  }, [currentMode, onModeChange]);
  
  const handleToolChange = useCallback((tool: ToolMode) => {
    setTool(tool);
    // No markDirty needed!
  }, []);
  
  const handleUndo = useCallback(() => {
    if (worldRef?.current) {
      commandManager.undo({ world: worldRef.current });
    }
  }, [worldRef]);
  
  const handleRedo = useCallback(() => {
    if (worldRef?.current) {
      commandManager.redo({ world: worldRef.current });
    }
  }, [worldRef]);
  
  return (
    <div className="mode-selector-bar flex items-center gap-2 p-2 bg-white rounded-lg shadow-md">
      {/* Mode Buttons */}
      <div className="flex gap-1 border-r pr-2">
        <button
          className={`px-3 py-2 rounded ${
            currentMode === EditorMode.Assembly 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => handleModeChange(EditorMode.Assembly)}
          title="Assembly Mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <button
          className={`px-3 py-2 rounded ${
            currentMode === EditorMode.Draw 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => handleModeChange(EditorMode.Draw)}
          title="Draw Mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        
        <button
          className={`px-3 py-2 rounded ${
            currentMode === EditorMode.Edit 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => handleModeChange(EditorMode.Edit)}
          title="Edit Mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      
      {/* Tool Buttons based on mode */}
      <div className="flex gap-1 border-r pr-2">
        {currentMode === EditorMode.Assembly && (
          <>
            <button
              className={`px-3 py-2 rounded ${
                currentTool === ToolMode.Select 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleToolChange(ToolMode.Select)}
              title="Select"
            >
              Select
            </button>
            
            <button
              className={`px-3 py-2 rounded ${
                currentTool === ToolMode.MoveRoom 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleToolChange(ToolMode.MoveRoom)}
              title="Move"
            >
              Move
            </button>
          </>
        )}
        
        {currentMode === EditorMode.Draw && (
          <>
            <button
              className={`px-3 py-2 rounded ${
                currentTool === ToolMode.DrawRoom 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleToolChange(ToolMode.DrawRoom)}
              title="Draw Room"
            >
              Room
            </button>
            
            <button
              className={`px-3 py-2 rounded ${
                currentTool === ToolMode.DrawWall 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleToolChange(ToolMode.DrawWall)}
              title="Draw Wall"
            >
              Wall
            </button>
          </>
        )}
        
        {currentMode === EditorMode.Edit && (
          <button
            className={`px-3 py-2 rounded ${
              currentTool === ToolMode.EditRoom 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => handleToolChange(ToolMode.EditRoom)}
            title="Edit Vertices"
          >
            Edit Vertices
          </button>
        )}
      </div>
      
      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          className={`px-3 py-2 rounded ${
            canUndo 
              ? 'bg-gray-100 hover:bg-gray-200' 
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        
        <button
          className={`px-3 py-2 rounded ${
            canRedo 
              ? 'bg-gray-100 hover:bg-gray-200' 
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>
      
      {/* Command History (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="ml-auto text-xs text-gray-500">
          History: {commandManager.getCurrentIndex() + 1} / {commandManager.getHistory().length}
        </div>
      )}
    </div>
  );
};