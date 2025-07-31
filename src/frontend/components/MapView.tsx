/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point, GeoJsonProperties } from "geojson";
import { useLocation } from 'react-router-dom';
interface MapViewProps {
  parksData: FeatureCollection<Point, GeoJsonProperties> | null;
  ntaData: FeatureCollection | null;
  showParks: boolean;
  setShowParks: (v: boolean) => void;
  showBoroughs: boolean;
  setShowBoroughs: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  selectedGispropnum: string;
  selectedParkName: string;
  selectedZipcode: string;
  setSelectedDistanceParks: React.Dispatch<React.SetStateAction<any[]>>;
}

const MapView: React.FC<MapViewProps> = ({
  parksData,
  ntaData,
  showParks,
  setShowParks,
  showBoroughs,
  setShowBoroughs,
  showHeatmap,
  setShowHeatmap,
  selectedGispropnum,
  selectedParkName,
  selectedZipcode,
  setSelectedDistanceParks,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const location = useLocation();

  // Map initialization and layers
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
            "line-color": "blue",
            "line-width": 1.5,
          },
        });
      }
      if (parksData) {
        map.current.addSource("nyc-parks", {
          type: "geojson",
          data: parksData || { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
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
          map.current!.addLayer({
            id: "clusters",
            type: "circle",
            source: "nyc-parks",
            filter: ["has", "point_count"],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'],
                '#51bbd6',
                50, '#f1f075',
                100, '#f28cb1'
              ],
              'circle-radius': [
                'step', ['get', 'point_count'],
                20,
                50, 30,
                100, 40
              ]
            }
          });
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
          map.current!.addLayer({
            id: "parks-symbol",
            type: "symbol",
            source: "nyc-parks",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": "tree-icon",
              "icon-size": 0.15,
              "icon-allow-overlap": true,
            },
          });
        });
        map.current!.on('click', 'clusters', (e) => {
          const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] }) as mapboxgl.MapboxGeoJSONFeature[];
          if (!features.length) return;
          const clusterId = features[0].properties!.cluster_id as number;
          const source = map.current!.getSource('nyc-parks') as mapboxgl.GeoJSONSource & { getClusterExpansionZoom(id: number, cb: (err: Error | null, zoom: number) => void): void };

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) { console.error(err); return; }
            if (zoom == null) return;
            const coords = (features[0].geometry as Point).coordinates;
            map.current!.easeTo({ center: coords as [number, number], zoom });
          });
        });
        map.current!.on('mouseenter', 'clusters', () => map.current!.getCanvas().style.cursor = 'pointer');
        map.current!.on('mouseleave', 'clusters', () => map.current!.getCanvas().style.cursor = '');
        map.current!.on('click', 'parks-symbol', (e) => {
          if (!e.features || !e.features.length) return;
          const park = e.features[0];
          setSelectedDistanceParks(prev => {
            if (prev.length === 2) return [park];
            return [...prev, park];
          });
          const props = park.properties!;
          const popupHtml = `
            <div style="font-size:12px;max-width:300px;color:black">
              <b>${props.signname || 'Park'}</b><br/>
              <span>📍 <b>Location:</b> ${props.location || ''}</span><br/>
              <span>🗺️ <b>ZIP Code(s):</b> ${props.zipcode || ''}</span><br/>
              <span>🌳 <b>Total Acres:</b> ${props.acres || ''}</span><br/>
              <span>🏀 <b>Active Acres:</b> ${props.active_acres || ''}</span><br/>
              <span>🧘 <b>Passive Acres:</b> ${props.passive_acres || ''}</span><br/>
              ${props.nycparks ? `<a href="${props.nycparks}" target="_blank">NYC Parks Info</a>` : ''}
            </div>
          `;
          new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(popupHtml).addTo(map.current!);
        });
      }
    });
  }, [parksData, ntaData, setSelectedDistanceParks, location.pathname]);

  // Layer visibility toggles
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
  }, [showParks, showHeatmap, showBoroughs]);

  // Center/fly to selected feature
  useEffect(() => {
    let selectedFeature = null;
    if (parksData) {
      selectedFeature = parksData.features.find(f =>
        (selectedGispropnum && f.properties?.gispropnum === selectedGispropnum) ||
        (selectedParkName && f.properties?.signname === selectedParkName) ||
        (selectedZipcode && f.properties?.zipcode === selectedZipcode)
      );
    }
    if (!map.current || !parksData || !selectedFeature) return;
    if (popupRef.current){
      popupRef.current.remove();
      popupRef.current = null;
    }
    const coords = selectedFeature.geometry.coordinates;
    const props = selectedFeature.properties!;
    const lngLat: [number, number] = [coords[0], coords[1]];
    map.current.flyTo({ center: lngLat, zoom: 15 });
    const popupHtml = `
          <div style="font-size:12px;max-width:300px;color:black">
            <b>${props.signname || 'Park'}</b><br/>
            <span>📍 <b>Location:</b> ${props.location || ''}</span><br/>
            <span>🗺️ <b>ZIP Code(s):</b> ${props.zipcode || ''}</span><br/>
            <span>🌳 <b>Total Acres:</b> ${props.acres || ''}</span><br/>
            <span>🏀 <b>Active Acres:</b> ${props.active_acres || ''}</span><br/>
            <span>🧘 <b>Passive Acres:</b> ${props.passive_acres || ''}</span><br/>
            ${props.nycparks ? `<a href="${props.nycparks}" target="_blank">NYC Parks Info</a>` : ''}
          </div>
    `;
    popupRef.current = new mapboxgl.Popup()
      .setLngLat(lngLat)
      .setHTML(popupHtml)
      .addTo(map.current);
  }, [selectedGispropnum, selectedParkName, selectedZipcode, parksData]);

  return (
    <main className="flex-1 relative flex flex-col items-center bg-white min-w-0">
      <div className="flex-1 w-full relative min-h-0">
        <div ref={mapContainer} key={location.pathname} className="absolute inset-0 w-full h-full rounded shadow" />
        {/* Map controls, overlays, etc */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded shadow p-3 text-xs z-20 min-w-[150px]">
          <div className="mb-2 font-semibold">Layers</div>
          <label className="flex items-center mb-2">
            <input type="checkbox" checked={showParks} onChange={() => setShowParks(!showParks)} className="accent-green-600 mr-2" />
            Parks
          </label>
          <label className="flex items-center mb-2">
            <input type="checkbox" checked={showBoroughs} onChange={() => setShowBoroughs(!showBoroughs)} className="accent-blue-600 mr-2" />
            Borough Boundaries
          </label>
          <label className="flex items-center mb-2">
            <input type="checkbox" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} className="accent-yellow-600 mr-2" />
            Heatmap
          </label>
        </div>
      </div>
    </main>
  );
};

export default MapView;
