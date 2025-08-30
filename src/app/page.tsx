// import UnifiedRoomEditor from "@/components/floorplan/UnifiedRoomEditor";
// import UnifiedRoomEditorECS from "@/components/floorplan/UnifiedRoomEditorECS";
import FloorPlanApp from "@/components/floorplan/FloorPlanApp";


export default function Home() {
  return (
    // Original monolithic component (2149 lines):
    // <UnifiedRoomEditorECS />
    
    // New refactored version with exact same functionality split into composable components:
    <FloorPlanApp />
  );
}
