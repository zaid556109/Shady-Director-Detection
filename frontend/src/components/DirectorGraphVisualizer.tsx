import { useState } from "react";
import type { OfficerSummary } from "../contracts/applicant";
import type { OfficerFeatures } from "../contracts/director-features";
import { mockApplicantProfile, mockDirectorFeatureSet } from "../mocks";

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  type: "target_company" | "officer" | "dissolved_company" | "active_company" | "address_cluster";
  x: number;
  y: number;
  labelYOffset?: number;
  details: string;
  riskLevel: "clean" | "warn" | "critical";
  credibilityScore: number;
  officerData?: OfficerSummary;
  featureData?: Partial<OfficerFeatures>;
}

interface Edge {
  source: string;
  target: string;
  dashed?: boolean;
  label?: string;
}

export default function DirectorGraphVisualizer({ companyNumber }: { companyNumber: string }) {
  const featureSet = mockDirectorFeatureSet(companyNumber);
  const profile = mockApplicantProfile(companyNumber);

  const officers = profile?.officers || [];
  const officerFeatures = featureSet?.officers || [];

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Target Company Node (Bottom Center)
  const targetId = profile?.company_number || companyNumber;
  const targetName = profile?.company_name || `Company ${companyNumber}`;
  nodes.push({
    id: targetId,
    label: targetName,
    sublabel: `Target Applicant (#${targetId})`,
    type: "target_company",
    x: 300,
    y: 290,
    labelYOffset: 38,
    details: `Status: ${profile?.status || "Active"} | Registered Address: ${profile?.registered_address?.address_line_1 || profile?.registered_address?.premises || ""}, ${profile?.registered_address?.postal_code || "UK"} | Inc. Date: ${profile?.incorporation_date || "2015-06-01"}`,
    riskLevel: "clean",
    credibilityScore: 92,
  });

  // 2. Director Nodes (Middle Row)
  const numOfficers = officers.length;
  officers.forEach((off: OfficerSummary, idx: number) => {
    const offId = off.officer_id || `off-${idx}`;
    const feat: Partial<OfficerFeatures> =
      officerFeatures.find((f: OfficerFeatures) => f.officer_id === offId) || {};

    let offX = 300;
    if (numOfficers === 2) {
      offX = idx === 0 ? 170 : 430;
    } else if (numOfficers > 2) {
      const step = 380 / (numOfficers - 1);
      offX = 110 + step * idx;
    }
    const offY = 170;

    const dissolvedCount = feat.dissolved_company_count || 0;
    const isDisqualified = feat.disqualification_flag || false;
    const riskLevel: "clean" | "warn" | "critical" = isDisqualified
      ? "critical"
      : dissolvedCount > 0
      ? "warn"
      : "clean";

    const credibilityScore = isDisqualified
      ? 10
      : dissolvedCount > 2
      ? 35
      : dissolvedCount > 0
      ? 55
      : 95;

    const rawName = off.name || "Director";
    const nameParts = rawName.split(",");
    const lastName = nameParts[0]?.trim() || rawName;
    const firstName = nameParts[1]?.trim() || "";
    const formattedName = firstName ? `${lastName}, ${firstName.split(" ")[0]}` : lastName;

    nodes.push({
      id: offId,
      label: formattedName,
      sublabel: `${off.role || "Director"} • ${feat.avg_tenure_days ? (feat.avg_tenure_days / 365).toFixed(1) + " yrs" : "Clean"}`,
      type: "officer",
      x: offX,
      y: offY,
      labelYOffset: -30,
      riskLevel,
      credibilityScore,
      officerData: off,
      featureData: feat,
      details: `Full Name: ${off.name} | Role: ${off.role} | Appointed: ${off.appointed_on || "2015-06-01"} | Active Directorships: ${feat.appointments_count || 1} | Dissolved Co.s: ${dissolvedCount} | Disqualified: ${isDisqualified ? "YES" : "No"} | Tenure: ${feat.avg_tenure_days ? Math.round(feat.avg_tenure_days) + " days" : "3,632 days"}`,
    });

    edges.push({
      source: offId,
      target: targetId,
      label: `Appointed ${off.appointed_on ? off.appointed_on.split("-")[0] : "2015"}`,
    });

    // 3. Dissolved Companies (Top Row)
    for (let d = 0; d < dissolvedCount; d++) {
      const disId = `dis-${offId}-${d + 1}`;
      const disX = numOfficers === 1 ? (d === 0 ? 160 : 440) : offX + (d === 0 ? -60 : 60);
      const disY = 55;

      nodes.push({
        id: disId,
        label: `Dissolved Entity #${d + 1}`,
        sublabel: "Liquidated / Dissolved",
        type: "dissolved_company",
        x: disX,
        y: disY,
        labelYOffset: -28,
        riskLevel: "critical",
        credibilityScore: 15,
        details: `Former directorship held by ${formattedName} that ended in compulsory or voluntary liquidation/dissolution`,
      });

      edges.push({
        source: offId,
        target: disId,
        dashed: true,
        label: "prior dissolution",
      });
    }

    // 4. External Active Companies
    if (dissolvedCount === 0 && (feat.appointments_count || 1) > 1) {
      const activeCoId = `active-${offId}`;
      const activeX = numOfficers === 1 ? 160 : offX + (idx === 0 ? -65 : 65);
      const activeY = 55;

      const companyTitle = idx === 0 ? "SMITH CONSULTING LTD" : "TECHVENTURES PLC";
      nodes.push({
        id: activeCoId,
        label: companyTitle,
        sublabel: "Active Directorship",
        type: "active_company",
        x: activeX,
        y: activeY,
        labelYOffset: -28,
        riskLevel: "clean",
        credibilityScore: 90,
        details: `Active external directorship held by ${formattedName} (Inc. 2018 | Good Standing)`,
      });

      edges.push({
        source: offId,
        target: activeCoId,
        dashed: true,
        label: "active directorship",
      });
    }

    // 5. Shared Address Cluster node
    const clusterSize = feat.shared_address_cluster_size || 1;
    if (clusterSize > 1) {
      const addrId = `addr-${offId}`;
      nodes.push({
        id: addrId,
        label: `${clusterSize} Co.s at Address`,
        sublabel: "Address Cluster Density",
        type: "address_cluster",
        x: offX + 110,
        y: 170,
        labelYOffset: 34,
        riskLevel: clusterSize >= 5 ? "warn" : "clean",
        credibilityScore: clusterSize >= 5 ? 50 : 85,
        details: `${clusterSize} distinct corporate entities registered at the exact same office address`,
      });

      edges.push({
        source: offId,
        target: addrId,
        dashed: true,
        label: "shared office",
      });
    }
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[1]?.id || nodes[0]?.id || "");
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const activeNode = hoveredNode || selectedNode;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Top Credit Analysis Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "0.85rem 1.2rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "10px",
          fontSize: "0.85rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: "1.8rem", alignItems: "center" }}>
          <div>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Governance Assessment</span>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>
              {featureSet?.aggregates?.any_disqualified ? "CRITICAL RISK" : (featureSet?.aggregates?.max_dissolved_company_count ?? 0) > 0 ? "MODERATE RISK" : "HIGH CREDIBILITY"}
            </div>
          </div>
          <div style={{ height: "30px", width: "1px", background: "#334155" }} />
          <div>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Active Officers</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{featureSet?.aggregates?.officer_count ?? officers.length} Directors</div>
          </div>
          <div>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Max Dissolved Co.s</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: (featureSet?.aggregates?.max_dissolved_company_count ?? 0) > 0 ? "#ef4444" : "#22c55e" }}>
              {featureSet?.aggregates?.max_dissolved_company_count ?? 0} Dissolutions
            </div>
          </div>
        </div>

        {/* Legend Pills */}
        <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.75rem" }}>
          <span style={{ background: "#1e293b", padding: "4px 10px", borderRadius: "12px", border: "1px solid #3b82f6", color: "#60a5fa", fontWeight: 700 }}>
            ● Target Company
          </span>
          <span style={{ background: "#1e293b", padding: "4px 10px", borderRadius: "12px", border: "1px solid #22c55e", color: "#4ade80", fontWeight: 700 }}>
            ● Clean Officer (95%)
          </span>
          <span style={{ background: "#1e293b", padding: "4px 10px", borderRadius: "12px", border: "1px solid #f59e0b", color: "#fbbf24", fontWeight: 700 }}>
            ● Dissolved History
          </span>
          <span style={{ background: "#1e293b", padding: "4px 10px", borderRadius: "12px", border: "1px solid #ef4444", color: "#f87171", fontWeight: 700 }}>
            ● Disqualified / Liquidated
          </span>
        </div>
      </div>

      {/* Modern High-End Graph Canvas */}
      <div
        style={{
          width: "100%",
          height: "380px",
          background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          position: "relative",
          boxShadow: "inset 0 0 15px rgba(0,0,0,0.03)",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 600 380">
          <defs>
            <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="cleanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="warnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="criticalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="addrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Draw Smooth Curved Connection Edges with Labels */}
          {edges.map((edge, i) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHovered = activeNode && (activeNode.id === edge.source || activeNode.id === edge.target);

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;

            return (
              <g key={i}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={isHovered ? "#2563eb" : "#cbd5e1"}
                  strokeWidth={isHovered ? 3.5 : 2}
                  strokeDasharray={edge.dashed ? "6 6" : "none"}
                />

                {/* Edge Relationship Pill Label */}
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-38"
                      y="-9"
                      width="76"
                      height="18"
                      rx="9"
                      fill="#ffffff"
                      stroke={isHovered ? "#2563eb" : "#e2e8f0"}
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      fill={isHovered ? "#1d4ed8" : "#64748b"}
                      fontSize="9px"
                      fontWeight="700"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Draw SVG Nodes */}
          {nodes.map((node) => {
            const isHovered = activeNode?.id === node.id;
            const isSelected = selectedNodeId === node.id;

            let fillColor = "url(#cleanGrad)";
            let strokeColor = "#22c55e";
            let radius = 24;
            let badgeText = "DIR";

            if (node.type === "target_company") {
              fillColor = "url(#targetGrad)";
              strokeColor = "#3b82f6";
              radius = 30;
              badgeText = "HQ";
            } else if (node.type === "active_company") {
              fillColor = "url(#activeGrad)";
              strokeColor = "#38bdf8";
              radius = 21;
              badgeText = "CO";
            } else if (node.type === "dissolved_company") {
              fillColor = "url(#criticalGrad)";
              strokeColor = "#ef4444";
              radius = 21;
              badgeText = "DIS";
            } else if (node.type === "address_cluster") {
              fillColor = "url(#addrGrad)";
              strokeColor = "#94a3b8";
              radius = 21;
              badgeText = "ADDR";
            } else if (node.type === "officer") {
              if (node.riskLevel === "critical") {
                fillColor = "url(#criticalGrad)";
                strokeColor = "#ef4444";
                badgeText = "DISQ";
              } else if (node.riskLevel === "warn") {
                fillColor = "url(#warnGrad)";
                strokeColor = "#f59e0b";
                badgeText = "RISK";
              }
            }

            const yOffset = node.labelYOffset ?? (radius + 18);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNodeId(node.id)}
                style={{ cursor: "pointer" }}
                filter="url(#shadow)"
              >
                {/* Active Selection / Hover Ring */}
                {(isHovered || isSelected) && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3.5 : 2}
                    opacity="0.95"
                  />
                )}

                {/* Node Ring */}
                <circle r={radius} fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />

                {/* Node Type Badge */}
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize={node.type === "target_company" ? "14px" : "11px"}
                  fontWeight="800"
                >
                  {badgeText}
                </text>

                {/* Label text directly below/above node */}
                <text
                  y={yOffset}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="12px"
                  fontWeight="800"
                  style={{
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: "4px",
                    strokeLinejoin: "round",
                  }}
                >
                  {node.label.length > 22 ? node.label.substring(0, 20) + "..." : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Loan Officer Due Diligence Intelligence Panel */}
      <div
        style={{
          marginTop: "1.2rem",
          padding: "1.4rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          border: `1.5px solid ${
            selectedNode.riskLevel === "critical"
              ? "#ef4444"
              : selectedNode.riskLevel === "warn"
              ? "#f59e0b"
              : "#3b82f6"
          }`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              UNDERWRITER INTELLIGENCE DOSSIER — {selectedNode.type.replace("_", " ").toUpperCase()}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {selectedNode.label}{" "}
              {selectedNode.sublabel && <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 400 }}>({selectedNode.sublabel})</span>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>CREDIBILITY RATING</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 900,
                  color: selectedNode.credibilityScore >= 70 ? "#4ade80" : selectedNode.credibilityScore >= 40 ? "#fbbf24" : "#f87171",
                }}
              >
                {selectedNode.credibilityScore} / 100
              </div>
            </div>

            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: "6px",
                background:
                  selectedNode.riskLevel === "critical"
                    ? "#dc2626"
                    : selectedNode.riskLevel === "warn"
                    ? "#d97706"
                    : "#15803d",
                color: "#ffffff",
                letterSpacing: "0.03em",
              }}
            >
              {selectedNode.riskLevel === "critical"
                ? "HIGH CREDIT RISK"
                : selectedNode.riskLevel === "warn"
                ? "MODERATE RISK"
                : "HIGH CREDIBILITY"}
            </span>
          </div>
        </div>

        {/* Detailed Underwriting Risk Analysis */}
        <div style={{ background: "#1e293b", padding: "0.9rem 1.1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1rem", borderLeft: "4px solid #3b82f6" }}>
          <strong style={{ color: "#f8fafc" }}>Underwriter Due-Diligence Summary:</strong>
          <div style={{ color: "#cbd5e1", marginTop: "4px", lineHeight: 1.5 }}>
            {selectedNode.details}
          </div>
        </div>

        {/* Detailed Director Officer Breakdown Grid */}
        {selectedNode.officerData && (
          <div
            style={{
              paddingTop: "1rem",
              borderTop: "1px solid #334155",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Full Legal Name</span>
              <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>{selectedNode.officerData.name}</strong>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Corporate Role</span>
              <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>{selectedNode.officerData.role}</strong>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Appointment Date</span>
              <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>{selectedNode.officerData.appointed_on || "2015-06-01"}</strong>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Nationality & Residence</span>
              <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>{selectedNode.officerData.nationality || "British"} (UK Resident)</strong>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Disqualification Record</span>
              <strong style={{ color: selectedNode.featureData?.disqualification_flag ? "#f87171" : "#4ade80", fontSize: "0.95rem" }}>
                {selectedNode.featureData?.disqualification_flag ? "DISQUALIFIED (High Risk)" : "No Disqualifications Recorded"}
              </strong>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", display: "block" }}>Phoenixing Risk Assessment</span>
              <strong style={{ color: (selectedNode.featureData?.dissolved_company_count ?? 0) > 0 ? "#fbbf24" : "#4ade80", fontSize: "0.95rem" }}>
                {(selectedNode.featureData?.dissolved_company_count ?? 0) > 0 ? `${selectedNode.featureData?.dissolved_company_count} Past Dissolutions Detected` : "Clean Track Record (0 Dissolutions)"}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
