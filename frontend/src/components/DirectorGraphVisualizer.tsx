import React, { useState } from "react";
import { mockApplicantProfile, mockDirectorFeatureSet } from "../mocks";

interface Props {
  companyNumber: string;
}

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  type: "target_company" | "officer" | "dissolved_company" | "address_cluster";
  x: number;
  y: number;
  details: string;
}

interface Edge {
  source: string;
  target: string;
  dashed?: boolean;
  label?: string;
}

export default function DirectorGraphVisualizer({ companyNumber }: Props) {
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  const featureSet = mockDirectorFeatureSet(companyNumber);
  const profile = mockApplicantProfile(companyNumber);

  const officers = profile?.officers || [];
  const officerFeatures = featureSet?.officers || [];

  // Build node and edge data dynamically for visual rendering
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Target Company Node
  const targetId = profile?.company_number || companyNumber;
  const targetName = profile?.company_name || `Company ${companyNumber}`;
  nodes.push({
    id: targetId,
    label: targetName,
    sublabel: `CH #${targetId}`,
    type: "target_company",
    x: 300,
    y: 210,
    details: `Status: ${profile?.status || "Active"} | Incorporate: ${profile?.incorporation_date || "N/A"}`,
  });

  // 2. Director Nodes
  const numOfficers = Math.max(officers.length, 1);
  officers.forEach((off: any, idx: number) => {
    const offId = off.officer_id || `off-${idx}`;
    const feat = officerFeatures.find((f: any) => f.officer_id === offId) || {};

    const angle = (Math.PI / (numOfficers + 1)) * (idx + 1) - Math.PI;
    const offX = 300 + Math.cos(angle) * 160;
    const offY = 120 + Math.sin(angle) * 50;

    nodes.push({
      id: offId,
      label: off.name || "Director",
      sublabel: off.role || "director",
      type: "officer",
      x: offX,
      y: offY,
      details: `Appointments: ${feat.appointments_count || 1} | Dissolved: ${feat.dissolved_company_count || 0} | Tenure: ${feat.avg_tenure_days ? Math.round(feat.avg_tenure_days) + " days" : "N/A"}`,
    });

    edges.push({
      source: offId,
      target: targetId,
      label: off.role || "appointed",
    });

    // 3. Dissolved Companies attached to this officer
    const dissolvedCount = feat.dissolved_company_count || 0;
    for (let d = 0; d < dissolvedCount; d++) {
      const disId = `dis-${offId}-${d + 1}`;
      const disX = offX + (d === 0 ? -120 : 120);
      const disY = offY - 60;

      nodes.push({
        id: disId,
        label: `Dissolved Co #${d + 1}`,
        sublabel: "dissolved",
        type: "dissolved_company",
        x: disX,
        y: disY,
        details: `Linked company dissolved prior to current appointment`,
      });

      edges.push({
        source: offId,
        target: disId,
        dashed: true,
        label: "prior directorship",
      });
    }

    // 4. Shared Address Cluster node if size > 1
    const clusterSize = feat.shared_address_cluster_size || 1;
    if (clusterSize > 1) {
      const addrId = `addr-${offId}`;
      nodes.push({
        id: addrId,
        label: `${clusterSize} Shared Address Co.s`,
        sublabel: "address cluster",
        type: "address_cluster",
        x: offX,
        y: offY + 65,
        details: `${clusterSize} distinct companies registered at the same address`,
      });

      edges.push({
        source: offId,
        target: addrId,
        dashed: true,
        label: "shared location",
      });
    }
  });

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      {/* Metrics Row */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
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

      {/* SVG Interactive Canvas */}
      <div
        style={{
          width: "100%",
          height: "280px",
          background: "#ffffff",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          position: "relative",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 600 280">
          <defs>
            <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2447c9" />
              <stop offset="100%" stopColor="#17307f" />
            </linearGradient>
            <linearGradient id="officerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="dissolvedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>

          {/* Draw Edges */}
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
                  stroke={isHovered ? "#2447c9" : "#cbd5e1"}
                  strokeWidth={isHovered ? 3 : 1.5}
                  strokeDasharray={edge.dashed ? "4 4" : "none"}
                />
              </g>
            );
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredNode?.id === node.id;
            let fillColor = "url(#officerGrad)";
            let radius = 24;

            if (node.type === "target_company") {
              fillColor = "url(#targetGrad)";
              radius = 28;
            } else if (node.type === "dissolved_company") {
              fillColor = "url(#dissolvedGrad)";
              radius = 20;
            } else if (node.type === "address_cluster") {
              fillColor = "#d97706";
              radius = 18;
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Outer Glow on Hover */}
                {isHovered && (
                  <circle r={radius + 6} fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.8" />
                )}

                <circle r={radius} fill={fillColor} />

                {/* Node Icon/Letter */}
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill="#ffffff"
                  fontSize={node.type === "target_company" ? "14px" : "12px"}
                  fontWeight="bold"
                >
                  {node.type === "target_company"
                    ? "HQ"
                    : node.type === "officer"
                    ? "DIR"
                    : node.type === "dissolved_company"
                    ? "DIS"
                    : "ADDR"}
                </text>

                {/* Label below node */}
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="11px"
                  fontWeight="600"
                >
                  {node.label.length > 20 ? node.label.substring(0, 18) + "..." : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              right: "10px",
              background: "rgba(15, 23, 42, 0.92)",
              color: "#ffffff",
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <div>
              <strong>{hoveredNode.label}</strong> ({hoveredNode.sublabel})
              <div style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>{hoveredNode.details}</div>
            </div>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Hovering Node</span>
          </div>
        )}
      </div>
    </div>
  );
}
