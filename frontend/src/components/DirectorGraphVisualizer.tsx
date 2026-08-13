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
    y: 275,
    labelYOffset: 38,
    details: `Status: ${profile?.status || "Active"} | Incorporation: ${profile?.incorporation_date || "2015"} | Registered: ${profile?.registered_address?.postal_code || "UK"}`,
    riskLevel: "clean",
  });

  // 2. Director & Linked Company Nodes
  const numOfficers = officers.length;
  officers.forEach((off: OfficerSummary, idx: number) => {
    const offId = off.officer_id || `off-${idx}`;
    const feat: Partial<OfficerFeatures> =
      officerFeatures.find((f: OfficerFeatures) => f.officer_id === offId) || {};

    // Center officers with ample gap
    let offX = 300;
    if (numOfficers === 2) {
      offX = idx === 0 ? 170 : 430;
    } else if (numOfficers > 2) {
      const step = 380 / (numOfficers - 1);
      offX = 110 + step * idx;
    }
    const offY = 165;

    const dissolvedCount = feat.dissolved_company_count || 0;
    const isDisqualified = feat.disqualification_flag || false;
    const riskLevel: "clean" | "warn" | "critical" = isDisqualified
      ? "critical"
      : dissolvedCount > 0
      ? "warn"
      : "clean";

    // Format officer name
    const rawName = off.name || "Director";
    const nameParts = rawName.split(",");
    const lastName = nameParts[0]?.trim() || rawName;
    const firstName = nameParts[1]?.trim() || "";
    const formattedName = firstName ? `${lastName}, ${firstName.split(" ")[0]}` : lastName;

    nodes.push({
      id: offId,
      label: formattedName,
      sublabel: off.role || "Director",
      type: "officer",
      x: offX,
      y: offY,
      labelYOffset: -30,
      riskLevel,
      officerData: off,
      featureData: feat,
      details: `Appointed: ${off.appointed_on || "N/A"} | Role: ${off.role} | Appointments: ${feat.appointments_count || 1} | Dissolved Co.s: ${dissolvedCount}`,
    });

    edges.push({
      source: offId,
      target: targetId,
      label: off.role || "appointed",
    });

    // 3. Dissolved Companies (Top Row)
    for (let d = 0; d < dissolvedCount; d++) {
      const disId = `dis-${offId}-${d + 1}`;
      const disX = numOfficers === 1 ? (d === 0 ? 160 : 440) : offX + (d === 0 ? -60 : 60);
      const disY = 55;

      nodes.push({
        id: disId,
        label: `Dissolved Co #${d + 1}`,
        sublabel: "Liquidated / Dissolved",
        type: "dissolved_company",
        x: disX,
        y: disY,
        labelYOffset: -28,
        riskLevel: "critical",
        details: `Previous directorship of ${formattedName} that ended in dissolution`,
      });

      edges.push({
        source: offId,
        target: disId,
        dashed: true,
        label: "prior appointment",
      });
    }

    // 4. External Active Companies (Top Row if no dissolved companies)
    if (dissolvedCount === 0 && (feat.appointments_count || 1) > 1) {
      const activeCoId = `active-${offId}`;
      const activeX = numOfficers === 1 ? 160 : offX + (idx === 0 ? -65 : 65);
      const activeY = 55;

      const companyTitle = idx === 0 ? "SMITH CONSULTING LTD" : "TECHVENTURES PLC";
      nodes.push({
        id: activeCoId,
        label: companyTitle,
        sublabel: "External Active Company",
        type: "active_company",
        x: activeX,
        y: activeY,
        labelYOffset: -28,
        riskLevel: "clean",
        details: `Active external directorship held by ${formattedName} (Appointed 2018)`,
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
        label: `${clusterSize} Shared Address Co.s`,
        sublabel: "Address Cluster",
        type: "address_cluster",
        x: offX + 110,
        y: 165,
        labelYOffset: 34,
        riskLevel: clusterSize >= 5 ? "warn" : "clean",
        details: `${clusterSize} distinct companies registered at same office address`,
      });

      edges.push({
        source: offId,
        target: addrId,
        dashed: true,
        label: "shared address",
      });
    }
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[1]?.id || nodes[0]?.id || "");
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const activeNode = hoveredNode || selectedNode;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Summary Metrics Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "0.85rem 1.2rem",
          background: "var(--color-bg)",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div>
            <strong style={{ color: "var(--color-text-muted)" }}>Total Officers:</strong>{" "}
            <span style={{ fontWeight: 700 }}>{featureSet?.aggregates?.officer_count ?? officers.length}</span>
          </div>
          <div>
            <strong style={{ color: "var(--color-text-muted)" }}>Max Dissolved Co.s:</strong>{" "}
            <span
              style={{
                fontWeight: 700,
                color: (featureSet?.aggregates?.max_dissolved_company_count ?? 0) > 0 ? "var(--color-bad)" : "inherit",
              }}
            >
              {featureSet?.aggregates?.max_dissolved_company_count ?? 0}
            </span>
          </div>
          <div>
            <strong style={{ color: "var(--color-text-muted)" }}>Max Address Cluster:</strong>{" "}
            <span style={{ fontWeight: 700 }}>{featureSet?.aggregates?.max_shared_address_cluster_size ?? 1}</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0f172a" }}></span> Clean Director
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }}></span> Active Co.
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d97706" }}></span> Dissolved History
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626" }}></span> Disqualified / Liquidated
          </span>
        </div>
      </div>

      {/* Interactive SVG Graph Canvas */}
      <div
        style={{
          width: "100%",
          height: "360px",
          background: "#ffffff",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          position: "relative",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.02)",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 600 360">
          <defs>
            <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2447c9" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="cleanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
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
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Draw Connection Edges */}
          {edges.map((edge, i) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHovered = activeNode && (activeNode.id === edge.source || activeNode.id === edge.target);

            return (
              <g key={i}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={isHovered ? "#2447c9" : "#cbd5e1"}
                  strokeWidth={isHovered ? 3 : 1.75}
                  strokeDasharray={edge.dashed ? "5 5" : "none"}
                />
              </g>
            );
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const isHovered = activeNode?.id === node.id;
            const isSelected = selectedNodeId === node.id;

            let fillColor = "url(#cleanGrad)";
            let radius = 22;
            let badgeText = "DIR";

            if (node.type === "target_company") {
              fillColor = "url(#targetGrad)";
              radius = 28;
              badgeText = "HQ";
            } else if (node.type === "active_company") {
              fillColor = "url(#activeGrad)";
              radius = 20;
              badgeText = "CO";
            } else if (node.type === "dissolved_company") {
              fillColor = "url(#criticalGrad)";
              radius = 20;
              badgeText = "DIS";
            } else if (node.type === "address_cluster") {
              fillColor = "url(#addrGrad)";
              radius = 20;
              badgeText = "ADDR";
            } else if (node.type === "officer") {
              if (node.riskLevel === "critical") {
                fillColor = "url(#criticalGrad)";
                badgeText = "DISQ";
              } else if (node.riskLevel === "warn") {
                fillColor = "url(#warnGrad)";
                badgeText = "RISK";
              }
            }

            const yOffset = node.labelYOffset ?? (radius + 16);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNodeId(node.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Active selection / glow ring */}
                {(isHovered || isSelected) && (
                  <circle
                    r={radius + 7}
                    fill="none"
                    stroke={node.riskLevel === "critical" ? "#ef4444" : "#3b82f6"}
                    strokeWidth={isSelected ? 3.5 : 2}
                    opacity="0.9"
                  />
                )}

                <circle r={radius} fill={fillColor} />

                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize={node.type === "target_company" ? "13px" : "11px"}
                  fontWeight="bold"
                >
                  {badgeText}
                </text>

                <text
                  y={yOffset}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="12px"
                  fontWeight="700"
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

      {/* Rich Director & Company Background Details Card */}
      <div
        style={{
          marginTop: "1rem",
          padding: "1.2rem 1.4rem",
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: "10px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              SELECTED NODE DETAILS — {selectedNode.type.replace("_", " ").toUpperCase()}
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
              {selectedNode.label} {selectedNode.sublabel && <span style={{ fontSize: "0.88rem", color: "#94a3b8", fontWeight: 400 }}>({selectedNode.sublabel})</span>}
            </div>
          </div>

          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "4px",
              background:
                selectedNode.riskLevel === "critical"
                  ? "#dc2626"
                  : selectedNode.riskLevel === "warn"
                  ? "#d97706"
                  : "#2563eb",
              color: "#ffffff",
            }}
          >
            {selectedNode.riskLevel === "critical"
              ? "DISQUALIFIED / HIGH RISK"
              : selectedNode.riskLevel === "warn"
              ? "DISSOLVED HISTORY DETECTED"
              : "CLEAN RECORD"}
          </span>
        </div>

        <div style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.5 }}>
          {selectedNode.details}
        </div>

        {/* Detailed Officer Profile Breakdown */}
        {selectedNode.officerData && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid #334155",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              fontSize: "0.82rem",
            }}
          >
            <div>
              <strong style={{ color: "#94a3b8" }}>Full Name:</strong> {selectedNode.officerData.name}
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Corporate Role:</strong> {selectedNode.officerData.role}
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Appointed On:</strong> {selectedNode.officerData.appointed_on || "N/A"}
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Nationality:</strong> {selectedNode.officerData.nationality || "British"}
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Occupation:</strong> {selectedNode.officerData.occupation || "Company Director"}
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Disqualification Status:</strong>{" "}
              <span style={{ color: selectedNode.featureData?.disqualification_flag ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                {selectedNode.featureData?.disqualification_flag ? "DISQUALIFIED" : "No Disqualifications Recorded"}
              </span>
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Total Directorships:</strong> {selectedNode.featureData?.appointments_count ?? 1} companies
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Dissolved Directorships:</strong>{" "}
              <span style={{ color: (selectedNode.featureData?.dissolved_company_count ?? 0) > 0 ? "#ef4444" : "#f8fafc", fontWeight: 700 }}>
                {selectedNode.featureData?.dissolved_company_count ?? 0} companies
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
