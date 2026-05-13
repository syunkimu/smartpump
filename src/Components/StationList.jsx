import { useMemo, useState } from "react";

export default function StationList({
  stations,
  selectedStation,
  setSelectedStation,
  stationPrices,
  setStationPrices,
  bestStation,
}) {
  const [loadingStation, setLoadingStation] = useState(null);
  const [fetchingAll, setFetchingAll] = useState(false);

  function updatePrice(placeId, value) {
    setStationPrices((prev) => ({
      ...prev,
      [placeId]: value === "" ? "" : Number(value),
    }));
  }

  function openInGoogleMaps(station) {
    const lat = station.geometry.location.lat();
    const lng = station.geometry.location.lng();

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank"
    );
  }

  async function fetchLatestPrice(station) {
    try {
      setLoadingStation(station.place_id);

      const lat = station.geometry.location.lat();
      const lng = station.geometry.location.lng();

      const response = await fetch(
        "https://cheapfuel-price-api.p.rapidapi.com/get_station_price_papi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
            "X-RapidAPI-Host": "cheapfuel-price-api.p.rapidapi.com",
          },
          body: JSON.stringify({
            lat: String(lat),
            lng: String(lng),
          }),
        }
      );

      const data = await response.json();

      const importedPrice =
        data?.result?.data?.rg ||
        data?.result?.data?.mg ||
        data?.result?.data?.pm ||
        data?.result?.data?.ds ||
        data?.result?.data?.e10;

      if (importedPrice) {
        updatePrice(station.place_id, importedPrice);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStation(null);
    }
  }

  async function fetchAllPrices() {
    setFetchingAll(true);

    for (const station of stations.slice(0, 6)) {
      await fetchLatestPrice(station);
    }

    setFetchingAll(false);
  }

  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => {
      const aBest = bestStation?.place_id === a.place_id ? 1 : 0;
      const bBest = bestStation?.place_id === b.place_id ? 1 : 0;

      const aHasPrice = stationPrices[a.place_id] ? 1 : 0;
      const bHasPrice = stationPrices[b.place_id] ? 1 : 0;

      return bBest - aBest || bHasPrice - aHasPrice;
    });
  }, [stations, bestStation, stationPrices]);

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Nearby Stations</h2>
        <p style={subtitleStyle}>
          Tap a station to view route and open it in Google Maps.
        </p>
      </div>

      {stations.length > 0 && (
        <button
          onClick={fetchAllPrices}
          disabled={fetchingAll}
          style={{
            ...fetchAllStyle,
            opacity: fetchingAll ? 0.7 : 1,
          }}
        >
          {fetchingAll ? "Fetching Prices..." : "Fetch All Prices"}
        </button>
      )}

      {sortedStations.length === 0 && (
        <p style={emptyStyle}>Use your location to find nearby gas stations.</p>
      )}

      <div style={listStyle}>
        {sortedStations.map((station) => {
          const isSelected = selectedStation?.place_id === station.place_id;
          const isBest = bestStation?.place_id === station.place_id;
          const price = stationPrices[station.place_id];

          return (
            <div
              key={station.place_id}
              onClick={() => setSelectedStation(station)}
              style={{
                ...cardStyle,
                border: isBest
                  ? "1px solid #22c55e"
                  : isSelected
                  ? "1px solid rgba(96,165,250,0.8)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: isBest
                  ? "rgba(34,197,94,0.10)"
                  : isSelected
                  ? "rgba(96,165,250,0.08)"
                  : "#101018",
              }}
            >
              <div
                style={{
                  ...iconStyle,
                  background: isBest
                    ? "rgba(34,197,94,0.16)"
                    : "rgba(255,255,255,0.05)",
                  color: isBest ? "#22c55e" : "#f8fafc",
                  border: isBest
                    ? "1px solid rgba(34,197,94,0.3)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {station.name?.charAt(0) || "G"}
              </div>

              <div style={mainInfoStyle}>
                <div style={nameRowStyle}>
                  <h3 style={nameStyle}>{station.name}</h3>
                  {isBest && <span style={bestBadgeStyle}>BEST</span>}
                </div>

                <p style={addressStyle}>{station.vicinity}</p>

                <div style={metaRowStyle}>
                  {station.rating && <span>⭐ {station.rating}</span>}

                  {price ? (
                    <span style={pricePillStyle}>
                      ${Number(price).toFixed(2)}/gal
                    </span>
                  ) : (
                    <span style={missingPillStyle}>Price needed</span>
                  )}
                </div>

                <div style={priceEditRowStyle}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={price || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updatePrice(station.place_id, e.target.value)
                    }
                    style={priceInputStyle}
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchLatestPrice(station);
                    }}
                    disabled={loadingStation === station.place_id}
                    style={{
                      ...miniButtonStyle,
                      opacity: loadingStation === station.place_id ? 0.7 : 1,
                    }}
                  >
                    {loadingStation === station.place_id ? "..." : "Fetch"}
                  </button>
                </div>

                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openInGoogleMaps(station);
                    }}
                    style={mapsButtonStyle}
                  >
                    Open in Google Maps →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const sectionStyle = {
  padding: "22px 20px 0",
};

const headerStyle = {
  marginBottom: "16px",
};

const titleStyle = {
  margin: 0,
  fontSize: "22px",
  color: "white",
  fontWeight: "900",
  letterSpacing: "-0.04em",
};

const subtitleStyle = {
  margin: "6px 0 0",
  color: "#8b8b96",
  fontSize: "13px",
  lineHeight: "1.4",
};

const fetchAllStyle = {
  width: "100%",
  border: "none",
  background: "#60a5fa",
  color: "#02111f",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "900",
  marginBottom: "16px",
  cursor: "pointer",
};

const emptyStyle = {
  color: "#8b8b96",
  fontSize: "14px",
  lineHeight: "1.5",
};

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const cardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  borderRadius: "20px",
  padding: "16px",
  cursor: "pointer",
  transition: "0.2s ease",
};

const iconStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "20px",
  flexShrink: 0,
};

const mainInfoStyle = {
  flex: 1,
  minWidth: 0,
};

const nameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const nameStyle = {
  margin: 0,
  color: "white",
  fontSize: "17px",
  fontWeight: "900",
};

const bestBadgeStyle = {
  background: "#22c55e",
  color: "#02130a",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "10px",
  fontWeight: "900",
};

const addressStyle = {
  margin: "5px 0 0",
  color: "#8b8b96",
  fontSize: "13px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const metaRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "9px",
  color: "#fbbf24",
  fontSize: "13px",
};

const pricePillStyle = {
  background: "rgba(34,197,94,0.14)",
  color: "#86efac",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "900",
};

const missingPillStyle = {
  background: "rgba(248,113,113,0.12)",
  color: "#fca5a5",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "800",
};

const priceEditRowStyle = {
  display: "flex",
  gap: "8px",
  marginTop: "10px",
};

const priceInputStyle = {
  width: "82px",
  background: "#0b0b10",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "9px",
  color: "white",
  fontSize: "14px",
};

const miniButtonStyle = {
  background: "#22c55e",
  color: "#02130a",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: "900",
  cursor: "pointer",
};

const mapsButtonStyle = {
  width: "100%",
  marginTop: "12px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid rgba(34,197,94,0.25)",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#02130a",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
};