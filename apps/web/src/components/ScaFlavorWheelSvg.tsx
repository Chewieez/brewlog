import React, { useState } from 'react';
import { SCA_FLAVOR_WHEEL } from '@brewlog/core';

interface ScaFlavorWheelSvgProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

// 15-line Polar to Cartesian SVG Arc Generator
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  const outerStart = polarToCartesian(x, y, outerRadius, startAngle);
  const outerEnd = polarToCartesian(x, y, outerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', outerStart.x, outerStart.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
    'L', innerStart.x, innerStart.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
    'Z'
  ].join(' ');
}

export const ScaFlavorWheelSvg: React.FC<ScaFlavorWheelSvgProps> = ({ selectedTags, onToggleTag }) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const cx = 200;
  const cy = 200;
  const rInner = 55;
  const rMid = 105;
  const rOuter = 185;

  const totalDescriptors = SCA_FLAVOR_WHEEL.reduce((acc, cat) => {
    const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
    return acc + descs.length;
  }, 0);

  const anglePerDescriptor = 360 / totalDescriptors;

  let currentAngle = 0;
  const innerSlices: any[] = [];
  const outerSlices: any[] = [];

  SCA_FLAVOR_WHEEL.forEach((cat) => {
    const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
    const catSpanAngle = descs.length * anglePerDescriptor;
    const catStartAngle = currentAngle;
    const catEndAngle = currentAngle + catSpanAngle;

    const hasSelectedChild = descs.some((d) => selectedTags.includes(d));

    // Inner ring slice (Primary Category)
    innerSlices.push({
      name: cat.name,
      color: cat.color,
      startAngle: catStartAngle,
      endAngle: catEndAngle,
      hasSelectedChild,
    });

    // Outer ring slices (Specific Descriptors)
    let descAngle = catStartAngle;
    descs.forEach((desc) => {
      const dStart = descAngle;
      const dEnd = descAngle + anglePerDescriptor;
      const isSelected = selectedTags.includes(desc);

      outerSlices.push({
        name: desc,
        category: cat.name,
        color: cat.color,
        startAngle: dStart,
        endAngle: dEnd,
        isSelected,
      });

      descAngle += anglePerDescriptor;
    });

    currentAngle += catSpanAngle;
  });

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-full py-1">
      <div className="relative w-[340px] h-[340px] flex items-center justify-center">
        <svg viewBox="0 0 400 400" className="w-full h-full transform transition-transform">
          {/* Inner Ring (Categories) */}
          {innerSlices.map((slice) => {
            const pathData = describeArc(cx, cy, rInner, rMid, slice.startAngle, slice.endAngle - 0.5);
            return (
              <path
                key={slice.name}
                d={pathData}
                fill={slice.color}
                fillOpacity={slice.hasSelectedChild ? 0.95 : 0.35}
                stroke="#1c1917"
                strokeWidth="1.5"
                className="transition-all duration-200 cursor-default"
                onMouseEnter={() => setHoveredSlice(slice.name)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}

          {/* Outer Ring (Clickable Descriptors) */}
          {outerSlices.map((slice) => {
            const pathData = describeArc(cx, cy, rMid + 2, rOuter, slice.startAngle, slice.endAngle - 0.5);
            const isHovered = hoveredSlice === slice.name;

            return (
              <g
                key={slice.name}
                className="cursor-pointer"
                onClick={() => onToggleTag(slice.name)}
                onMouseEnter={() => setHoveredSlice(slice.name)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <path
                  d={pathData}
                  fill={slice.color}
                  fillOpacity={slice.isSelected ? 1.0 : isHovered ? 0.8 : 0.25}
                  stroke={slice.isSelected ? '#f59e0b' : '#0c0a09'}
                  strokeWidth={slice.isSelected ? '2.5' : '1'}
                  className="transition-all duration-150 transform origin-center hover:scale-[1.01]"
                />
              </g>
            );
          })}

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r={rInner - 3} fill="#0c0a09" stroke="#292524" strokeWidth="2" />
        </svg>

        {/* Center Dynamic Label Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {hoveredSlice ? (
            <>
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
                Tasting Note
              </span>
              <span className="text-sm font-bold text-stone-100 mt-0.5 leading-tight line-clamp-2">
                {hoveredSlice}
              </span>
              <span className="text-[9px] text-stone-400 mt-1">Tap to toggle</span>
            </>
          ) : (
            <>
              <span className="text-[9px] uppercase font-mono tracking-widest text-stone-400">
                SCA
              </span>
              <span className="text-xs font-bold text-amber-400 mt-0.5">
                Sensory Wheel
              </span>
              <span className="text-[9px] text-stone-400 mt-0.5">
                {selectedTags.length} active
              </span>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-1 text-center">
        Tap any segment on the outer wheel to add or remove sensory notes.
      </p>
    </div>
  );
};
