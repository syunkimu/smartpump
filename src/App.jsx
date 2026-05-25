import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import "./App.css";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const HERE_KEY = import.meta.env.VITE_HERE_API_KEY;

const mapContainerStyle = {
  width: "100%",
  height: "360px",
  borderRadius: "24px",
};

const defaultCenter = { lat: 40.4237, lng: -86.9212 };

function App() {
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_KEY,
    libraries: ["places", "geometry"],
  });

  const [mode, setMode] = useState("nearby");

  const [origin, setOrigin] = useState("Purdue University");
  const [destination, setDestination] = useState("Chicago");
  const [destinationResults, setDestinationResults] = useState([]);
  const [selectedDestinationPlace, setSelectedDestinationPlace] =
    useState(null);

  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [stations, setStations] = useState([]);
  const [directions, setDirections] = useState(null);
  const [bestDirections, setBestDirections] = useState(null);

  const [fuelDistanceLeft, setFuelDistanceLeft] = useState(120);
  const [gallonsNeeded, setGallonsNeeded] = useState(10);
  const [mpg] = useState(25);
  const [timeValue, setTimeValue] = useState(15);

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);

  useEffect(() => {
    const savedTrips =
      JSON.parse(localStorage.getItem("smartpump_recentTrips")) || [];
    const savedInputs =
      JSON.parse(localStorage.getItem("smartpump_inputs")) || null;

    setRecentTrips(savedTrips);

    if (savedInputs) {
      setOrigin(savedInputs.origin || "Purdue University");
      setDestination(savedInputs.destination || "Chicago");
      setFuelDistanceLeft(savedInputs.fuelDistanceLeft || 120);
      setGallonsNeeded(savedInputs.gallonsNeeded || 10);
      setTimeValue(savedInputs.timeValue || 15);
    }
  }, []);

  useEffect(() => {
    const inputs = {
      origin,
      destination,
      fuelDistanceLeft,
      gallonsNeeded,
      timeValue,
    };

    localStorage.setItem("smartpump_inputs", JSON.stringify(inputs));
  }, [origin, destination, fuelDistanceLeft, gallonsNeeded, timeValue]);

  const onMapLoad = (map) => {
    mapRef.current = map;
  };

  const getBestMarkerIcon = () => {
    if (!window.google) return undefined;

    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
          <svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="30" fill="#22c55e" opacity="0.22"/>
            <circle cx="36" cy="36" r="22" fill="#22c55e" opacity="0.38"/>
            <circle cx="36" cy="36" r="15" fill="#16a34a"/>
            <text x="36" y="41" text-anchor="middle" font-size="17" font-family="Arial" font-weight="900" fill="white">★</text>
          </svg>
        `),
      scaledSize: new window.google.maps.Size(64, 64),
      anchor: new window.google.maps.Point(32, 32),
    };
  };

  const getNormalMarkerIcon = () => {
    if (!window.google) return undefined;

    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="16" fill="#2563eb"/>
            <text x="24" y="30" text-anchor="middle" font-size="18" font-family="Arial" font-weight="900" fill="white">$</text>
          </svg>
        `),
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21),
    };
  };

  const fitMapToRoute = (routeResult) => {
    if (!mapRef.current || !window.google || !routeResult) return;

    const bounds = new window.google.maps.LatLngBounds();

    routeResult.routes[0].legs.forEach((leg) => {
      bounds.extend(leg.start_location);
      bounds.extend(leg.end_location);
    });

    mapRef.current.fitBounds(bounds);
  };

  const fitMapToBestRoute = (station, routeResult) => {
    if (!mapRef.current || !window.google || !station) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (routeResult) {
      routeResult.routes[0].legs.forEach((leg) => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });
    }

    bounds.extend({ lat: station.lat, lng: station.lng });
    mapRef.current.fitBounds(bounds);
  };

  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setUserLocation(current);
        setOrigin(`${current.lat},${current.lng}`);
      },
      () => alert("Location access denied.")
    );
  };

  const saveRecentTrip = () => {
    if (!origin || !destination) return;

    const newTrip = {
      id: Date.now(),
      origin,
      destination,
    };

    const updatedTrips = [
      newTrip,
      ...recentTrips.filter(
        (trip) => trip.origin !== origin || trip.destination !== destination
      ),
    ].slice(0, 5);

    setRecentTrips(updatedTrips);
    localStorage.setItem("smartpump_recentTrips", JSON.stringify(updatedTrips));
  };

  const loadRecentTrip = (trip) => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setDestinationResults([]);
    setSelectedDestinationPlace(null);
    setDirections(null);
    setBestDirections(null);
    setStations([]);
    setSelectedStation(null);
  };

  const searchDestinationPlaces = () => {
    if (!window.google || !mapRef.current) {
      alert("Google Maps is not ready yet.");
      return;
    }

    if (!destination.trim()) {
      alert("Please enter destination.");
      return;
    }

    const service = new window.google.maps.places.PlacesService(mapRef.current);

    service.textSearch(
      {
        query: destination,
        location: userLocation,
        radius: 50000,
      },
      (results, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          console.error("Place search failed:", status);
          alert("Place search failed.");
          return;
        }

        const places = results.slice(0, 5).map((place) => ({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }));

        setDestinationResults(places);
        setSelectedDestinationPlace(null);
      }
    );
  };

  const calculateRoute = () => {
    if (!window.google) return;

    const directionsService = new window.google.maps.DirectionsService();

    const routeDestination = selectedDestinationPlace
      ? { lat: selectedDestinationPlace.lat, lng: selectedDestinationPlace.lng }
      : destination;

    directionsService.route(
      {
        origin,
        destination: routeDestination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          saveRecentTrip();

          setDirections(result);
          setBestDirections(null);
          setStations([]);
          setSelectedStation(null);

          const leg = result.routes[0].legs[0];

          setUserLocation({
            lat: leg.start_location.lat(),
            lng: leg.start_location.lng(),
          });

          setTimeout(() => fitMapToRoute(result), 300);
        } else {
          console.error("Route calculation failed:", status);
          alert("Route calculation failed.");
        }
      }
    );
  };

  const getRouteSearchPoints = () => {
    if (!directions) return [userLocation];

    const path = directions.routes[0].overview_path;
    if (!path || path.length === 0) return [userLocation];

    const points = [];
    const step = Math.max(1, Math.floor(path.length / 6));

    for (let i = 0; i < path.length; i += step) {
      points.push({ lat: path[i].lat(), lng: path[i].lng() });
    }

    return points.slice(0, 7);
  };

  const fetchGooglePlacesGasStations = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.google || !mapRef.current) {
        resolve([]);
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        mapRef.current
      );

      service.nearbySearch(
        {
          location: { lat, lng },
          radius: 8000,
          type: "gas_station",
        },
        (results, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
            resolve([]);
            return;
          }

          resolve(
            results.map((place, index) => ({
              id: `places-${lat}-${lng}-${index}`,
              name: place.name || "Gas Station",
              address: place.vicinity || "Address unavailable",
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              price: null,
              source: "Google Places",
            }))
          );
        }
      );
    });
  };

  const extractRegularPrice = (station) => {
    const fuels = station.fuels || station.fuel || station.prices || [];

    if (!Array.isArray(fuels)) return null;

    const regular = fuels.find((fuel) => {
      const text = `${fuel.name || ""} ${fuel.type || ""} ${fuel.id || ""}`
        .toLowerCase()
        .trim();

      return (
        text.includes("regular") ||
        text.includes("unleaded") ||
        text.includes("87")
      );
    });

    const targetFuel = regular || fuels[0];

    if (!targetFuel) return null;

    const rawPrice =
      targetFuel.price?.value ??
      targetFuel.price ??
      targetFuel.amount ??
      targetFuel.value;

    const price = Number(rawPrice);

    return Number.isFinite(price) ? price : null;
  };

  const fetchGasPrices = async (lat, lng) => {
    try {
      const url = `https://fuel-v2.cc.api.here.com/fuel/stations.json?prox=${lat},${lng},5000&apiKey=${HERE_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data || !Array.isArray(data.items)) {
        console.warn(
          "HERE returned no usable fuel data. Falling back to Google Places."
        );
        return await fetchGooglePlacesGasStations(lat, lng);
      }

      const hereStations = data.items
        .map((station, index) => {
          const position = station.position || station.location || {};
          const price = extractRegularPrice(station);

          return {
            id: station.id || `here-${lat}-${lng}-${index}`,
            name: station.name || station.brand?.name || "Unknown Station",
            lat: Number(position.lat),
            lng: Number(position.lng),
            address:
              station.address?.label ||
              station.address?.formattedAddress ||
              station.vicinity ||
              "",
            price,
            source: "HERE",
          };
        })
        .filter(
          (station) =>
            station.lat &&
            station.lng &&
            station.price &&
            Number.isFinite(station.price)
        );

      if (hereStations.length > 0) return hereStations;

      return await fetchGooglePlacesGasStations(lat, lng);
    } catch (error) {
      console.error("HERE API ERROR:", error);
      return await fetchGooglePlacesGasStations(lat, lng);
    }
  };

  const fetchStationsAlongRoute = async () => {
    const searchPoints = getRouteSearchPoints();

    const results = await Promise.allSettled(
      searchPoints.map((point) => fetchGasPrices(point.lat, point.lng))
    );

    const allStations = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .flat();

    const uniqueMap = new Map();

    allStations.forEach((station) => {
      if (!station.lat || !station.lng) return;

      const key = `${station.name}-${station.lat.toFixed(
        4
      )}-${station.lng.toFixed(4)}`;

      if (!uniqueMap.has(key)) uniqueMap.set(key, station);
    });

    return Array.from(uniqueMap.values());
  };

  const getDistanceMiles = (pointA, pointB) => {
    if (!window.google?.maps?.geometry) return Infinity;

    const a = new window.google.maps.LatLng(pointA.lat, pointA.lng);
    const b = new window.google.maps.LatLng(pointB.lat, pointB.lng);

    return (
      window.google.maps.geometry.spherical.computeDistanceBetween(a, b) /
      1609.34
    );
  };

  const getStationDistanceFromRouteMiles = (station) => {
    if (!directions || !window.google?.maps?.geometry) return Infinity;

    const path = directions.routes[0].overview_path;
    const stationPoint = new window.google.maps.LatLng(station.lat, station.lng);

    let minDistanceMeters = Infinity;

    for (const routePoint of path) {
      const distanceMeters =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          stationPoint,
          routePoint
        );

      if (distanceMeters < minDistanceMeters) {
        minDistanceMeters = distanceMeters;
      }
    }

    return minDistanceMeters / 1609.34;
  };

  const getOriginalRouteInfo = () => {
    if (!directions) return null;

    const leg = directions.routes[0].legs[0];

    return {
      durationMin: leg.duration.value / 60,
      distanceMiles: leg.distance.value / 1609.34,
    };
  };

  const getRouteWithStation = (station) => {
    return new Promise((resolve) => {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin,
          destination: selectedDestinationPlace
            ? {
                lat: selectedDestinationPlace.lat,
                lng: selectedDestinationPlace.lng,
              }
            : destination,
          waypoints: [
            {
              location: { lat: station.lat, lng: station.lng },
              stopover: true,
            },
          ],
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        },
        (result, status) => {
          if (status !== "OK") {
            resolve(null);
            return;
          }

          const legs = result.routes[0].legs;

          const totalDurationMin =
            legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60;

          const totalDistanceMiles =
            legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1609.34;

          const milesToStation = legs[0].distance.value / 1609.34;

          resolve({
            result,
            totalDurationMin,
            totalDistanceMiles,
            milesToStation,
          });
        }
      );
    });
  };

  const getSmartLabel = (station, allStations) => {
    if (!station.canReachStation) return "Out of Range";
    if (!station.price) return "Closest Option";

    const highestSavings = Math.max(...allStations.map((s) => s.netSavings));
    const leastDetour = Math.min(...allStations.map((s) => s.extraMinutes));

    if (station.netSavings === highestSavings) return "Highest Savings";
    if (station.extraMinutes === leastDetour) return "Fastest Stop";
    if (station.distanceFromRoute <= 1) return "Easy Detour";
    return "Smart Pick";
  };

  const getAverageKnownPrice = (stationList) => {
    const prices = stationList
      .map((station) => station.price)
      .filter((price) => price && Number.isFinite(price));

    if (!prices.length) return null;

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  };

  const analyzeStationsWithRealDetour = async (rawStations) => {
    const original = getOriginalRouteInfo();

    if (!original) {
      alert("Calculate route first.");
      return [];
    }

    const routeFilteredStations = rawStations
      .map((station) => ({
        ...station,
        distanceFromRoute: getStationDistanceFromRouteMiles(station),
      }))
      .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
      .slice(0, 10);

    const routeResults = await Promise.allSettled(
      routeFilteredStations.map(async (station) => {
        const routeWithStation = await getRouteWithStation(station);
        if (!routeWithStation) return null;

        const extraMinutes = Math.max(
          0,
          routeWithStation.totalDurationMin - original.durationMin
        );

        const extraDistance = Math.max(
          0,
          routeWithStation.totalDistanceMiles - original.distanceMiles
        );

        const canReachStation =
          routeWithStation.milesToStation <= Number(fuelDistanceLeft);

        return {
          ...station,
          routeResult: routeWithStation.result,
          extraMinutes,
          extraDistance,
          canReachStation,
          milesToStation: routeWithStation.milesToStation,
        };
      })
    );

    const reachableStations = routeResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .filter(Boolean)
      .filter((station) => station.canReachStation);

    const averagePrice = getAverageKnownPrice(reachableStations);

    const analyzed = reachableStations
      .map((station) => {
        const priceSavings =
          station.price && averagePrice
            ? Math.max(0, averagePrice - station.price) * gallonsNeeded
            : 0;

        const extraFuelCost = station.price
          ? (station.extraDistance / mpg) * station.price
          : 0;

        const timeCost = (station.extraMinutes / 60) * timeValue;
        const netSavings = priceSavings - extraFuelCost - timeCost;

        return {
          ...station,
          averagePrice,
          priceSavings,
          extraFuelCost,
          timeCost,
          netSavings,
        };
      })
      .sort((a, b) => b.netSavings - a.netSavings);

    return analyzed.map((station) => ({
      ...station,
      smartLabel: getSmartLabel(station, analyzed),
    }));
  };

  const searchStations = async () => {
    if (!directions) {
      alert("Please calculate route first.");
      return;
    }

    if (!fuelDistanceLeft || Number(fuelDistanceLeft) <= 0) {
      alert("Please enter your remaining fuel distance.");
      return;
    }

    setLoading(true);
    setLoadingText("Scanning your route...");
    setSelectedStation(null);
    setBestDirections(null);

    try {
      setLoadingText("Finding gas stations along your trip...");
      const rawStations = await fetchStationsAlongRoute();

      if (!rawStations.length) {
        alert("No gas stations found along your route.");
        setLoading(false);
        setLoadingText("");
        return;
      }

      setLoadingText("Checking reachable stations...");
      const analyzedStations = await analyzeStationsWithRealDetour(rawStations);
      setStations(analyzedStations);

      if (analyzedStations[0]) {
        setBestDirections(analyzedStations[0].routeResult);

        setTimeout(() => {
          fitMapToBestRoute(
            analyzedStations[0],
            analyzedStations[0].routeResult
          );
        }, 300);
      } else {
        alert("No reachable gas stations found with your current fuel range.");
      }
    } catch (err) {
      console.error("Analyze failed:", err);
      alert("Failed to analyze gas stations.");
    }

    setLoading(false);
    setLoadingText("");
  };

  const searchNearbyStations = async () => {
    setLoading(true);
    setLoadingText("Finding nearby gas stations...");
    setSelectedStation(null);
    setBestDirections(null);
    setDirections(null);

    try {
      const rawStations = await fetchGasPrices(userLocation.lat, userLocation.lng);

      if (!rawStations.length) {
        alert("No nearby gas stations found.");
        setLoading(false);
        setLoadingText("");
        return;
      }

      const averagePrice = getAverageKnownPrice(rawStations);

      const analyzedStations = rawStations
        .map((station) => {
          const distanceMiles = getDistanceMiles(userLocation, {
            lat: station.lat,
            lng: station.lng,
          });

          const estimatedDriveMinutes = (distanceMiles / 30) * 60;
          const canReachStation = distanceMiles <= Number(fuelDistanceLeft);

          const priceSavings =
            station.price && averagePrice
              ? Math.max(0, averagePrice - station.price) * gallonsNeeded
              : 0;

          const extraFuelCost = station.price
            ? (distanceMiles / mpg) * station.price
            : 0;

          const timeCost = (estimatedDriveMinutes / 60) * timeValue;
          const netSavings = priceSavings - extraFuelCost - timeCost;

          return {
            ...station,
            averagePrice,
            distanceFromRoute: distanceMiles,
            extraMinutes: estimatedDriveMinutes,
            extraDistance: distanceMiles,
            priceSavings,
            extraFuelCost,
            timeCost,
            netSavings,
            canReachStation,
            milesToStation: distanceMiles,
          };
        })
        .filter((station) => station.canReachStation)
        .sort((a, b) => {
          if (b.netSavings !== a.netSavings) {
            return b.netSavings - a.netSavings;
          }

          return a.distanceFromRoute - b.distanceFromRoute;
        })
        .slice(0, 10)
        .map((station, index) => ({
          ...station,
        }));

      setStations(analyzedStations);

      if (!analyzedStations.length) {
        alert("No reachable nearby stations found with your current fuel range.");
      }
    } catch (err) {
      console.error("Nearby search failed:", err);
      alert("Failed to analyze nearby gas stations.");
    }

    setLoading(false);
    setLoadingText("");
  };

  const rankedStations = useMemo(() => {
    return [...stations].sort((a, b) => b.netSavings - a.netSavings);
  }, [stations]);

  const bestStation = rankedStations[0];

  const openGoogleMaps = (station) => {
    let url = "";

    if (mode === "nearby") {
      url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origin
      )}&destination=${station.lat},${station.lng}&travelmode=driving`;
    } else {
      const finalDestination = selectedDestinationPlace
        ? `${selectedDestinationPlace.lat},${selectedDestinationPlace.lng}`
        : destination;

      url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(
        finalDestination
      )}&waypoints=${station.lat},${station.lng}&travelmode=driving`;
    }

    window.open(url, "_blank");
  };

  if (!isLoaded) {
    return <div className="app">Loading SmartPump...</div>;
  }

  return (
    <div className="app">
      <div className="phone">
        <header className="hero brand-only">
          <p className="brand-title">SMARTPUMP</p>
        </header>

        <section className="card">
          <div className="mode-toggle">
            <button
              className={mode === "nearby" ? "active" : ""}
              onClick={() => {
                setMode("nearby");
                setStations([]);
                setDirections(null);
                setBestDirections(null);
              }}
            >
              Nearby
            </button>

            <button
              className={mode === "route" ? "active" : ""}
              onClick={() => {
                setMode("route");
                setStations([]);
              }}
            >
              Route
            </button>
          </div>

          <h2>{mode === "route" ? "Route Mode" : "Nearby Mode"}</h2>

          <div className="origin-row">
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
            />

            <button className="location-btn" onClick={getMyLocation}>
              📍
            </button>
          </div>

          {mode === "route" && (
            <>
              <div className="destination-row">
                <input
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestinationResults([]);
                    setSelectedDestinationPlace(null);
                  }}
                  placeholder="Destination, ex: Sam's Club"
                />

                <button onClick={searchDestinationPlaces}>Search</button>
              </div>

              {destinationResults.length > 0 && (
                <div className="place-list">
                  {destinationResults.map((place) => (
                    <button
                      key={place.id}
                      className={
                        selectedDestinationPlace?.id === place.id
                          ? "place-card selected"
                          : "place-card"
                      }
                      onClick={() => {
                        setSelectedDestinationPlace(place);
                        setDestination(`${place.name}, ${place.address}`);
                      }}
                    >
                      <strong>{place.name}</strong>
                      <span>{place.address}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            className="primary"
            onClick={mode === "route" ? calculateRoute : searchNearbyStations}
          >
            {mode === "route" ? "Calculate Route" : "Find Best Nearby"}
          </button>

          {mode === "route" && recentTrips.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ fontWeight: 800, marginBottom: "8px" }}>
                Recent Trips
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {recentTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => loadRecentTrip(trip)}
                    style={{
                      textAlign: "left",
                      borderRadius: "14px",
                      padding: "10px 12px",
                    }}
                  >
                    {trip.origin} → {trip.destination}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="map-card">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={userLocation}
            zoom={12}
            onLoad={onMapLoad}
          >
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: "#3B82F6",
                    strokeOpacity: 0.55,
                    strokeWeight: 6,
                  },
                }}
              />
            )}

            {bestDirections && (
              <DirectionsRenderer
                directions={bestDirections}
                options={{
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: "#22C55E",
                    strokeOpacity: 0.95,
                    strokeWeight: 7,
                  },
                }}
              />
            )}

            {rankedStations.map((s, index) => (
              <Marker
                key={s.id || `${s.name}-${index}`}
                position={{ lat: s.lat, lng: s.lng }}
                icon={index === 0 ? getBestMarkerIcon() : getNormalMarkerIcon()}
                title={`${s.smartLabel}: ${s.name}`}
                onClick={() => {
                  setSelectedStation(s);
                  fitMapToBestRoute(s, s.routeResult);
                }}
              />
            ))}
          </GoogleMap>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "12px",
              fontSize: "13px",
              color: "#cbd5e1",
            }}
          >
            {mode === "route" ? (
              <>
                <span>Blue = original route</span>
                <span>Green = optimized fuel route</span>
              </>
            ) : (
              <span>Nearby results from your current location</span>
            )}
          </div>
        </section>

        {mode === "route" && (
          <section className="card">
            <h2>Savings Inputs</h2>

            <label>Fuel distance left</label>
            <input
              type="number"
              value={fuelDistanceLeft}
              onChange={(e) => setFuelDistanceLeft(Number(e.target.value))}
              placeholder="Ex: 120 miles"
            />

            <label>Gallons needed</label>
            <input
              type="number"
              value={gallonsNeeded}
              onChange={(e) => setGallonsNeeded(Number(e.target.value))}
            />

            <label>Time value per hour</label>
            <input
              type="number"
              value={timeValue}
              onChange={(e) => setTimeValue(Number(e.target.value))}
            />

            <button className="primary" onClick={searchStations}>
              {loading ? loadingText : "Find Best Along Route"}
            </button>
          </section>
        )}

        {bestStation && (
          <section className="best-card">
            <h2>{bestStation.name}</h2>
            <p>{bestStation.address}</p>

            <div className="hero-savings">
              <strong>${bestStation.netSavings.toFixed(2)}</strong>
              <span>Estimated Savings vs route average</span>
            </div>

            <div className="mini-stats">
              <p>
                {bestStation.price
                  ? `$${bestStation.price.toFixed(2)} / gal`
                  : "Price unavailable"}
              </p>
              <p>{bestStation.extraMinutes.toFixed(1)} min away</p>
              <p>{bestStation.milesToStation.toFixed(1)} mi to station</p>
            </div>

            <button onClick={() => openGoogleMaps(bestStation)}>
              {mode === "route"
                ? "Open route with gas stop in Google Maps"
                : "Open in Google Maps"}
            </button>
          </section>
        )}

        {selectedStation && selectedStation.id !== bestStation?.id && (
          <section className="card">
            <h2>{selectedStation.name}</h2>
            <p>Net savings: ${selectedStation.netSavings.toFixed(2)}</p>
            <p>
              Miles to station: {selectedStation.milesToStation.toFixed(1)} mi
            </p>
            <button onClick={() => openGoogleMaps(selectedStation)}>
              Open in Google Maps
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;