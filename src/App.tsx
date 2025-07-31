/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState } from "react";
import { Link, Routes, Route } from 'react-router-dom';
import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import './App.css'
import Select from "react-select";
import type {
  FeatureCollection,
  Point,
  GeoJsonProperties
} from "geojson";
import distance from "@turf/distance";
import DrivingDirectionsInput from "./frontend/components/DrivingDirectionsInput"
import PercentChart from './frontend/components/PercentChart';
import Heatmap from "./frontend/components/Heatmap";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const location = useLocation();

  // Example state for toggles and filters
  const [showParks, setShowParks] = useState(true);
  const [showBoroughs, setShowBoroughs] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const [gispropnums, setGispropnums] = useState<string[]>([]);
  const [parkNames, setParkNames] = useState<string[]>([]);
  const [zipcodes, setZipcodes] = useState<string[]>([]);

  const [selectedGispropnum, setSelectedGispropnum] = useState<string>("");
  const [selectedParkName, setSelectedParkName] = useState<string>("");
  const [selectedZipcode, setSelectedZipcode] = useState<string>("");
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
  // GeoJSONs
  const [parksData, setParksData] = useState<FeatureCollection<Point, GeoJsonProperties> | null>(null);
  const [ntaData, setNtaData] = useState(null);

  // const [distanceMode, setDistanceMode] = useState(false);
  const [selectedDistanceParks, setSelectedDistanceParks] = useState<any[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  

  useEffect(() => {
    fetch("/nyc-parks-2.geojson")
      .then(res => res.json() as Promise<FeatureCollection<Point, GeoJsonProperties>>)
      .then(data => {
        setParksData(data);
      });
      fetch("/nyc_tracts.geojson").then(res => res.json()).then(setNtaData);
      
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    if (mapContainer.current) {
      mapContainer.current.innerHTML = "";
    }

    if (!parksData && !ntaData) {return}
    if (!parksData) {
      console.log("parksData in effect: null (waiting for fetch)");
      return;
    }
    console.log("parkData: ", ntaData);
    
    if (!mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-73.9708, 40.7238],
      zoom: 10,
    });
    
    map.current.on("load", () => {
      if (!map.current) return;

      if (ntaData) {
        map.current.addSource("nyc-nta", {
          type: "geojson",
          data: ntaData,
        });
        map.current.addLayer({
          id: "nyc-nta-outline",
          type: "line",
          source: "nyc-nta",
          paint: {
            "line-color": "blue", // orange, or any color you like
            "line-width": 1.5,
          },
        });
      }
      
      // Add park points
      if (parksData) {
        map.current.addSource("nyc-parks", {
          type: "geojson",
          data: parksData || { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50,  // Radius of each cluster when clustering points (pixels)
        });

        // Unclustered source (for heatmap)
        map.current.addSource("nyc-parks-heatmap", {
          type: "geojson",
          data: parksData || { type: "FeatureCollection", features: [] }
        });

        map.current.loadImage("/tree.png", (error, image) => {
          if (error) throw error;
          if (!map.current?.hasImage("tree-icon") && image) {
            map.current?.addImage("tree-icon", image);
          }
          map.current!.addLayer({
            id: "parks-heatmap",
            type: "heatmap",
            source: "nyc-parks-heatmap",
            maxzoom: 15,
            paint: {
              "heatmap-weight": 1,
              "heatmap-intensity": [
                "interpolate", ["linear"], ["zoom"], 0, 2, 15, 5
              ],
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(33,102,172,0)",
                0.2, "rgb(103,169,207)",
                0.4, "rgb(209,229,240)",
                0.6, "rgb(253,219,199)",
                0.8, "rgb(239,138,98)",
                1, "rgb(178,24,43)"
              ],
              "heatmap-radius": [
                "interpolate", ["linear"], ["zoom"], 0, 2, 9, 20
              ],
              "heatmap-opacity": [
                "interpolate", ["linear"], ["zoom"], 7, 1, 15, 0
              ]
            }
          });
          // 4. Clustered circles layer
          map.current!.addLayer({
            id: "clusters",
            type: "circle",
            source: "nyc-parks",
            filter: ["has", "point_count"],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'],
                '#51bbd6',    // color for count < first threshold
                50, '#f1f075',
                100, '#f28cb1'
              ],
              'circle-radius': [
                'step', ['get', 'point_count'],
                20,   // radius for count < first threshold
                50, 30,
                100, 40
              ]
            }
          });

          // 5. Cluster count labels
          map.current!.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "nyc-parks",
            filter: ["has", "point_count"],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }
          });

          // Add symbol layer for parks
          map.current!.addLayer({
            id: "parks-symbol",
            type: "symbol",
            source: "nyc-parks",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": "tree-icon",
              "icon-size": 0.15, // Adjust as needed
              "icon-allow-overlap": true,
            },
          });
        });
        

        map.current!.on('click', 'clusters', (e) => {
          // tell TS these are Mapbox features with GeoJSON Point geometry:
          const features = map.current!
            .queryRenderedFeatures(e.point, { layers: ['clusters'] }) as mapboxgl.MapboxGeoJSONFeature[];

          if (!features.length) return;
          const clusterId = features[0].properties!.cluster_id as number;

          // get the source and narrow its type so getClusterExpansionZoom will yield a number
          const source = map.current!.getSource('nyc-parks') as
            | mapboxgl.GeoJSONSource
            & { getClusterExpansionZoom(id: number, cb: (err: Error | null, zoom: number) => void): void };

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) {
              console.error(err);
              return;
            }
            // guard against any unexpected null/undefined
            if (zoom == null) return;

            // cast geometry to GeoJSON.Point so coordinates is [number, number]
            const coords = (features[0].geometry as Point).coordinates;
            map.current!.easeTo({
              center: coords as [number, number],
              zoom
            });
          });
        });

        map.current!.on('mouseenter', 'clusters', () => map.current!.getCanvas().style.cursor = 'pointer');
        map.current!.on('mouseleave', 'clusters', () => map.current!.getCanvas().style.cursor = '');

        map.current!.on('click', 'parks-symbol', (e) => {
          
          if (!e.features || !e.features.length) return;
          const park = e.features[0];
          
          console.log("Im working")
          setSelectedDistanceParks(prev => {
              if (prev.length === 2) return [park];
              return [...prev, park];
          });
          console.log("Selected park for distance:", park);
            // Optionally: don't open a popup in distance mode
        
          // Show popup as usual when not in distance mode
          const props = park.properties!;
          const popupHtml = `
            <div style="font-size:12px;max-width:300px;color:black">
              <b>${props["public open space name"] || 'Park'}</b><br/>
              <span>📍 <b>Location:</b> ${props.location || ''}</span><br/>
              <span>🗺️ <b>ZIP Code(s):</b> ${props["zipcode(s)"] || ''}</span><br/>
              <span>🌳 <b>Total Acres:</b> ${props["open space acres"] || ''}</span><br/>
              <span>🏀 <b>Active Acres:</b> ${props["active acres"] || ''}</span><br/>
              <span>🧘 <b>Passive Acres:</b> ${props["passive acres"] || ''}</span><br/>
              ${props.nycparks ? `<a href="${props.nycparks}" target="_blank">NYC Parks Info</a>` : ''}
            </div>
          `;
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupHtml)
            .addTo(map.current!);
        });
        

 
    }
    });
  }, [parksData, ntaData, location.pathname]);

  useEffect(() => {
    if (!map.current) return;
    const m = map.current;
    if (m.getLayer("nyc-nta-outline")){
      m.setLayoutProperty("nyc-nta-outline", "visibility", showBoroughs ? "visible": "none");
    }
    if (m.getLayer("nyc-parks-fill")) {
      m.setLayoutProperty("nyc-parks-fill", "visibility", showParks ? "visible" : "none");
      m.setLayoutProperty("nyc-parks-outline", "visibility", showParks ? "visible" : "none");
    }
    ['clusters', 'cluster-count', 'parks-symbol'].forEach(layer => {
      if (m.getLayer(layer)) {
        m.setLayoutProperty(layer, 'visibility', showParks ? 'visible' : 'none');
      }
    })
    if (m.getLayer("parks-heatmap")) {
      m.setLayoutProperty("parks-heatmap", "visibility", showHeatmap ? "visible" : "none");
    }
    // Add heatmap toggle logic here if you implement a heatmap layer
  }, [showParks, showHeatmap, showBoroughs]);

  useEffect(() => {
    if (!parksData) return;
    const gis = new Set<string>();
    const names = new Set<string>();
    const zips = new Set<string>();
    parksData.features.forEach(f => {
      if (f.properties?.gispropnum) gis.add(f.properties.gispropnum);
      if (f.properties?.["public open space name"]) names.add(f.properties["public open space name"]);
      if (f.properties?.["zipcode(s)"]) zips.add(f.properties["zipcode(s)"]);
    });
    setGispropnums(Array.from(gis));
    setParkNames(Array.from(names));
    setZipcodes(Array.from(zips));
    
  }, [parksData]);

  useEffect(() => {
    if (selectedDistanceParks.length === 2) {
      const from = selectedDistanceParks[0].geometry;
      const to = selectedDistanceParks[1].geometry;
      const dist = distance(from, to, { units: 'kilometers' });
      setMeasuredDistance(dist);
    } else {
      setMeasuredDistance(null);
    }
  }, [selectedDistanceParks]);

  let selectedFeature = null;
  if (parksData) {
    selectedFeature = parksData.features.find(f =>
      (selectedGispropnum && f.properties?.gispropnum === selectedGispropnum) ||
      (selectedParkName && f.properties?.["public open space name"] === selectedParkName) ||
      (selectedZipcode && f.properties?.["zipcode(s)"] === selectedZipcode)
    );
  }

  useEffect(() => {
    if (!map.current || !parksData) return;
    if (popupRef.current){
      popupRef.current.remove();
      popupRef.current = null;
    }
    if (selectedFeature) {
      // Ensure coordinates are [number, number] (LngLatLike)
      const coords = selectedFeature.geometry.coordinates;
      const props = selectedFeature.properties!;
      const lngLat: [number, number] = [coords[0], coords[1]];
      map.current.flyTo({ center: lngLat, zoom: 15 });
      // Optionally: highlight the marker or show a popup
      const popupHtml = `
            <div style="font-size:12px;max-width:300px;color:black">
              <b>${props["public open space name"] || 'Park'}</b><br/>
              <span>📍 <b>Location:</b> ${props.location || ''}</span><br/>
              <span>🗺️ <b>ZIP Code(s):</b> ${props["zipcode(s)"] || ''}</span><br/>
              <span>🌳 <b>Total Acres:</b> ${props["open space acres"] || ''}</span><br/>
              <span>🏀 <b>Active Acres:</b> ${props["active acres"] || ''}</span><br/>
              <span>🧘 <b>Passive Acres:</b> ${props["passive acres"] || ''}</span><br/>
              ${props.nycparks ? `<a href="${props.nycparks}" target="_blank">NYC Parks Info</a>` : ''}
            </div>
      `;
      popupRef.current = new mapboxgl.Popup()
        .setLngLat(lngLat)
        .setHTML(popupHtml)
        .addTo(map.current);
    }
  }, [selectedGispropnum, selectedParkName, selectedZipcode, parksData, selectedFeature]);

  function handleSelectChange(type: string, value: string) {
    if (!parksData) return;
    let feature = null;
    if (type === "gispropnum") {
      feature = parksData.features.find(f => f.properties?.gispropnum === value);
    } else if (type === "public open space name") {
      feature = parksData.features.find(f => f.properties?.["public open space name"] === value);
    } else if (type === "zipcode(s)") {
      feature = parksData.features.find(f => f.properties?.["zipcode(s)"] === value);
    }
    if (feature) {
      setSelectedGispropnum(feature.properties?.gispropnum || "");
      setSelectedParkName(feature.properties?.["public open space name"] || "");
      setSelectedZipcode(feature.properties?.["zipcode(s)"] || "");
    } else {
      // If "All" is selected, reset all
      setSelectedGispropnum("");
      setSelectedParkName("");
      setSelectedZipcode("");
    }
  }

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  function openGoogleMapsDirections() {
    if (!origin || !destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, "_blank");
  }

  const BarChart = React.lazy(() => import('./frontend/components/BarChart'));
  function BarChartPage() {
    const [data, setData] = useState<{ name: string; acres: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      fetch('/nyc-parks-2.geojson')
        .then(res => res.json())
        .then(json => {
          const features = json.features || [];
          const rows = features.map((f: any) => ({
            name: f.properties?.['public open space name'] || '',
            acres: parseFloat(f.properties?.['open space acres'] || '0'),
          })).filter((row: any) => row.name && !isNaN(row.acres));
          // Sort by acres descending
          rows.sort((a: any, b: any) => b.acres - a.acres);
          setData(rows);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load data');
          setLoading(false);
        });
    }, []);

    return (
      <div className="flex flex-col w-full bg-white items-center">
        <div className="w-full flex flex-col items-center mt-8">
          {loading ? (
            <div className="text-lg text-gray-600 my-8">Loading...</div>
          ) : error ? (
            <div className="text-lg text-red-600 my-8">{error}</div>
          ) : (
            <BarChart data={data} height={400} />
          )}
        </div>
      </div>
    );
  }

  // const ActiveVsPassive = React.lazy(() => import('./frontend/components/PercentChart'))

  const AvsP_data = parksData?.features.map((f: any) => ({
    name: f.properties?.['public open space name'] || '',
    active_percent: parseFloat(f.properties?.["active percent"] || '0'),
    passive_percent: parseFloat(f.properties?.["passive percent"] || '0')
  })) || [];

  const heatmapData = parksData?.features.map(f => ({
    name: f.properties?.['public open space name'] || '',
    active_acres: parseFloat(f.properties?.['active acres'] || '0'),
    passive_acres: parseFloat(f.properties?.['passive acres'] || '0'),
  })) || [];

  return (
    <div className="flex flex-col h-screen" >
      {/* Top Navbar */}
      <nav className="bg-amber-100 shadow px-4 md:px-8 py--1 w-full">
        <div className="flex items-center justify-between w-full">
          {/* Title */}
          <span className="text-xl font-bold text-blue-900 whitespace-nowrap mr-10">
            🌳 NYC Parks Active and Passive Recreation App
          </span>
          {/* Nav Links */}
          <div className="navbar flex ">
            <Link to="/" className="navbar-link">Interactive Map</Link>
            <Link to="/bar-chart" className="navbar-link">Public Open Space Name vs Total Open Space Acres</Link>
            <Link to="/active-passive" className="navbar-link">Active vs Passive Percent</Link>
            <Link to="/Heatmap" className="navbar-link">Heatmap of Active and Passive Acres</Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={
          <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <aside className="w-1/6 bg-white border-r p-4 overflow-y-auto flex flex-col min-w-0">
            <div className="mb-6 p-4 bg-gray-50 rounded shadow">
              <div className="font-semibold mb-3 text-base break-words">This interactive map provides detailed information on New York City's public open spaces, allowing you to explore various aspects of the city's parks and land use.</div>
              <h2 className="font-bold mb-3 mt-2 text-lg">Explore Park Details:</h2>
              <ul className="text-sm list-disc ml-5 mb-4 space-y-1">
                <li><b>GISPROPNUM:</b> Unique identification number for each public open space.</li>
                <li><b>Public Open Space Name:</b> Name of the public open space.</li>
                <li><b>Open Space Acres:</b> Size of the open space resource in acres.</li>
                <li><b>Active Percent:</b> Percentage dedicated to active recreational amenities, such as ball fields, playgrounds.</li>
                <li><b>Passive Percent:</b> Percentage dedicated to passive recreational amenities, such as benches and walking paths.</li>
                <li><b>Location:</b> Description of the location of a property with respect to the street system and physical features such as water bodies.</li>
                <li><b>ZIPCODE(S):</b> Zipcode in which the property is located.</li>
              </ul>
              <div className="text-xs mt-2">
                For general zoning questions: read the <a href="#" className="underline text-blue-700">Zoning Help Desk FAQ</a>.<br />
                If your question isn't answered there, call <b>212-720-3291</b> during business hours (9:30AM-5:30PM, Monday-Friday; closed on legal holidays).
              </div>
            </div>
          </aside>
          {/* Map */}
          <main className="flex-1 relative flex flex-col items-center bg-white min-w-0">
            <div className="w-full flex flex-col items-center py-6">
              <h2 className="text-2xl font-bold text-blue-900 mb-3">New York City Parks Active and Passive Recreation</h2>
              <div className="text-lg font-semibold mb-3">
                Total Parks and Recreations: <span className="font-bold text-blue-700">1318</span>
                <span className="mx-4">|</span>
                Total Open Space Acres: <span className="font-bold text-blue-700">22224.17</span>
              </div>
            </div>
            <div className="flex-1 w-full relative min-h-0">
              <div ref={mapContainer} key={location.pathname} className="absolute inset-0 w-full h-full rounded shadow" />
              {/* Map controls, overlays, etc */}
              <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded shadow p-3 text-xs z-20 min-w-[150px]">
                <div className="mb-2 font-semibold">Layers</div>
                <label className="flex items-center mb-2">
                  <input type="checkbox" checked={showParks} onChange={() => setShowParks(v => !v)} className="accent-green-600 mr-2" />
                  Parks
                </label>
                <label className="flex items-center mb-2">
                  <input type="checkbox" checked={showBoroughs} onChange={() => setShowBoroughs(v => !v)} className="accent-blue-600 mr-2" />
                  Borough Boundaries
                </label>
                <label className="flex items-center mb-2">
                  <input type="checkbox" checked={showHeatmap} onChange={() => setShowHeatmap(v => !v)} className="accent-yellow-600 mr-2" />
                  Heatmap
                </label>
                {/* Add more toggles as needed */}
              </div>
            </div>
          </main>
          {/* Right Sidebar (Filters) */}
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
              <Select
                options={[{label: "All", value: ""}, ...parkNames.map(n => ({ label: n, value: n }))]}
                value={parkNames.map(n => ({ label: n, value: n })).find(opt => opt.value === selectedParkName) || {label: "All", value: ""}}
                onChange={opt => handleSelectChange("public open space name", opt!.value)}
                className="w-full text-sm border-solid"
              />
              {/* <select
                className="w-full border rounded p-2 text-sm" 
                value={selectedParkName}
                onChange={e => handleSelectChange("public open space name", e.target.value)}
              >
                <option value="">All</option>
                {parkNames.map((n, i) => <option key={n || i} value={n}>{n}</option>)}
              </select> */}
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-2">ZIPCODE(S):</label>
              <select
                className="w-full border rounded p-2 text-sm"
                value={selectedZipcode}
                onChange={e => handleSelectChange("zipcode(s)", e.target.value)}
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
                  // setDistanceMode(false);
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
          </div>
        } />
        <Route path="/bar-chart" element={
            <Suspense fallback={<div className="text-lg text-gray-600 my-8">Loading chart...</div>}>
              <BarChartPage  key="active-passive"/>
            </Suspense>
        } />
        <Route path="/active-passive" element={
          <Suspense fallback={<div className="text-lg text-gray-600 my-8">Loading chart...</div>}>
            <PercentChart key="bar-chart" data={AvsP_data} />
          </Suspense>
        } />
        <Route path="/Heatmap" element={
          <Suspense fallback={<div className="text-lg text-gray-600 my-8">Loading chart...</div>}>
            <Heatmap data={heatmapData} />
          </Suspense>
        } />
      </Routes>
    </div>
  );
}

export default App;
