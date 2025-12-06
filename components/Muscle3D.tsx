import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Sphere, Box, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Muscle3DProps {
  contraction: number; // 0 to 1
}

export const Muscle3D: React.FC<Muscle3DProps> = ({ contraction }) => {
  const muscleRef = useRef<THREE.Group>(null);
  const muscleBellyRef = useRef<THREE.Group>(null);
  
  // Visual parameters based on contraction
  // When contracted (1): Shorten Y, Bulge X/Z
  const currentHeight = 3 - (contraction * 0.5); 
  const currentRadius = 0.6 + (contraction * 0.3);
  const colorIntensity = contraction; 

  useFrame((state) => {
    if (muscleBellyRef.current) {
        // Idle breathing motion
        const breath = Math.sin(state.clock.elapsedTime * 2) * 0.01;
        
        // Twitch jitter when contracting
        // Adds high frequency noise to scale for "straining" look
        let jitter = 0;
        if (contraction > 0) {
            jitter = (Math.random() - 0.5) * 0.05 * contraction;
        }

        muscleBellyRef.current.scale.set(
            (currentRadius / 0.6) + breath + jitter, 
            (currentHeight / 3) - (jitter * 0.5), 
            (currentRadius / 0.6) + breath + jitter
        );
    }
  });

  return (
    <group ref={muscleRef} position={[0, 0, 0]}>
      {/* Top Tendon/Clamp */}
      <Box args={[1, 0.2, 1]} position={[0, 1.6, 0]} castShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </Box>
      <Cylinder args={[0.1, 0.1, 0.5]} position={[0, 1.3, 0]}>
         <meshStandardMaterial color="#cbd5e1" />
      </Cylinder>

      {/* The Muscle Belly - Scaled via ref in useFrame for animation */}
      <group ref={muscleBellyRef}>
         <Sphere args={[0.6, 32, 32]} scale={[1, 2.5, 1]}>
            <meshStandardMaterial 
              color={new THREE.Color().setHSL(0.95, 0.7, 0.6 - (colorIntensity * 0.3))} 
              roughness={0.4}
            />
         </Sphere>
      </group>

      {/* Bottom Tendon/Thread */}
      <Cylinder args={[0.05, 0.05, 1]} position={[0, -1.8 + (contraction * 0.25), 0]}>
        <meshStandardMaterial color="#f1f5f9" />
      </Cylinder>
      
      {/* Weight/Hook */}
      <group position={[0, -2.3 + (contraction * 0.25), 0]}>
         <Box args={[0.4, 0.4, 0.4]}>
            <meshStandardMaterial color="#475569" metalness={0.6} />
         </Box>
         <Text 
            position={[0, 0, 0.21]} 
            fontSize={0.2} 
            color="white"
            anchorX="center" 
            anchorY="middle"
         >
            5g
         </Text>
      </group>

      {/* Electrodes */}
      <group position={[0.8, 0.5, 0]} rotation={[0, 0, 1]}>
         <Cylinder args={[0.02, 0.02, 1.5]} rotation={[0, 0, 1.57]}>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
         </Cylinder>
      </group>
       <group position={[-0.8, -0.5, 0]} rotation={[0, 0, -1]}>
         <Cylinder args={[0.02, 0.02, 1.5]} rotation={[0, 0, 1.57]}>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
         </Cylinder>
      </group>
    </group>
  );
};