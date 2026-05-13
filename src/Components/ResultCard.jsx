export default function ResultCard({
    selectedStation,
    nearestPrice,
    mpg,
    gallons,
    timeValue,
  }) {
    if (!selectedStation?.price) return null;
  
    const extraDistance = selectedStation.distance || 2;
    const extraMinutes = selectedStation.duration || extraDistance * 2.2;
  
    const gasSavings = (nearestPrice - selectedStation.price) * gallons;
    const driveCost = (extraDistance / mpg) * selectedStation.price;
    const timeCost = (extraMinutes / 60) * timeValue;
    const netSavings = gasSavings - driveCost - timeCost;
  
    const worthIt = netSavings > 0;
  
    return (
      <section style={cardStyle}>
        <div style={topRowStyle}>
          <div>
            <div style={labelStyle}>REAL SAVINGS</div>
  
            <div
              style={{
                ...amountStyle,
                color: worthIt ? "#22c55e" : "#f87171",
              }}
            >
              {netSavings >= 0 ? "$" : "-$"}
              {Math.abs(netSavings).toFixed(2)}
            </div>
  
            <p style={subTextStyle}>
              net savings after fuel + time cost
            </p>
          </div>
  
          <div
            style={{
              ...badgeStyle,
              background: worthIt
                ? "rgba(34,197,94,0.14)"
                : "rgba(248,113,113,0.14)",
              color: worthIt ? "#22c55e" : "#f87171",
              border: worthIt
                ? "1px solid rgba(34,197,94,0.35)"
                : "1px solid rgba(248,113,113,0.35)",
            }}
          >
            {worthIt ? "WORTH IT" : "SKIP IT"}
          </div>
        </div>
  
        <div style={recommendBoxStyle}>
          {worthIt
            ? "This station is financially worth the extra drive."
            : "The extra driving and time cost likely cancel out the cheaper gas."}
        </div>
  
        <div style={statsGridStyle}>
          <MiniCard
            title="Gas saved"
            value={`$${gasSavings.toFixed(2)}`}
            positive
          />
  
          <MiniCard
            title="Time cost"
            value={`$${timeCost.toFixed(2)}`}
          />
  
          <MiniCard
            title="Fuel cost"
            value={`$${driveCost.toFixed(2)}`}
          />
        </div>
  
        <div style={footerStyle}>
          <span>{extraDistance.toFixed(1)} mi extra</span>
          <span>{Math.round(extraMinutes)} min drive</span>
        </div>
      </section>
    );
  }
  
  function MiniCard({ title, value, positive }) {
    return (
      <div style={miniCardStyle}>
        <div
          style={{
            ...miniTitleStyle,
            color: positive ? "#86efac" : "#9ca3af",
          }}
        >
          {title}
        </div>
  
        <div style={miniValueStyle}>{value}</div>
      </div>
    );
  }
  
  const cardStyle = {
    margin: "18px 20px 0",
    background:
      "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(7,20,13,0.92))",
    border: "1px solid rgba(34,197,94,0.28)",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 20px 55px rgba(34,197,94,0.12)",
  };
  
  const topRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
  };
  
  const labelStyle = {
    color: "#86efac",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.12em",
    marginBottom: "8px",
  };
  
  const amountStyle = {
    fontSize: "48px",
    fontWeight: "950",
    letterSpacing: "-0.07em",
    lineHeight: "1",
  };
  
  const subTextStyle = {
    margin: "8px 0 0",
    color: "#86efac",
    opacity: 0.75,
    fontSize: "14px",
    fontWeight: "700",
  };
  
  const badgeStyle = {
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "950",
    letterSpacing: "0.08em",
    flexShrink: 0,
  };
  
  const recommendBoxStyle = {
    marginTop: "18px",
    padding: "14px",
    borderRadius: "16px",
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#d1fae5",
    fontSize: "14px",
    lineHeight: "1.5",
  };
  
  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "16px",
  };
  
  const miniCardStyle = {
    background: "rgba(0,0,0,0.38)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "14px 12px",
  };
  
  const miniTitleStyle = {
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "8px",
  };
  
  const miniValueStyle = {
    color: "white",
    fontSize: "18px",
    fontWeight: "900",
    letterSpacing: "-0.03em",
  };
  
  const footerStyle = {
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    color: "#86efac",
    fontSize: "13px",
    fontWeight: "800",
  };