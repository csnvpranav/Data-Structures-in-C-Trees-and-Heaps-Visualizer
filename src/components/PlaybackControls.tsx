import React from 'react';
import { Play, Pause, Square, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sliders } from 'lucide-react';

interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number; // millisecond intervals
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onChangeSpeed: (newSpeed: number) => void;
  onChangeStep: (step: number) => void;
  darkMode: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onTogglePlay,
  onNext,
  onPrev,
  onFirst,
  onLast,
  onChangeSpeed,
  onChangeStep,
  darkMode,
}) => {
  const progressPercent = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className={`${
      darkMode ? 'bg-[#090909] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-md'
    } border-t p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none z-10 shadow-3xl`}>
      {/* Step Progress indicators */}
      <div className="flex items-center gap-3 w-full md:w-auto font-mono">
        <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest font-mono`}>
          Timeline
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 ${
          darkMode ? 'bg-black/45 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
        } border rounded-lg text-xs font-mono font-bold`}>
          <span>{totalSteps > 0 ? currentStep + 1 : 0}</span>
          <span className="opacity-40">/</span>
          <span>{totalSteps}</span>
        </div>
      </div>

      {/* Main Playback Control Bar Buttons */}
      <div className="flex items-center gap-1.5 justify-center">
        <button
          onClick={onFirst}
          disabled={currentStep === 0 || totalSteps <= 1}
          id="btn_first"
          className={`p-2 border ${
            darkMode 
              ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 shadow-sm'
          } disabled:opacity-30 rounded-lg transition-colors cursor-pointer`}
          title="Jump to Start"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onPrev}
          disabled={currentStep === 0 || totalSteps <= 1}
          id="btn_prev"
          className={`p-2 border ${
            darkMode 
              ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 shadow-sm'
          } disabled:opacity-30 rounded-lg transition-colors cursor-pointer`}
          title="Previous Step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          disabled={totalSteps <= 1}
          id="btn_toggle_play"
          className={`p-2 px-4 rounded-lg text-black font-extrabold flex items-center gap-1.5 text-xs transition-all duration-300 cursor-pointer select-none ${
            isPlaying
              ? 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.35)]'
          } disabled:opacity-40`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current animate-pulse" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Animate</span>
            </>
          )}
        </button>

        <button
          onClick={onNext}
          disabled={currentStep === totalSteps - 1 || totalSteps <= 1}
          id="btn_next"
          className={`p-2 border ${
            darkMode 
              ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 shadow-sm'
          } disabled:opacity-30 rounded-lg transition-colors cursor-pointer`}
          title="Next Step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onLast}
          disabled={currentStep === totalSteps - 1 || totalSteps <= 1}
          id="btn_last"
          className={`p-2 border ${
            darkMode 
              ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 hover:text-white' 
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 shadow-sm'
          } disabled:opacity-30 rounded-lg transition-colors cursor-pointer`}
          title="Skip to End"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline scrubbing & customizable speed slider */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-[40%] text-xs">
        {/* Timeline Progress bar scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={(e) => onChangeStep(parseInt(e.target.value, 10))}
            disabled={totalSteps <= 1}
            id="timeline_slider"
            className={`w-full h-1.5 ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-slate-200'
            } rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40`}
          />
        </div>

        {/* Speed adjust slider */}
        <div className={`flex items-center gap-2 border-l ${
          darkMode ? 'border-white/10' : 'border-slate-200'
        } md:pl-4 min-w-[155px]`}>
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className={`text-[10px] uppercase font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Speed: {speed}ms
          </span>
          <input
            type="range"
            min={200}
            max={2500}
            step={100}
            value={speed}
            onChange={(e) => onChangeSpeed(parseInt(e.target.value, 10))}
            id="speed_slider"
            className={`w-20 h-1.5 ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-slate-200'
            } rounded-lg appearance-none cursor-pointer accent-cyan-400`}
            title="Adjust transition speed"
          />
        </div>
      </div>
    </div>
  );
};
