import React from "react";
import Sidebar from "../components/Sidebar";
import MapView from "../components/MapView";
import Filters_rightbar from "../components/Filters_rightbar";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const InteractiveMap = () => (
  <div className="flex h-screen w-screen">
    <aside className="w-1/6 bg-white border-r p-4 overflow-y-auto flex flex-col min-w-0">
      <Sidebar />
    </aside>
    <main className="flex-1 relative flex flex-col items-center bg-white min-w-0">
      <MapView 
        parksData={[]} 
        ntaData={[]} 
        showParks={true} 
        setShowParks={() => {}} 
        showNTAs={true} 
        setShowNTAs={() => {}} 
        selectedPark={null} 
        setSelectedPark={() => {}} 
        selectedNTA={null} 
        setSelectedNTA={() => {}} 
        mapCenter={{ lat: 40.7128, lng: -74.0060 }} 
        setMapCenter={() => {}} 
      />
    </main>
    <aside className="w-1/5 bg-white border-l p-4 overflow-y-auto flex flex-col">
      <Filters_rightbar />
    </aside>
  </div>
);

export default InteractiveMap;
