import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { SCA_FLAVOR_WHEEL } from '@brewlog/core';
import { Check, Plus, Tag } from 'lucide-react';

interface ScaFlavorWheelSvgProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  className?: string;
}

interface CategorySlice {
  name: string;
  color: string;
  startAngle: number;
  endAngle: number;
  hasSelectedChild: boolean;
  descriptors: string[];
  selectedCount: number;
}

interface DescriptorSlice {
  name: string;
  category: string;
  color: string;
  startAngle: number;
  endAngle: number;
  isSelected: boolean;
}

interface InspectedItem {
  type: 'descriptor' | 'category';
  name: string;
  category?: string;
  color: string;
  isSelected?: boolean;
  totalCount?: number;
  selectedCount?: number;
}

// Polar to Cartesian SVG Arc Generator
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

export const ScaFlavorWheelSvg: React.FC<ScaFlavorWheelSvgProps> = ({
  selectedTags,
  onToggleTag,
  className = '',
}) => {
  const titleId = useId();
  const descId = useId();

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
  const innerSlices: CategorySlice[] = [];
  const outerSlices: DescriptorSlice[] = [];

  SCA_FLAVOR_WHEEL.forEach((cat) => {
    const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
    const catSpanAngle = descs.length * anglePerDescriptor;
    const catStartAngle = currentAngle;
    const catEndAngle = currentAngle + catSpanAngle;

    const selectedCount = descs.filter((d) => selectedTags.includes(d)).length;

    // Inner ring slice (Primary Category)
    innerSlices.push({
      name: cat.name,
      color: cat.color,
      startAngle: catStartAngle,
      endAngle: catEndAngle,
      hasSelectedChild: selectedCount > 0,
      descriptors: descs,
      selectedCount,
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

  // Find initial focus index (first selected tag or 0)
  const initialIndex = Math.max(
    0,
    outerSlices.findIndex((s) => s.isSelected)
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndex);
  const [inspectedItem, setInspectedItem] = useState<InspectedItem | null>(null);
  const [isSvgFocused, setIsSvgFocused] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const descriptorRefs = useRef<(SVGGElement | null)[]>([]);

  // Update inspection when focused via keyboard
  const focusDescriptor = useCallback(
    (index: number) => {
      const targetIndex = (index + outerSlices.length) % outerSlices.length;
      setFocusedIndex(targetIndex);
      const slice = outerSlices[targetIndex];
      if (slice) {
        setInspectedItem({
          type: 'descriptor',
          name: slice.name,
          category: slice.category,
          color: slice.color,
          isSelected: slice.isSelected,
        });
        setAnnouncement(`${slice.name}, ${slice.category}, ${slice.isSelected ? 'selected' : 'not selected'}`);
        descriptorRefs.current[targetIndex]?.focus();
      }
    },
    [outerSlices]
  );

  const handleDescriptorKeyDown = (e: React.KeyboardEvent, index: number, slice: DescriptorSlice) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusDescriptor(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusDescriptor(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusDescriptor(0);
        break;
      case 'End':
        e.preventDefault();
        focusDescriptor(outerSlices.length - 1);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        onToggleTag(slice.name);
        const willBeSelected = !slice.isSelected;
        setAnnouncement(`${slice.name}, ${slice.category}, ${willBeSelected ? 'selected' : 'removed'}`);
        setInspectedItem({
          type: 'descriptor',
          name: slice.name,
          category: slice.category,
          color: slice.color,
          isSelected: willBeSelected,
        });
        break;
      default:
        break;
    }
  };

  const handleDescriptorClick = (slice: DescriptorSlice) => {
    onToggleTag(slice.name);
    const willBeSelected = !slice.isSelected;
    setInspectedItem({
      type: 'descriptor',
      name: slice.name,
      category: slice.category,
      color: slice.color,
      isSelected: willBeSelected,
    });
    setAnnouncement(`${slice.name}, ${slice.category}, ${willBeSelected ? 'selected' : 'removed'}`);
  };

  const handleCategoryClick = (cat: CategorySlice) => {
    setInspectedItem({
      type: 'category',
      name: cat.name,
      color: cat.color,
      totalCount: cat.descriptors.length,
      selectedCount: cat.selectedCount,
    });
    setAnnouncement(`Category ${cat.name}, ${cat.descriptors.length} notes, ${cat.selectedCount} selected`);
  };

  // Keep inspected item sync'd with selectedTags changes
  useEffect(() => {
    if (inspectedItem && inspectedItem.type === 'descriptor') {
      const isSelected = selectedTags.includes(inspectedItem.name);
      if (inspectedItem.isSelected !== isSelected) {
        setInspectedItem((prev) => (prev ? { ...prev, isSelected } : null));
      }
    }
  }, [selectedTags, inspectedItem]);

  return (
    <div className={`flex flex-col items-center justify-center relative w-full h-full py-1 ${className}`}>
      {/* Screen Reader Live Announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full transform transition-transform"
          role="region"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onFocus={() => setIsSvgFocused(true)}
          onBlur={() => {
            // Only reset if focus left the SVG container entirely
            setTimeout(() => {
              if (!document.activeElement?.closest('svg')) {
                setIsSvgFocused(false);
              }
            }, 10);
          }}
        >
          <title id={titleId}>SCA Coffee Taster's Flavor Wheel</title>
          <desc id={descId}>
            Interactive sensory flavor wheel with 9 primary categories and {totalDescriptors} descriptors. Use arrow keys to rotate, Space or Enter to toggle notes.
          </desc>

          {/* Inner Ring (Categories) */}
          {innerSlices.map((slice) => {
            const pathData = describeArc(cx, cy, rInner, rMid, slice.startAngle, slice.endAngle - 0.5);
            const isCategoryInspected = inspectedItem?.type === 'category' && inspectedItem.name === slice.name;

            return (
              <path
                key={slice.name}
                d={pathData}
                fill={slice.color}
                fillOpacity={isCategoryInspected ? 1.0 : slice.hasSelectedChild ? 0.9 : 0.35}
                stroke={isCategoryInspected ? '#f59e0b' : '#1c1917'}
                strokeWidth={isCategoryInspected ? '2.5' : '1.5'}
                className="transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-[0.99] origin-center focus:outline-none"
                role="button"
                tabIndex={-1}
                aria-label={`Category ${slice.name}, ${slice.descriptors.length} notes, ${slice.selectedCount} selected`}
                onClick={() => handleCategoryClick(slice)}
                onMouseEnter={() =>
                  setInspectedItem({
                    type: 'category',
                    name: slice.name,
                    color: slice.color,
                    totalCount: slice.descriptors.length,
                    selectedCount: slice.selectedCount,
                  })
                }
                onMouseLeave={() => {
                  if (!isSvgFocused) {
                    setInspectedItem(null);
                  }
                }}
              />
            );
          })}

          {/* Outer Ring (Clickable & Keyboard Accessible Descriptors) */}
          {outerSlices.map((slice, index) => {
            const pathData = describeArc(cx, cy, rMid + 2, rOuter, slice.startAngle, slice.endAngle - 0.5);
            const isHovered = inspectedItem?.type === 'descriptor' && inspectedItem.name === slice.name;
            const isFocused = isSvgFocused && focusedIndex === index;

            return (
              <g
                key={slice.name}
                ref={(el) => {
                  descriptorRefs.current[index] = el;
                }}
                role="checkbox"
                tabIndex={focusedIndex === index ? 0 : -1}
                aria-checked={slice.isSelected}
                aria-label={`${slice.name}, category ${slice.category}, ${slice.isSelected ? 'Selected' : 'Not selected'}`}
                className="cursor-pointer focus:outline-none"
                onClick={() => handleDescriptorClick(slice)}
                onKeyDown={(e) => handleDescriptorKeyDown(e, index, slice)}
                onFocus={() => {
                  setFocusedIndex(index);
                  setInspectedItem({
                    type: 'descriptor',
                    name: slice.name,
                    category: slice.category,
                    color: slice.color,
                    isSelected: slice.isSelected,
                  });
                }}
                onMouseEnter={() =>
                  setInspectedItem({
                    type: 'descriptor',
                    name: slice.name,
                    category: slice.category,
                    color: slice.color,
                    isSelected: slice.isSelected,
                  })
                }
                onMouseLeave={() => {
                  if (!isSvgFocused) {
                    setInspectedItem(null);
                  }
                }}
              >
                <path
                  d={pathData}
                  fill={slice.color}
                  fillOpacity={slice.isSelected ? 1.0 : isHovered || isFocused ? 0.85 : 0.25}
                  stroke={isFocused ? '#38bdf8' : slice.isSelected ? '#f59e0b' : '#0c0a09'}
                  strokeWidth={isFocused ? '3.5' : slice.isSelected ? '2.5' : '1'}
                  className="transition-all duration-150 transform origin-center hover:scale-[1.01]"
                />
              </g>
            );
          })}

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r={rInner - 3} fill="#0c0a09" stroke="#292524" strokeWidth="2" />
        </svg>

        {/* Center Dynamic Label Display & Touch Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3 select-none">
          {inspectedItem ? (
            inspectedItem.type === 'descriptor' ? (
              <div className="flex flex-col items-center justify-center max-w-[130px]">
                <span
                  className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.2 rounded border"
                  style={{
                    color: inspectedItem.color,
                    borderColor: `${inspectedItem.color}40`,
                    backgroundColor: `${inspectedItem.color}15`,
                  }}
                >
                  {inspectedItem.category}
                </span>

                <span className="text-xs sm:text-sm font-bold text-text-primary mt-1 leading-tight line-clamp-2">
                  {inspectedItem.name}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTag(inspectedItem.name);
                    const willBe = !inspectedItem.isSelected;
                    setInspectedItem((prev) => (prev ? { ...prev, isSelected: willBe } : null));
                    setAnnouncement(`${inspectedItem.name}, ${willBe ? 'selected' : 'removed'}`);
                  }}
                  aria-label={`${inspectedItem.isSelected ? 'Remove' : 'Add'} ${inspectedItem.name}`}
                  className={`pointer-events-auto mt-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer ${
                    inspectedItem.isSelected
                      ? 'bg-accent text-zinc-950'
                      : 'bg-panel-recessed text-text-secondary border border-border-subtle hover:bg-zinc-800 hover:text-text-primary'
                  }`}
                >
                  {inspectedItem.isSelected ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                      <span>Selected</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-2.5 h-2.5 text-text-muted" />
                      <span>Add Note</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center max-w-[130px]">
                <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted">
                  Category
                </span>
                <span
                  className="text-xs sm:text-sm font-bold mt-0.5 leading-tight line-clamp-1"
                  style={{ color: inspectedItem.color }}
                >
                  {inspectedItem.name}
                </span>
                <span className="text-[10px] text-text-secondary font-mono mt-1">
                  {inspectedItem.selectedCount}/{inspectedItem.totalCount} selected
                </span>
                <span className="text-[8px] text-text-muted mt-0.5">
                  Tap outer ring to pick
                </span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center max-w-[120px]">
              <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted">
                SCA
              </span>
              <span className="text-xs font-bold font-mono text-accent mt-0.5">
                Sensory Wheel
              </span>
              <div className="flex items-center space-x-1 mt-1 text-[10px] text-text-secondary">
                <Tag className="w-2.5 h-2.5 text-accent" />
                <span className="font-mono font-semibold">{selectedTags.length} active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-text-muted mt-2 text-center max-w-sm font-mono">
        Use <kbd className="px-1 py-0.5 bg-panel-recessed rounded text-[10px] font-mono text-accent border border-border-subtle">←</kbd> <kbd className="px-1 py-0.5 bg-panel-recessed rounded text-[10px] font-mono text-accent border border-border-subtle">→</kbd> to rotate, <kbd className="px-1.5 py-0.5 bg-panel-recessed rounded text-[10px] font-mono text-accent border border-border-subtle">Space</kbd> to toggle, or tap any sensory note.
      </p>
    </div>
  );
};
