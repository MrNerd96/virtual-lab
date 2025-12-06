import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DataPoint } from '../types';

interface OscilloscopeProps {
  data: DataPoint[];
  currentVoltage: number;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({ data, currentVoltage }) => {
  return (
    <div className="w-full h-full bg-black border-4 border-gray-700 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col">
        {/* Screen Grid Overlay Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(18,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px] z-10"></div>
        
        <div className="absolute top-2 right-4 text-green-400 font-mono text-xs z-20 font-bold">
            CH1: {currentVoltage.toFixed(1)}V
        </div>
        <div className="absolute top-6 right-4 text-green-400 font-mono text-xs z-20 font-bold">
            TIME: 50ms/div
        </div>

        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="time" 
                        type="number" 
                        domain={[0, 500]} 
                        tickCount={11} 
                        stroke="#475569" 
                        tick={{fill: '#64748b', fontSize: 10}}
                        allowDataOverflow
                    />
                    <YAxis 
                        domain={[0, 12]} 
                        stroke="#475569" 
                        tick={{fill: '#64748b', fontSize: 10}}
                        label={{ value: 'Force (g)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                        allowDataOverflow
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#4ade80', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#4ade80' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number) => [value.toFixed(2) + ' g', 'Force']}
                        labelFormatter={(label) => label + ' ms'}
                        isAnimationActive={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="force" 
                        stroke="#4ade80" 
                        strokeWidth={3} 
                        dot={false} 
                        isAnimationActive={false}
                        filter="drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))"
                    />
                    {/* Stimulus Artifact Line */}
                    {data.length > 0 && (
                         <ReferenceLine x={LATENT_PERIOD} stroke="#ef4444" strokeDasharray="3 3" />
                    )}
                     <ReferenceLine x={0} stroke="#ef4444" label={{position: 'insideTopLeft', value: 'Stim', fill:'#ef4444', fontSize: 10}} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

const LATENT_PERIOD = 20; // Matching App.tsx constant for visual reference