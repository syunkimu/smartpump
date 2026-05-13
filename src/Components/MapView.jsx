import {
    GoogleMap,
    Marker,
    DirectionsRenderer,
  } from "@react-google-maps/api";
  
  export default function MapView({
    center,
    location,
    stations,
    selectedStation,
    setSelectedStation,
    directions,
    mapRef,
  }) {
    return (
      <div style={mapWrapperStyle}>
        <GoogleMap
          center={center}
          zoom={13}
          mapContainerStyle={mapContainerStyle}
          options={{
            disableDefaultUI: true,
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: darkMapStyle,
          }}
          onLoad={(map) => {
            mapRef.current = map;
          }}
        >
          {location && <Marker position={location} label="You" />}
  
          {stations.map((station) => {
            const isSelected =
              selectedStation?.place_id === station.place_id;
  
            return (
              <Marker
                key={station.place_id}
                position={{
                  lat: station.geometry.location.lat(),
                  lng: station.geometry.location.lng(),
                }}
                onClick={() => setSelectedStation(station)}
                icon={
                  isSelected
                    ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
                }
              />
            );
          })}
  
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
  
        <div style={overlayCardStyle}>
          <div>
            <div style={overlayLabelStyle}>Nearest cheaper station</div>
            <div style={overlayMainStyle}>
              {selectedStation ? selectedStation.name : "Select a station"}
            </div>
          </div>
  
          <div style={{ textAlign: "right" }}>
            <div style={overlayLabelStyle}>Extra drive</div>
            <div style={overlayMainStyle}>
              {selectedStation ? "Route ready" : "--"}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const mapWrapperStyle = {
    position: "relative",
    overflow: "hidden",
    background: "#0b0b10",
  };
  
  const mapContainerStyle = {
    width: "100%",
    height: "255px",
    minHeight: "255px",
  };
  
  const overlayCardStyle = {
    position: "absolute",
    left: "18px",
    right: "18px",
    bottom: "18px",
    background: "rgba(5,5,6,0.88)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "18px",
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
  };
  
  const overlayLabelStyle = {
    color: "#8b8b96",
    fontSize: "12px",
    fontWeight: "800",
  };
  
  const overlayMainStyle = {
    color: "white",
    fontSize: "16px",
    fontWeight: "900",
    marginTop: "4px",
  };
  
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#111827" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#1f2937" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#0f172a" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#111827" }],
    },
  ];