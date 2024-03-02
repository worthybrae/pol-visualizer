import React, { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

function DataPoint({ position, data, setHovered, color }) {
  const [hovered, setHoveredState] = useState(false);
  // This function will be called when the mouse hovers over the sphere
  const onPointerOver = (e) => {
    e.stopPropagation();
    setHoveredState(true); // Set local hovered state
    const formattedTimestamp = new Date(data.timestamp).toLocaleString(); // Format the timestamp
    setHovered({
      ...data,
      timestamp: formattedTimestamp // Pass the formatted timestamp
    });
  };

  // This function will be called when the mouse leaves the sphere
  const onPointerOut = (e) => {
    e.stopPropagation();
    setHoveredState(false); // Unset local hovered state
    setHovered(null);
  };

  // Calculate scale based on hover state
  const scale = hovered ? 1 : 1; // 50% larger when hovered
  const outlineScale = hovered ? 1.1 : 1; // Slightly larger scale for outline effect

  return (
    <group>
      {/* Outline mesh that's slightly larger than the actual mesh */}
      {hovered && (
        <mesh position={position} scale={[outlineScale, outlineScale, outlineScale]}>
          <sphereGeometry args={[0.015, 32, 32]} />
          <meshBasicMaterial color="orange" depthTest={false} />
        </mesh>
      )}
      {/* Actual data point mesh */}
      <mesh
        position={position}
        scale={[scale, scale, scale]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.01, 32, 32]} />
        <meshStandardMaterial color={color}  transparent/>
      </mesh>
    </group>
  );
}

function DataVisualization() {
  const [dataPoints, setDataPoints] = useState([]);
  const [hovered, setHovered] = useState(null); // State to store the hovered point

  const handleFileInput = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        
        const headers = lines[0].split(',').map(header => header.trim().toUpperCase());
        const idIndex = headers.indexOf('ID');
        const latIndex = headers.indexOf('LATITUDE');
        const longIndex = headers.indexOf('LONGITUDE');
        const timeIndex = headers.indexOf('TIMESTAMP');
        
        const idToColorMap = new Map();
  
        let rawPoints = lines.slice(1).map((line) => {
          if (line) {
            const columns = line.split(',').map(column => column.trim());
            const id = columns[idIndex];
            const latitude = parseFloat(columns[latIndex]);
            const longitude = parseFloat(columns[longIndex]);
            const timestamp = new Date(columns[timeIndex]).getTime();
            
            // Associate id with a color if it doesn't have one already
            if (!idToColorMap.has(id)) {
              idToColorMap.set(id, stringToColor(id));
            }
  
            return {
              id: id,
              color: idToColorMap.get(id),
              x: latitude,
              y: longitude,
              z: timestamp
            };
          }
          return null;
        }).filter(p => p);

        const xs = [];
        const ys = [];
        const zs = [];

        rawPoints.forEach(p => {
            xs.push(p.x);
            ys.push(p.y);
            zs.push(p.z);
        });

        const minX = Math.min(...xs); 
        const maxX = Math.max(...xs); 
        const minY = Math.min(...ys); 
        const maxY = Math.max(...ys);
        const minZ = Math.min(...zs); 
        const maxZ = Math.max(...zs); 
        
        // Normalize points
        const newPoints = rawPoints.map(p => ({
          position: new THREE.Vector3(
            (p.x - minX) / (maxX - minX),
            (p.y - minY) / (maxY - minY),
            (p.z - minZ) / (maxZ - minZ)
          ),
          latitude: p.x, // Store original values if needed for display
          longitude: p.y,
          timestamp: p.z
        }));
        console.log(newPoints);
        // Proceed with normalization and setting state...
        setDataPoints(newPoints);
      };
      reader.readAsText(file);
      
    }
  };

  return (
    <>
      <Canvas camera={{ fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 0, 5]} intensity={1} />
        <color attach="background" args={["#000"]} />
        {dataPoints.map((data, index) => (
          <DataPoint key={index} position={data.position} data={data} setHovered={setHovered} color={data.color}/>
        ))}
        <CameraController dataPoints={dataPoints} />
        <OrbitControls />
      </Canvas>
      {hovered && ( // If there's a hovered point, display its data
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div>Latitude: {hovered.latitude}</div>
          <div>Longitude: {hovered.longitude}</div>
          <div>Timestamp: {hovered.timestamp}</div>
        </div>
      )}
      <input
        type="file"
        onChange={handleFileInput}
        style={{
          position: 'absolute',
          zIndex: 10,
          top: '10px',
          left: '10px',
          opacity: 0.8,
          borderRadius: '10px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.5)', // Slightly opaque white
          cursor: 'pointer', // Change cursor to pointer on hover
          fontSize: '16px', // Larger font size for better readability
        }}
      />

    </>
  );
}

function CameraController({ dataPoints }) {
  const { camera, set } = useThree();

  useEffect(() => {
    if (dataPoints.length > 0) {
      // Find min and max for each axis
      console.log(dataPoints[0]);

      const xs = dataPoints.map(p => p.position.x);
      const ys = dataPoints.map(p => p.position.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Calculate center
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const cameraPosition = new THREE.Vector3(centerX, centerY, 2);
      
      camera.position.copy(cameraPosition);
      camera.lookAt(new THREE.Vector3(centerX, centerY, 0));
      set({ camera }); // Update the camera in the state
    }
  }, [dataPoints, camera, set]); // Update when dataPoints change

  return null; // This component does not render anything itself
}

export default DataVisualization;
