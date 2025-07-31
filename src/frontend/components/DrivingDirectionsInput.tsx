// DrivingDirectionsInput.tsx
import React from "react";

interface DrivingDirectionsInputProps {
  origin: string;
  setOrigin: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  onGetDirections: () => void;
}

const DrivingDirectionsInput = React.memo(function DrivingDirectionsInput({
  origin,
  setOrigin,
  destination,
  setDestination,
  onGetDirections
}: DrivingDirectionsInputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2">Origin Address:</label>
      <input
        className="w-full border rounded p-2 text-sm mb-3"
        placeholder="e.g., Times Square, New York, NY"
        value={origin}
        onChange={e => setOrigin(e.target.value)}
      />
      <label className="block text-xs font-semibold mb-2">Destination Address:</label>
      <input
        className="w-full border rounded p-2 text-sm mb-3"
        placeholder="e.g., Central Park, New York, NY"
        value={destination}
        onChange={e => setDestination(e.target.value)}
      />
      <button
        className="bg-green-600 text-white px-4 py-2 rounded w-full font-semibold"
        onClick={onGetDirections}
        disabled={!origin || !destination}
      >
        Get Driving Directions (Google Maps)
      </button>
    </div>
  );
});

export default DrivingDirectionsInput;