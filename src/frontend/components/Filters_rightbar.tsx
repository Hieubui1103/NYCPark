/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import DrivingDirectionsInput from "./DrivingDirectionsInput";

interface FiltersRightbarProps {
  gispropnums: string[];
  parkNames: string[];
  zipcodes: string[];
  selectedGispropnum: string;
  selectedParkName: string;
  selectedZipcode: string;
  handleSelectChange: (type: string, value: string) => void;
  measuredDistance: number | null;
  setSelectedDistanceParks: (v: any[]) => void;
  setMeasuredDistance: (v: number | null) => void;
  origin: string;
  setOrigin: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  openGoogleMapsDirections: () => void;
}

const Filters_rightbar: React.FC<FiltersRightbarProps> = ({
  gispropnums,
  parkNames,
  zipcodes,
  selectedGispropnum,
  selectedParkName,
  selectedZipcode,
  handleSelectChange,
  measuredDistance,
  setSelectedDistanceParks,
  setMeasuredDistance,
  origin,
  setOrigin,
  destination,
  setDestination,
  openGoogleMapsDirections
}) => (
  <aside className="w-1/5 bg-white border-l p-4 overflow-y-auto flex flex-col">
    <h2 className="font-bold mb-3 text-xl">Map Filters</h2>
    <div className="mb-5">
      <label className="block text-xs font-semibold mb-2">GISPROPNUM:</label>
      <select
        className="w-full border rounded p-2 text-sm"
        value={selectedGispropnum}
        onChange={e => handleSelectChange("gispropnum", e.target.value)}
      >
        <option value="">All</option>
        {gispropnums.map((g, i) => <option key={g || i} value={g}>{g}</option>)}
      </select>
    </div>
    <div className="mb-5">
      <label className="block text-xs font-semibold mb-2">Public Open Space Name:</label>
      <select
        className="w-full border rounded p-2 text-sm"
        value={selectedParkName}
        onChange={e => handleSelectChange("signname", e.target.value)}
      >
        <option value="">All</option>
        {parkNames.map((n, i) => <option key={n || i} value={n}>{n}</option>)}
      </select>
    </div>
    <div className="mb-5">
      <label className="block text-xs font-semibold mb-2">ZIPCODE(S):</label>
      <select
        className="w-full border rounded p-2 text-sm"
        value={selectedZipcode}
        onChange={e => handleSelectChange("zipcode", e.target.value)}
      >
        <option value="">All</option>
        {zipcodes.map((z, i) => <option key={z || i} value={z}>{z}</option>)}
      </select>
    </div>
    <div className="mb-8">
      <h3 className="font-bold text-blue-700 mb-3 text-base">Park-to-Park Straight-Line Distance</h3>
      <div className="mb-2 p-2 bg-blue-100 rounded text-blue-900 font-semibold">
        {measuredDistance !== null
          ? `Distance: ${measuredDistance.toFixed(2)} km`
          : 'Select two parks to measure distance.'}
      </div>
      <button
        className="bg-gray-200 px-4 py-2 rounded mb-2 font-semibold"
        onClick={() => {
          setSelectedDistanceParks([]);
          setMeasuredDistance(null);
        }}
      >
        Clear Selection
      </button>
      <div className="text-xs text-green-700 mt-2">
        Note: This is straight-line distance, not driving or walking route.
      </div>
    </div>
    <div>
      <h3 className="font-bold text-blue-700 mb-3 text-base">Driving Directions</h3>
      <DrivingDirectionsInput
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        onGetDirections={openGoogleMapsDirections}
      />
    </div>
  </aside>
);

export default Filters_rightbar;
