'use client';

import React from 'react';
import { InteractiveConstraintSketch } from '../../components/geometry/InteractiveConstraintSketch';
import { NiceConstraintDemo } from '../../components/geometry/NiceConstraintDemo';

export default function GeometryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Geometric Constraint Solver</h1>
        <p className="text-gray-600 mb-4">
          Pure JavaScript 2D constraint solver using gradient descent - no dependencies!
        </p>
        
        <div className="mt-6 space-y-8">
          <InteractiveConstraintSketch />
          <NiceConstraintDemo />
        </div>
        
        <div className="mt-12 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4">How it Works</h2>
            <p className="text-gray-600 mb-4">
              Our solver uses gradient descent optimization to satisfy geometric constraints. 
              The key insight: gradients for geometry are just direction vectors! 
              No complex calculus needed - just iteratively move points to minimize constraint errors.
            </p>
            
            <div className="bg-gray-50 p-4 rounded font-mono text-sm">
              <div className="text-gray-700">
                {`// Simple gradient descent for distance constraint`}<br/>
                {`const dx = p2.x - p1.x;`}<br/>
                {`const dy = p2.y - p1.y;`}<br/>
                {`const currentDist = Math.sqrt(dx*dx + dy*dy);`}<br/>
                {`const error = targetDistance - currentDist;`}<br/>
                {``}<br/>
                {`// The "gradient" is just the normalized direction!`}<br/>
                {`const dirX = dx / currentDist;`}<br/>
                {`const dirY = dy / currentDist;`}<br/>
                {``}<br/>
                {`// Move points to satisfy constraint`}<br/>
                {`p1.x -= dirX * error * learningRate;`}<br/>
                {`p1.y -= dirY * error * learningRate;`}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Supported Constraints</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Point Constraints:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• p2p_coincident - Make points coincident</li>
                  <li>• p2p_distance - Set distance between points</li>
                  <li>• p2p_angle - Set angle between points</li>
                  <li>• point_on_line - Point lies on line</li>
                  <li>• point_on_circle - Point lies on circle</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Line & Shape Constraints:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• perpendicular - Lines at 90°</li>
                  <li>• parallel - Lines parallel</li>
                  <li>• tangent_circle2line - Circle tangent to line</li>
                  <li>• equal_length - Equal line lengths</li>
                  <li>• symmetric - Symmetric about line</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold mb-2 text-blue-900">Tips</h2>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Set <code className="bg-blue-100 px-1 rounded">fixed: true</code> on points you don\'t want to move</li>
              <li>• Constraints reference geometries by their IDs</li>
              <li>• The solver will adjust non-fixed points to satisfy all constraints</li>
              <li>• Check the console for detailed output after solving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}