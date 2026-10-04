import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { SCA_FLAVOR_WHEEL, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ScaFlavorWheelSvgProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  size?: number;
}

interface CategorySlice {
  name: string;
  color: string;
  startAngle: number;
  endAngle: number;
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
    'Z',
  ].join(' ');
}

export const ScaFlavorWheelSvg: React.FC<ScaFlavorWheelSvgProps> = ({
  selectedTags,
  onToggleTag,
  size = 320,
}) => {
  const [inspectedDescriptor, setInspectedDescriptor] = useState<DescriptorSlice | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const rInner = size * 0.18;
  const rMid = size * 0.32;
  const rOuter = size * 0.48;

  const totalDescriptors = SCA_FLAVOR_WHEEL.reduce((acc, cat) => {
    const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
    return acc + descs.length;
  }, 0);

  const anglePerDescriptor = 360 / (totalDescriptors || 1);

  let currentAngle = 0;
  const innerSlices: CategorySlice[] = [];
  const outerSlices: DescriptorSlice[] = [];

  SCA_FLAVOR_WHEEL.forEach((cat) => {
    const descs = cat.subcategories?.flatMap((sub) => sub.descriptors || []) || [];
    const catSpanAngle = descs.length * anglePerDescriptor;
    const catStartAngle = currentAngle;
    const catEndAngle = currentAngle + catSpanAngle;
    const selectedCount = descs.filter((d) => selectedTags.includes(d)).length;

    innerSlices.push({
      name: cat.name,
      color: cat.color,
      startAngle: catStartAngle,
      endAngle: catEndAngle,
      descriptors: descs,
      selectedCount,
    });

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
    <View style={styles.wrapper}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Inner ring (categories) */}
          <G>
            {innerSlices.map((slice) => {
              const pathData = describeArc(cx, cy, rInner, rMid, slice.startAngle, slice.endAngle);
              return (
                <Path
                  key={`cat-${slice.name}`}
                  d={pathData}
                  fill={slice.color}
                  opacity={slice.selectedCount > 0 ? 0.9 : 0.45}
                  stroke={colors.canvas}
                  strokeWidth={1}
                />
              );
            })}
          </G>

          {/* Outer ring (descriptors) */}
          <G>
            {outerSlices.map((slice) => {
              const pathData = describeArc(cx, cy, rMid, rOuter, slice.startAngle, slice.endAngle);
              const isSelected = selectedTags.includes(slice.name);
              const isInspected = inspectedDescriptor?.name === slice.name;
              return (
                <Path
                  key={`desc-${slice.name}`}
                  d={pathData}
                  fill={slice.color}
                  opacity={isSelected ? 1 : isInspected ? 0.8 : 0.35}
                  stroke={isSelected ? colors.canvas : colors.borderSubtle}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  onPress={() => {
                    setInspectedDescriptor(slice);
                  }}
                />
              );
            })}
          </G>

          {/* Center hole background */}
          <Circle cx={cx} cy={cy} r={rInner - 2} fill={colors.panel} stroke={colors.borderSubtle} strokeWidth={1} />
        </Svg>

        {/* Center overlay readout */}
        <View style={[styles.centerOverlay, { width: (rInner - 4) * 2, height: (rInner - 4) * 2, borderRadius: rInner }]}>
          {inspectedDescriptor ? (
            <View style={styles.centerContent}>
              <Text style={styles.centerCategory} numberOfLines={1}>
                {inspectedDescriptor.category}
              </Text>
              <Text style={styles.centerDescriptor} numberOfLines={2}>
                {inspectedDescriptor.name}
              </Text>
              <Pressable
                style={[
                  styles.centerActionBtn,
                  selectedTags.includes(inspectedDescriptor.name) && styles.centerActionBtnActive,
                ]}
                onPress={() => onToggleTag(inspectedDescriptor.name)}
                accessibilityRole="button"
                accessibilityLabel={`${selectedTags.includes(inspectedDescriptor.name) ? 'Remove' : 'Add'} ${inspectedDescriptor.name}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.centerActionText}>
                  {selectedTags.includes(inspectedDescriptor.name) ? 'REMOVE' : 'ADD'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.centerPlaceholder}>TAP SLICE</Text>
              <Text style={styles.centerCount}>{selectedTags.length} active</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  centerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    padding: 6,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCategory: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerDescriptor: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: 2,
  },
  centerActionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  centerActionBtnActive: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  centerActionText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.canvas,
    letterSpacing: 1,
  },
  centerPlaceholder: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  centerCount: {
    fontFamily: FONTS.monoMedium,
    fontSize: 10,
    color: colors.accent,
    marginTop: 2,
  },
});
