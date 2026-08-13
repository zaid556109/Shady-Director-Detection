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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
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
    y: 275,
    labelYOffset: 38,
    details: `Status: ${profile?.status || "Active"} | Registered: ${profile?.registered_address?.postal_code || "UK"}`,
    riskLevel: "clean",
  });

  // 2. Director Nodes (Middle Row)
  const numOfficers = officers.length;
  officers.forEach((off: OfficerSummary, idx: number) => {
    const offId = off.officer_id || `off-${idx}`;
    const feat: Partial<OfficerFeatures> =
      officerFeatures.find((f: OfficerFeatures) => f.officer_id === offId) || {};

    // Horizontal positioning for officers: ensure generous gap (min 220px) so names NEVER collide
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

    // Format officer display name cleanly (e.g. SMITH, John M.)
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
      details: `Appointed: ${off.appointed_on || "N/A"} | Appointments: ${feat.appointments_count || 1} | Dissolved Co.s: ${dissolvedCount} | Disqualified: ${isDisqualified ? "YES" : "No"}`,
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
        details: `Previous directorship of ${formattedName} that ended in company dissolution`,
      });

      edges.push({
        source: offId,
        target: disId,
        dashed: true,
        label: "prior appointment",
      });
    }

    // 4. Shared Address Cluster node
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

  const activeNode = hoveredNode || selectedNode;

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      {/* Metrics Summary Header */}
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
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d97706" }}></span> Dissolved History
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626" }}></span> Disqualified / Liquidated
          </span>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
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

          {/* Draw Connection Lines */}
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

            let fillColor = "url(#cleanGrad)";
            let radius = 22;
            let badgeText = "DIR";

            if (node.type === "target_company") {
              fillColor = "url(#targetGrad)";
              radius = 28;
              badgeText = "HQ";
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
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow ring on hover/selection */}
                {isHovered && (
                  <circle
                    r={radius + 7}
                    fill="none"
                    stroke={node.riskLevel === "critical" ? "#ef4444" : "#3b82f6"}
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
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

                {/* Label text directly above/below node */}
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

        {/* Hover / Selection Details Drawer */}
        {activeNode ? (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              right: "12px",
              background: "rgba(15, 23, 42, 0.96)",
              color: "#ffffff",
              padding: "0.85rem 1.2rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
              border: `1px solid ${
                activeNode.riskLevel === "critical"
                  ? "#ef4444"
                  : activeNode.riskLevel === "warn"
                  ? "#f59e0b"
                  : "#3b82f6"
              }`,
            }}
          >
            <div>
              <strong style={{ fontSize: "1rem", color: "#f8fafc" }}>{activeNode.label}</strong>{" "}
              <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>({activeNode.sublabel})</span>
              <div style={{ color: "#cbd5e1", fontSize: "0.82rem", marginTop: "4px" }}>
                {activeNode.details}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                background:
                  activeNode.riskLevel === "critical"
                    ? "#991b1b"
                    : activeNode.riskLevel === "warn"
                    ? "#92400e"
                    : "#1e3a8a",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              {activeNode.type === "officer"
                ? activeNode.riskLevel === "critical"
                  ? "DISQUALIFIED RISK"
                  : activeNode.riskLevel === "warn"
                  ? "HIGH RISK (DISSOLVED)"
                  : "CLEAN DIRECTOR"
                : activeNode.type.replace("_", " ").toUpperCase()}
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
            Click or hover any director node to inspect complete appointment history and risk metrics
          </div>
        )}
      </div>
    </div>
  );
}
