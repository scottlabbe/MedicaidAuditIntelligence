import { useRef, useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Link } from "wouter";
import type { ReportPreview, StateLatestResponse } from "@/lib/types";

// Performance optimization: move constants outside component  
const TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// US State codes mapping from FIPS to USPS - memoized as constant
const USPS_BY_ID: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
  "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY"
};

export default function USMap({ 
  data, 
  scope 
}: { 
  data: StateLatestResponse; 
  scope: "state" | "federal" 
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [overTip, setOverTip] = useState(false);
  const [showDelay, setShowDelay] = useState<NodeJS.Timeout | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Performance optimization: memoize set of keys that have data
  const keysWithData = useMemo(() => 
    new Set(Object.keys(data.byKey).filter(key => data.byKey[key]?.length > 0)), 
    [data.byKey]
  );

  // Performance optimization: memoize style objects
  const mapStyles = useMemo(() => ({
    hasData: {
      default: {
        fill: "var(--map-has-data)",
        stroke: "var(--map-stroke)",
        strokeWidth: 0.6,
        vectorEffect: "non-scaling-stroke" as const
      },
      hover: { fill: "var(--map-hover)" },
      pressed: { fill: "var(--map-hover)" }
    },
    noData: {
      default: {
        fill: "var(--map-no-data)",
        stroke: "var(--map-stroke)",
        strokeWidth: 0.6,
        vectorEffect: "non-scaling-stroke" as const
      },
      hover: { fill: "var(--map-hover)" },
      pressed: { fill: "var(--map-hover)" }
    }
  }), []);

  const itemsFor = (k: string | null): ReportPreview[] | undefined => 
    k ? data.byKey[k] : undefined;

  return (
    <div ref={boxRef} className="relative">
      <ComposableMap projection="geoAlbersUsa" className="w-full h-[520px]">
        <Geographies geography={TOPO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = String(geo.id).padStart(2, "0");
              const key = scope === "federal" ? "FED" : USPS_BY_ID[fips];
              const has = key ? keysWithData.has(key) : false;
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(evt: any) => {
                    // Clear any existing delay
                    if (showDelay) clearTimeout(showDelay);
                    
                    // Add 100ms delay to reduce flicker
                    const timeout = setTimeout(() => {
                      const r = boxRef.current?.getBoundingClientRect();
                      if (r) {
                        setActiveKey(key || null);
                        setAnchor({ x: evt.clientX - r.left, y: evt.clientY - r.top });
                      }
                    }, 100);
                    setShowDelay(timeout);
                  }}
                  onMouseLeave={() => {
                    // Clear show delay if user leaves quickly
                    if (showDelay) {
                      clearTimeout(showDelay);
                      setShowDelay(null);
                    }
                    
                    setTimeout(() => {
                      if (!overTip) {
                        setActiveKey(null);
                        setAnchor(null);
                      }
                    }, 50);
                  }}
                  tabIndex={0}
                  style={has ? mapStyles.hasData : mapStyles.noData}
                />
              );
            })
          }
        </Geographies>
        
        {/* Add border outlines for better visibility */}
        <Geographies geography={TOPO_URL}>
          {({ geographies }: any) => geographies.map((geo: any) => (
            <Geography 
              key={`border-${geo.rsmKey}`} 
              geography={geo} 
              fill="none"
              stroke="var(--map-stroke)" 
              strokeWidth={0.6} 
              pointerEvents="none"
            />
          ))}
        </Geographies>
      </ComposableMap>

      {activeKey && anchor && (
        <div
          className="absolute z-10 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 pointer-events-auto"
          style={{
            left: Math.min(
              anchor.x + 16,
              (boxRef.current?.clientWidth ?? 0) - 340
            ),
            top: Math.min(
              Math.max(8, anchor.y - 8),
              (boxRef.current?.clientHeight ?? 0) - 200
            ),
          }}
          onMouseEnter={() => setOverTip(true)}
          onMouseLeave={() => {
            setOverTip(false);
            setActiveKey(null);
            setAnchor(null);
          }}
        >
          <TooltipContent
            keyStr={activeKey}
            scope={scope}
            items={itemsFor(activeKey)}
          />
        </div>
      )}

      {/* Map Legend */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span 
            className="h-3 w-3 rounded-sm inline-block" 
            style={{background:'var(--map-has-data)'}} 
          /> 
          Has recent reports
        </span>
        <span className="inline-flex items-center gap-1">
          <span 
            className="h-3 w-3 rounded-sm inline-block" 
            style={{background:'var(--map-no-data)'}} 
          /> 
          No recent reports
        </span>
      </div>
    </div>
  );
}

function TooltipContent({
  keyStr,
  scope,
  items,
}: {
  keyStr: string;
  scope: "state" | "federal";
  items?: ReportPreview[];
}) {
  const title = scope === "federal" ? "Federal (shown at Washington, DC)" : keyStr;
  
  if (!items || items.length === 0) {
    return (
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {title}
        </div>
        <div className="text-sm text-muted-foreground">No recent reports.</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </div>
      <ul className="space-y-2">
        {items.slice(0, 3).map((r) => (
          <li key={r.id} className="text-sm">
            <Link
              href={`/report/${r.id}`}
              className="font-medium text-foreground hover:underline line-clamp-2"
            >
              {r.title}
            </Link>
            <div className="text-xs text-muted-foreground">
              {new Date(r.publicationDate).toLocaleDateString()} • {r.agency}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        {scope === "federal" ? (
          <Link
            href={`/explore?agency=${encodeURIComponent("HHS OIG")}`}
            className="text-xs text-foreground underline underline-offset-4"
          >
            View all federal
          </Link>
        ) : (
          <Link
            href={`/explore?state=${encodeURIComponent(keyStr)}`}
            className="text-xs text-foreground underline underline-offset-4"
          >
            View all in {keyStr}
          </Link>
        )}
      </div>
    </div>
  );
}