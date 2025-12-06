export interface DataPoint {
  time: number;
  force: number;
  voltage: number;
}

export interface SimulationState {
  voltage: number;
  frequency: number;
  isStimulating: boolean;
  lastStimulusTime: number | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
