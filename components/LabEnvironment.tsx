import React from 'react';
import { Environment, Lightformer } from '@react-three/drei';

// Scene lighting/reflections built from a few virtual light panels, rendered once into an
// environment map. Replaces drei's downloaded HDR presets ("city"/"studio", ~1.5 MB each from an
// external CDN), so 3D experiments open without waiting for that download.
//   variant "city"   – bright sky and soft panels all round (general scenes)
//   variant "studio" – adds narrow bright strips that give polished metal its highlights
export const LabEnvironment: React.FC<{ variant?: 'city' | 'studio' }> = ({ variant = 'city' }) => (
    <Environment resolution={256} frames={1}>
        {/* Bright sky overhead */}
        <Lightformer form="rect" intensity={2} position={[0, 10, 0]} scale={[20, 20, 1]} color="#eef3ff" target={[0, 0, 0]} />
        {/* Soft panels around the horizon */}
        <Lightformer form="rect" intensity={1.5} position={[0, 2, -10]} scale={[20, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} position={[0, 2, 10]} scale={[20, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[-10, 2, 0]} scale={[20, 5, 1]} color="#fff4e0" target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[10, 2, 0]} scale={[20, 5, 1]} target={[0, 0, 0]} />
        {/* Dim warm bounce from the bench below */}
        <Lightformer form="rect" intensity={0.4} position={[0, -10, 0]} scale={[20, 20, 1]} color="#b8a898" target={[0, 0, 0]} />
        {variant === 'studio' && (
            <>
                {/* Tall softbox strips — the streaky highlights on metal tubes and arms */}
                {/* placed either side of a front-right viewing direction so the streaks face the camera */}
                <Lightformer form="rect" intensity={10} position={[6, 3, 1.5]} scale={[0.8, 8, 1]} target={[0, 0, 0]} />
                <Lightformer form="rect" intensity={6} position={[1.5, 3, 6]} scale={[0.6, 8, 1]} target={[0, 0, 0]} />
                <Lightformer form="rect" intensity={4} position={[-4, 1, 3]} scale={[0.6, 6, 1]} target={[0, 0, 0]} />
            </>
        )}
    </Environment>
);
