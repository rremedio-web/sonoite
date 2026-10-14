/**
 * Add barycentric coordinates to geometry for analytic wireframe rendering
 * @module addBarycentric
 */

import * as THREE from 'three';

/**
 * Adds barycentric coordinates as a vertex attribute
 * Each triangle gets [1,0,0], [0,1,0], [0,0,1] per vertex
 * @param {THREE.BufferGeometry} geom - Geometry to modify
 */
export function addBarycentric(geom) {
  const posCount = geom.attributes.position.count;
  const isIndexed = geom.index !== null;
  
  if (isIndexed) {
    // For indexed geometry, we need to unindex it first
    // to ensure each triangle has unique barycentric coords
    const index = geom.index.array;
    const positions = geom.attributes.position.array;
    const normals = geom.attributes.normal?.array;
    const uvs = geom.attributes.uv?.array;
    
    const newPositions = [];
    const newNormals = normals ? [] : null;
    const newUvs = uvs ? [] : null;
    const baryCoords = [];
    
    for (let i = 0; i < index.length; i += 3) {
      // For each triangle
      for (let j = 0; j < 3; j++) {
        const idx = index[i + j];
        
        // Copy position
        newPositions.push(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2]
        );
        
        // Copy normal if exists
        if (newNormals) {
          newNormals.push(
            normals[idx * 3],
            normals[idx * 3 + 1],
            normals[idx * 3 + 2]
          );
        }
        
        // Copy UV if exists
        if (newUvs) {
          newUvs.push(
            uvs[idx * 2],
            uvs[idx * 2 + 1]
          );
        }
      }
      
      // Add barycentric coords for this triangle
      baryCoords.push(
        1, 0, 0,  // First vertex
        0, 1, 0,  // Second vertex
        0, 0, 1   // Third vertex
      );
    }
    
    // Update geometry with new attributes
    geom.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (newNormals) {
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }
    if (newUvs) {
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }
    geom.setAttribute('aBary', new THREE.Float32BufferAttribute(baryCoords, 3));
    
    // Remove index
    geom.setIndex(null);
    
  } else {
    // For non-indexed geometry, just add barycentric coords
    const baryCoords = [];
    const triangleCount = posCount / 3;
    
    for (let i = 0; i < triangleCount; i++) {
      baryCoords.push(
        1, 0, 0,  // First vertex
        0, 1, 0,  // Second vertex
        0, 0, 1   // Third vertex
      );
    }
    
    geom.setAttribute('aBary', new THREE.Float32BufferAttribute(baryCoords, 3));
  }
  
  // Mark for update
  geom.attributes.aBary.needsUpdate = true;
  
  return geom;
}