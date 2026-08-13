import { useState } from "react";
import type { OfficerSummary } from "../contracts/applicant";
import type { OfficerFeatures } from "../contracts/director-features";
import { mockApplicantProfile, mockDirectorFeatureSet } from "../mocks";

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  type: "target_company" | "officer" | "dissolved_company" | "address_cluster";
  x: number;
  y: number;
  labelYOffset?: number;
  details: string;
}

interface Edge {
  source: string;
  target: string;
  dashed?: boolean;
  label?: string;
}

export default function DirectorGraphVisualizer({ companyNumber }: { companyNumber: string }) {
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

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
    sublabel: `Target Company (#${targetId})`,
    type: "target_company",
    x: 300,
    y: 280,
    labelYOffset: 38,
    details: `Status: ${profile?.status || "Active"} | Registered: ${profile?.registered_address?.postal_code || "UK"}`,
  });

  // 2. Director Nodes (Middle Row)
  const numOfficers = Math.max(officers.length, 1);
  officers.forEach((off: OfficerSummary, idx: number) => {
    const offId = off.officer_id || `off-${idx}`;
    const feat: Partial<OfficerFeatures> = officerFeatures.find((f: OfficerFeatures) => f.officer_id === offId) || {};

    // Center officers horizontally
    const step = 300 / (numOfficers + 1);
    const offX = numOfficers === 1 ? 300 : 150 + step * (idx + 1);
    const offY = 170;

    nodes.push({
      id: offId,
      label: off.name || "Director",
      sublabel: off.role || "Director",
      type: "officer",
      x: offX,
      y: offY,
      labelYOffset: -32,
      details: `Appointments: ${feat.appointments_count || 1} | Dissolved Co.s: ${feat.dissolved_company_count || 0} | Avg Tenure: ${feat.avg_tenure_days ? Math.round(feat.avg_tenure_days) + " days" : "N/A"}`,
    });

    edges.push({
      source: offId,
      target: targetId,
      label: off.role || "appointed",
    });

    // 3. Dissolved Companies (Top Row, spread left and right)
    const dissolvedCount = feat.dissolved_company_count || 0;
    for (let d = 0; d < dissolvedCount; d++) {
      const disId = `dis-${offId}-${d + 1}`;
      const disX = dissolvedCount === 1 ? 160 : d === 0 ? 140 : 460;
      const disY = 60;

      nodes.push({
        id: disId,
        label: `Dissolved Co #${d + 1}`,
        sublabel: "Liquidated / Dissolved",
        type: "dissolved_company",
        x: disX,
        y: disY,
        labelYOffset: -30,
        details: `Previous directorship that ended in company dissolution`,
      });

      edges.push({
        source: offId,
        target: disId,
        dashed: true,
        label: "prior appointment",
      });
    }

    // 4. Shared Address Cluster node (Side Node, offset right to avoid vertical overlap)
    const clusterSize = feat.shared_address_cluster_size || 1;
    if (clusterSize > 1) {
      const addrId = `addr-${offId}`;
      nodes.push({
        id: addrId,
        label: `${clusterSize} Shared Address Co.s`,
        sublabel: "Address Cluster",
        type: "address_cluster",
        x: 470,
        y: 170,
        labelYOffset: 34,
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

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      {/* Metrics Bar */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1rem",
          padding: "0.75rem 1.2rem",
          background: "var(--color-bg)",
          borderRadius: "8px",
          fontSize: "0.85rem",
        }}
      >
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
          <strong style={{ color: "var(--color-text-muted)" }}>Max Shared Address Cluster:</strong>{" "}
          <span style={{ fontWeight: 700 }}>{featureSet?.aggregates?.max_shared_address_cluster_size ?? 1}</span>
        </div>
      </div>

      {/* Interactive Graph Canvas */}
      <div
        style={{
          width: "100%",
          height: "370px",
          background: "#ffffff",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          position: "relative",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.02)",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 600 370">
          <defs>
            <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2447c9" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="officerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="dissolvedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="addrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>

          {/* Draw Connection Edges */}
          {edges.map((edge, i) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHovered = hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

            return (
              <g key={i}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={isHovered ? "#2447c9" : "#94a3b8"}
                  strokeWidth={isHovered ? 3 : 1.75}
                  strokeDasharray={edge.dashed ? "5 5" : "none"}
                />
              </g>
            );
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNode?.id === node.id;
            let fillColor = "url(#officerGrad)";
            let radius = 22;
            let badgeText = "DIR";

            if (node.type === "target_company") {
              fillColor = "url(#targetGrad)";
              radius = 28;
              badgeText = "HQ";
            } else if (node.type === "dissolved_company") {
              fillColor = "url(#dissolvedGrad)";
              radius = 20;
              badgeText = "DIS";
            } else if (node.type === "address_cluster") {
              fillColor = "url(#addrGrad)";
              radius = 20;
              badgeText = "ADDR";
            }

            const yOffset = node.labelYOffset ?? (radius + 16);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle r={radius + 7} fill="none" stroke="#3b82f6" strokeWidth="2.5" opacity="0.85" />
                )}

                <circle r={radius} fill={fillColor} />

                {/* Node Text Code */}
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize={node.type === "target_company" ? "13px" : "11px"}
                  fontWeight="bold"
                >
                  {badgeText}
                </text>

                {/* Clean Label underneath/above */}
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

        {/* Hover Details Panel */}
        {hoveredNode ? (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              right: "12px",
              background: "rgba(15, 23, 42, 0.94)",
              color: "#ffffff",
              padding: "0.7rem 1.1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <div>
              <strong style={{ fontSize: "0.95rem" }}>{hoveredNode.label}</strong>{" "}
              <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>({hoveredNode.sublabel})</span>
              <div style={{ color: "#cbd5e1", fontSize: "0.8rem", marginTop: "2px" }}>{hoveredNode.details}</div>
            </div>
            <span style={{ fontSize: "0.75rem", background: "#334155", padding: "3px 8px", borderRadius: "4px" }}>
              {hoveredNode.type.replace("_", " ").toUpperCase()}
            </span>
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}
          >
            Hover over any node to view detailed director and company features
          </div>
        )}
      </div>
    </div>
  );
}
