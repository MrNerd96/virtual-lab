import React from 'react';
import { Zap, RotateCcw, Activity } from 'lucide-react';

interface ControlsProps {
  voltage: number;
  setVoltage: (v: number) => void;
  onStimulate: () => void;
  onReset: () => void;
  isStimulating: boolean;
  thresholdValue?: number; // Optional dynamic threshold
  maximalValue?: number;   // Optional dynamic maximal
}

export const Controls: React.FC<ControlsProps> = ({
  voltage,
  setVoltage,
  onStimulate,
  onReset,
  isStimulating,
  thresholdValue,
  maximalValue
}) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <h2 className="text-slate-200 text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        Stimulator Control
      </h2>

      <div className="space-y-6">
        {/* Voltage Dial/Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-slate-400 text-sm font-medium">Voltage (Stimulus Strength)</label>
            <span className="text-blue-400 font-mono font-bold">{voltage.toFixed(1)} V</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={voltage}
            onChange={(e) => setVoltage(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            disabled={isStimulating}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
            <span>0V</span>
            {thresholdValue !== undefined && <span>Threshold (~{thresholdValue}V)</span>}
            {maximalValue !== undefined && <span>Maximal (~{maximalValue}V)</span>}
            <span>10V</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onStimulate}
            disabled={isStimulating}
            className={`
              flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all
              ${isStimulating
                ? 'bg-green-900/50 text-green-500/50 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] active:scale-95'}
            `}
          >
            <Zap className={`w-5 h-5 ${isStimulating ? '' : 'fill-current'}`} />
            {isStimulating ? 'Stimulating...' : 'STIMULATE'}
          </button>

          <button
            onClick={onReset}
            disabled={isStimulating}
            className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Data
          </button>
        </div>
      </div>
    </div>
  );
};
